/**
 * Data Export Feature for Academic Research (Master's Thesis)
 * 
 * Admin-only, read-only CSV export functionality.
 * No database modifications, no user personal data.
 * 
 * Privacy note: All exports exclude user identifiable information (emails, names).
 * User IDs are anonymized with hash prefixes for relational integrity.
 */

import { db } from "../db";
import { stations, reports, chargingSessions, stationVerifications } from "@shared/schema";
import { eq, sql, count } from "drizzle-orm";
import { calculateTrustScore, isTrustScoreEnabled } from "../features/trustScore";
import type { Response } from "express";

// Anonymize user IDs for privacy (keep relational integrity)
function anonymizeUserId(userId: string | null): string {
  if (!userId) return "";
  // Use first 8 chars of a hash-like representation
  return `user_${userId.substring(0, 8)}`;
}

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
 * Export stations dataset
 * Fields: station_id, latitude, longitude, charger_type, power_kw, 
 *         trust_score, total_reports, total_verifications, created_at
 */
export async function exportStationsCSV(res: Response): Promise<void> {
  // Set headers for CSV download
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="stations_export.csv"');
  
  // Write CSV header
  const headers = [
    "station_id",
    "latitude",
    "longitude",
    "charger_type",
    "power_kw",
    "trust_score",
    "total_reports",
    "total_verifications",
    "created_at"
  ];
  res.write(toCSVRow(headers));

  // Get all approved stations
  const stationsData = await db
    .select()
    .from(stations)
    .where(eq(stations.approvalStatus, "APPROVED"));

  // Process each station
  for (const station of stationsData) {
    // Count reports for this station
    const reportCountResult = await db
      .select({ count: count() })
      .from(reports)
      .where(eq(reports.stationId, station.id));
    const totalReports = reportCountResult[0]?.count || 0;

    // Count verifications for this station
    const verificationCountResult = await db
      .select({ count: count() })
      .from(stationVerifications)
      .where(eq(stationVerifications.stationId, station.id));
    const totalVerifications = verificationCountResult[0]?.count || 0;

    // Get trust score if enabled
    let trustScore: number | null = null;
    if (isTrustScoreEnabled()) {
      const scoreData = await calculateTrustScore(station.id);
      trustScore = scoreData?.score ?? null;
    }

    const row = [
      station.id,
      station.lat,
      station.lng,
      station.chargerType,
      station.powerKw ?? "",
      trustScore ?? "",
      totalReports,
      totalVerifications,
      formatDate(station.createdAt)
    ];
    res.write(toCSVRow(row));
  }

  res.end();
}

/**
 * Export charging sessions dataset
 * Fields: session_id, station_id, start_time, end_time, duration_minutes, created_at
 * 
 * Note: User IDs excluded for privacy. Only station relationship preserved.
 */
export async function exportChargingSessionsCSV(res: Response): Promise<void> {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="charging_sessions_export.csv"');
  
  const headers = [
    "session_id",
    "station_id",
    "start_time",
    "end_time",
    "duration_minutes",
    "created_at"
  ];
  res.write(toCSVRow(headers));

  const sessionsData = await db.select().from(chargingSessions);

  for (const session of sessionsData) {
    // Compute duration if not stored
    let durationMinutes = session.durationMinutes;
    if (!durationMinutes && session.startTime && session.endTime) {
      const start = new Date(session.startTime).getTime();
      const end = new Date(session.endTime).getTime();
      durationMinutes = Math.round((end - start) / (1000 * 60));
    }

    const row = [
      session.id,
      session.stationId,
      formatDate(session.startTime),
      formatDate(session.endTime),
      durationMinutes ?? "",
      formatDate(session.createdAt)
    ];
    res.write(toCSVRow(row));
  }

  res.end();
}

/**
 * Export reports dataset
 * Fields: report_id, station_id, report_reason, created_at, resolved
 * 
 * Note: User IDs excluded for privacy.
 */
export async function exportReportsCSV(res: Response): Promise<void> {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="reports_export.csv"');
  
  const headers = [
    "report_id",
    "station_id",
    "report_reason",
    "created_at",
    "resolved"
  ];
  res.write(toCSVRow(headers));

  const reportsData = await db.select().from(reports);

  for (const report of reportsData) {
    // Map reviewStatus to resolved boolean
    const resolved = report.reviewStatus === "resolved" ? "true" : "false";

    const row = [
      report.id,
      report.stationId,
      report.reason ?? "",
      formatDate(report.createdAt),
      resolved
    ];
    res.write(toCSVRow(row));
  }

  res.end();
}

/**
 * Get available datasets for export
 */
export function getAvailableDatasets() {
  return {
    datasets: [
      {
        id: "stations",
        name: "Stations Dataset",
        description: "EV charging station locations with trust scores and activity counts",
        fields: ["station_id", "latitude", "longitude", "charger_type", "power_kw", "trust_score", "total_reports", "total_verifications", "created_at"]
      },
      {
        id: "sessions",
        name: "Charging Sessions Dataset",
        description: "Charging session records with duration calculations",
        fields: ["session_id", "station_id", "start_time", "end_time", "duration_minutes", "created_at"]
      },
      {
        id: "reports",
        name: "Reports Dataset",
        description: "User-submitted station status reports",
        fields: ["report_id", "station_id", "report_reason", "created_at", "resolved"]
      }
    ],
    privacyNote: "All exports exclude personally identifiable information. User IDs are not included."
  };
}
