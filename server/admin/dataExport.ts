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
        recordCount: "~10 metrics"
      },
      {
        id: "users",
        name: "Users Dataset",
        nameAr: "بيانات المستخدمين",
        description: "User profiles with charging behavior analytics",
        descriptionAr: "ملفات المستخدمين مع تحليلات سلوك الشحن",
        icon: "Users",
        fields: ["user_id", "email", "trust_score", "total_sessions", "total_energy_kwh", "unique_stations_used", "favorite_station"],
        recordCount: "All users"
      },
      {
        id: "stations",
        name: "Stations Dataset",
        nameAr: "بيانات المحطات",
        description: "Charging stations with location, metrics, and verification stats",
        descriptionAr: "محطات الشحن مع الموقع والمقاييس وإحصائيات التحقق",
        icon: "MapPin",
        fields: ["station_id", "name", "location", "charger_type", "power_kw", "trust_score", "total_sessions", "verifications"],
        recordCount: "All approved stations"
      },
      {
        id: "sessions",
        name: "Charging Sessions",
        nameAr: "جلسات الشحن",
        description: "Detailed charging session records with energy and duration",
        descriptionAr: "سجلات جلسات الشحن التفصيلية مع الطاقة والمدة",
        icon: "Zap",
        fields: ["session_id", "user_email", "station", "duration", "energy_kwh", "battery_levels"],
        recordCount: "All sessions"
      },
      {
        id: "verifications",
        name: "Verification Votes",
        nameAr: "أصوات التحقق",
        description: "Community verification votes with temporal patterns",
        descriptionAr: "أصوات التحقق المجتمعية مع الأنماط الزمنية",
        icon: "CheckCircle",
        fields: ["verification_id", "station", "voter_email", "vote", "day_of_week", "hour"],
        recordCount: "All verifications"
      },
      {
        id: "reports",
        name: "Station Reports",
        nameAr: "بلاغات المحطات",
        description: "User-submitted station issues and resolution status",
        descriptionAr: "مشاكل المحطات المقدمة من المستخدمين وحالة الحل",
        icon: "AlertTriangle",
        fields: ["report_id", "station", "reporter", "reason", "review_status"],
        recordCount: "All reports"
      }
    ],
    researchNote: "Data exported for academic research purposes. Includes user emails for correlation analysis.",
    researchNoteAr: "البيانات مُصدَّرة لأغراض البحث الأكاديمي. تتضمن بريد المستخدمين لتحليل الارتباطات."
  };
}
