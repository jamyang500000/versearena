"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sword, Zap, X, Search, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

interface BattleUser {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
}

interface Battle {
  id: string;
  roomCode: string;
  title: string | null;
  status: string;
  createdAt: string;
  challenger: BattleUser;
  opponent: BattleUser | null;
  _count: { votes: number };
}

interface Person {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function BattlePage() {
  const router = useRouter();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    function loadBattles() {
      fetch("/api/battles").then(r => r.json()).then(setBattles).catch(() => {});
    }
    loadBattles();
    const interval = setInterval(loadBattles, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Search users via the working search API
  useEffect(() => {
    if (!showPicker) return;
    const t = setTimeout(() => searchUsers(query), 250);
    return () => clearTimeout(t);
  }, [showPicker, query]);

  async function searchUsers(q: string) {
    setNetworkLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (Array.isArray(data)) setPeople(data);
    } catch (e) {
      console.error(e);
    } finally {
      setNetworkLoading(false);
    }
  }

  const filtered = people;

  async function challengePerson(targetId: string, targetName: string) {
    setCreating(true);
    try {
      const res = await fetch("/api/battles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: null, challengedUserId: targetId }),
      });
      if (res.ok) {
        const battle = await res.json();
        toast.success(`Challenge sent to ${targetName}! 🎤`);
        setShowPicker(false);
        router.push(`/battle/${battle.roomCode}`);
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed");
      }
    } finally {
      setCreating(false);
    }
  }

  async function createOpen() {
    setCreating(true);
    try {
      const res = await fetch("/api/battles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: null }),
      });
      if (res.ok) {
        const battle = await res.json();
        setShowPicker(false);
        router.push(`/battle/${battle.roomCode}`);
      } else {
        toast.error("Failed to create battle");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Sword size={20} className="text-yellow-400" />
          Battle Arena
        </h1>
        <button
          onClick={() => setShowPicker(true)}
          className="px-4 py-1.5 bg-yellow-400 text-black text-sm font-bold rounded-full hover:bg-yellow-300 transition"
        >
          + Challenge
        </button>
      </header>

      <div className="p-4 space-y-3">
        {battles.length === 0 ? (
          <div className="text-center py-20">
            <Sword size={40} className="text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400">No live battles right now</p>
            <p className="text-zinc-600 text-sm mt-1">Be the first to step into the arena</p>
            <button
              onClick={() => setShowPicker(true)}
              className="inline-block mt-6 px-6 py-3 bg-yellow-400 text-black font-bold rounded-full hover:bg-yellow-300 transition"
            >
              Start a Battle
            </button>
          </div>
        ) : (
          battles.map((battle) => (
            <Link
              key={battle.id}
              href={`/battle/${battle.roomCode}`}
              className="block bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-yellow-400/50 transition"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {battle.status === "LIVE" ? (
                    <span className="flex items-center gap-1 text-red-500 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                      <Zap size={12} /> WAITING
                    </span>
                  )}
                </div>
                <span className="text-zinc-600 text-xs">{timeAgo(battle.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="font-bold text-white">{battle.challenger.name ?? battle.challenger.username}</p>
                  <p className="text-zinc-500 text-xs">@{battle.challenger.username}</p>
                </div>
                <div className="text-yellow-400 font-black text-xl">VS</div>
                <div className="text-center">
                  {battle.opponent ? (
                    <>
                      <p className="font-bold text-white">{battle.opponent.name ?? battle.opponent.username}</p>
                      <p className="text-zinc-500 text-xs">@{battle.opponent.username}</p>
                    </>
                  ) : (
                    <p className="text-zinc-500 text-sm italic">Open slot...</p>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* ── CHALLENGE PICKER MODAL ── */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPicker(false)} />

          {/* Sheet */}
          <div className="relative w-full max-w-lg bg-zinc-950 border-t border-zinc-800 rounded-t-3xl max-h-[80vh] flex flex-col">
            {/* Handle */}
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mt-3 mb-1" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h2 className="text-white font-bold text-lg">Who do you want to challenge?</h2>
              <button onClick={() => setShowPicker(false)} className="text-zinc-500 hover:text-white transition">
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 bg-zinc-900 rounded-xl px-3 py-2 border border-zinc-800 focus-within:border-yellow-400 transition">
                <Search size={15} className="text-zinc-500" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search followers & following..."
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* People list */}
            <div className="overflow-y-auto flex-1">
              {/* Open challenge option */}
              <button
                onClick={createOpen}
                disabled={creating}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 transition border-b border-zinc-800/50 text-left"
              >
                <div className="w-11 h-11 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
                  <Sword size={18} className="text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">Open Challenge</p>
                  <p className="text-zinc-500 text-xs">Anyone can accept and join</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
              </button>

              {networkLoading && (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-zinc-600 text-xs">Loading your network...</p>
                </div>
              )}

              {!networkLoading && filtered.length === 0 && (
                <p className="text-center text-zinc-600 text-sm py-10">
                  {people.length === 0 ? "Follow some rappers to challenge them directly" : "No one matches"}
                </p>
              )}

              {filtered.map(person => (
                <button
                  key={person.id}
                  onClick={() => challengePerson(person.id, person.name ?? person.username)}
                  disabled={creating}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 transition text-left"
                >
                  {person.image ? (
                    <img src={person.image} className="w-11 h-11 rounded-full object-cover border border-zinc-700" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg font-black text-white">
                      {(person.name ?? person.username)[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">{person.name ?? person.username}</p>
                    <p className="text-zinc-500 text-xs">@{person.username}</p>
                  </div>
                  <span className="text-yell