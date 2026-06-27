"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

interface User {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
}

export default function NewMessagePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (Array.isArray(data)) setResults(data);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function startConversation(userId: string) {
    setStarting(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const conv = await res.json();
        router.push(`/messages/${conv.id}`);
      } else {
        toast.error("Couldn't start conversation");
      }
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white transition">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 flex items-center gap-2 bg-zinc-900 rounded-2xl px-3 py-2 border border-zinc-800 focus-within:border-yellow-400 transition">
          <Search size={15} className="text-zinc-500" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search people..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-zinc-600"
          />
        </div>
      </header>

      <div className="divide-y divide-zinc-800/60">
        {results.map(user => (
          <button
            key={user.id}
            onClick={() => startConversation(user.id)}
            disabled={starting}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-zinc-900/50 transition text-left"
          >
            {user.image ? (
              <img src={user.image} className="w-12 h-12 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-black text-white shrink-0">
                {(user.name ?? user.username)[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-white font-semibold text-sm">{user.name ?? user.username}</p>
              <p className="text-zinc-500 text-xs">@{user.username}</p>
            </div>
          </button>
        ))}

        {!loading && query && results.length === 0 && (
          <p className="text-center text-zinc-600 text-sm py-16">No users found</p>
        )}

        {!query && (
          <p className="text-center text-zinc-600 text-sm py-16">Type a name to search</p>
        )}
      </div>
    </div>
  );
}
