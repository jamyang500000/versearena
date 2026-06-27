import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";
import { getTierForPoints } from "@/lib/rankings";

export const revalidate = 120;

type Tab = "points" | "wins" | "gifts";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: Tab }>;
}) {
  const { tab = "points" } = await searchParams;

  let users: {
    id: string; name: string | null; username: string; image: string | null;
    wins: number; losses: number; points: number; coins: number;
    _count?: { giftsReceived: number };
  }[] = [];

  if (tab === "points") {
    users = await db.user.findMany({
      orderBy: { points: "desc" },
      take: 50,
      select: { id: true, name: true, username: true, image: true, wins: true, losses: true, points: true, coins: true },
    });
  } else if (tab === "wins") {
    users = await db.user.findMany({
      orderBy: { wins: "desc" },
      take: 50,
      select: { id: true, name: true, username: true, image: true, wins: true, losses: true, points: true, coins: true },
    });
  } else if (tab === "gifts") {
    const gifted = await db.user.findMany({
      orderBy: { giftsReceived: { _count: "desc" } },
      take: 50,
      select: {
        id: true, name: true, username: true, image: true,
        wins: true, losses: true, points: true, coins: true,
        _count: { select: { giftsReceived: true } },
      },
    });
    users = gifted;
  }

  const tabs = [
    { key: "points", label: "🏆 Top Points" },
    { key: "wins",   label: "⚔️ Most Wins"  },
    { key: "gifts",  label: "🎁 Top Gifted"  },
  ] as const;

  return (
    <div className="max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
        <h1 className="text-xl font-bold text-white">Leaderboard</h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/leaderboard?tab=${t.key}`}
            className={`flex-1 py-3 text-center text-sm font-semibold transition ${
              tab === t.key
                ? "text-yellow-400 border-b-2 border-yellow-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Top 3 podium */}
      {users.length >= 3 && (
        <div className="flex items-end justify-center gap-3 px-4 py-6">
          {/* 2nd */}
          <PodiumCard user={users[1]} pos={2} />
          {/* 1st */}
          <PodiumCard user={users[0]} pos={1} />
          {/* 3rd */}
          <PodiumCard user={users[2]} pos={3} />
        </div>
      )}

      {/* Full list */}
      <div className="divide-y divide-zinc-800/60">
        {users.slice(3).map((user, i) => {
          const tier = getTierForPoints(user.points);
          return (
            <Link
              key={user.id}
              href={`/profile/${user.username}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900/40 transition"
            >
              <span className="w-6 text-zinc-500 text-sm font-bold">#{i + 4}</span>
              <div className="w-9 h-9 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
                {user.image ? (
                  <Image src={user.image} alt={user.username} width={36} height={36} className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
                    {(user.name ?? user.username)[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">{user.name ?? user.username}</p>
                <p className="text-xs text-zinc-500">{user.wins}W · {user.losses}L</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: tier.color }}>
                  {tab === "wins" ? `${user.wins} W` :
                   tab === "gifts" ? `${(user as typeof user & { _count?: { giftsReceived: number } })._count?.giftsReceived ?? 0} 🎁` :
                   `${user.points.toLocaleString()} pts`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function PodiumCard({ user, pos }: { user: { name: string | null; username: string; image: string | null; wins: number; points: number }; pos: 1 | 2 | 3 }) {
  const heights = { 1: "h-24", 2: "h-16", 3: "h-12" };
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const sizes = { 1: "w-16 h-16", 2: "w-12 h-12", 3: "w-12 h-12" };

  return (
    <Link href={`/profile/${user.username}`} className="flex flex-col items-center gap-2 flex-1">
      <div className={`${sizes[pos]} rounded-full bg-zinc-700 overflow-hidden border-2 border-zinc-600`}>
        {user.image ? (
          <Image src={user.image} alt={user.username} width={64} height={64} className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-black text-white text-lg">
            {(user.name ?? user.username)[0].toUpperCase()}
          </div>
        )}
      </div>
      <p className="text-white text-xs font-bold text-center truncate max-w-full px-1">
        {medals[pos]} {user.name ?? user.username}
      </p>
      <p className="text-zinc-500 text-xs">{user.wins}W</p>
      <div className={`w-full ${heights[pos]} ${
        pos === 1 ? "bg-yellow-400/20 border border-yellow-400/40" :
        pos === 2 ? "bg-zinc-600/30 border border-zinc-600" :
        "bg-orange-900/20 border border-orange-800/40"
      } rounded-t-lg`} />
    </Link>
  );
}
