import { db } from "./db";

export const RANK_TIERS = [
  { tier: "BRONZE",   min: 0,    max: 499,   color: "#CD7F32", emoji: "🥉", label: "Bronze"   },
  { tier: "SILVER",   min: 500,  max: 999,   color: "#C0C0C0", emoji: "🥈", label: "Silver"   },
  { tier: "GOLD",     min: 1000, max: 1999,  color: "#FFD700", emoji: "🥇", label: "Gold"     },
  { tier: "PLATINUM", min: 2000, max: 3999,  color: "#E5E4E2", emoji: "💎", label: "Platinum" },
  { tier: "DIAMOND",  min: 4000, max: 7999,  color: "#B9F2FF", emoji: "💠", label: "Diamond"  },
  { tier: "LEGEND",   min: 8000, max: Infinity, color: "#FFD700", emoji: "👑", label: "Legend" },
] as const;

export type RankTierName = (typeof RANK_TIERS)[number]["tier"];

export function getTierForPoints(points: number) {
  return RANK_TIERS.find((t) => points >= t.min && points <= t.max) ?? RANK_TIERS[0];
}

export const POINTS = {
  WIN:          100,
  LOSS:         -20,
  VOTE_CAST:    5,
  VOTE_RECEIVED: 2,
  GIFT_RECEIVED: 1,  // per coin value
  TOURNAMENT_WIN: 500,
};

export async function awardPoints(userId: string, points: number) {
  const user = await db.user.update({
    where: { id: userId },
    data: { points: { increment: points } },
    select: { points: true },
  });

  const tier = getTierForPoints(user.points);

  await db.ranking.upsert({
    where: { userId },
    create: { userId, points: user.points, tier: tier.tier },
    update: { points: user.points, tier: tier.tier },
  });

  return user.points;
}

export async function refreshRanks() {
  const rankings = await db.ranking.findMany({
    orderBy: { points: "desc" },
  });

  await Promise.all(
    rankings.map((r, i) =>
      db.ranking.update({ where: { id: r.id }, data: { rank: i + 1 } })
    )
  );
}
