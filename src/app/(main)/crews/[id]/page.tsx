"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Users, Shield, Crown, Star, Trophy } from "lucide-react";
import toast from "react-hot-toast";

interface CrewMember {
  id: string;
  role: "OWNER" | "CAPTAIN" | "MEMBER";
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
    wins: number;
    losses: number;
    points: number;
  };
}

interface Crew {
  id: string;
  name: string;
  tag: string;
  description: string | null;
  points: number;
  wins: number;
  losses: number;
  ownerId: string;
  createdAt: string;
  owner: { id: string; name: string | null; username: string; image: string | null };
  members: CrewMember[];
  _count: { members: number };
}

const ROLE_ICON: Record<string, React.ReactNode> = {
  OWNER: <Crown size={12} className="text-yellow-400" />,
  CAPTAIN: <Star size={12} className="text-blue-400" />,
  MEMBER: null,
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  CAPTAIN: "Captain",
  MEMBER: "Member",
};

function Avatar({ user, size = 40 }: { user: { name: string | null; username: string; image: string | null }; size?: number }) {
  if (user.image) {
    return (
      <Image
        src={user.image}
        alt={user.name ?? user.username}
        width={size}
        height={size}
        className="rounded-full object-cover border border-zinc-700"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-black"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {(user.name ?? user.username)[0].toUpperCase()}
    </div>
  );
}

export default function CrewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [crew, setCrew] = useState<Crew | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myCrewId, setMyCrewId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    fetch(`/api/crews/${id}`)
      .then((r) => r.json())
      .then((data) => { setCrew(data); setLoading(false); })
      .catch(() => setLoading(false));

    fetch("/api/users/me")
      .then((r) => r.json())
      .then((me) => {
        if (me?.id) setMyUserId(me.id);
        if (me?.crewMember?.crewId) setMyCrewId(me.crewMember.crewId);
      });
  }, [id]);

  const isMember = crew?.members.some((m) => m.user.id === myUserId);
  const isOwner = crew?.ownerId === myUserId;
  const canJoin = myUserId && !myCrewId; // not in any crew

  async function joinCrew() {
    setActing(true);
    try {
      const res = await fetch(`/api/crews/${id}/join`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`You joined [${crew?.tag}] ${crew?.name}! 🔥`);
        setMyCrewId(id);
        // Refresh crew data
        const updated = await fetch(`/api/crews/${id}`).then((r) => r.json());
        setCrew(updated);
      } else {
        toast.error(data.error || "Couldn't join");
      }
    } finally {
      setActing(false);
    }
  }

  async function leaveCrew() {
    if (!confirm("Leave this crew?")) return;
    setActing(true);
    try {
      const res = await fetch(`/api/crews/${id}/leave`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("You left the crew");
        setMyCrewId(null);
        const updated = await fetch(`/api/crews/${id}`).then((r) => r.json());
        setCrew(updated);
      } else {
        toast.error(data.error || "Couldn't leave");
      }
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!crew) {
    return (
      <div className="text-center py-20 text-zinc-500">
        <Shield size={40} className="mx-auto text-zinc-700 mb-4" />
        <p>Crew not found</p>
      </div>
    );
  }

  const totalBattles = crew.wins + crew.losses;
  const winRate = totalBattles > 0 ? Math.round((crew.wins / totalBattles) * 100) : 0;

  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white transition">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-yellow-400 font-black text-sm">[{crew.tag}]</span>
          <h1 className="font-bold text-white truncate">{crew.name}</h1>
        </div>
        {/* Join / Leave */}
        {!isMember && canJoin && (
          <button
            onClick={joinCrew}
            disabled={acting}
            className="px-4 py-1.5 bg-yellow-400 text-black text-sm font-bold rounded-full hover:bg-yellow-300 transition disabled:opacity-50"
          >
            {acting ? "..." : "Join"}
          </button>
        )}
        {isMember && !isOwner && (
          <button
            onClick={leaveCrew}
            disabled={acting}
            className="px-4 py-1.5 bg-zinc-800 text-zinc-300 text-sm font-semibold rounded-full hover:bg-zinc-700 transition disabled:opacity-50"
          >
            {acting ? "..." : "Leave"}
          </button>
        )}
      </header>

      {/* Crew Hero */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-5">
          {/* Tag badge */}
          <div className="w-16 h-16 rounded-2xl bg-yellow-400 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(250,204,21,0.3)]">
            <span className="text-black font-black text-lg">{crew.tag}</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">{crew.name}</h2>
            {crew.description && (
              <p className="text-zinc-400 text-sm mt-1">{crew.description}</p>
            )}
            <p className="text-zinc-600 text-xs mt-1">
              Founded by @{crew.owner.username}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { label: "Points", value: crew.points.toLocaleString(), icon: <Trophy size={14} className="text-yellow-400" /> },
            { label: "Members", value: crew._count.members, icon: <Users size={14} className="text-blue-400" /> },
            { label: "Wins", value: crew.wins, icon: <Shield size={14} className="text-green-400" /> },
            { label: "Win %", value: `${winRate}%`, icon: <Star size={14} className="text-purple-400" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
              <div className="flex justify-center mb-1">{icon}</div>
              <p className="text-white font-black text-base">{value}</p>
              <p className="text-zinc-600 text-[10px]">{label}</p>
            </div>
          ))}
        </div>

        {/* Members */}
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
            Members ({crew._count.members})
          </p>
          <div className="space-y-2">
            {crew.members.map((member) => (
              <Link
                key={member.id}
                href={`/profile/${member.user.id}`}
                className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-3 hover:border-zinc-700 transition"
              >
                <Avatar user={member.user} size={42} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {ROLE_ICON[member.role]}
                    <p className="font-semibold text-white text-sm truncate">
                      {member.user.name ?? member.user.username}
                    </p>
                    {member.user.id === myUserId && (
                      <span className="text-[10px] text-yellow-400 font-bold">(you)</span>
                    )}
                  </div>
                  <p className="text-zinc-500 text-xs">
                    @{member.user.username} · {ROLE_LABEL[member.role]}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white text-sm font-bold">{member.user.wins}W</p>
                  <p className="text-zinc-600 text-xs">{member.user.points} pts</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Not in a crew CTA */}
        {!isMember && !myCrewId && (
          <div className="mt-6 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 text-center">
            <p className="text-yellow-400 font-semibold text-sm mb-3">Want to represent [{crew.tag}]?</p>
            <button
              onClick={joinCrew}
              disabled={acting}
              className="px-6 py-2.5 bg-yellow-400 text-black font-black rounded-full text-sm hover:bg-yellow-300 transition disabled:opacity-50"
            >
              {acting ? "Joining..." : `Join ${crew.name}`}
            </button>
          </div>
        )}

        {/* Already in different crew */}
        {!isMember && myCrewId && myCrewId !== id && (
          <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <p className="text-zinc-500 text-sm">You're already in a crew. Leave it first to join this one.</p>
            <Link href={`/crews/${myCrewId}`} className="text-yellow-400 text-sm font-semibold mt-2 block">
              Go to my crew →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
