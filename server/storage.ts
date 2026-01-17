import {
  stations, reports, chargingSessions, evVehicles, userVehicles,
  type Station, type InsertStation,
  type Report, type InsertReport,
  type ChargingSession, type InsertChargingSession,
  type EvVehicle, type InsertEvVehicle,
  type UserVehicle, type InsertUserVehicle, type UserVehicleWithDetails
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ilike, or } from "drizzle-orm";

export interface IStorage {
  getStations(filters?: { search?: string; city?: string; type?: string }): Promise<Station[]>;
  getStation(id: number): Promise<Station | undefined>;
  createStation(station: InsertStation): Promise<Station>;
  updateStationAvailability(id: number, availableChargers: number): Promise<Station | undefined>;
  updateStationStatus(id: number, status: string): Promise<Station | undefined>;
  getReports(stationId: number): Promise<Report[]>;
  createReport(report: InsertReport): Promise<Report>;
  startChargingSession(stationId: number, batteryStartPercent?: number, userVehicleId?: number, userId?: string): Promise<ChargingSession>;
  endChargingSession(sessionId: number, batteryEndPercent?: number, energyKwh?: number): Promise<ChargingSession | undefined>;
  getChargingSessions(stationId?: number, userId?: string): Promise<ChargingSession[]>;
  getActiveSession(stationId: number): Promise<ChargingSession | undefined>;
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
  seed(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getStations(filters?: { search?: string; city?: string; type?: string }): Promise<Station[]> {
    let conditions = [];

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
      conditions.push(eq(stations.chargerType, filters.type));
    }

    if (conditions.length > 0) {
      return await db.select().from(stations).where(and(...conditions));
    }

    return await db.select().from(stations);
  }

  async getStation(id: number): Promise<Station | undefined> {
    const [station] = await db.select().from(stations).where(eq(stations.id, id));
    return station;
  }

  async createStation(insertStation: InsertStation): Promise<Station> {
    const [station] = await db.insert(stations).values(insertStation).returning();
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

  async getReports(stationId: number): Promise<Report[]> {
    return await db.select()
      .from(reports)
      .where(eq(reports.stationId, stationId))
      .orderBy(desc(reports.createdAt));
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const [report] = await db.insert(reports).values(insertReport).returning();
    return report;
  }

  async startChargingSession(stationId: number, batteryStartPercent?: number, userVehicleId?: number, userId?: string): Promise<ChargingSession> {
    const [session] = await db.insert(chargingSessions).values({
      stationId,
      userId,
      userVehicleId,
      batteryStartPercent,
      isActive: true,
      startTime: new Date(),
    }).returning();
    return session;
  }

  async endChargingSession(sessionId: number, batteryEndPercent?: number, energyKwh?: number): Promise<ChargingSession | undefined> {
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
        isActive: false,
        updatedAt: new Date(),
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

  async getActiveSession(stationId: number): Promise<ChargingSession | undefined> {
    const [session] = await db.select()
      .from(chargingSessions)
      .where(and(
        eq(chargingSessions.stationId, stationId),
        eq(chargingSessions.isActive, true)
      ));
    return session;
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
      const evVehicle = await this.getVehicle(uv.evVehicleId);
      result.push({ ...uv, evVehicle });
    }
    return result;
  }

  async getUserVehicle(id: number): Promise<UserVehicleWithDetails | undefined> {
    const [uv] = await db.select().from(userVehicles).where(eq(userVehicles.id, id));
    if (!uv) return undefined;
    const evVehicle = await this.getVehicle(uv.evVehicleId);
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
}

export const storage = new DatabaseStorage();
