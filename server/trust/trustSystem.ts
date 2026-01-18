import { db } from "../db";
import { users, stationVerifications, reports, trustEvents, type UserTrustLevel } from "@shared/schema";
import { eq, and, gte, sql, isNull } from "drizzle-orm";

const TRUST_THRESHOLDS = {
  NEW: 5,
  NORMAL: 10,
};

const WINDOW_30_MIN = 30 * 60 * 1000;
const WINDOW_24_HR = 24 * 60 * 60 * 1000;

function calculateTrustLevel(score: number): UserTrustLevel {
  if (score >= TRUST_THRESHOLDS.NORMAL) return "TRUSTED";
  if (score >= TRUST_THRESHOLDS.NEW) return "NORMAL";
  return "NEW";
}

export async function getUserTrustLevel(userId: string): Promise<UserTrustLevel> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return (user?.userTrustLevel as UserTrustLevel) ?? "NEW";
}

async function tryAwardTrust(
  userId: string,
  eventType: string,
  delta: number,
  stationId: number | null,
  reason: string | null,
  windowMs: number
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMs);

  return await db.transaction(async (tx) => {
    const [lockedUser] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    
    if (!lockedUser) return false;

    const conditions = [
      eq(trustEvents.userId, userId),
      eq(trustEvents.eventType, eventType),
      gte(trustEvents.createdAt, windowStart),
    ];

    if (stationId !== null) {
      conditions.push(eq(trustEvents.stationId, stationId));
    } else {
      conditions.push(isNull(trustEvents.stationId));
    }

    if (reason !== null) {
      conditions.push(eq(trustEvents.reason, reason));
    } else {
      conditions.push(isNull(trustEvents.reason));
    }

    const existing = await tx
      .select()
      .from(trustEvents)
      .where(and(...conditions))
      .limit(1);

    if (existing.length > 0) {
      return false;
    }

    await tx.insert(trustEvents).values({
      userId,
      eventType,
      stationId,
      reason,
      delta,
    });

    const currentScore = lockedUser.trustScore ?? 0;
    const newScore = Math.max(0, currentScore + delta);
    const newLevel = calculateTrustLevel(newScore);

    await tx
      .update(users)
      .set({
        trustScore: newScore,
        userTrustLevel: newLevel,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return true;
  });
}

export async function checkAndRewardVerificationConsensus(
  stationId: number,
  userId: string,
  userVote: string
): Promise<void> {
  const thirtyMinutesAgo = new Date(Date.now() - WINDOW_30_MIN);

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
    await tryAwardTrust(userId, "verification_reward", 1, stationId, null, WINDOW_30_MIN);
  }
}

export async function checkAndPenalizeContradictions(userId: string): Promise<void> {
  const twentyFourHoursAgo = new Date(Date.now() - WINDOW_24_HR);

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
    await tryAwardTrust(userId, "contradiction_penalty", -1, null, null, WINDOW_24_HR);
  }
}

export async function checkAndRewardReportConsensus(
  stationId: number,
  userId: string,
  reason: string
): Promise<void> {
  const twentyFourHoursAgo = new Date(Date.now() - WINDOW_24_HR);

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
      await tryAwardTrust(report.userId, "report_reward", 2, stationId, reason, WINDOW_24_HR);
    }
  }
}

export async function isTrustedUser(userId: string): Promise<boolean> {
  const level = await getUserTrustLevel(userId);
  return level === "TRUSTED";
}
