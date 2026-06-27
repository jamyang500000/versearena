import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Trophy, Users } from "lucide-react";

interface PageProps { params: Promise<{ id: string }> }

export default async function TournamentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  const tournament = await db.tournament.findUnique({
    where: { id },
    include: {
      entrants: {
        include: {
          user: { select: { id: true, name: true, username: true, image: true, wins: true } },
        },
        orderBy: { seed: "asc" },
      },
      matches: {
        orderBy: [{ round: "asc" }, { position: "asc" }],
        include: { battle: { take: 1 } },
      },
      winner: { select: { name: true, username: true, image: true } },
    },
  });

  if (!tournament) notFound();

  const isEntered = session?.user?.id
    ? tournament.entrants.some((e) => e.userId === session.user!.id)
    : false;

  const canEnter =
    session?.user?.id &&
    !isEntered &&
    tournament.status === "REGISTRATION" &&
    tournament.entrants.length < tournament.maxEntrants;

  return (
    <div className="max-w-lg mx-auto pb-8">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
        <h1 className="font-bold text-white">{tournament.name}</h1>
        <p className="text-xs text-zinc-500 capitalize">{tournament.status.toLowerCase()}</p>
      </header>

      <div className="p-4 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 rounded-xl p-3 text-center">
            <p className="text-white font-bold">{tournament.entrants.length}/{tournament.maxEntrants}</p>
            <p className="text-zinc-500 text-xs">Entrants</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-3 text-center">
            <p className="text-yellow-400 font-bold">{tournament.prizeCoins.toLocaleString()}</p>
            <p className="text-zinc-500 text-xs">Prize 💰</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-3 text-center">
            <p className="text-white font-bold">{new Date(tournament.startDate).toLocaleDateString()}</p>
            <p className="text-zinc-500 text-xs">Start Date</p>
          </div>
        </div>

        {/* Winner */}
        {tournament.winner && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 flex items-center gap-3">
            <Trophy size={24} className="text-yellow-400" />
            <div>
              <p className="text-yellow-400 text-xs font-bold">CHAMPION</p>
              <Link href={`/profile/${tournament.winner.username}`} className="text-white font-bold hover:underline">
                {tournament.winner.name ?? tournament.winner.username}
              </Link>
            </div>
          </div>
        )}

        {/* Enter button */}
        {canEnter && (
          <form action={`/api/tournaments/${id}/enter`} method="POST">
            <button
              type="submit"
              className="w-full py-3 bg-yellow-400 text-black font-black rounded-xl hover:bg-yellow-300 transition"
            >
              Enter Tournament
            </button>
          </form>
        )}
        {isEntered && (
          <div className="w-full py-3 bg-green-500/10 border border-green-500/30 text-green-400 font-bold rounded-xl text-center">
            ✓ You&apos;re in the tournament!
          </div>
        )}

        {/* Bracket */}
        {tournament.matches.length > 0 && (
          <div>
            <h2 className="text-white font-bold mb-3">Bracket</h2>
            <div className="space-y-2">
              {tournament.matches.map((match) => (
                <div key={match.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                  <p className="text-zinc-500 text-xs mb-1">Round {match.round} · Match {match.position}</p>
                  {match.battle[0] ? (
                    <Link
                      href={`/battle/${match.battle[0].roomCode}`}
                      className="text-yellow-400 text-sm hover:underline"
                    >
                      View Battle →
                    </Link>
                  ) : (
                    <p className="text-zinc-600 text-sm">Battle not yet scheduled</p>
                  )}
                  {match.winnerId && (
                    <p className="text-green-400 text-xs mt-1">Winner decided ✓</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entrants */}
        <div>
          <h2 className="text-white font-bold mb-3 flex items-center gap-2">
            <Users size={16} /> Entrants ({tournament.entrants.length})
          </h2>
          <div className="space-y-2">
            {tournament.entrants.map((e, i) => (
              <Link
                key={e.id}
                href={`/profile/${e.user.username}`}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-900 transition"
              >
                <span className="text-zinc-500 text-sm w-5">#{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden">
                  {e.user.image ? (
                    <Image src={e.user.image} alt={e.user.username} width={32} height={32} className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                      {(e.user.name ?? e.user.username)[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{e.user.name ?? e.user.username}</p>
                  <p className="text-zinc-500 text-xs">{e.user.wins} wins</p>
                </div>
                {e.eliminated && (
                  <span className="ml-auto text-red-500 text-xs">Eliminated</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
