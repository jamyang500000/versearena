import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";
import { getTierForPoints, RANK_TIERS } from "@/lib/rankings";

export const revalidate = 60;

export default async function RankingsPage() {
  const session = await auth();

  const rankings = await db.ranking.findMany({
    orderBy: { points: "desc" },
    take: 100,
    include: {
      user: {
        select: { id: true, name: true, username: true, image: true, wins: true, losses: true },
      },
    },
  });

  const myRanking = session?.user?.id
    ? rankings.find((r) => r.userId === session.user!.id)
    : null;

  return (
    <div className="max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
        <h1 className="text-xl font-bold text-white">Rankings</h1>
      </header>

      {/* Tier legend */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {RANK_TIERS.map((t) => (
          <span
            key={t.tier}
            className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold border"
            style={{ borderColor: t.color, color: t.color }}
          >
            {t.emoji} {t.label}
          </span>
        ))}
      </div>

      {/* My rank card */}
      {myRanking && (
        <div className="mx-4 mb-4 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4">
          <p className="text-yellow-400 text-xs font-bold mb-1">YOUR RANK</p>
          <RankRow ranking={myRanking} index={rankings.indexOf(myRanking)} highlight />
        </div>
      )}

      {/* Top 100 */}
      <div className="divide-y divide-zinc-800/60">
        {rankings.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            No rankings yet. Win battles to earn points!
          </div>
        ) : (
          rankings.map((r, i) => (
            <RankRow key={r.id} ranking={r} index={i} highlight={r.userId === session?.user?.id} />
          ))
        )}
      </div>
    </div>
  );
}

function RankRow({
  ranking,
  index,
  highlight,
}: {
  ranking: {
    userId: string;
    points: number;
    tier: string;
    user: { id: string; name: string | null; username: string; image: string | null; wins: number; losses: number };
  };
  index: number;
  highlight?: boolean;
}) {
  const tier = getTierForPoints(ranking.points);
  const pos = index + 1;
  const medal = pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : null;

  return (
    <Link
      href={`/profile/${ranking.user.username}`}
      className={`flex items-center gap-3 px-4 py-3 hover:bg-zinc-900/40 transition ${
        highlight ? "bg-yellow-400/5" : ""
      }`}
    >
      <span className="w-8 text-center font-bold text-sm text-zinc-400">
        {medal ?? `#${pos}`}
      </span>

      <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
        {ranking.user.image ? (
          <Image
            src={ranking.user.image}
            alt={ranking.user.username}
            width={40}
            height={40}
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold text-white text-sm">
            {(ranking.user.name ?? ranking.user.username)[0].toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate">
          {ranking.user.name ?? ranking.user.username}
        </p>
        <p className="text-zinc-500 text-xs">
          {ranking.user.wins}W · {ranking.user.losses}L
        </p>
      </div>

      <div className="text-right">
        <p className="font-bold text-sm" style={{ color: tier.color }}>
          {tier.emoji} {tier.label}
        </p>
        <p className="text-zinc-500 text-xs">{ranking.points.toLocaleString()} pts</p>
      </div>
    </Link>
  );
}
