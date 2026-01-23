/**
 * Data Export Feature for Academic Research
 * 
 * Comprehensive admin-only CSV export functionality for research purposes.
 * Includes user analytics, charging patterns, station metrics, and verification data.
 */

import { db } from "../db";
import { stations, reports, chargingSessions, stationVerifications, users } from "@shared/schema";
import { eq, sql, count, sum, desc } from "drizzle-orm";
import { calculateTrustScore, isTrustScoreEnabled } from "../features/trustScore";
import type { Response } from "express";

// Format date for CSV (ISO 8601)
function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString();
}

// Escape CSV field (handle commas, quotes, newlines)
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Generate CSV row
function toCSVRow(values: any[]): string {
  return values.map(escapeCSV).join(",") + "\n";
}

/**
 * Export stations dataset with comprehensive metrics
 */
export async function exportStationsCSV(res: Response): Promise<void> {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="bariq_stations_dataset.csv"');
  
  const headers = [
    "station_id",
    "name_en",
    "name_ar",
    "operator",
    "city",
    "city_ar",
    "latitude",
    "longitude",
    "charger_type",
    "power_kw",
    "charger_count",
    "station_type",
    "is_free",
    "status",
    "trust_level",
    "trust_score",
    "total_sessions",
    "total_energy_kwh",
    "total_reports",
    "total_verifications",
    "working_votes",
    "not_working_votes",
    "busy_votes",
    "created_at"
  ];
  res.write(toCSVRow(headers));

  const stationsData = await db
    .select()
    .from(stations)
    .where(eq(stations.approvalStatus, "APPROVED"));

  for (const station of stationsData) {
    // Count and sum sessions
    const sessionStats = await db
      .select({
        count: count(),
        totalEnergy: sum(chargingSessions.energyKwh)
      })
      .from(chargingSessions)
      .where(eq(chargingSessions.stationId, station.id));

    // Count reports
    const reportCount = await db
      .select({ count: count() })
      .from(reports)
      .where(eq(reports.stationId, station.id));

    // Count verifications by vote type
    const verifications = await db
      .select()
      .from(stationVerifications)
      .where(eq(stationVerifications.stationId, station.id));
    
    const workingVotes = verifications.filter(v => v.vote === "WORKING").length;
    const notWorkingVotes = verifications.filter(v => v.vote === "NOT_WORKING").length;
    const busyVotes = verifications.filter(v => v.vote === "BUSY").length;

    let trustScore: number | null = null;
    if (isTrustScoreEnabled()) {
      const scoreData = await calculateTrustScore(station.id);
      trustScore = scoreData?.score ?? null;
    }

    const row = [
      station.id,
      station.name,
      station.nameAr,
      station.operator ?? "",
      station.city,
      station.cityAr,
      station.lat,
      station.lng,
      station.chargerType,
      station.powerKw ?? "",
      station.chargerCount ?? 1,
      station.stationType ?? "PUBLIC",
      station.isFree ? "true" : "false",
      station.status ?? "OPERATIONAL",
      station.trustLevel ?? "NORMAL",
      trustScore ?? "",
      sessionStats[0]?.count || 0,
      sessionStats[0]?.totalEnergy || 0,
      reportCount[0]?.count || 0,
      verifications.length,
      workingVotes,
      notWorkingVotes,
      busyVotes,
      formatDate(station.createdAt)
    ];
    res.write(toCSVRow(row));
  }

  res.end();
}

/**
 * Export charging sessions with full details
 */
export async function exportChargingSessionsCSV(res: Response): Promise<void> {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="bariq_charging_sessions_dataset.csv"');
  
  const headers = [
    "session_id",
    "user_email",
    "station_id",
    "station_name",
    "station_city",
    "start_time",
    "end_time",
    "duration_minutes",
    "energy_kwh",
    "battery_start_percent",
    "battery_end_percent",
    "has_screenshot",
    "created_at"
  ];
  res.write(toCSVRow(headers));

  const sessionsData = await db
    .select({
      session: chargingSessions,
      user: users,
      station: stations
    })
    .from(chargingSessions)
    .leftJoin(users, eq(chargingSessions.userId, users.id))
    .leftJoin(stations, eq(chargingSessions.stationId, stations.id))
    .orderBy(desc(chargingSessions.createdAt));

  for (const { session, user, station } of sessionsData) {
    let durationMinutes = session.durationMinutes;
    if (!durationMinutes && session.startTime && session.endTime) {
      const start = new Date(session.startTime).getTime();
      const end = new Date(session.endTime).getTime();
      durationMinutes = Math.round((end - start) / (1000 * 60));
    }

    const row = [
      session.id,
      user?.email ?? "",
      session.stationId,
      station?.name ?? "",
      station?.city ?? "",
      formatDate(session.startTime),
      formatDate(session.endTime),
      durationMinutes ?? "",
      session.energyKwh ?? "",
      session.batteryStartPercent ?? "",
      session.batteryEndPercent ?? "",
      session.screenshotPath ? "true" : "false",
      formatDate(session.createdAt)
    ];
    res.write(toCSVRow(row));
  }

  res.end();
}

/**
 * Export reports with resolution status
 */
export async function exportReportsCSV(res: Response): Promise<void> {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="bariq_reports_dataset.csv"');
  
  const headers = [
    "report_id",
    "station_id",
    "station_name",
    "reporter_email",
    "report_status",
    "report_reason",
    "review_status",
    "created_at",
    "reviewed_at"
  ];
  res.write(toCSVRow(headers));

  const reportsData = await db
    .select({
      report: reports,
      user: users,
      station: stations
    })
    .from(reports)
    .leftJoin(users, eq(reports.userId, users.id))
    .leftJoin(stations, eq(reports.stationId, stations.id))
    .orderBy(desc(reports.createdAt));

  for (const { report, user, station } of reportsData) {
    const row = [
      report.id,
      report.stationId,
      station?.name ?? "",
      user?.email ?? "",
      report.status,
      report.reason ?? "",
      report.reviewStatus ?? "open",
      formatDate(report.createdAt),
      formatDate(report.reviewedAt)
    ];
    res.write(toCSVRow(row));
  }

  res.end();
}

/**
 * Export user analytics with charging behavior
 */
export async function exportUsersCSV(res: Response): Promise<void> {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="bariq_users_dataset.csv"');
  
  const headers = [
    "user_id",
    "email",
    "first_name",
    "provider",
    "trust_score",
    "trust_level",
    "total_sessions",
    "total_energy_kwh",
    "avg_session_duration_min",
    "total_reports",
    "total_verifications",
    "unique_stations_used",
    "favorite_station_id",
    "favorite_station_name",
    "created_at",
    "last_activity"
  ];
  res.write(toCSVRow(headers));

  const usersData = await db.select().from(users).orderBy(desc(users.createdAt));

  for (const user of usersData) {
    // Session statistics
    const sessionStats = await db
      .select({
        count: count(),
        totalEnergy: sum(chargingSessions.energyKwh),
        avgDuration: sql<number>`AVG(${chargingSessions.durationMinutes})`
      })
      .from(chargingSessions)
      .where(eq(chargingSessions.userId, user.id));

    // Unique stations used
    const uniqueStations = await db
      .select({ stationId: chargingSessions.stationId })
      .from(chargingSessions)
      .where(eq(chargingSessions.userId, user.id))
      .groupBy(chargingSessions.stationId);

    // Favorite station (most used)
    const favoriteStation = await db
      .select({
        stationId: chargingSessions.stationId,
        count: count()
      })
      .from(chargingSessions)
      .where(eq(chargingSessions.userId, user.id))
      .groupBy(chargingSessions.stationId)
      .orderBy(desc(count()))
      .limit(1);

    let favoriteStationName = "";
    if (favoriteStation[0]?.stationId) {
      const stationData = await db
        .select({ name: stations.name })
        .from(stations)
        .where(eq(stations.id, favoriteStation[0].stationId))
        .limit(1);
      favoriteStationName = stationData[0]?.name ?? "";
    }

    // Reports count
    const reportCount = await db
      .select({ count: count() })
      .from(reports)
      .where(eq(reports.userId, user.id));

    // Verifications count
    const verificationCount = await db
      .select({ count: count() })
      .from(stationVerifications)
      .where(eq(stationVerifications.userId, user.id));

    // Last activity
    const lastSession = await db
      .select({ createdAt: chargingSessions.createdAt })
      .from(chargingSessions)
      .where(eq(chargingSessions.userId, user.id))
      .orderBy(desc(chargingSessions.createdAt))
      .limit(1);

    const row = [
      user.id.substring(0, 8), // Partial ID for privacy in research
      user.email ?? "",
      user.firstName ?? "",
      user.provider ?? "local",
      user.trustScore ?? 0,
      user.userTrustLevel ?? "NEW",
      sessionStats[0]?.count || 0,
      sessionStats[0]?.totalEnergy || 0,
      Math.round(Number(sessionStats[0]?.avgDuration) || 0),
      reportCount[0]?.count || 0,
      verificationCount[0]?.count || 0,
      uniqueStations.length,
      favoriteStation[0]?.stationId ?? "",
      favoriteStationName,
      formatDate(user.createdAt),
      formatDate(lastSession[0]?.createdAt)
    ];
    res.write(toCSVRow(row));
  }

  res.end();
}

/**
 * Export verification votes with temporal patterns
 */
export async function exportVerificationsCSV(res: Response): Promise<void> {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="bariq_verifications_dataset.csv"');
  
  const headers = [
    "verification_id",
    "station_id",
    "station_name",
    "station_city",
    "voter_email",
    "voter_trust_level",
    "vote",
    "day_of_week",
    "hour_of_day",
    "created_at"
  ];
  res.write(toCSVRow(headers));

  const verificationsData = await db
    .select({
      verification: stationVerifications,
      user: users,
      station: stations
    })
    .from(stationVerifications)
    .leftJoin(users, eq(stationVerifications.userId, users.id))
    .leftJoin(stations, eq(stationVerifications.stationId, stations.id))
    .orderBy(desc(stationVerifications.createdAt));

  for (const { verification, user, station } of verificationsData) {
    const createdAt = verification.createdAt ? new Date(verification.createdAt) : null;
    
    const row = [
      verification.id,
      verification.stationId,
      station?.name ?? "",
      station?.city ?? "",
      user?.email ?? "",
      user?.userTrustLevel ?? "NEW",
      verification.vote,
      createdAt ? createdAt.getDay() : "", // 0=Sunday, 6=Saturday
      createdAt ? createdAt.getHours() : "",
      formatDate(verification.createdAt)
    ];
    res.write(toCSVRow(row));
  }

  res.end();
}

/**
 * Export summary statistics for quick overview
 */
export async function exportSummaryCSV(res: Response): Promise<void> {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="bariq_summary_statistics.csv"');
  
  const headers = ["metric", "value", "description"];
  res.write(toCSVRow(headers));

  // Total users
  const totalUsers = await db.select({ count: count() }).from(users);
  res.write(toCSVRow(["total_users", totalUsers[0]?.count || 0, "Total registered users"]));

  // Total stations
  const totalStations = await db.select({ count: count() }).from(stations).where(eq(stations.approvalStatus, "APPROVED"));
  res.write(toCSVRow(["total_stations", totalStations[0]?.count || 0, "Total approved charging stations"]));

  // Total sessions
  const totalSessions = await db.select({ count: count() }).from(chargingSessions);
  res.write(toCSVRow(["total_sessions", totalSessions[0]?.count || 0, "Total charging sessions"]));

  // Total energy
  const totalEnergy = await db.select({ sum: sum(chargingSessions.energyKwh) }).from(chargingSessions);
  res.write(toCSVRow(["total_energy_kwh", totalEnergy[0]?.sum || 0, "Total energy delivered (kWh)"]));

  // Total reports
  const totalReports = await db.select({ count: count() }).from(reports);
  res.write(toCSVRow(["total_reports", totalReports[0]?.count || 0, "Total station reports"]));

  // Total verifications
  const totalVerifications = await db.select({ count: count() }).from(stationVerifications);
  res.write(toCSVRow(["total_verifications", totalVerifications[0]?.count || 0, "Total verification votes"]));

  // Trusted users
  const trustedUsers = await db.select({ count: count() }).from(users).where(eq(users.userTrustLevel, "TRUSTED"));
  res.write(toCSVRow(["trusted_users", trustedUsers[0]?.count || 0, "Users with TRUSTED level"]));

  // Average session duration
  const avgDuration = await db.select({ avg: sql<number>`AVG(${chargingSessions.durationMinutes})` }).from(chargingSessions);
  res.write(toCSVRow(["avg_session_duration_min", Math.round(Number(avgDuration[0]?.avg) || 0), "Average charging session duration (minutes)"]));

  // Stations by type
  const acStations = await db.select({ count: count() }).from(stations).where(eq(stations.chargerType, "AC"));
  res.write(toCSVRow(["ac_stations", acStations[0]?.count || 0, "AC charging stations"]));

  const dcStations = await db.select({ count: count() }).from(stations).where(eq(stations.chargerType, "DC"));
  res.write(toCSVRow(["dc_stations", dcStations[0]?.count || 0, "DC fast charging stations"]));

  res.end();
}

/**
 * Export temporal patterns analysis - hourly and daily charging patterns
 */
export async function exportTemporalPatternsCSV(res: Response): Promise<void> {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="bariq_temporal_patterns.csv"');
  
  const headers = [
    "hour_of_day",
    "day_of_week",
    "total_sessions",
    "total_energy_kwh",
    "avg_duration_min",
    "avg_energy_kwh",
    "total_verifications",
    "working_votes",
    "not_working_votes"
  ];
  res.write(toCSVRow(headers));

  // Get all sessions with timestamps
  const sessionsData = await db.select().from(chargingSessions);
  const verificationsData = await db.select().from(stationVerifications);

  // Create hourly-daily matrix (24 hours x 7 days)
  const matrix: Record<string, {
    sessions: number;
    energy: number;
    duration: number;
    verifications: number;
    working: number;
    notWorking: number;
  }> = {};

  // Initialize matrix
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      matrix[`${hour}-${day}`] = {
        sessions: 0,
        energy: 0,
        duration: 0,
        verifications: 0,
        working: 0,
        notWorking: 0
      };
    }
  }

  // Populate sessions data
  for (const session of sessionsData) {
    if (session.startTime) {
      const date = new Date(session.startTime);
      const key = `${date.getHours()}-${date.getDay()}`;
      if (matrix[key]) {
        matrix[key].sessions++;
        matrix[key].energy += session.energyKwh || 0;
        matrix[key].duration += session.durationMinutes || 0;
      }
    }
  }

  // Populate verifications data
  for (const verification of verificationsData) {
    if (verification.createdAt) {
      const date = new Date(verification.createdAt);
      const key = `${date.getHours()}-${date.getDay()}`;
      if (matrix[key]) {
        matrix[key].verifications++;
        if (verification.vote === "WORKING") matrix[key].working++;
        if (verification.vote === "NOT_WORKING") matrix[key].notWorking++;
      }
    }
  }

  // Write rows
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const data = matrix[`${hour}-${day}`];
      const row = [
        hour,
        day, // 0=Sunday, 6=Saturday
        data.sessions,
        data.energy.toFixed(2),
        data.sessions > 0 ? (data.duration / data.sessions).toFixed(1) : 0,
        data.sessions > 0 ? (data.energy / data.sessions).toFixed(2) : 0,
        data.verifications,
        data.working,
        data.notWorking
      ];
      res.write(toCSVRow(row));
    }
  }

  res.end();
}

/**
 * Export geographic analysis - station distribution by city
 */
export async function exportGeographicAnalysisCSV(res: Response): Promise<void> {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="bariq_geographic_analysis.csv"');
  
  const headers = [
    "city",
    "city_ar",
    "total_stations",
    "ac_stations",
    "dc_stations",
    "both_type_stations",
    "total_power_kw",
    "avg_power_kw",
    "total_chargers",
    "total_sessions",
    "total_energy_kwh",
    "operational_stations",
    "offline_stations",
    "free_stations",
    "paid_stations"
  ];
  res.write(toCSVRow(headers));

  // Get all approved stations
  const stationsData = await db
    .select()
    .from(stations)
    .where(eq(stations.approvalStatus, "APPROVED"));

  // Group by city
  const cityStats: Record<string, {
    cityAr: string;
    total: number;
    ac: number;
    dc: number;
    both: number;
    totalPower: number;
    totalChargers: number;
    operational: number;
    offline: number;
    free: number;
    paid: number;
    stationIds: number[];
  }> = {};

  for (const station of stationsData) {
    const city = station.city;
    if (!cityStats[city]) {
      cityStats[city] = {
        cityAr: station.cityAr,
        total: 0,
        ac: 0,
        dc: 0,
        both: 0,
        totalPower: 0,
        totalChargers: 0,
        operational: 0,
        offline: 0,
        free: 0,
        paid: 0,
        stationIds: []
      };
    }

    cityStats[city].total++;
    cityStats[city].stationIds.push(station.id);
    cityStats[city].totalPower += station.powerKw || 0;
    cityStats[city].totalChargers += station.chargerCount || 1;

    if (station.chargerType === "AC") cityStats[city].ac++;
    else if (station.chargerType === "DC") cityStats[city].dc++;
    else if (station.chargerType === "Both") cityStats[city].both++;

    if (station.status === "OPERATIONAL") cityStats[city].operational++;
    else cityStats[city].offline++;

    if (station.isFree) cityStats[city].free++;
    else cityStats[city].paid++;
  }

  // Batch query: Get session stats per station in one query
  const allSessionStats = await db
    .select({
      stationId: chargingSessions.stationId,
      count: count(),
      energy: sum(chargingSessions.energyKwh)
    })
    .from(chargingSessions)
    .groupBy(chargingSessions.stationId);

  // Map session stats by stationId
  const sessionStatsMap: Record<number, { count: number; energy: number }> = {};
  for (const stat of allSessionStats) {
    sessionStatsMap[stat.stationId] = {
      count: Number(stat.count) || 0,
      energy: Number(stat.energy) || 0
    };
  }

  // Write rows using pre-fetched data
  for (const city of Object.keys(cityStats)) {
    const stats = cityStats[city];
    
    // Sum sessions and energy from pre-fetched map
    let totalSessions = 0;
    let totalEnergy = 0;
    for (const stationId of stats.stationIds) {
      const stationStats = sessionStatsMap[stationId];
      if (stationStats) {
        totalSessions += stationStats.count;
        totalEnergy += stationStats.energy;
      }
    }

    const row = [
      city,
      stats.cityAr,
      stats.total,
      stats.ac,
      stats.dc,
      stats.both,
      stats.totalPower.toFixed(1),
      stats.total > 0 ? (stats.totalPower / stats.total).toFixed(1) : 0,
      stats.totalChargers,
      totalSessions,
      totalEnergy.toFixed(2),
      stats.operational,
      stats.offline,
      stats.free,
      stats.paid
    ];
    res.write(toCSVRow(row));
  }

  res.end();
}

/**
 * Export user behavior patterns - engagement and activity metrics
 * Optimized with batch queries to avoid N+1 performance issues
 */
export async function exportUserBehaviorCSV(res: Response): Promise<void> {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="bariq_user_behavior.csv"');
  
  const headers = [
    "user_id",
    "email",
    "days_since_registration",
    "days_since_last_activity",
    "total_sessions",
    "sessions_per_month",
    "total_energy_kwh",
    "avg_session_energy_kwh",
    "total_verifications",
    "verification_accuracy_rate",
    "total_reports",
    "resolved_reports",
    "preferred_charger_type",
    "preferred_time_of_day",
    "engagement_score"
  ];
  res.write(toCSVRow(headers));

  const now = new Date();

  // Batch fetch all data
  const usersData = await db.select().from(users);
  const allSessions = await db
    .select({
      session: chargingSessions,
      station: stations
    })
    .from(chargingSessions)
    .leftJoin(stations, eq(chargingSessions.stationId, stations.id));
  const allVerifications = await db
    .select({
      verification: stationVerifications,
      station: stations
    })
    .from(stationVerifications)
    .leftJoin(stations, eq(stationVerifications.stationId, stations.id));
  const allReports = await db.select().from(reports);

  // Group data by userId
  const sessionsByUser: Record<string, typeof allSessions> = {};
  const verificationsByUser: Record<string, typeof allVerifications> = {};
  const reportsByUser: Record<string, typeof allReports> = {};

  for (const sessionData of allSessions) {
    const userId = sessionData.session.userId;
    if (userId) {
      if (!sessionsByUser[userId]) sessionsByUser[userId] = [];
      sessionsByUser[userId].push(sessionData);
    }
  }

  for (const verificationData of allVerifications) {
    const userId = verificationData.verification.userId;
    if (!verificationsByUser[userId]) verificationsByUser[userId] = [];
    verificationsByUser[userId].push(verificationData);
  }

  for (const report of allReports) {
    const userId = report.userId;
    if (userId) {
      if (!reportsByUser[userId]) reportsByUser[userId] = [];
      reportsByUser[userId].push(report);
    }
  }

  // Process each user
  for (const user of usersData) {
    const userSessions = sessionsByUser[user.id] || [];
    const userVerifications = verificationsByUser[user.id] || [];
    const userReports = reportsByUser[user.id] || [];

    // Calculate metrics
    const daysSinceReg = user.createdAt 
      ? Math.floor((now.getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    let lastActivity = user.createdAt;
    for (const { session } of userSessions) {
      if (session.createdAt && (!lastActivity || new Date(session.createdAt) > new Date(lastActivity))) {
        lastActivity = session.createdAt;
      }
    }
    const daysSinceLastActivity = lastActivity
      ? Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
      : daysSinceReg;

    const totalEnergy = userSessions.reduce((sum, { session }) => sum + (session.energyKwh || 0), 0);
    const avgEnergy = userSessions.length > 0 ? totalEnergy / userSessions.length : 0;
    const sessionsPerMonth = daysSinceReg > 0 ? (userSessions.length / daysSinceReg) * 30 : 0;

    // Verification accuracy (compare vote to current station status using pre-fetched data)
    let accurateVotes = 0;
    for (const { verification, station } of userVerifications) {
      if (station) {
        const isAccurate = 
          (verification.vote === "WORKING" && station.status === "OPERATIONAL") ||
          (verification.vote === "NOT_WORKING" && station.status === "OFFLINE");
        if (isAccurate) accurateVotes++;
      }
    }
    const accuracyRate = userVerifications.length > 0 ? (accurateVotes / userVerifications.length) : 0;

    const resolvedReports = userReports.filter(r => r.reviewStatus === "resolved").length;

    // Preferred charger type (using pre-fetched station data)
    const chargerTypes: Record<string, number> = {};
    for (const { station } of userSessions) {
      const type = station?.chargerType || "Unknown";
      chargerTypes[type] = (chargerTypes[type] || 0) + 1;
    }
    const preferredType = Object.entries(chargerTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

    // Preferred time (most common hour)
    const hourCounts: Record<number, number> = {};
    for (const { session } of userSessions) {
      if (session.startTime) {
        const hour = new Date(session.startTime).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    }
    const preferredHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

    // Engagement score (0-100)
    const engagementScore = Math.min(100, Math.round(
      (userSessions.length * 5) +
      (userVerifications.length * 3) +
      (userReports.length * 2) +
      (accuracyRate * 20) +
      (user.trustScore || 0)
    ));

    const row = [
      user.id.substring(0, 8),
      user.email ?? "",
      daysSinceReg,
      daysSinceLastActivity,
      userSessions.length,
      sessionsPerMonth.toFixed(2),
      totalEnergy.toFixed(2),
      avgEnergy.toFixed(2),
      userVerifications.length,
      (accuracyRate * 100).toFixed(1) + "%",
      userReports.length,
      resolvedReports,
      preferredType,
      preferredHour,
      engagementScore
    ];
    res.write(toCSVRow(row));
  }

  res.end();
}

/**
 * Export reliability metrics - station reliability and trust analysis
 * Optimized with batch queries to avoid N+1 performance issues
 */
export async function exportReliabilityMetricsCSV(res: Response): Promise<void> {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="bariq_reliability_metrics.csv"');
  
  const headers = [
    "station_id",
    "station_name",
    "city",
    "current_status",
    "trust_level",
    "total_verifications",
    "working_votes",
    "not_working_votes",
    "busy_votes",
    "working_rate",
    "status_changes_count",
    "avg_verification_confidence",
    "total_reports",
    "resolved_reports",
    "report_resolution_rate",
    "reliability_score"
  ];
  res.write(toCSVRow(headers));

  // Batch fetch all data
  const stationsData = await db
    .select()
    .from(stations)
    .where(eq(stations.approvalStatus, "APPROVED"));
  const allVerifications = await db.select().from(stationVerifications);
  const allReports = await db.select().from(reports);

  // Group verifications by stationId
  const verificationsByStation: Record<number, typeof allVerifications> = {};
  for (const verification of allVerifications) {
    if (!verificationsByStation[verification.stationId]) {
      verificationsByStation[verification.stationId] = [];
    }
    verificationsByStation[verification.stationId].push(verification);
  }

  // Group reports by stationId
  const reportsByStation: Record<number, typeof allReports> = {};
  for (const report of allReports) {
    if (!reportsByStation[report.stationId]) {
      reportsByStation[report.stationId] = [];
    }
    reportsByStation[report.stationId].push(report);
  }

  // Process each station
  for (const station of stationsData) {
    const verifications = verificationsByStation[station.id] || [];
    const stationReports = reportsByStation[station.id] || [];

    const workingVotes = verifications.filter(v => v.vote === "WORKING").length;
    const notWorkingVotes = verifications.filter(v => v.vote === "NOT_WORKING").length;
    const busyVotes = verifications.filter(v => v.vote === "BUSY").length;
    const workingRate = verifications.length > 0 
      ? workingVotes / verifications.length 
      : 0;

    const resolvedReports = stationReports.filter(r => r.reviewStatus === "resolved").length;
    const resolutionRate = stationReports.length > 0 
      ? resolvedReports / stationReports.length 
      : 1; // 100% if no reports

    // Calculate confidence (how consistent are the votes)
    const totalVotes = workingVotes + notWorkingVotes + busyVotes;
    const maxVoteType = Math.max(workingVotes, notWorkingVotes, busyVotes);
    const confidence = totalVotes > 0 ? maxVoteType / totalVotes : 0;

    // Reliability score (0-100)
    const reliabilityScore = Math.round(
      (workingRate * 40) +
      (resolutionRate * 20) +
      (confidence * 20) +
      (station.trustLevel === "HIGH" ? 20 : station.trustLevel === "NORMAL" ? 10 : 0)
    );

    const row = [
      station.id,
      station.name,
      station.city,
      station.status ?? "OPERATIONAL",
      station.trustLevel ?? "NORMAL",
      verifications.length,
      workingVotes,
      notWorkingVotes,
      busyVotes,
      (workingRate * 100).toFixed(1) + "%",
      0, // status_changes_count placeholder (requires historical data)
      (confidence * 100).toFixed(1) + "%",
      stationReports.length,
      resolvedReports,
      (resolutionRate * 100).toFixed(1) + "%",
      reliabilityScore
    ];
    res.write(toCSVRow(row));
  }

  res.end();
}

/**
 * Get available datasets for export with descriptions
 */
export function getAvailableDatasets() {
  return {
    datasets: [
      {
        id: "summary",
        name: "Summary Statistics",
        nameAr: "إحصائيات ملخصة",
        description: "Quick overview of all platform metrics",
        descriptionAr: "نظرة عامة سريعة على جميع مقاييس المنصة",
        icon: "BarChart3",
        fields: ["metric", "value", "description"],
        recordCount: "~10 metrics",
        category: "primary"
      },
      {
        id: "users",
        name: "Users Dataset",
        nameAr: "بيانات المستخدمين",
        description: "User profiles with charging behavior analytics",
        descriptionAr: "ملفات المستخدمين مع تحليلات سلوك الشحن",
        icon: "Users",
        fields: ["user_id", "email", "trust_score", "total_sessions", "total_energy_kwh", "unique_stations_used", "favorite_station"],
        recordCount: "All users",
        category: "primary"
      },
      {
        id: "stations",
        name: "Stations Dataset",
        nameAr: "بيانات المحطات",
        description: "Charging stations with location, metrics, and verification stats",
        descriptionAr: "محطات الشحن مع الموقع والمقاييس وإحصائيات التحقق",
        icon: "MapPin",
        fields: ["station_id", "name", "location", "charger_type", "power_kw", "trust_score", "total_sessions", "verifications"],
        recordCount: "All approved stations",
        category: "primary"
      },
      {
        id: "sessions",
        name: "Charging Sessions",
        nameAr: "جلسات الشحن",
        description: "Detailed charging session records with energy and duration",
        descriptionAr: "سجلات جلسات الشحن التفصيلية مع الطاقة والمدة",
        icon: "Zap",
        fields: ["session_id", "user_email", "station", "duration", "energy_kwh", "battery_levels"],
        recordCount: "All sessions",
        category: "primary"
      },
      {
        id: "verifications",
        name: "Verification Votes",
        nameAr: "أصوات التحقق",
        description: "Community verification votes with temporal patterns",
        descriptionAr: "أصوات التحقق المجتمعية مع الأنماط الزمنية",
        icon: "CheckCircle",
        fields: ["verification_id", "station", "voter_email", "vote", "day_of_week", "hour"],
        recordCount: "All verifications",
        category: "secondary"
      },
      {
        id: "reports",
        name: "Station Reports",
        nameAr: "بلاغات المحطات",
        description: "User-submitted station issues and resolution status",
        descriptionAr: "مشاكل المحطات المقدمة من المستخدمين وحالة الحل",
        icon: "AlertTriangle",
        fields: ["report_id", "station", "reporter", "reason", "review_status"],
        recordCount: "All reports",
        category: "secondary"
      },
      {
        id: "temporal",
        name: "Temporal Patterns",
        nameAr: "الأنماط الزمنية",
        description: "Hourly and daily charging patterns analysis (24x7 matrix)",
        descriptionAr: "تحليل أنماط الشحن بالساعة واليوم (مصفوفة 24×7)",
        icon: "Clock",
        fields: ["hour_of_day", "day_of_week", "total_sessions", "total_energy_kwh", "verifications"],
        recordCount: "168 time slots",
        category: "analysis"
      },
      {
        id: "geographic",
        name: "Geographic Analysis",
        nameAr: "التحليل الجغرافي",
        description: "Station distribution and density by city",
        descriptionAr: "توزيع المحطات وكثافتها حسب المدينة",
        icon: "Globe",
        fields: ["city", "total_stations", "ac_stations", "dc_stations", "total_sessions", "total_energy_kwh"],
        recordCount: "All cities",
        category: "analysis"
      },
      {
        id: "behavior",
        name: "User Behavior",
        nameAr: "سلوك المستخدمين",
        description: "Engagement metrics and activity patterns per user",
        descriptionAr: "مقاييس المشاركة وأنماط النشاط لكل مستخدم",
        icon: "Activity",
        fields: ["user_id", "sessions_per_month", "verification_accuracy", "preferred_charger", "engagement_score"],
        recordCount: "All users",
        category: "analysis"
      },
      {
        id: "reliability",
        name: "Reliability Metrics",
        nameAr: "مقاييس الموثوقية",
        description: "Station reliability scores and trust analysis",
        descriptionAr: "درجات موثوقية المحطات وتحليل الثقة",
        icon: "TrendingUp",
        fields: ["station_id", "working_rate", "report_resolution_rate", "reliability_score"],
        recordCount: "All stations",
        category: "analysis"
      }
    ],
    researchNote: "Data exported for academic research purposes. Includes user emails for correlation analysis.",
    researchNoteAr: "البيانات مُصدَّرة لأغراض البحث الأكاديمي. تتضمن بريد المستخدمين لتحليل الارتباطات."
  };
}
