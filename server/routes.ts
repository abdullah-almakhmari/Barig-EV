import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./auth";
import rateLimit from "express-rate-limit";
import { 
  checkAndRewardVerificationConsensus, 
  checkAndPenalizeContradictions,
  checkAndRewardReportConsensus,
  getUserTrustLevel
} from "./trust/trustSystem";
import { 
  calculateTrustScore, 
  getTrustScoreLabel, 
  isTrustScoreEnabled 
} from "./features/trustScore";
import {
  exportStationsCSV,
  exportChargingSessionsCSV,
  exportReportsCSV,
  getAvailableDatasets
} from "./admin/dataExport";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { 
  validateCsrf, 
  csrfTokenEndpoint, 
  verificationLimiter 
} from "./security";

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: "Too many creation requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { message: "Too many reports, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup authentication (must be before other routes)
  await setupAuth(app);
  
  // Apply general rate limiting to all API routes
  app.use("/api", generalLimiter);
  
  // CSRF token endpoint - must be before CSRF validation middleware
  app.get("/api/csrf-token", csrfTokenEndpoint);
  
  // Apply CSRF validation to all state-changing API routes
  app.use("/api", validateCsrf);
  
  // Seed database only in development (not production)
  if (process.env.NODE_ENV !== "production") {
    await storage.seed();
  }

  // Register object storage routes for screenshot uploads
  registerObjectStorageRoutes(app);

  app.get(api.stations.list.path, async (req, res) => {
    try {
      const filters = api.stations.list.input?.parse(req.query);
      const stations = await storage.getStations(filters);
      res.json(stations);
    } catch (err) {
      if (err instanceof z.ZodError) {
         // handle optional input parsing if strictly required, but for query params usually permissive or we'd strict parse
         // Since input is optional, if req.query is empty it might be undefined, but .optional() handles that.
         // If parse fails on specific fields:
         return res.status(400).json({ message: "Invalid filters" });
      }
      throw err;
    }
  });

  app.get(api.stations.get.path, async (req, res) => {
    const station = await storage.getStation(Number(req.params.id));
    if (!station) {
      return res.status(404).json({ message: "Station not found" });
    }
    // Only show APPROVED stations to public (or null for legacy stations)
    // PENDING and REJECTED stations should not be publicly accessible
    const isApproved = station.approvalStatus === "APPROVED" || station.approvalStatus === null;
    const isVisible = !station.isHidden;
    if (!isApproved || !isVisible) {
      return res.status(404).json({ message: "Station not found" });
    }
    res.json(station);
  });

  app.post(api.stations.create.path, createLimiter, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.stations.create.input.parse(req.body);
      const userId = req.user?.id;
      const station = await storage.createStation({ ...input, addedByUserId: userId }, true);
      res.status(201).json(station);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.stations.getReports.path, async (req, res) => {
    const reports = await storage.getReports(Number(req.params.id));
    res.json(reports);
  });

  app.patch(api.stations.updateAvailability.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.stations.updateAvailability.input.parse(req.body);
      const stationId = Number(req.params.id);
      const userId = req.user?.id;
      
      const station = await storage.getStation(stationId);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      // Authorization: Only station owner OR user with active session can update
      const isOwner = station.addedByUserId === userId;
      const activeSession = await storage.getActiveSession(stationId);
      const hasActiveSession = activeSession && activeSession.userId === userId;
      
      if (!isOwner && !hasActiveSession) {
        return res.status(403).json({ 
          message: "You are not allowed to change this charger status, but you can report it." 
        });
      }
      
      if (input.availableChargers > (station.chargerCount || 1)) {
        return res.status(400).json({ message: "Available chargers cannot exceed total chargers" });
      }
      const updated = await storage.updateStationAvailability(stationId, input.availableChargers);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });
  
  // Update station status (owner only)
  const statusUpdateSchema = z.object({
    status: z.enum(["OPERATIONAL", "MAINTENANCE", "OFFLINE"])
  });
  
  app.patch("/api/stations/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = statusUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid status. Must be OPERATIONAL, MAINTENANCE, or OFFLINE" });
      }
      
      const { status } = parsed.data;
      const stationId = Number(req.params.id);
      const userId = req.user?.id;
      
      const station = await storage.getStation(stationId);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      // Authorization: Only station owner can change status
      if (station.addedByUserId !== userId) {
        return res.status(403).json({ 
          message: "You are not allowed to change this charger status, but you can report it." 
        });
      }
      
      const updated = await storage.updateStationStatus(stationId, status);
      res.json(updated);
    } catch (err) {
      throw err;
    }
  });

  // Community verification endpoints
  const verificationSchema = z.object({
    vote: z.enum(["WORKING", "NOT_WORKING", "BUSY"])
  });

  app.post("/api/stations/:id/verify", verificationLimiter, isAuthenticated, async (req: any, res) => {
    try {
      const parsed = verificationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid vote. Must be WORKING, NOT_WORKING, or BUSY" });
      }
      
      const { vote } = parsed.data;
      const stationId = Number(req.params.id);
      const userId = req.user?.id;
      
      const station = await storage.getStation(stationId);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      const verification = await storage.submitVerification(stationId, userId, vote);
      const summary = await storage.getVerificationSummary(stationId);
      
      // Trust system: check if user's vote matches consensus
      checkAndRewardVerificationConsensus(stationId, userId, vote).catch(() => {});
      // Trust system: check for contradictions
      checkAndPenalizeContradictions(userId).catch(() => {});
      
      // Hybrid Community Verification System
      // Auto-update station status based on votes
      const userTrustLevel = await getUserTrustLevel(userId);
      const isTrustedUser = userTrustLevel === "TRUSTED";
      
      // Priority 1: Trusted user votes - immediate effect based on THEIR vote
      if (isTrustedUser) {
        if (vote === 'NOT_WORKING') {
          if (station.status !== 'OFFLINE') {
            await storage.updateStationStatus(stationId, 'OFFLINE');
          }
        } else if (vote === 'WORKING') {
          if (station.status !== 'OPERATIONAL') {
            await storage.updateStationStatus(stationId, 'OPERATIONAL');
          }
        }
        // BUSY from trusted user doesn't change station status
      } 
      // Priority 2: 3+ votes agree with clear consensus (majority)
      else {
        const { working, notWorking, busy } = summary;
        
        // NOT_WORKING has 3+ votes AND is strictly greater than other statuses
        if (notWorking >= 3 && notWorking > working && notWorking > busy) {
          if (station.status !== 'OFFLINE') {
            await storage.updateStationStatus(stationId, 'OFFLINE');
          }
        }
        // WORKING has 3+ votes AND is strictly greater than other statuses
        else if (working >= 3 && working > notWorking && working > busy) {
          if (station.status !== 'OPERATIONAL') {
            await storage.updateStationStatus(stationId, 'OPERATIONAL');
          }
        }
        // In case of tie or no clear consensus, don't change status
      }
      
      res.status(201).json({ verification, summary });
    } catch (err) {
      throw err;
    }
  });

  app.get("/api/stations/:id/verification-summary", async (req, res) => {
    try {
      const stationId = Number(req.params.id);
      
      const station = await storage.getStation(stationId);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      // Only show verification summary for APPROVED stations
      const isApproved = station.approvalStatus === "APPROVED" || station.approvalStatus === null;
      const isVisible = !station.isHidden;
      if (!isApproved || !isVisible) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      const summary = await storage.getVerificationSummary(stationId);
      res.json(summary);
    } catch (err) {
      throw err;
    }
  });

  // Verification history endpoint - shows recent verifications with user names
  app.get("/api/stations/:id/verification-history", async (req, res) => {
    try {
      const stationId = Number(req.params.id);
      const history = await storage.getVerificationHistory(stationId);
      res.json(history);
    } catch (err) {
      throw err;
    }
  });

  // Trust Score endpoint (feature-flagged)
  app.get("/api/stations/:id/trust-score", async (req, res) => {
    try {
      // Feature flag check - returns 404 if disabled
      if (!isTrustScoreEnabled()) {
        return res.status(404).json({ message: "Feature not available" });
      }

      const stationId = Number(req.params.id);
      
      const station = await storage.getStation(stationId);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      // Only show trust score for APPROVED visible stations
      const isApproved = station.approvalStatus === "APPROVED" || station.approvalStatus === null;
      const isVisible = !station.isHidden;
      if (!isApproved || !isVisible) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      const trustScore = await calculateTrustScore(stationId);
      if (!trustScore) {
        return res.status(404).json({ message: "Trust score not available" });
      }

      const label = getTrustScoreLabel(trustScore.score);
      
      res.json({
        score: trustScore.score,
        label,
        components: trustScore.components,
      });
    } catch (err) {
      throw err;
    }
  });

  // Deprecated: Use /api/charging-sessions/start instead
  app.post(api.stations.startCharging.path, async (req, res) => {
    return res.status(410).json({ 
      message: "Deprecated. Use /api/charging-sessions/start with stationId instead",
      redirect: api.chargingSessions.start.path
    });
  });

  // Deprecated: Use /api/charging-sessions/:id/end instead  
  app.post(api.stations.stopCharging.path, async (req, res) => {
    return res.status(410).json({ 
      message: "Deprecated. Use /api/charging-sessions/:id/end instead",
      redirect: api.chargingSessions.end.path
    });
  });

  app.post(api.reports.create.path, reportLimiter, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.reports.create.input.parse(req.body);
      const userId = req.user?.id;
      // Verify station exists
      const station = await storage.getStation(input.stationId);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      const report = await storage.createReport({ ...input, userId });
      
      // Check report count and flag station if 3+ reports
      const reportCount = await storage.getReportCountByStation(input.stationId);
      if (reportCount >= 3 && station.trustLevel !== "LOW") {
        await storage.updateStationTrustLevel(input.stationId, "LOW");
      }
      
      // Trust system: check if report matches consensus
      if (input.reason) {
        checkAndRewardReportConsensus(input.stationId, userId, input.reason).catch(() => {});
      }
      
      res.status(201).json(report);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Charging Sessions (protected - requires login)
  app.post(api.chargingSessions.start.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.chargingSessions.start.input.parse(req.body);
      const userId = req.user?.id;
      
      // Check if user already has an active session
      const existingSession = await storage.getUserActiveSession(userId);
      if (existingSession) {
        return res.status(400).json({ message: "You already have an active charging session" });
      }
      
      const station = await storage.getStation(input.stationId);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      // Check available chargers - multiple sessions allowed as long as chargers are available
      const available = station.availableChargers ?? 0;
      if (available <= 0) {
        return res.status(400).json({ message: "No available chargers" });
      }
      
      // Create charging session first, then update availability
      const session = await storage.startChargingSession(input.stationId, input.batteryStartPercent, input.userVehicleId, userId, input.customVehicleName);
      
      try {
        await storage.updateStationAvailability(input.stationId, available - 1);
      } catch (err) {
        // Rollback: delete the session if availability update failed
        await storage.deleteSession(session.id);
        throw err;
      }
      
      res.status(201).json(session);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.chargingSessions.end.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.chargingSessions.end.input.parse(req.body);
      const sessionId = Number(req.params.id);
      const userId = req.user?.id;
      
      // Check if session exists and is active before ending
      const existingSession = await storage.getSessionById(sessionId);
      if (!existingSession) {
        return res.status(404).json({ message: "Session not found" });
      }
      // Verify the session belongs to this user
      if (existingSession.userId && existingSession.userId !== userId) {
        return res.status(403).json({ message: "Cannot end another user's session" });
      }
      if (!existingSession.isActive) {
        return res.status(400).json({ message: "Session already ended" });
      }
      
      const session = await storage.endChargingSession(sessionId, input.batteryEndPercent, input.energyKwh, input.screenshotPath);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Increase available chargers
      const station = await storage.getStation(session.stationId);
      if (station) {
        const available = station.availableChargers ?? 0;
        const total = station.chargerCount ?? 1;
        if (available < total) {
          await storage.updateStationAvailability(session.stationId, available + 1);
        }
      }
      
      res.json(session);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.chargingSessions.list.path, isAuthenticated, async (req: any, res) => {
    const stationId = req.query.stationId ? Number(req.query.stationId) : undefined;
    const userId = req.user?.id;
    // Return only sessions for the current user
    const sessions = await storage.getChargingSessions(stationId, userId);
    res.json(sessions);
  });

  app.get(api.chargingSessions.getActive.path, async (req, res) => {
    const stationId = Number(req.params.id);
    const session = await storage.getActiveSession(stationId);
    res.json(session || null);
  });

  app.get("/api/charging-sessions/my-active", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const session = await storage.getUserActiveSession(userId);
    if (session) {
      const station = await storage.getStation(session.stationId);
      return res.json({ session, station });
    }
    res.json(null);
  });

  // Vehicles
  app.get(api.vehicles.list.path, async (req, res) => {
    const vehicles = await storage.getVehicles();
    res.json(vehicles);
  });

  app.get(api.vehicles.get.path, async (req, res) => {
    const vehicle = await storage.getVehicle(Number(req.params.id));
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    res.json(vehicle);
  });

  // User Vehicles (protected - requires login)
  app.get(api.userVehicles.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user?.id;
    const vehicles = await storage.getUserVehicles(userId);
    res.json(vehicles);
  });

  app.get(api.userVehicles.get.path, isAuthenticated, async (req: any, res) => {
    const vehicle = await storage.getUserVehicle(Number(req.params.id));
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    const userId = req.user?.id;
    if (vehicle.userId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    res.json(vehicle);
  });

  app.post(api.userVehicles.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.userVehicles.create.input.parse(req.body);
      const userId = req.user?.id;
      const vehicle = await storage.createUserVehicle({ ...input, userId });
      res.status(201).json(vehicle);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.userVehicles.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.userVehicles.update.input.parse(req.body);
      const vehicleId = Number(req.params.id);
      const userId = req.user?.id;
      
      const existing = await storage.getUserVehicle(vehicleId);
      if (!existing) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const vehicle = await storage.updateUserVehicle(vehicleId, input);
      res.json(vehicle);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.userVehicles.delete.path, isAuthenticated, async (req: any, res) => {
    const vehicleId = Number(req.params.id);
    const userId = req.user?.id;
    
    const existing = await storage.getUserVehicle(vehicleId);
    if (!existing) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    if (existing.userId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    await storage.deleteUserVehicle(vehicleId);
    res.json({ success: true });
  });

  app.post(api.userVehicles.setDefault.path, isAuthenticated, async (req: any, res) => {
    const vehicleId = Number(req.params.id);
    const userId = req.user?.id;
    
    const existing = await storage.getUserVehicle(vehicleId);
    if (!existing) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    if (existing.userId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    await storage.setDefaultUserVehicle(userId, vehicleId);
    res.json({ success: true });
  });

  // Admin middleware
  const isAdmin = (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    next();
  };

  // Admin: Get all reports with station info
  app.get("/api/admin/reports", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      console.log("[Admin] Fetching all reports for admin:", req.user?.email);
      const reports = await storage.getAllReportsWithDetails();
      console.log("[Admin] Found", reports.length, "reports");
      res.json(reports);
    } catch (err) {
      console.error("[Admin] Error fetching reports:", err);
      throw err;
    }
  });

  // Admin: Update report review status
  const reviewStatusSchema = z.object({
    reviewStatus: z.enum(["open", "resolved", "rejected", "confirmed", "confirmed_working", "confirmed_broken"])
  });

  app.patch("/api/admin/reports/:id/review", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const parsed = reviewStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid review status" });
      }
      
      const reportId = Number(req.params.id);
      const adminId = req.user?.id;
      
      // Get the report first to check its status
      const existingReport = await storage.getReportById(reportId);
      if (!existingReport) {
        return res.status(404).json({ message: "Report not found" });
      }
      
      const report = await storage.updateReportReviewStatus(reportId, parsed.data.reviewStatus, adminId);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      
      // If admin confirms station is working, update the station status to ONLINE
      if (parsed.data.reviewStatus === "confirmed_working") {
        await storage.updateStationStatus(existingReport.stationId, "ONLINE");
      }
      
      // If admin confirms station is broken, update the station status to OFFLINE
      if (parsed.data.reviewStatus === "confirmed_broken" || 
          (parsed.data.reviewStatus === "confirmed" && existingReport.status === "NOT_WORKING")) {
        await storage.updateStationStatus(existingReport.stationId, "OFFLINE");
      }
      
      // If resolving a report (station is fixed), update the station status back to ONLINE
      if (parsed.data.reviewStatus === "resolved") {
        await storage.updateStationStatus(existingReport.stationId, "ONLINE");
      }
      
      res.json(report);
    } catch (err) {
      throw err;
    }
  });

  // Admin: Get all stations (including hidden)
  app.get("/api/admin/stations", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const stations = await storage.getAllStationsForAdmin();
      res.json(stations);
    } catch (err) {
      throw err;
    }
  });

  // Admin: Get charging sessions with screenshots
  app.get("/api/admin/charging-sessions", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const sessions = await storage.getChargingSessionsWithScreenshots();
      res.json(sessions);
    } catch (err) {
      throw err;
    }
  });

  // Admin: Hide/Restore station
  const hideStationSchema = z.object({
    isHidden: z.boolean()
  });

  app.patch("/api/admin/stations/:id/visibility", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const parsed = hideStationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid visibility value" });
      }
      
      const stationId = Number(req.params.id);
      const station = await storage.updateStationVisibility(stationId, parsed.data.isHidden);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      res.json(station);
    } catch (err) {
      throw err;
    }
  });

  // Admin: Update station status (OPERATIONAL/OFFLINE)
  app.patch("/api/admin/stations/:id/status", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const stationId = Number(req.params.id);
      const { status } = req.body;
      
      if (!["OPERATIONAL", "OFFLINE"].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      const station = await storage.updateStationStatus(stationId, status);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      res.json(station);
    } catch (err) {
      throw err;
    }
  });

  // Admin: Get report counts per station
  app.get("/api/admin/stations/:id/report-count", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const stationId = Number(req.params.id);
      const count = await storage.getReportCountByStation(stationId);
      res.json({ count });
    } catch (err) {
      throw err;
    }
  });

  // Get user trust level for badge display
  app.get("/api/users/:id/trust-level", async (req, res) => {
    try {
      const userId = req.params.id;
      const level = await getUserTrustLevel(userId);
      res.json({ trustLevel: level });
    } catch (err) {
      throw err;
    }
  });

  // Admin: Approve or Reject station
  const approvalStatusSchema = z.object({
    approvalStatus: z.enum(["APPROVED", "REJECTED"])
  });

  app.patch("/api/admin/stations/:id/approval", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const parsed = approvalStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid approval status" });
      }
      
      const stationId = Number(req.params.id);
      const station = await storage.updateStationApprovalStatus(stationId, parsed.data.approvalStatus);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      
      console.log(`[Admin] Station ${stationId} ${parsed.data.approvalStatus} by ${req.user?.email}`);
      res.json(station);
    } catch (err) {
      throw err;
    }
  });

  // ============ DATA EXPORT ENDPOINTS (Admin Only) ============
  // For academic research / thesis data analysis
  
  // List available datasets
  app.get("/api/admin/export", isAuthenticated, isAdmin, (_req, res) => {
    res.json(getAvailableDatasets());
  });

  // Export stations dataset as CSV
  app.get("/api/admin/export/stations", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      await exportStationsCSV(res);
    } catch (err) {
      console.error("[Export] Stations export failed:", err);
      res.status(500).json({ message: "Export failed" });
    }
  });

  // Export charging sessions dataset as CSV
  app.get("/api/admin/export/sessions", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      await exportChargingSessionsCSV(res);
    } catch (err) {
      console.error("[Export] Sessions export failed:", err);
      res.status(500).json({ message: "Export failed" });
    }
  });

  // Export reports dataset as CSV
  app.get("/api/admin/export/reports", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      await exportReportsCSV(res);
    } catch (err) {
      console.error("[Export] Reports export failed:", err);
      res.status(500).json({ message: "Export failed" });
    }
  });

  // Contact messages
  app.post("/api/contact", async (req: any, res) => {
    try {
      const { userName, userEmail, subject, message } = req.body;
      
      if (!subject || !message) {
        return res.status(400).json({ message: "Subject and message are required" });
      }
      
      const userId = req.user?.id || null;
      
      const contactMessage = await storage.createContactMessage({
        userId,
        userName: userName || null,
        userEmail: userEmail || null,
        subject,
        message
      });
      
      res.status(201).json(contactMessage);
    } catch (err) {
      console.error("[Contact] Failed to create message:", err);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Admin: Get all contact messages
  app.get("/api/admin/messages", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const messages = await storage.getContactMessages();
      res.json(messages);
    } catch (err) {
      console.error("[Admin] Failed to get messages:", err);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  // Admin: Update message status
  app.patch("/api/admin/messages/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, adminNotes } = req.body;
      
      const updated = await storage.updateContactMessageStatus(id, status, adminNotes);
      if (!updated) {
        return res.status(404).json({ message: "Message not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("[Admin] Failed to update message:", err);
      res.status(500).json({ message: "Failed to update message" });
    }
  });

  return httpServer;
}
