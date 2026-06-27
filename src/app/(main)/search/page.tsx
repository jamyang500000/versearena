"use client";

import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import FollowButton from "@/components/profile/FollowButton";

interface UserResult {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  wins: number;
  points: number;
  isFollowing: boolean;
  _count: { followers: number; following: number };
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 350);
    return () => clearTimeout(t);
  }, [query, search]);

  return (
    <div className="max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-3 bg-zinc-900 rounded-2xl px-4 py-2.5 border border-zinc-800 focus-within:border-yellow-400 transition">
          <Search size={18} className="text-zinc-500 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rappers, artists..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-zinc-600"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-zinc-600 hover:text-white text-xs transition">✕</button>
          )}
        </div>
      </header>

      <div className="p-4">
        {!query && (
          <div className="text-center py-20">
            <Search size={40} className="text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">Search for rappers to follow</p>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-zinc-900 rounded-2xl p-4 animate-pulse flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-zinc-800 rounded w-1/3" />
                  <div className="h-2 bg-zinc-800 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <p className="text-center py-16 text-zinc-500 text-sm">No users found for "{query}"</p>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-3">
            {results.map((user) => (
              <div key={user.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
                <Link href={`/profile/${user.username}`} className="shrink-0">
                  {user.image ? (
                    <img src={user.image} alt={user.username} className="w-12 h-12 rounded-full object-cover border border-zinc-700" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl font-black text-white">
                      {(user.name ?? user.username)[0].toUpperCase()}
                    </div>
                  )}
                </Link>

                <Link href={`/profile/${user.username}`} className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{user.name ?? user.username}</p>
                  <p className="text-zinc-500 text-xs">@{user.username}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-600">
                    <span>{user._count.followers} followers</span>
                    <span>{user.wins} wins</span>
                    <span>{user.points} pts</span>
                  </div>
                </Link>

                <div className="shrink-0">
                  <FollowButton
                    userId={user.id}
                    initialFollowing={user.isFollowing}
                    className="px-4 py-2 rounded-full text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
