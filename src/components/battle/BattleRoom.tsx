"use client";

import { useState } from "react";
import Image from "next/image";
import { Mic, MicOff, Trophy, Users } from "lucide-react";
import toast from "react-hot-toast";
import type { BattleWithUsers } from "@/types";

interface BattleRoomProps {
  battle: BattleWithUsers;
  currentUserId?: string;
}

export default function BattleRoom({ battle, currentUserId }: BattleRoomProps) {
  const [voted, setVoted] = useState(false);
  const [muted, setMuted] = useState(false);

  const isParticipant =
    currentUserId === battle.challengerId ||
    currentUserId === battle.opponentId;

  async function vote(votedFor: string) {
    if (!currentUserId) {
      toast.error("Sign in to vote");
      return;
    }
    if (voted) {
      toast.error("You already voted!");
      return;
    }

    const res = await fetch(`/api/battles/${battle.roomCode}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ votedFor }),
    });

    if (res.ok) {
      setVoted(true);
      toast.success("Vote cast! 🔥");
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to vote");
    }
  }

  async function joinBattle() {
    const res = await fetch(`/api/battles/${battle.roomCode}/join`, {
      method: "POST",
    });
    if (res.ok) {
      toast.success("You're in the battle! 🎤");
      window.location.reload();
    } else {
      const data = await res.json();
      toast.error(data.error || "Couldn't join battle");
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-zinc-950 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-white">
            {battle.title || "Rap Battle"}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`text-xs font-bold flex items-center gap-1 ${
                battle.status === "LIVE"
                  ? "text-red-500"
                  : battle.status === "VOTING"
                  ? "text-yellow-400"
                  : "text-zinc-500"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${
                battle.status === "LIVE" ? "bg-red-500 animate-pulse" :
                battle.status === "VOTING" ? "bg-yellow-400" : "bg-zinc-600"
              }`} />
              {battle.status}
            </span>
            <span className="text-zinc-600 text-xs flex items-center gap-1">
              <Users size={12} />
              {battle._count.votes} votes
            </span>
          </div>
        </div>
        {isParticipant && (
          <button
            onClick={() => setMuted(!muted)}
            className={`p-2 rounded-full transition ${
              muted ? "bg-red-500/20 text-red-500" : "bg-zinc-800 text-white"
            }`}
          >
            {muted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        )}
      </div>

      {/* Battle Stage */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Challenger */}
          <div className="bg-zinc-900 rounded-2xl p-4 text-center border border-zinc-800">
            <div className="w-16 h-16 rounded-full bg-zinc-700 mx-auto mb-3 overflow-hidden">
              {battle.challenger.image ? (
                <Image
                  src={battle.challenger.image}
                  alt={battle.challenger.username}
                  width={64}
                  height={64}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                  {(battle.challenger.name ?? battle.challenger.username)[0].toUpperCase()}
                </div>
              )}
            </div>
            <p className="font-bold text-white text-sm">
              {battle.challenger.name ?? battle.challenger.username}
            </p>
            <p className="text-zinc-500 text-xs">@{battle.challenger.username}</p>

            {battle.status === "VOTING" && !voted && currentUserId !== battle.challengerId && (
              <button
                onClick={() => vote(battle.challengerId)}
                className="mt-3 w-full py-2 bg-yellow-400 text-black text-xs font-bold rounded-full hover:bg-yellow-300 transition"
              >
                Vote 🔥
              </button>
            )}
          </div>

          {/* VS */}
          <div className="bg-zinc-900 rounded-2xl p-4 text-center border border-zinc-800">
            {battle.opponent ? (
              <>
                <div className="w-16 h-16 rounded-full bg-zinc-700 mx-auto mb-3 overflow-hidden">
                  {battle.opponent.image ? (
                    <Image
                      src={battle.opponent.image}
                      alt={battle.opponent.username}
                      width={64}
                      height={64}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                      {(battle.opponent.name ?? battle.opponent.username)[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="font-bold text-white text-sm">
                  {battle.opponent.name ?? battle.opponent.username}
                </p>
                <p className="text-zinc-500 text-xs">@{battle.opponent.username}</p>

                {battle.status === "VOTING" && !voted && currentUserId !== battle.opponentId && (
                  <button
                    onClick={() => vote(battle.opponentId!)}
                    className="mt-3 w-full py-2 bg-yellow-400 text-black text-xs font-bold rounded-full hover:bg-yellow-300 transition"
                  >
                    Vote 🔥
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-4">
                <p className="text-zinc-600 text-sm mb-3">Open slot</p>
                {currentUserId && currentUserId !== battle.challengerId && (
                  <button
                    onClick={joinBattle}
                    className="px-4 py-2 bg-yellow-400 text-black text-xs font-bold rounded-full hover:bg-yellow-300 transition"
                  >
                    Accept Challenge
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* VS divider */}
        <div className="text-center -mt-2 mb-6">
          <span className="text-yellow-400 font-black text-2xl">VS</span>
        </div>

        {/* Winner display */}
        {battle.status === "ENDED" && battle.winnerId && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 text-center">
            <Trophy size={32} className="text-yellow-400 mx-auto mb-2" />
            <p className="text-yellow-400 font-black text-lg">Winner!</p>
          </div>
        )}

        {/* Voted feedback */}
        {voted && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 text-center">
            <p className="text-green-400 font-semibold">Vote cast ✓</p>
            <p className="text-zinc-500 text-sm mt-1">Waiting for results...</p>
          </div>
        )}
      </div>
    </div>
  );
}
