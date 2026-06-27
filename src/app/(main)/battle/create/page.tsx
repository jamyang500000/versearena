"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Sword } from "lucide-react";

export default function CreateBattlePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/battles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const battle = await res.json();
        toast.success("Battle room created! Share the code to invite an opponent.");
        router.push(`/battle/${battle.roomCode}`);
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to create battle");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-yellow-400/10 flex items-center justify-center mx-auto mb-4">
          <Sword size={28} className="text-yellow-400" />
        </div>
        <h1 className="text-2xl font-black text-white">Issue a Challenge</h1>
        <p className="text-zinc-500 text-sm mt-2">
          Create a battle room. Anyone can join and your opponent accepts the challenge.
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-5">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Battle Title (optional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. East vs West, Battle for the Crown..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition"
          />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
          <p className="text-white font-semibold text-sm">Rules</p>
          <ul className="text-zinc-500 text-xs space-y-1">
            <li>• Each battler gets 60 seconds to drop their verse</li>
            <li>• Audience votes decide the winner</li>
            <li>• Winner earns 100 ranking points</li>
            <li>• Audience can send gifts during the battle</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-yellow-400 text-black font-black rounded-xl hover:bg-yellow-300 transition disabled:opacity-50 text-lg"
        >
          {loading ? "Creating..." : "🎤 Enter the Arena"}
        </button>
      </form>
    </div>
  );
}
