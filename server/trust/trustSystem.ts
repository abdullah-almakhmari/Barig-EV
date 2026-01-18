import { db } from "../db";
import { users, stationVerifications, reports, type UserTrustLevel } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";

const TRUST_THRESHOLDS = {
  NEW: 5,
  NORMAL: 10,
};

const rewardedVerifications = new Map<string, number>();
const rewardedReports = new Map<string, number>();
const lastPenaltyTime = new Map<string, number>();

const WINDOW_30_MIN = 30 * 60 * 1000;
const WINDOW_24_HR = 24 * 60 * 60 * 1000;

function calculateTrustLevel(score: number): UserTrustLevel {
  if (score >= TRUST_THRESHOLDS.NORMAL) return "TRUSTED";
  if (score >= TRUST_THRESHOLDS.NEW) return "NORMAL";
  return "NEW";
}

export async function updateUserTrustScore(userId: string, delta: number): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return;

  const currentScore = user.trustScore ?? 0;
  const newScore = Math.max(0, currentScore + delta);
  const newLevel = calculateTrustLevel(newScore);

  await db
    .update(users)
    .set({
      trustScore: newScore,
      userTrustLevel: newLevel,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function getUserTrustLevel(userId: string): Promise<UserTrustLevel> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return (user?.userTrustLevel as UserTrustLevel) ?? "NEW";
}

export async function checkAndRewardVerificationConsensus(
  stationId: number,
  userId: string,
  userVote: string
): Promise<void> {
  const now = Date.now();
  const thirtyMinutesAgo = new Date(now - WINDOW_30_MIN);

  const rewardKey = `${userId}:${stationId}:verification`;
  const lastRewarded = rewardedVerifications.get(rewardKey);
  if (lastRewarded && now - lastRewarded < WINDOW_30_MIN) {
    return;
  }

  const recentVerifications = await db
    .select()
    .from(stationVerifications)
    .where(
      and(
        eq(stationVerifications.stationId, stationId),
        gte(stationVerifications.createdAt, thirtyMinutesAgo)
      )
    );

  const voteCounts: Record<string, number> = {};
  for (const v of recentVerifications) {
    voteCounts[v.vote] = (voteCounts[v.vote] || 0) + 1;
  }

  const leadingVote = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0];

  if (leadingVote && leadingVote[1] >= 3 && leadingVote[0] === userVote) {
    await updateUserTrustScore(userId, 1);
    rewardedVerifications.set(rewardKey, now);
  }
}

export async function checkAndPenalizeContradictions(userId: string): Promise<void> {
  const now = Date.now();
  const twentyFourHoursAgo = new Date(now - WINDOW_24_HR);

  const lastPenalty = lastPenaltyTime.get(userId);
  if (lastPenalty && now - lastPenalty < WINDOW_24_HR) {
    return;
  }

  const userVerifications = await db
    .select()
    .from(stationVerifications)
    .where(
      and(
        eq(stationVerifications.userId, userId),
        gte(stationVerifications.createdAt, twentyFourHoursAgo)
      )
    );

  let contradictionCount = 0;

  for (const userVote of userVerifications) {
    const thirtyMinutesAfter = new Date(userVote.createdAt!.getTime() + WINDOW_30_MIN);

    const otherVerifications = await db
      .select()
      .from(stationVerifications)
      .where(
        and(
          eq(stationVerifications.stationId, userVote.stationId),
          gte(stationVerifications.createdAt, userVote.createdAt!),
          sql`${stationVerifications.createdAt} <= ${thirtyMinutesAfter}`
        )
      );

    const voteCounts: Record<string, number> = {};
    for (const v of otherVerifications) {
      voteCounts[v.vote] = (voteCounts[v.vote] || 0) + 1;
    }

    const leadingVote = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0];

    if (leadingVote && leadingVote[1] >= 3 && leadingVote[0] !== userVote.vote) {
      contradictionCount++;
    }
  }

  if (contradictionCount >= 3) {
    await updateUserTrustScore(userId, -1);
    lastPenaltyTime.set(userId, now);
  }
}

export async function checkAndRewardReportConsensus(
  stationId: number,
  userId: string,
  reason: string
): Promise<void> {
  const now = Date.now();
  const twentyFourHoursAgo = new Date(now - WINDOW_24_HR);

  const recentReports = await db
    .select()
    .from(reports)
    .where(
      and(
        eq(reports.stationId, stationId),
        eq(reports.reason, reason),
        gte(reports.createdAt, twentyFourHoursAgo)
      )
    );

  if (recentReports.length >= 3) {
    for (const report of recentReports) {
      if (!report.userId) continue;
      
      const rewardKey = `${report.userId}:${stationId}:${reason}:report`;
      const lastRewarded = rewardedReports.get(rewardKey);
      if (lastRewarded && now - lastRewarded < WINDOW_24_HR) {
        continue;
      }
      
      await updateUserTrustScore(report.userId, 2);
      rewardedReports.set(rewardKey, now);
    }
  }
}

export async function isTrustedUser(userId: string): Promise<boolean> {
  const level = await getUserTrustLevel(userId);
  return level === "TRUSTED";
}
