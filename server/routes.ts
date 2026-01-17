import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./auth";
import rateLimit from "express-rate-limit";

// Rate limiters for different endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: { message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 creates per hour
  message: { message: "Too many creation requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 reports per hour
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
  
  // Seed database on startup
  await storage.seed();

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
    res.json(station);
  });

  app.post(api.stations.create.path, createLimiter, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.stations.create.input.parse(req.body);
      const userId = req.user?.id;
      const station = await storage.createStation({ ...input, addedByUserId: userId });
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

  app.patch(api.stations.updateAvailability.path, async (req, res) => {
    try {
      const input = api.stations.updateAvailability.input.parse(req.body);
      const station = await storage.getStation(Number(req.params.id));
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }
      if (input.availableChargers > (station.chargerCount || 1)) {
        return res.status(400).json({ message: "Available chargers cannot exceed total chargers" });
      }
      const updated = await storage.updateStationAvailability(Number(req.params.id), input.availableChargers);
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
      
      // Update station status based on report
      if (input.status === "NOT_WORKING") {
        await storage.updateStationStatus(input.stationId, "OFFLINE");
      } else if (input.status === "WORKING") {
        await storage.updateStationStatus(input.stationId, "OPERATIONAL");
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
      const session = await storage.startChargingSession(input.stationId, input.batteryStartPercent, input.userVehicleId, userId);
      
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
      
      const session = await storage.endChargingSession(sessionId, input.batteryEndPercent, input.energyKwh);
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

  return httpServer;
}
