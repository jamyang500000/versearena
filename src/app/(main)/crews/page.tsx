"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Shield, X, Plus, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

interface CrewMember {
  id: string;
  role: string;
  user: { id: string; name: string | null; username: string; image: string | null; wins: number };
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
  owner: { id: string; name: string | null; username: string; image: string | null };
  members: CrewMember[];
  _count: { members: number };
}

export default function CrewsPage() {
  const router = useRouter();
  const [crews, setCrews] = useState<Crew[]>([]);
  const [myCrewId, setMyCrewId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", tag: "", description: "" });

  useEffect(() => {
    fetch("/api/crews")
      .then((r) => r.json())
      .then(setCrews);

    // Check if I'm in a crew
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((me) => {
        if (me?.crewMember?.crewId) setMyCrewId(me.crewMember.crewId);
      });
  }, []);

  async function createCrew() {
    if (!form.name.trim() || !form.tag.trim()) {
      toast.error("Name and tag are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/crews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Crew [${data.tag}] ${data.name} created! 🔥`);
        setShowCreate(false);
        router.push(`/crews/${data.id}`);
      } else {
        toast.error(data.error || "Failed to create crew");
      }
    } finally {
      setCreating(false);
    }
  }

  const myCrew = myCrewId ? crews.find((c) => c.id === myCrewId) : null;

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield size={20} className="text-yellow-400" />
          Crews
        </h1>
        {!myCrew && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-yellow-400 text-black text-sm font-bold rounded-full hover:bg-yellow-300 transition"
          >
            <Plus size={14} /> Create
          </button>
        )}
      </header>

      <div className="p-4 space-y-5">
        {/* My Crew */}
        {myCrew && (
          <div>
            <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-2">My Crew</p>
            <Link
              href={`/crews/${myCrew.id}`}
              className="flex items-center gap-4 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 hover:bg-yellow-400/15 transition"
            >
              <div className="w-12 h-12 rounded-xl bg-yellow-400 flex items-center justify-center">
                <span className="text-black font-black text-sm">{myCrew.tag}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-base">{myCrew.name}</p>
                <p className="text-zinc-400 text-xs mt-0.5">
                  <Users size={11} className="inline mr-1" />
                  {myCrew._count.members} members · {myCrew.wins}W {myCrew.losses}L
                </p>
              </div>
              <div className="text-right">
                <p className="text-yellow-400 font-bold">{myCrew.points.toLocaleString()}</p>
                <p className="text-zinc-600 text-xs">pts</p>
              </div>
            </Link>
          </div>
        )}

        {/* All Crews leaderboard */}
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
            Leaderboard — {crews.length} crew{crews.length !== 1 ? "s" : ""}
          </p>

          {crews.length === 0 ? (
            <div className="text-center py-16">
              <Shield size={40} className="text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-400">No crews yet</p>
              <p className="text-zinc-600 text-sm mt-1">Be the first to start one</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-6 px-6 py-3 bg-yellow-400 text-black font-bold rounded-full text-sm hover:bg-yellow-300 transition"
              >
                Create a Crew
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {crews.map((crew, i) => (
                <Link
                  key={crew.id}
                  href={`/crews/${crew.id}`}
                  className={`flex items-center gap-3 rounded-2xl p-4 border transition ${
                    crew.id === myCrewId
                      ? "bg-yellow-400/5 border-yellow-400/20"
                      : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  {/* Rank */}
                  <span className={`font-black text-sm w-6 text-center ${
                    i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-orange-400" : "text-zinc-600"
                  }`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>

                  {/* Tag badge */}
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                    <span className="text-yellow-400 font-black text-[10px]">{crew.tag}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{crew.name}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      <Users size={10} className="inline mr-0.5" />
                      {crew._count.members} · {crew.wins}W {crew.losses}L
                    </p>
                  </div>

                  {/* Points */}
                  <div className="text-right shrink-0">
                    <p className="text-white font-bold text-sm">{crew.points.toLocaleString()}</p>
                    <p className="text-zinc-600 text-[10px]">pts</p>
                  </div>

                  <ChevronRight size={14} className="text-zinc-700" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CREATE CREW BOTTOM SHEET ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg bg-zinc-950 border-t border-zinc-800 rounded-t-3xl pb-10">
            {/* Handle */}
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mt-3 mb-1" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h2 className="text-white font-bold text-lg">Start a Crew</h2>
              <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="px-4 py-5 space-y-4">
              {/* Crew Name */}
              <div>
                <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                  Crew Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Bronx Street Kings"
                  maxLength={32}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-yellow-400 transition"
                />
              </div>

              {/* Tag */}
              <div>
                <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                  Tag <span className="text-zinc-600 normal-case font-normal">(2–6 chars, shown as [TAG])</span>
                </label>
                <input
                  type="text"
                  value={form.tag}
                  onChange={(e) => setForm({ ...form, tag: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                  placeholder="BSK"
                  maxLength={6}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-yellow-400 font-bold placeholder:text-zinc-600 text-sm focus:outline-none focus:border-yellow-400 transition tracking-widest"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                  Description <span className="text-zinc-600 normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What's your crew about?"
                  maxLength={160}
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-yellow-400 transition resize-none"
                />
              </div>

              {/* Preview */}
              {form.name && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                  <p className="text-zinc-500 text-xs mb-1">Preview</p>
                  <p className="text-white font-bold">
                    <span className="text-yellow-400">[{form.tag || "TAG"}]</span> {form.name}
                  </p>
                </div>
              )}

              <button
                onClick={createCrew}
                disabled={creating || !form.name.trim() || !form.tag.trim()}
                className="w-full py-3.5 bg-yellow-400 text-black font-black rounded-2xl text-base hover:bg-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? "Creating..." : "Create Crew 🔥"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
