import {
  stations, reports, chargingSessions,
  type Station, type InsertStation,
  type Report, type InsertReport,
  type ChargingSession, type InsertChargingSession
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
  startChargingSession(stationId: number, batteryStartPercent?: number): Promise<ChargingSession>;
  endChargingSession(sessionId: number, batteryEndPercent?: number, energyKwh?: number): Promise<ChargingSession | undefined>;
  getChargingSessions(stationId?: number): Promise<ChargingSession[]>;
  getActiveSession(stationId: number): Promise<ChargingSession | undefined>;
  getSessionById(sessionId: number): Promise<ChargingSession | undefined>;
  deleteSession(sessionId: number): Promise<void>;
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
      .set({ availableChargers })
      .where(eq(stations.id, id))
      .returning();
    return updated;
  }

  async updateStationStatus(id: number, status: string): Promise<Station | undefined> {
    const [updated] = await db.update(stations)
      .set({ status })
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

  async startChargingSession(stationId: number, batteryStartPercent?: number): Promise<ChargingSession> {
    const [session] = await db.insert(chargingSessions).values({
      stationId,
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
      })
      .where(eq(chargingSessions.id, sessionId))
      .returning();
    return updated;
  }

  async getChargingSessions(stationId?: number): Promise<ChargingSession[]> {
    if (stationId) {
      return await db.select()
        .from(chargingSessions)
        .where(eq(chargingSessions.stationId, stationId))
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
    console.log("Database seeded successfully");
  }
}

export const storage = new DatabaseStorage();
