import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTierForPoints } from "@/lib/rankings";
import { BarChart2, Mic, Heart, Eye, Gift } from "lucide-react";

export default async function StatsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Fetch via the API handler logic inline (server component)
  const userId = session.user.id;

  const [user, battlesChallenger, battlesOpponent, posts, gifts] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        wins: true, losses: true, points: true, coins: true,
        ranking: true,
        _count: { select: { followers: true, following: true, posts: true } },
      },
    }),
    db.battle.findMany({ where: { challengerId: userId }, select: { status: true, winnerId: true, _count: { select: { votes: true } } } }),
    db.battle.findMany({ where: { opponentId: userId }, select: { status: true, winnerId: true, _count: { select: { votes: true } } } }),
    db.post.findMany({ where: { userId }, select: { views: true, _count: { select: { likes: true, comments: true } } } }),
    db.gift.findMany({ where: { receiverId: userId }, select: { giftType: true, coinCost: true } }),
  ]);

  if (!user) redirect("/login");

  const allBattles = [...battlesChallenger, ...battlesOpponent];
  const ended = allBattles.filter((b) => b.status === "ENDED");
  const winRate = ended.length > 0 ? ((user.wins / ended.length) * 100).toFixed(0) : "0";
  const avgVotes = ended.length > 0
    ? (ended.reduce((s, b) => s + b._count.votes, 0) / ended.length).toFixed(1)
    : "0";

  const totalViews = posts.reduce((s, p) => s + p.views, 0);
  const totalLikes = posts.reduce((s, p) => s + p._count.likes, 0);
  const totalGiftCoins = gifts.reduce((s, g) => s + g.coinCost, 0);

  const tier = getTierForPoints(user.points);

  const giftCounts = gifts.reduce(
    (acc, g) => { acc[g.giftType] = (acc[g.giftType] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  const GIFT_EMOJIS: Record<string, string> = {
    FIRE: "🔥", MIC: "🎤", CROWN: "👑", DIAMOND: "💎", TROPHY: "🏆",
  };

  return (
    <div className="max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart2 size={20} className="text-yellow-400" /> My Stats
        </h1>
      </header>

      <div className="p-4 space-y-5">
        {/* Rank card */}
        <div
          className="rounded-2xl p-5 border"
          style={{ borderColor: tier.color + "40", backgroundColor: tier.color + "10" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold" style={{ color: tier.color }}>
                {tier.emoji} {tier.label} Tier
              </p>
              <p className="text-3xl font-black text-white mt-1">{user.points.toLocaleString()} pts</p>
              {user.ranking?.rank && (
                <p className="text-zinc-400 text-sm mt-0.5">Global Rank #{user.ranking.rank}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-yellow-400 font-bold">💰 {user.coins}</p>
              <p className="text-zinc-500 text-xs">coins</p>
            </div>
          </div>
        </div>

        {/* Battle stats */}
        <div>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Mic size={12} /> Battle Stats
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Battles", value: allBattles.length },
              { label: "Win Rate", value: `${winRate}%` },
              { label: "Wins", value: user.wins, color: "text-green-400" },
              { label: "Losses", value: user.losses, color: "text-red-400" },
              { label: "Avg Votes/Battle", value: avgVotes },
              { label: "Battles Ended", value: ended.length },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-zinc-900 rounded-xl p-3">
                <p className={`text-xl font-black ${color ?? "text-white"}`}>{value}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Post stats */}
        <div>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Eye size={12} /> Post Performance
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Posts", value: user._count.posts },
              { label: "Total Views", value: totalViews.toLocaleString() },
              { label: "Total Likes", value: totalLikes.toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="bg-zinc-900 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-white">{value}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Social */}
        <div>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Heart size={12} /> Social
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-white">{user._count.followers}</p>
              <p className="text-zinc-500 text-xs">Followers</p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-white">{user._count.following}</p>
              <p className="text-zinc-500 text-xs">Following</p>
            </div>
          </div>
        </div>

        {/* Gifts received */}
        {gifts.length > 0 && (
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Gift size={12} /> Gifts Received
            </p>
            <div className="bg-zinc-900 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white font-bold">{gifts.length} total gifts</p>
                <p className="text-yellow-400 text-sm font-bold">💰 {totalGiftCoins} coins earned</p>
              </div>
              <div className="flex gap-3 flex-wrap">
                {Object.entries(giftCounts).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <span className="text-lg">{GIFT_EMOJIS[type] ?? "🎁"}</span>
                    <span className="text-white font-bold text-sm">×{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Win streak */}
        {user.ranking?.streak && user.ranking.streak > 1 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 text-center">
            <p className="text-orange-400 font-black text-2xl">🔥 {user.ranking.streak} Win Streak!</p>
            <p className="text-zinc-400 text-sm mt-1">Keep it going!</p>
          </div>
        )}
      </div>
    </div>
  );
}
