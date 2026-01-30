import {
  stations, reports, chargingSessions, evVehicles, userVehicles, users, stationVerifications, contactMessages, teslaConnectors,
  type Station, type InsertStation,
  type Report, type InsertReport,
  type ChargingSession, type InsertChargingSession,
  type EvVehicle, type InsertEvVehicle,
  type UserVehicle, type InsertUserVehicle, type UserVehicleWithDetails,
  type StationVerification, type VerificationSummary,
  type ContactMessage, type InsertContactMessage,
  type TeslaConnector, type InsertTeslaConnector
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ilike, or, ne, gte, sql, isNotNull } from "drizzle-orm";

export interface IStorage {
  getStations(filters?: { search?: string; city?: string; type?: string }): Promise<Station[]>;
  getStation(id: number): Promise<Station | undefined>;
  getStationByLocation(lat: number, lng: number, radiusMeters?: number): Promise<Station | undefined>;
  createStation(station: InsertStation, isUserSubmitted?: boolean): Promise<Station>;
  updateStationAvailability(id: number, availableChargers: number): Promise<Station | undefined>;
  updateStationStatus(id: number, status: string): Promise<Station | undefined>;
  updateStationTrustLevel(id: number, trustLevel: string): Promise<Station | undefined>;
  updateStationVisibility(id: number, isHidden: boolean): Promise<Station | undefined>;
  updateStationApprovalStatus(id: number, approvalStatus: string): Promise<Station | undefined>;
  deleteStation(id: number): Promise<void>;
  getAllStationsForAdmin(): Promise<Station[]>;
  getReports(stationId: number): Promise<Report[]>;
  getReportById(id: number): Promise<Report | undefined>;
  getReportCountByStation(stationId: number): Promise<number>;
  getAllReportsWithDetails(): Promise<ReportWithDetails[]>;
  updateReportReviewStatus(id: number, reviewStatus: string, reviewedBy: string): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  startChargingSession(stationId: number, batteryStartPercent?: number, userVehicleId?: number, userId?: string, customVehicleName?: string): Promise<ChargingSession>;
  endChargingSession(sessionId: number, batteryEndPercent?: number, energyKwh?: number, screenshotPath?: string, teslaData?: {
    gridVoltage?: number;
    gridFrequency?: number;
    maxCurrentA?: number;
    avgCurrentA?: number;
    maxPowerKw?: number;
    maxTempC?: number;
  }): Promise<ChargingSession | undefined>;
  createCompletedSession(session: {
    stationId: number;
    userId?: string;
    userVehicleId?: number | null;
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    energyKwh: number;
    gridVoltage?: number;
    gridFrequency?: number;
    maxCurrentA?: number;
    avgCurrentA?: number;
    maxPowerKw?: number;
    maxTempC?: number;
    isAutoTracked?: boolean;
    teslaConnectorId?: number;
  }): Promise<ChargingSession>;
  getChargingSessions(stationId?: number, userId?: string): Promise<ChargingSession[]>;
  getChargingSessionsWithScreenshots(): Promise<(ChargingSession & { stationName?: string; stationNameAr?: string; userEmail?: string })[]>;
  getActiveSession(stationId: number): Promise<ChargingSession | undefined>;
  getUserActiveSession(userId: string): Promise<ChargingSession | undefined>;
  getStationsWithActiveAutoTrackedSessions(): Promise<number[]>;
  getSessionById(sessionId: number): Promise<ChargingSession | undefined>;
  deleteSession(sessionId: number): Promise<void>;
  getVehicles(): Promise<EvVehicle[]>;
  getVehicle(id: number): Promise<EvVehicle | undefined>;
  getUserVehicles(userId: string): Promise<UserVehicleWithDetails[]>;
  getUserVehicle(id: number): Promise<UserVehicleWithDetails | undefined>;
  createUserVehicle(vehicle: InsertUserVehicle): Promise<UserVehicle>;
  updateUserVehicle(id: number, vehicle: Partial<InsertUserVehicle>): Promise<UserVehicle | undefined>;
  deleteUserVehicle(id: number): Promise<void>;
  setDefaultUserVehicle(userId: string, vehicleId: number): Promise<void>;
  // User profile
  updateUserProfileImage(userId: string, profileImageUrl: string | null): Promise<{ profileImageUrl: string | null } | undefined>;
  // Verification methods
  submitVerification(stationId: number, userId: string, vote: string): Promise<StationVerification>;
  getVerificationSummary(stationId: number): Promise<VerificationSummary>;
  getUserRecentVerification(stationId: number, userId: string): Promise<StationVerification | undefined>;
  getVerificationHistory(stationId: number): Promise<VerificationHistoryItem[]>;
  // Contact messages
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getContactMessages(): Promise<ContactMessage[]>;
  updateContactMessageStatus(id: number, status: string, adminNotes?: string): Promise<ContactMessage | undefined>;
  // Tesla Connectors
  createTeslaConnector(connector: InsertTeslaConnector): Promise<TeslaConnector>;
  getTeslaConnector(id: number): Promise<TeslaConnector | undefined>;
  getTeslaConnectorByToken(deviceToken: string): Promise<TeslaConnector | undefined>;
  getUserTeslaConnectors(userId: string): Promise<TeslaConnector[]>;
  getStationTeslaConnectors(stationId: number): Promise<TeslaConnector[]>;
  updateTeslaConnector(id: number, data: Partial<TeslaConnector>): Promise<TeslaConnector | undefined>;
  deleteTeslaConnector(id: number): Promise<void>;
  createChargingSession(session: InsertChargingSession): Promise<ChargingSession>;
  getStaleAutoTrackedSessions(staleHours: number): Promise<ChargingSession[]>;
  getConnectorsWithStaleSessions(): Promise<TeslaConnector[]>;
  seed(): Promise<void>;
}

export type VerificationHistoryItem = {
  id: number;
  vote: string;
  createdAt: string;
  userName: string;
  userTrustLevel: string;
};

export type ReportWithDetails = Report & {
  stationName?: string;
  stationNameAr?: string;
  reporterEmail?: string;
  reportCount?: number;
};

export class DatabaseStorage implements IStorage {
  async getStations(filters?: { search?: string; city?: string; type?: string }): Promise<Station[]> {
    let conditions = [];

    // Always exclude hidden stations for public API
    conditions.push(or(eq(stations.isHidden, false), eq(stations.isHidden, null as any)));
    
    // Only show APPROVED stations to public (or null for legacy stations)
    conditions.push(or(eq(stations.approvalStatus, "APPROVED"), eq(stations.approvalStatus, null as any)));

    if (filters?.search) {
      const searchLower = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        or(
          ilike(stations.name, searchLower),
          ilike(stations.nameAr, searchLower),
          ilike(stations.city, searchLower),
          ilike(stations.cityAr, searchLower)
        )
      );
    }
    
    if (filters?.city) {
       conditions.push(
        or(
          ilike(stations.city, filters.city),
          ilike(stations.cityAr, filters.city)
        )
      );
    }

    if (filters?.type) {
      if (filters.type === "HOME") {
        conditions.push(eq(stations.stationType, "HOME"));
      } else {
        conditions.push(eq(stations.chargerType, filters.type));
      }
    }

    return await db.select().from(stations).where(and(...conditions));
  }

  async getStation(id: number): Promise<Station | undefined> {
    const [station] = await db.select().from(stations).where(eq(stations.id, id));
    return station;
  }

  async getStationByLocation(lat: number, lng: number, radiusMeters: number = 50): Promise<Station | undefined> {
    // Use Haversine formula to find stations within radius
    // Convert radius from meters to approximate degrees (at equator, 1 degree ≈ 111,320 meters)
    const radiusDegrees = radiusMeters / 111320;
    
    const result = await db.select().from(stations).where(
      and(
        sql`ABS(${stations.lat} - ${lat}) < ${radiusDegrees}`,
        sql`ABS(${stations.lng} - ${lng}) < ${radiusDegrees}`
      )
    ).limit(1);
    
    return result[0];
  }

  async createStation(insertStation: InsertStation, isUserSubmitted: boolean = false): Promise<Station> {
    const [station] = await db.insert(stations).values({
      ...insertStation,
      approvalStatus: isUserSubmitted ? "PENDING" : "APPROVED"
    }).returning();
    return station;
  }

  async updateStationAvailability(id: number, availableChargers: number): Promise<Station | undefined> {
    const [updated] = await db.update(stations)
      .set({ availableChargers, updatedAt: new Date() })
      .where(eq(stations.id, id))
      .returning();
    return updated;
  }

  async updateStationStatus(id: number, status: string): Promise<Station | undefined> {
    const [updated] = await db.update(stations)
      .set({ status, updatedAt: new Date() })
      .where(eq(stations.id, id))
      .returning();
    return updated;
  }

  async updateStationTrustLevel(id: number, trustLevel: string): Promise<Station | undefined> {
    const [updated] = await db.update(stations)
      .set({ trustLevel, updatedAt: new Date() })
      .where(eq(stations.id, id))
      .returning();
    return updated;
  }

  async updateStationVisibility(id: number, isHidden: boolean): Promise<Station | undefined> {
    const [updated] = await db.update(stations)
      .set({ isHidden, updatedAt: new Date() })
      .where(eq(stations.id, id))
      .returning();
    return updated;
  }

  async updateStationApprovalStatus(id: number, approvalStatus: string): Promise<Station | undefined> {
    const [updated] = await db.update(stations)
      .set({ approvalStatus, updatedAt: new Date() })
      .where(eq(stations.id, id))
      .returning();
    return updated;
  }

  async deleteStation(id: number): Promise<void> {
    await db.delete(stations).where(eq(stations.id, id));
  }

  async getAllStationsForAdmin(): Promise<Station[]> {
    return await db.select().from(stations).orderBy(desc(stations.createdAt));
  }

  async getReports(stationId: number): Promise<Report[]> {
    return await db.select()
      .from(reports)
      .where(eq(reports.stationId, stationId))
      .orderBy(desc(reports.createdAt));
  }

  async getReportById(id: number): Promise<Report | undefined> {
    const [report] = await db.select()
      .from(reports)
      .where(eq(reports.id, id));
    return report;
  }

  async getReportCountByStation(stationId: number): Promise<number> {
    const reportsList = await db.select()
      .from(reports)
      .where(eq(reports.stationId, stationId));
    return reportsList.length;
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const [report] = await db.insert(reports).values(insertReport).returning();
    return report;
  }

  async getAllReportsWithDetails(): Promise<ReportWithDetails[]> {
    const allReports = await db.select().from(reports).orderBy(desc(reports.createdAt));
    const result: ReportWithDetails[] = [];
    
    for (const report of allReports) {
      const [station] = await db.select().from(stations).where(eq(stations.id, report.stationId));
      const [user] = report.userId ? await db.select().from(users).where(eq(users.id, report.userId)) : [null];
      const reportCount = await this.getReportCountByStation(report.stationId);
      
      result.push({
        ...report,
        stationName: station?.name,
        stationNameAr: station?.nameAr,
        reporterEmail: user?.email || undefined,
        reportCount
      });
    }
    
    return result;
  }

  async updateReportReviewStatus(id: number, reviewStatus: string, reviewedBy: string): Promise<Report | undefined> {
    const [updated] = await db.update(reports)
      .set({ 
        reviewStatus, 
        reviewedBy, 
        reviewedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(reports.id, id))
      .returning();
    return updated;
  }

  async startChargingSession(stationId: number, batteryStartPercent?: number, userVehicleId?: number, userId?: string, customVehicleName?: string): Promise<ChargingSession> {
    const [session] = await db.insert(chargingSessions).values({
      stationId,
      userId,
      userVehicleId: customVehicleName ? null : userVehicleId,
      customVehicleName,
      batteryStartPercent,
      isActive: true,
      startTime: new Date(),
    }).returning();
    return session;
  }

  async createCompletedSession(session: {
    stationId: number;
    userId?: string;
    userVehicleId?: number | null;
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    energyKwh: number;
    gridVoltage?: number;
    gridFrequency?: number;
    maxCurrentA?: number;
    avgCurrentA?: number;
    maxPowerKw?: number;
    maxTempC?: number;
    isAutoTracked?: boolean;
    teslaConnectorId?: number;
  }): Promise<ChargingSession> {
    const [created] = await db.insert(chargingSessions).values({
      stationId: session.stationId,
      userId: session.userId,
      userVehicleId: session.userVehicleId,
      startTime: session.startTime,
      endTime: session.endTime,
      durationMinutes: session.durationMinutes,
      energyKwh: session.energyKwh,
      gridVoltage: session.gridVoltage,
      gridFrequency: session.gridFrequency,
      maxCurrentA: session.maxCurrentA,
      avgCurrentA: session.avgCurrentA,
      maxPowerKw: session.maxPowerKw,
      maxTempC: session.maxTempC,
      isActive: false,
      isAutoTracked: session.isAutoTracked ?? false,
      teslaConnectorId: session.teslaConnectorId,
    }).returning();
    return created;
  }

  async endChargingSession(sessionId: number, batteryEndPercent?: number, energyKwh?: number, screenshotPath?: string, teslaData?: {
    gridVoltage?: number;
    gridFrequency?: number;
    maxCurrentA?: number;
    avgCurrentA?: number;
    maxPowerKw?: number;
    maxTempC?: number;
  }): Promise<ChargingSession | undefined> {
    const [session] = await db.select().from(chargingSessions).where(eq(chargingSessions.id, sessionId));
    if (!session) return undefined;

    const endTime = new Date();
    const durationMinutes = session.startTime 
      ? Math.round((endTime.getTime() - new Date(session.startTime).getTime()) / 60000)
      : null;

    const [updated] = await db.update(chargingSessions)
      .set({
        endTime,
        durationMinutes,
        batteryEndPercent,
        energyKwh,
        screenshotPath,
        isActive: false,
        updatedAt: new Date(),
        ...(teslaData && {
          gridVoltage: teslaData.gridVoltage,
          gridFrequency: teslaData.gridFrequency,
          maxCurrentA: teslaData.maxCurrentA,
          avgCurrentA: teslaData.avgCurrentA,
          maxPowerKw: teslaData.maxPowerKw,
          maxTempC: teslaData.maxTempC,
        }),
      })
      .where(eq(chargingSessions.id, sessionId))
      .returning();
    return updated;
  }

  async getChargingSessions(stationId?: number, userId?: string): Promise<ChargingSession[]> {
    let conditions = [];
    if (stationId) {
      conditions.push(eq(chargingSessions.stationId, stationId));
    }
    if (userId) {
      conditions.push(eq(chargingSessions.userId, userId));
    }
    
    if (conditions.length > 0) {
      return await db.select()
        .from(chargingSessions)
        .where(and(...conditions))
        .orderBy(desc(chargingSessions.createdAt));
    }
    return await db.select()
      .from(chargingSessions)
      .orderBy(desc(chargingSessions.createdAt));
  }

  async getChargingSessionsWithScreenshots(): Promise<(ChargingSession & { stationName?: string; stationNameAr?: string; userEmail?: string })[]> {
    const results = await db.select({
      id: chargingSessions.id,
      stationId: chargingSessions.stationId,
      userId: chargingSessions.userId,
      startTime: chargingSessions.startTime,
      endTime: chargingSessions.endTime,
      durationMinutes: chargingSessions.durationMinutes,
      batteryStartPercent: chargingSessions.batteryStartPercent,
      batteryEndPercent: chargingSessions.batteryEndPercent,
      energyKwh: chargingSessions.energyKwh,
      isActive: chargingSessions.isActive,
      userVehicleId: chargingSessions.userVehicleId,
      customVehicleName: chargingSessions.customVehicleName,
      screenshotPath: chargingSessions.screenshotPath,
      createdAt: chargingSessions.createdAt,
      stationName: stations.name,
      stationNameAr: stations.nameAr,
      userEmail: users.email,
    })
      .from(chargingSessions)
      .leftJoin(stations, eq(chargingSessions.stationId, stations.id))
      .leftJoin(users, eq(chargingSessions.userId, users.id))
      .where(isNotNull(chargingSessions.screenshotPath))
      .orderBy(desc(chargingSessions.createdAt));
    
    return results as (ChargingSession & { stationName?: string; stationNameAr?: string; userEmail?: string })[];
  }

  async getActiveSession(stationId: number): Promise<ChargingSession | undefined> {
    const [session] = await db.select()
      .from(chargingSessions)
      .where(and(
        eq(chargingSessions.stationId, stationId),
        eq(chargingSessions.isActive, true)
      ));
    return session;
  }

  async getUserActiveSession(userId: string): Promise<ChargingSession | undefined> {
    const [session] = await db.select()
      .from(chargingSessions)
      .where(and(
        eq(chargingSessions.userId, userId),
        eq(chargingSessions.isActive, true)
      ));
    return session;
  }

  async getStationsWithActiveAutoTrackedSessions(): Promise<number[]> {
    const sessions = await db.select({ stationId: chargingSessions.stationId })
      .from(chargingSessions)
      .where(and(
        eq(chargingSessions.isActive, true),
        eq(chargingSessions.isAutoTracked, true)
      ));
    return sessions.map(s => s.stationId);
  }

  async getSessionById(sessionId: number): Promise<ChargingSession | undefined> {
    const [session] = await db.select()
      .from(chargingSessions)
      .where(eq(chargingSessions.id, sessionId));
    return session;
  }

  async deleteSession(sessionId: number): Promise<void> {
    await db.delete(chargingSessions).where(eq(chargingSessions.id, sessionId));
  }

  async getVehicles(): Promise<EvVehicle[]> {
    return await db.select().from(evVehicles);
  }

  async getVehicle(id: number): Promise<EvVehicle | undefined> {
    const [vehicle] = await db.select().from(evVehicles).where(eq(evVehicles.id, id));
    return vehicle;
  }

  async getUserVehicles(userId: string): Promise<UserVehicleWithDetails[]> {
    const userVehiclesList = await db.select().from(userVehicles).where(eq(userVehicles.userId, userId)).orderBy(desc(userVehicles.createdAt));
    const result: UserVehicleWithDetails[] = [];
    for (const uv of userVehiclesList) {
      const evVehicle = uv.evVehicleId ? await this.getVehicle(uv.evVehicleId) : undefined;
      result.push({ ...uv, evVehicle });
    }
    return result;
  }

  async getUserVehicle(id: number): Promise<UserVehicleWithDetails | undefined> {
    const [uv] = await db.select().from(userVehicles).where(eq(userVehicles.id, id));
    if (!uv) return undefined;
    const evVehicle = uv.evVehicleId ? await this.getVehicle(uv.evVehicleId) : undefined;
    return { ...uv, evVehicle };
  }

  async createUserVehicle(vehicle: InsertUserVehicle): Promise<UserVehicle> {
    const [created] = await db.insert(userVehicles).values(vehicle).returning();
    return created;
  }

  async updateUserVehicle(id: number, vehicle: Partial<InsertUserVehicle>): Promise<UserVehicle | undefined> {
    const [updated] = await db.update(userVehicles).set({ ...vehicle, updatedAt: new Date() }).where(eq(userVehicles.id, id)).returning();
    return updated;
  }

  async deleteUserVehicle(id: number): Promise<void> {
    await db.delete(userVehicles).where(eq(userVehicles.id, id));
  }

  async setDefaultUserVehicle(userId: string, vehicleId: number): Promise<void> {
    await db.update(userVehicles).set({ isDefault: false, updatedAt: new Date() }).where(eq(userVehicles.userId, userId));
    await db.update(userVehicles).set({ isDefault: true, updatedAt: new Date() }).where(eq(userVehicles.id, vehicleId));
  }

  // User profile methods
  async updateUserProfileImage(userId: string, profileImageUrl: string | null): Promise<{ profileImageUrl: string | null } | undefined> {
    const [updated] = await db.update(users)
      .set({ profileImageUrl, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ profileImageUrl: users.profileImageUrl });
    return updated;
  }

  // Verification methods
  async submitVerification(stationId: number, userId: string, vote: string): Promise<StationVerification> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    // Check if user already submitted a verification in the last 30 minutes
    const existing = await this.getUserRecentVerification(stationId, userId);
    
    if (existing) {
      // Update existing verification
      const [updated] = await db.update(stationVerifications)
        .set({ vote, createdAt: new Date() })
        .where(eq(stationVerifications.id, existing.id))
        .returning();
      return updated;
    }
    
    // Create new verification
    const [verification] = await db.insert(stationVerifications)
      .values({ stationId, userId, vote })
      .returning();
    return verification;
  }

  async getUserRecentVerification(stationId: number, userId: string): Promise<StationVerification | undefined> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const [verification] = await db.select()
      .from(stationVerifications)
      .where(and(
        eq(stationVerifications.stationId, stationId),
        eq(stationVerifications.userId, userId),
        gte(stationVerifications.createdAt, thirtyMinutesAgo)
      ))
      .orderBy(desc(stationVerifications.createdAt))
      .limit(1);
    return verification;
  }

  async getVerificationSummary(stationId: number): Promise<VerificationSummary> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const recentVotes = await db.select()
      .from(stationVerifications)
      .where(and(
        eq(stationVerifications.stationId, stationId),
        gte(stationVerifications.createdAt, thirtyMinutesAgo)
      ))
      .orderBy(desc(stationVerifications.createdAt));
    
    const working = recentVotes.filter(v => v.vote === 'WORKING').length;
    const notWorking = recentVotes.filter(v => v.vote === 'NOT_WORKING').length;
    const busy = recentVotes.filter(v => v.vote === 'BUSY').length;
    const totalVotes = recentVotes.length;
    
    // Get the most recent verification timestamp
    const lastVerifiedAt = recentVotes.length > 0 && recentVotes[0].createdAt 
      ? recentVotes[0].createdAt.toISOString() 
      : null;
    
    // Determine leading vote
    let leadingVote: 'WORKING' | 'NOT_WORKING' | 'BUSY' | null = null;
    const maxVotes = Math.max(working, notWorking, busy);
    if (maxVotes > 0) {
      if (working === maxVotes) leadingVote = 'WORKING';
      else if (notWorking === maxVotes) leadingVote = 'NOT_WORKING';
      else if (busy === maxVotes) leadingVote = 'BUSY';
    }
    
    // Verified if >= 2 confirmations, strong if >= 3
    const isVerified = maxVotes >= 2;
    const isStrongVerified = maxVotes >= 3;
    
    return {
      working,
      notWorking,
      busy,
      totalVotes,
      leadingVote,
      isVerified,
      isStrongVerified,
      lastVerifiedAt
    };
  }

  async getVerificationHistory(stationId: number): Promise<VerificationHistoryItem[]> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const verifications = await db.select({
      id: stationVerifications.id,
      vote: stationVerifications.vote,
      createdAt: stationVerifications.createdAt,
      userId: stationVerifications.userId,
    })
      .from(stationVerifications)
      .where(and(
        eq(stationVerifications.stationId, stationId),
        gte(stationVerifications.createdAt, twentyFourHoursAgo)
      ))
      .orderBy(desc(stationVerifications.createdAt))
      .limit(20);
    
    const result: VerificationHistoryItem[] = [];
    
    for (const v of verifications) {
      const [user] = await db.select({
        firstName: users.firstName,
        userTrustLevel: users.userTrustLevel,
      })
        .from(users)
        .where(eq(users.id, v.userId));
      
      result.push({
        id: v.id,
        vote: v.vote,
        createdAt: v.createdAt?.toISOString() || new Date().toISOString(),
        userName: user?.firstName || 'مستخدم',
        userTrustLevel: user?.userTrustLevel || 'NEW',
      });
    }
    
    return result;
  }

  // Contact messages
  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [newMessage] = await db.insert(contactMessages).values(message).returning();
    return newMessage;
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }

  async updateContactMessageStatus(id: number, status: string, adminNotes?: string): Promise<ContactMessage | undefined> {
    const [updated] = await db.update(contactMessages)
      .set({ status, adminNotes, updatedAt: new Date() })
      .where(eq(contactMessages.id, id))
      .returning();
    return updated;
  }

  async seed(): Promise<void> {
    const existing = await this.getStations();
    if (existing.length > 0) return;

    const seedStations: InsertStation[] = [
      {
        name: "Oman Oil - Qurum",
        nameAr: "نفط عمان - القرم",
        operator: "Oman Oil",
        lat: 23.614328,
        lng: 58.475432,
        chargerType: "DC",
        powerKw: 50,
        chargerCount: 4,
        availableChargers: 2,
        isFree: false,
        priceText: "0.100 OMR/kWh",
        city: "Muscat",
        cityAr: "مسقط",
        address: "Al Qurum, Muscat",
        status: "OPERATIONAL"
      },
      {
        name: "Shell - Al Khoud",
        nameAr: "شل - الخوض",
        operator: "Shell",
        lat: 23.618671,
        lng: 58.192345,
        chargerType: "DC",
        powerKw: 60,
        chargerCount: 2,
        availableChargers: 1,
        isFree: false,
        priceText: "0.120 OMR/kWh",
        city: "Muscat",
        cityAr: "مسقط",
        address: "Al Khoud, Seeb",
        status: "OPERATIONAL"
      },
      {
        name: "Mall of Oman",
        nameAr: "مول عمان",
        operator: "Recharge",
        lat: 23.578912,
        lng: 58.391234,
        chargerType: "AC",
        powerKw: 22,
        chargerCount: 6,
        availableChargers: 4,
        isFree: true,
        priceText: "Free",
        city: "Muscat",
        cityAr: "مسقط",
        address: "Bausher, Muscat",
        status: "OPERATIONAL"
      },
      {
        name: "Muscat City Centre",
        nameAr: "سيتي سنتر مسقط",
        operator: "Majid Al Futtaim",
        lat: 23.601234,
        lng: 58.245678,
        chargerType: "AC",
        powerKw: 11,
        chargerCount: 4,
        availableChargers: 0,
        isFree: true,
        priceText: "Free",
        city: "Muscat",
        cityAr: "مسقط",
        address: "Seeb, Muscat",
        status: "MAINTENANCE"
      },
      {
        name: "Sohar Beach Hotel",
        nameAr: "فندق شاطئ صحار",
        operator: "Private",
        lat: 24.364512,
        lng: 56.746321,
        chargerType: "AC",
        powerKw: 7,
        chargerCount: 2,
        availableChargers: 2,
        isFree: true,
        priceText: "Free for guests",
        city: "Sohar",
        cityAr: "صحار",
        address: "Sohar Beach",
        status: "OPERATIONAL"
      },
      {
        name: "Salalah Gardens Mall",
        nameAr: "صلالة جاردنز مول",
        operator: "Recharge",
        lat: 17.019283,
        lng: 54.062341,
        chargerType: "AC",
        powerKw: 22,
        chargerCount: 3,
        availableChargers: 1,
        isFree: true,
        priceText: "Free",
        city: "Salalah",
        cityAr: "صلالة",
        address: "Salalah",
        status: "OPERATIONAL"
      },
      {
        name: "Nizwa Grand Mall",
        nameAr: "ننزوى جراند مول",
        operator: "Oman Oil",
        lat: 22.912345,
        lng: 57.543210,
        chargerType: "DC",
        powerKw: 50,
        chargerCount: 2,
        availableChargers: 2,
        isFree: false,
        priceText: "0.100 OMR/kWh",
        city: "Nizwa",
        cityAr: "نزوى",
        address: "Firq, Nizwa",
        status: "OPERATIONAL"
      },
      {
        name: "Al Mouj Muscat",
        nameAr: "الموج مسقط",
        operator: "Al Mouj",
        lat: 23.634567,
        lng: 58.281234,
        chargerType: "AC",
        powerKw: 22,
        chargerCount: 4,
        availableChargers: 3,
        isFree: true,
        priceText: "Free",
        city: "Muscat",
        cityAr: "مسقط",
        address: "The Walk, Al Mouj",
        status: "OPERATIONAL"
      }
    ];

    await db.insert(stations).values(seedStations);

    const existingVehicles = await this.getVehicles();
    if (existingVehicles.length === 0) {
      const seedVehicles: InsertEvVehicle[] = [
        { brand: "BYD", model: "Atto 3", brandAr: "بي واي دي", modelAr: "أتو 3", batteryCapacityKwh: 60.5, chargerType: "CCS", maxChargingPowerKw: 80 },
        { brand: "BYD", model: "Seal", brandAr: "بي واي دي", modelAr: "سيل", batteryCapacityKwh: 82.5, chargerType: "CCS", maxChargingPowerKw: 150 },
        { brand: "BYD", model: "Dolphin", brandAr: "بي واي دي", modelAr: "دولفين", batteryCapacityKwh: 44.9, chargerType: "CCS", maxChargingPowerKw: 60 },
        { brand: "BYD", model: "Han", brandAr: "بي واي دي", modelAr: "هان", batteryCapacityKwh: 85.4, chargerType: "CCS", maxChargingPowerKw: 120 },
        { brand: "BYD", model: "Tang", brandAr: "بي واي دي", modelAr: "تانج", batteryCapacityKwh: 86.4, chargerType: "CCS", maxChargingPowerKw: 110 },
        { brand: "Tesla", model: "Model 3", brandAr: "تيسلا", modelAr: "موديل 3", batteryCapacityKwh: 60, chargerType: "CCS", maxChargingPowerKw: 170 },
        { brand: "Tesla", model: "Model Y", brandAr: "تيسلا", modelAr: "موديل واي", batteryCapacityKwh: 75, chargerType: "CCS", maxChargingPowerKw: 250 },
        { brand: "Tesla", model: "Model S", brandAr: "تيسلا", modelAr: "موديل إس", batteryCapacityKwh: 100, chargerType: "CCS", maxChargingPowerKw: 250 },
        { brand: "Nissan", model: "Leaf", brandAr: "نيسان", modelAr: "ليف", batteryCapacityKwh: 40, chargerType: "CHAdeMO", maxChargingPowerKw: 50 },
        { brand: "BMW", model: "iX3", brandAr: "بي إم دبليو", modelAr: "آي إكس 3", batteryCapacityKwh: 80, chargerType: "CCS", maxChargingPowerKw: 150 },
        { brand: "BMW", model: "i4", brandAr: "بي إم دبليو", modelAr: "آي 4", batteryCapacityKwh: 83.9, chargerType: "CCS", maxChargingPowerKw: 200 },
        { brand: "Mercedes", model: "EQS", brandAr: "مرسيدس", modelAr: "إي كيو إس", batteryCapacityKwh: 107.8, chargerType: "CCS", maxChargingPowerKw: 200 },
        { brand: "Mercedes", model: "EQE", brandAr: "مرسيدس", modelAr: "إي كيو إي", batteryCapacityKwh: 90.6, chargerType: "CCS", maxChargingPowerKw: 170 },
        { brand: "Audi", model: "e-tron", brandAr: "أودي", modelAr: "إي ترون", batteryCapacityKwh: 95, chargerType: "CCS", maxChargingPowerKw: 150 },
        { brand: "Porsche", model: "Taycan", brandAr: "بورش", modelAr: "تايكان", batteryCapacityKwh: 93.4, chargerType: "CCS", maxChargingPowerKw: 270 },
        { brand: "Hyundai", model: "Ioniq 5", brandAr: "هيونداي", modelAr: "أيونيك 5", batteryCapacityKwh: 77.4, chargerType: "CCS", maxChargingPowerKw: 220 },
        { brand: "Hyundai", model: "Ioniq 6", brandAr: "هيونداي", modelAr: "أيونيك 6", batteryCapacityKwh: 77.4, chargerType: "CCS", maxChargingPowerKw: 220 },
        { brand: "Kia", model: "EV6", brandAr: "كيا", modelAr: "إي في 6", batteryCapacityKwh: 77.4, chargerType: "CCS", maxChargingPowerKw: 240 },
        { brand: "Volkswagen", model: "ID.4", brandAr: "فولكس فاجن", modelAr: "آي دي 4", batteryCapacityKwh: 77, chargerType: "CCS", maxChargingPowerKw: 135 },
        { brand: "MG", model: "ZS EV", brandAr: "إم جي", modelAr: "زد إس", batteryCapacityKwh: 50.3, chargerType: "CCS", maxChargingPowerKw: 76 },
      ];
      await db.insert(evVehicles).values(seedVehicles);
    }

    console.log("Database seeded successfully");
  }

  // Tesla Connector methods
  async createTeslaConnector(connector: InsertTeslaConnector): Promise<TeslaConnector> {
    const [newConnector] = await db.insert(teslaConnectors).values(connector).returning();
    return newConnector;
  }

  async getTeslaConnector(id: number): Promise<TeslaConnector | undefined> {
    const [connector] = await db.select().from(teslaConnectors).where(eq(teslaConnectors.id, id));
    return connector;
  }

  async getTeslaConnectorByToken(deviceToken: string): Promise<TeslaConnector | undefined> {
    const [connector] = await db.select().from(teslaConnectors).where(eq(teslaConnectors.deviceToken, deviceToken));
    return connector;
  }

  async getUserTeslaConnectors(userId: string): Promise<TeslaConnector[]> {
    return await db.select().from(teslaConnectors).where(eq(teslaConnectors.userId, userId));
  }

  async getStationTeslaConnectors(stationId: number): Promise<TeslaConnector[]> {
    return await db.select().from(teslaConnectors).where(eq(teslaConnectors.stationId, stationId));
  }

  async updateTeslaConnector(id: number, data: Partial<TeslaConnector>): Promise<TeslaConnector | undefined> {
    const [updated] = await db.update(teslaConnectors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(teslaConnectors.id, id))
      .returning();
    return updated;
  }

  async deleteTeslaConnector(id: number): Promise<void> {
    await db.delete(teslaConnectors).where(eq(teslaConnectors.id, id));
  }

  async createChargingSession(session: InsertChargingSession): Promise<ChargingSession> {
    const [newSession] = await db.insert(chargingSessions).values(session).returning();
    return newSession;
  }

  async getStaleAutoTrackedSessions(staleHours: number): Promise<ChargingSession[]> {
    const staleThreshold = new Date(Date.now() - staleHours * 60 * 60 * 1000);
    const sessions = await db.select()
      .from(chargingSessions)
      .where(and(
        eq(chargingSessions.isActive, true),
        eq(chargingSessions.isAutoTracked, true),
        isNotNull(chargingSessions.teslaConnectorId)
      ));
    
    // Filter sessions where the connector hasn't been updated recently
    const staleSessions: ChargingSession[] = [];
    for (const session of sessions) {
      if (session.teslaConnectorId) {
        const connector = await this.getTeslaConnector(session.teslaConnectorId);
        if (connector && connector.lastSeen && connector.lastSeen < staleThreshold) {
          staleSessions.push(session);
        }
      }
    }
    return staleSessions;
  }

  async getConnectorsWithStaleSessions(): Promise<TeslaConnector[]> {
    const connectors = await db.select()
      .from(teslaConnectors)
      .where(isNotNull(teslaConnectors.currentSessionId));
    return connectors;
  }
}

export const storage = new DatabaseStorage();
