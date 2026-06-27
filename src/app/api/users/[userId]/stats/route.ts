import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const [user, battlesChallenger, battlesOpponent, posts, gifts, aiJudgements] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, username: true, wins: true, losses: true,
        points: true, coins: true,
        ranking: true,
        _count: { select: { followers: true, following: true, posts: true, chatMessages: true } },
      },
    }),
    db.battle.findMany({
      where: { challengerId: userId },
      select: { status: true, winnerId: true, createdAt: true, _count: { select: { votes: true } } },
    }),
    db.battle.findMany({
      where: { opponentId: userId },
      select: { status: true, winnerId: true, createdAt: true, _count: { select: { votes: true } } },
    }),
    db.post.findMany({
      where: { userId },
      select: { views: true, createdAt: true, _count: { select: { likes: true, comments: true } } },
    }),
    db.gift.findMany({
      where: { receiverId: userId },
      select: { giftType: true, coinCost: true, createdAt: true },
    }),
    db.aIJudgement.findMany({
      where: { winnerId: userId },
      select: { provider: true, scores: true, createdAt: true },
    }),
  ]);

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allBattles = [...battlesChallenger, ...battlesOpponent];
  const endedBattles = allBattles.filter((b) => b.status === "ENDED");

  // Win rate over time (last 10 battles)
  const recentBattles = endedBattles.slice(-10).map((b) => ({
    won: b.winnerId === userId,
    votes: b._count.votes,
    date: b.createdAt,
  }));

  // Gift breakdown
  const giftBreakdown = gifts.reduce(
    (acc, g) => {
      acc[g.giftType] = (acc[g.giftType] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Post performance
  const totalViews = posts.reduce((s, p) => s + p.views, 0);
  const totalLikes = posts.reduce((s, p) => s + p._count.likes, 0);
  const totalComments = posts.reduce((s, p) => s + p._count.comments, 0);

  // AI judge win rate
  const aiWins = aiJudgements.length;

  // Average votes per battle
  const avgVotes =
    endedBattles.length > 0
      ? (endedBattles.reduce((s, b) => s + b._count.votes, 0) / endedBattles.length).toFixed(1)
      : 0;

  return NextResponse.json({
    user,
    battles: {
      total: allBattles.length,
      ended: endedBattles.length,
      wins: user.wins,
      losses: user.losses,
      winRate: endedBattles.length > 0 ? ((user.wins / endedBattles.length) * 100).toFixed(1) : 0,
      avgVotes,
      recent: recentBattles,
    },
    posts: {
      total: posts.length,
      totalViews,
      totalLikes,
      totalComments,
      avgViews: posts.length > 0 ? Math.round(totalViews / posts.length) : 0,
    },
    gifts: {
      total: gifts.length,
      totalCoinsReceived: gifts.reduce((s, g) => s + g.coinCost, 0),
      breakdown: giftBreakdown,
    },
    aiJudge: { wins: aiWins },
    ranking: user.ranking,
  });
}
