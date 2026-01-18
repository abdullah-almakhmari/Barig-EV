/**
 * Trust Score Feature v1
 * 
 * Calculates a deterministic trust score (0-100) based on existing data:
 * - Number of community verifications
 * - Number of recent reports
 * - Recency of last status update/activity
 * 
 * Feature flag: TRUST_SCORE_ENABLED (default: false)
 */

import { db } from "../db";
import { stationVerifications, reports, stations } from "@shared/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";

// Feature flag check
export function isTrustScoreEnabled(): boolean {
  return process.env.TRUST_SCORE_ENABLED === "true";
}

interface TrustScoreData {
  score: number;
  components: {
    verificationScore: number;
    reportScore: number;
    recencyScore: number;
  };
  debug?: {
    totalVerifications: number;
    recentVerifications: number;
    totalReports: number;
    recentReports: number;
    daysSinceLastActivity: number;
  };
}

/**
 * Trust Score Formula (0-100):
 * 
 * 1. Verification Score (40 points max):
 *    - Base: 5 points per verification (max 20 points)
 *    - Recent (7 days): +5 points per recent verification (max 20 points)
 * 
 * 2. Report Reliability Score (30 points max):
 *    - Resolved/addressed reports boost score
 *    - Unresolved recent reports decrease score
 *    - Formula: 30 - (unresolved_recent_reports * 10), min 0
 * 
 * 3. Recency Score (30 points max):
 *    - Last activity within 24h: 30 points
 *    - Last activity within 3 days: 25 points
 *    - Last activity within 7 days: 20 points
 *    - Last activity within 14 days: 15 points
 *    - Last activity within 30 days: 10 points
 *    - Older: 5 points
 */
export async function calculateTrustScore(stationId: number): Promise<TrustScoreData | null> {
  if (!isTrustScoreEnabled()) {
    return null;
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get station data
  const station = await db.select().from(stations).where(eq(stations.id, stationId)).limit(1);
  if (station.length === 0) {
    return null;
  }

  // Count total verifications
  const totalVerificationsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stationVerifications)
    .where(eq(stationVerifications.stationId, stationId));
  const totalVerifications = totalVerificationsResult[0]?.count || 0;

  // Count recent verifications (last 7 days)
  const recentVerificationsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stationVerifications)
    .where(
      and(
        eq(stationVerifications.stationId, stationId),
        gte(stationVerifications.createdAt, sevenDaysAgo)
      )
    );
  const recentVerifications = recentVerificationsResult[0]?.count || 0;

  // Count total reports
  const totalReportsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reports)
    .where(eq(reports.stationId, stationId));
  const totalReports = totalReportsResult[0]?.count || 0;

  // Count recent unresolved reports (last 30 days, not resolved)
  const recentUnresolvedReportsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reports)
    .where(
      and(
        eq(reports.stationId, stationId),
        gte(reports.createdAt, thirtyDaysAgo),
        eq(reports.status, "pending")
      )
    );
  const recentUnresolvedReports = recentUnresolvedReportsResult[0]?.count || 0;

  // Get last activity date (most recent of: updatedAt, last verification, last report)
  const stationUpdatedAt = station[0].updatedAt || station[0].createdAt;
  
  const lastVerification = await db
    .select({ createdAt: stationVerifications.createdAt })
    .from(stationVerifications)
    .where(eq(stationVerifications.stationId, stationId))
    .orderBy(desc(stationVerifications.createdAt))
    .limit(1);

  const lastReport = await db
    .select({ createdAt: reports.createdAt })
    .from(reports)
    .where(eq(reports.stationId, stationId))
    .orderBy(desc(reports.createdAt))
    .limit(1);

  const lastActivityDate = Math.max(
    stationUpdatedAt ? new Date(stationUpdatedAt).getTime() : 0,
    lastVerification[0]?.createdAt ? new Date(lastVerification[0].createdAt).getTime() : 0,
    lastReport[0]?.createdAt ? new Date(lastReport[0].createdAt).getTime() : 0
  );

  const daysSinceLastActivity = (now.getTime() - lastActivityDate) / (1000 * 60 * 60 * 24);

  // Calculate component scores
  const verificationBaseScore = Math.min(totalVerifications * 5, 20);
  const verificationRecentScore = Math.min(recentVerifications * 5, 20);
  const verificationScore = verificationBaseScore + verificationRecentScore;

  const reportScore = Math.max(30 - (recentUnresolvedReports * 10), 0);

  let recencyScore: number;
  if (daysSinceLastActivity <= 1) {
    recencyScore = 30;
  } else if (daysSinceLastActivity <= 3) {
    recencyScore = 25;
  } else if (daysSinceLastActivity <= 7) {
    recencyScore = 20;
  } else if (daysSinceLastActivity <= 14) {
    recencyScore = 15;
  } else if (daysSinceLastActivity <= 30) {
    recencyScore = 10;
  } else {
    recencyScore = 5;
  }

  const totalScore = Math.min(verificationScore + reportScore + recencyScore, 100);

  return {
    score: totalScore,
    components: {
      verificationScore,
      reportScore,
      recencyScore,
    },
    debug: {
      totalVerifications,
      recentVerifications,
      totalReports,
      recentReports: recentUnresolvedReports,
      daysSinceLastActivity: Math.round(daysSinceLastActivity * 10) / 10,
    },
  };
}

/**
 * Get trust score label based on score value
 */
export function getTrustScoreLabel(score: number): { en: string; ar: string } {
  if (score >= 80) {
    return { en: "Highly Trusted", ar: "موثوق جداً" };
  } else if (score >= 60) {
    return { en: "Trusted", ar: "موثوق" };
  } else if (score >= 40) {
    return { en: "Moderate", ar: "متوسط" };
  } else if (score >= 20) {
    return { en: "Low Trust", ar: "ثقة منخفضة" };
  } else {
    return { en: "Unverified", ar: "غير متحقق" };
  }
}
