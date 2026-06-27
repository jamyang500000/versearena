import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Trophy, Calendar, Users } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

export default async function TournamentsPage() {
  const session = await auth();

  const tournaments = await db.tournament.findMany({
    orderBy: { startDate: "asc" },
    include: {
      _count: { select: { entrants: true, matches: true } },
      entrants: session?.user?.id
        ? { where: { userId: session.user.id }, select: { id: true } }
        : false,
    },
  });

  const upcoming = tournaments.filter((t) => t.status === "UPCOMING" || t.status === "REGISTRATION");
  const live = tournaments.filter((t) => t.status === "LIVE");
  const ended = tournaments.filter((t) => t.status === "ENDED");

  return (
    <div className="max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy size={20} className="text-yellow-400" />
          Tournaments
        </h1>
      </header>

      <div className="p-4 space-y-6">
        {live.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live Now
            </h2>
            <TournamentList tournaments={live} myId={session?.user?.id} />
          </section>
        )}

        {upcoming.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3">Upcoming</h2>
            <TournamentList tournaments={upcoming} myId={session?.user?.id} />
          </section>
        )}

        {ended.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Ended</h2>
            <TournamentList tournaments={ended} myId={session?.user?.id} />
          </section>
        )}

        {tournaments.length === 0 && (
          <div className="text-center py-16 text-zinc-500">
            <Trophy size={40} className="mx-auto text-zinc-700 mb-3" />
            <p>No tournaments yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TournamentList({
  tournaments,
  myId,
}: {
  tournaments: Array<{
    id: string; name: string; description: string | null; status: string;
    maxEntrants: number; prizeCoins: number; startDate: Date;
    _count: { entrants: number };
    entrants: Array<{ id: string }> | false;
  }>;
  myId?: string;
}) {
  return (
    <div className="space-y-3">
      {tournaments.map((t) => {
        const isEntered = Array.isArray(t.entrants) && t.entrants.length > 0;
        const spotsLeft = t.maxEntrants - t._count.entrants;
        return (
          <Link
            key={t.id}
            href={`/tournaments/${t.id}`}
            className="block bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-yellow-400/40 transition"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-white">{t.name}</p>
                {t.description && <p className="text-zinc-500 text-xs mt-0.5">{t.description}</p>}
              </div>
              {isEntered && (
                <span className="flex-shrink-0 px-2 py-0.5 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs rounded-full font-bold">
                  Entered
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Users size={12} /> {t._count.entrants}/{t.maxEntrants}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={12} /> {new Date(t.startDate).toLocaleDateString()}
              </span>
              {t.prizeCoins > 0 && (
                <span className="text-yellow-400 font-bold">💰 {t.prizeCoins} coins</span>
              )}
              {t.status === "REGISTRATION" && spotsLeft > 0 && (
                <span className="text-green-400">{spotsLeft} spots left</span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
