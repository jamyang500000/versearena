"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoTrack,
  useParticipants,
  useLocalParticipant,
  useTracks,
  RoomAudioRenderer,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { Mic, MicOff, Video, VideoOff, Users, PhoneOff, UserX, Vote } from "lucide-react";
import AudienceChat from "./AudienceChat";
import GiftPanel from "@/components/gifts/GiftPanel";
import type { BattleWithUsers } from "@/types";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface LiveBattleRoomProps {
  battle: BattleWithUsers;
  currentUserId?: string;
}

export default function LiveBattleRoom({ battle, currentUserId }: LiveBattleRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [voted, setVoted] = useState(false);
  const [battleStatus, setBattleStatus] = useState(battle.status);
  const [liveOpponent, setLiveOpponent] = useState(battle.opponent);
  const [voteCount, setVoteCount] = useState(battle._count?.votes ?? 0);
  const router = useRouter();

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!;
  const isChallenger = currentUserId === battle.challengerId;

  // Poll battle status every 3 seconds so all users see real-time updates
  useEffect(() => {
    if (battleStatus === "ENDED") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/battles/${battle.roomCode}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status !== battleStatus) {
          setBattleStatus(data.status);
          if (data.status === "ENDED") {
            setTimeout(() => router.push("/battle"), 2000);
          }
        }
        if (data.opponent && !liveOpponent) setLiveOpponent(data.opponent);
        if (data._count?.votes !== undefined) setVoteCount(data._count.votes);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [battle.roomCode, battleStatus, liveOpponent, router]);

  useEffect(() => {
    if (!currentUserId) return;
    fetch("/api/livekit/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode: battle.roomCode }),
    })
      .then((r) => r.json())
      .then((d) => {
        setToken(d.token);
        setIsParticipant(d.isParticipant);
      });
  }, [battle.roomCode, currentUserId]);

  async function vote(votedFor: string) {
    if (!currentUserId) { toast.error("Sign in to vote"); return; }
    if (voted) { toast.error("Already voted!"); return; }
    const res = await fetch(`/api/battles/${battle.roomCode}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ votedFor }),
    });
    if (res.ok) { setVoted(true); toast.success("Vote cast! 🔥"); }
    else { const d = await res.json(); toast.error(d.error || "Failed"); }
  }

  async function joinBattle() {
    const res = await fetch(`/api/battles/${battle.roomCode}/join`, { method: "POST" });
    if (res.ok) { toast.success("You're in! 🎤"); window.location.reload(); }
    else { const d = await res.json(); toast.error(d.error || "Couldn't join"); }
  }

  async function startVoting() {
    const res = await fetch(`/api/battles/${battle.roomCode}/end`, { method: "PATCH" });
    if (res.ok) {
      setBattleStatus("VOTING");
      toast.success("Voting open! 🗳️");
      router.refresh();
    } else {
      const d = await res.json(); toast.error(d.error || "Failed");
    }
  }

  async function endBattle() {
    if (!confirm("End the battle now? Votes will be tallied.")) return;
    const res = await fetch(`/api/battles/${battle.roomCode}/end`, { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      if (d.winnerId) {
        const winnerName =
          d.winnerId === battle.challengerId
            ? (battle.challenger.name ?? battle.challenger.username)
            : (battle.opponent?.name ?? battle.opponent?.username ?? "Opponent");
        toast.success(`🏆 ${winnerName} wins!`, { duration: 3000 });
      } else {
        toast("Battle ended — it's a tie! 🤝", { duration: 3000 });
      }
      setTimeout(() => router.push("/battle"), 1500);
    } else {
      const d = await res.json(); toast.error(d.error || "Failed to end battle");
    }
  }

  async function kickOpponent() {
    if (!confirm("Remove opponent from the battle?")) return;
    const res = await fetch(`/api/battles/${battle.roomCode}/kick`, { method: "POST" });
    if (res.ok) { toast.success("Opponent removed"); window.location.reload(); }
    else { const d = await res.json(); toast.error(d.error || "Failed"); }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950">
        <div>
          <h2 className="font-bold text-white">{battle.title || "Rap Battle"}</h2>
          <span className={`text-xs font-bold flex items-center gap-1 mt-0.5 ${
            battleStatus === "LIVE" ? "text-red-500" :
            battleStatus === "VOTING" ? "text-yellow-400" : "text-zinc-500"
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              battleStatus === "LIVE" ? "bg-red-500 animate-pulse" :
              battleStatus === "VOTING" ? "bg-yellow-400 animate-pulse" : "bg-zinc-600"
            }`} />
            {battleStatus}
          </span>
        </div>
        <span className="flex items-center gap-1 text-zinc-400 text-sm">
          <Users size={14} /> Live
        </span>
      </div>

      {token ? (
        <LiveKitRoom
          token={token}
          serverUrl={livekitUrl}
          connect
          audio={isParticipant}
          video={isParticipant}
          className="flex-1 flex flex-col"
        >
          <RoomAudioRenderer />
          <BattleStage
            battle={{ ...battle, opponent: liveOpponent }}
            battleStatus={battleStatus}
            isParticipant={isParticipant}
            isChallenger={isChallenger}
            currentUserId={currentUserId}
            voted={voted}
            voteCount={voteCount}
            onVote={vote}
            onJoin={joinBattle}
            onStartVoting={startVoting}
            onEndBattle={endBattle}
            onKick={kickOpponent}
          />
          <div className="border-t border-zinc-800">
            <AudienceChat battleId={battle.id} currentUserId={currentUserId} />
          </div>
        </LiveKitRoom>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-zinc-600 text-sm">Connecting to battle room...</div>
        </div>
      )}
    </div>
  );
}

function BattleStage({
  battle,
  battleStatus,
  isParticipant,
  isChallenger,
  currentUserId,
  voted,
  voteCount,
  onVote,
  onJoin,
  onStartVoting,
  onEndBattle,
  onKick,
}: {
  battle: BattleWithUsers;
  battleStatus: string;
  isParticipant: boolean;
  isChallenger: boolean;
  currentUserId?: string;
  voted: boolean;
  voteCount: number;
  onVote: (id: string) => void;
  onJoin: () => void;
  onStartVoting: () => void;
  onEndBattle: () => void;
  onKick: () => void;
}) {
  const isParticipantUser = currentUserId === battle.challengerId || currentUserId === battle.opponentId;
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(false);

  async function handleEnd() {
    try {
      await localParticipant.setCameraEnabled(false);
      await localParticipant.setMicrophoneEnabled(false);
      // Stop all media tracks at browser level so camera light goes off
      localParticipant.getTracks().forEach(pub => {
        pub.track?.mediaStreamTrack?.stop();
      });
      await room.disconnect();
    } catch (_) {}
    onEndBattle();
  }

  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.Microphone, withPlaceholder: false },
  ]);

  const challengerTrack = tracks.find(t => t.participant.identity === battle.challengerId);
  const opponentTrack = tracks.find(t => t.participant.identity === battle.opponentId);

  return (
    <div className="flex-1 p-4 flex flex-col gap-4">
      {/* Video stage */}
      <div className="grid grid-cols-2 gap-3">
        {/* Challenger */}
        <div className={`bg-zinc-900 rounded-2xl overflow-hidden aspect-[3/4] relative border ${
          battle.winnerId === battle.challengerId
            ? "border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]"
            : "border-zinc-800"
        }`}>
          {challengerTrack?.publication?.track ? (
            <VideoTrack trackRef={challengerTrack} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl font-black text-zinc-700">
                {(battle.challenger.name ?? battle.challenger.username)[0].toUpperCase()}
              </span>
            </div>
          )}
          {battle.winnerId === battle.challengerId && (
            <div className="absolute top-2 left-2 bg-yellow-400 text-black text-xs font-black px-2 py-0.5 rounded-full">🏆 WINNER</div>
          )}
          <div className="absolute bottom-2 left-2 right-2">
            <p className="text-white text-xs font-bold bg-black/60 px-2 py-1 rounded-full text-center truncate">
              🎤 {battle.challenger.name ?? battle.challenger.username}
            </p>
          </div>
          {battleStatus === "VOTING" && !voted && !isParticipantUser && (
            <button
              onClick={() => onVote(battle.challengerId)}
              className="absolute top-2 right-2 px-3 py-1 bg-yellow-400 text-black text-xs font-black rounded-full animate-bounce"
            >VOTE</button>
          )}
        </div>

        {/* Opponent */}
        <div className={`bg-zinc-900 rounded-2xl overflow-hidden aspect-[3/4] relative border ${
          battle.winnerId === battle.opponentId
            ? "border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]"
            : "border-zinc-800"
        }`}>
          {battle.opponent ? (
            <>
              {opponentTrack?.publication?.track ? (
                <VideoTrack trackRef={opponentTrack} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-5xl font-black text-zinc-700">
                    {(battle.opponent.name ?? battle.opponent.username)[0].toUpperCase()}
                  </span>
                </div>
              )}
              {battle.winnerId === battle.opponentId && (
                <div className="absolute top-2 left-2 bg-yellow-400 text-black text-xs font-black px-2 py-0.5 rounded-full">🏆 WINNER</div>
              )}
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-white text-xs font-bold bg-black/60 px-2 py-1 rounded-full text-center truncate">
                  🎤 {battle.opponent.name ?? battle.opponent.username}
                </p>
              </div>
              {battleStatus === "VOTING" && !voted && !isParticipantUser && (
                <button
                  onClick={() => onVote(battle.opponentId!)}
                  className="absolute top-2 right-2 px-3 py-1 bg-yellow-400 text-black text-xs font-black rounded-full animate-bounce"
                >VOTE</button>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <p className="text-zinc-600 text-sm">Open slot</p>
              {currentUserId && currentUserId !== battle.challengerId && (
                <button
                  onClick={onJoin}
                  className="px-4 py-2 bg-yellow-400 text-black text-xs font-bold rounded-full"
                >Accept Challenge</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* VS + vote count */}
      <div className="text-center -mt-1">
        <span className="text-yellow-400 font-black text-xl">VS</span>
        {battleStatus === "VOTING" && (
          <p className="text-zinc-500 text-xs mt-0.5">{voteCount} vote{voteCount !== 1 ? "s" : ""} cast</p>
        )}
      </div>

      {/* ── FLOATING CALL-STYLE CONTROLS ── */}
      {battleStatus !== "ENDED" && (
        <div className="flex items-center justify-center gap-5 py-2">
          {/* Mic toggle — participants only */}
          {isParticipant && (
            <button
              onClick={() => {
                localParticipant.setMicrophoneEnabled(!micEnabled);
                setMicEnabled(!micEnabled);
              }}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition shadow-lg ${
                micEnabled ? "bg-zinc-800" : "bg-red-600"
              }`}
            >
              {micEnabled ? <Mic size={22} className="text-white" /> : <MicOff size={22} className="text-white" />}
            </button>
          )}

          {/* Cam toggle — participants only */}
          {isParticipant && (
            <button
              onClick={() => {
                localParticipant.setCameraEnabled(!camEnabled);
                setCamEnabled(!camEnabled);
              }}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition shadow-lg ${
                camEnabled ? "bg-white" : "bg-zinc-800"
              }`}
            >
              {camEnabled
                ? <Video size={22} className="text-black" />
                : <VideoOff size={22} className="text-white" />}
            </button>
          )}

          {/* Open Voting — challenger, LIVE phase only */}
          {isChallenger && battleStatus === "LIVE" && (
            <button
              onClick={onStartVoting}
              className="w-14 h-14 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg hover:bg-yellow-300 transition"
              title="Open Voting"
            >
              <Vote size={22} className="text-black" />
            </button>
          )}

          {/* Kick — challenger, opponent present */}
          {isChallenger && battle.opponent && (
            <button
              onClick={onKick}
              className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center shadow-lg hover:bg-zinc-700 transition border border-zinc-700"
              title="Kick Opponent"
            >
              <UserX size={22} className="text-white" />
            </button>
          )}

          {/* End Battle — red hang-up button, participants only */}
          {isParticipant && (
            <button
              onClick={handleEnd}
              className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg hover:bg-red-500 transition"
              title="End Battle"
            >
              <PhoneOff size={22} className="text-white" />
            </button>
          )}
        </div>
      )}

      {/* Gifts */}
      {currentUserId && battleStatus === "LIVE" && battle.opponent && (
        <GiftPanel
          battleId={battle.id}
          challengerId={battle.challengerId}
          opponentId={battle.opponentId!}
          challengerName={battle.challenger.name ?? battle.challenger.username}
          opponentName={battle.opponent.name ?? battle.opponent.username}
          currentUserId={currentUserId}
        />
      )}

      {voted && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-3 text-center">
          <p className="text-green-400 font-semibold text-sm">Vote cast ✓ — Waiting for results</p>
        </div>
      )}
    </div>
  );
}
