"use client";

import { useState, useEffect } from "react";
import { GIFT_CATALOG } from "@/lib/coins";
import toast from "react-hot-toast";

interface GiftPanelProps {
  battleId: string;
  challengerId: string;
  opponentId: string;
  challengerName: string;
  opponentName: string;
  currentUserId: string;
}

interface FloatingGift {
  id: string;
  emoji: string;
  x: number;
}

export default function GiftPanel({
  battleId,
  challengerId,
  opponentId,
  challengerName,
  opponentName,
  currentUserId,
}: GiftPanelProps) {
  const [coins, setCoins] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [floating, setFloating] = useState<FloatingGift[]>([]);
  const [target, setTarget] = useState<string>(challengerId);

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((u) => setCoins(u.coins));
  }, []);

  async function sendGift(giftType: string, cost: number, emoji: string) {
    if (coins !== null && coins < cost) {
      toast.error("Not enough coins!");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleId, receiverId: target, giftType }),
      });
      const data = await res.json();
      if (res.ok) {
        setCoins(data.newBalance);
        toast.success(`Gift sent! 🎁`);
        // Trigger floating animation
        const id = Math.random().toString(36).slice(2);
        const x = Math.random() * 80 + 10;
        setFloating((f) => [...f, { id, emoji, x }]);
        setTimeout(() => setFloating((f) => f.filter((g) => g.id !== id)), 2500);
      } else {
        toast.error(data.error || "Failed to send gift");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative">
      {/* Floating gift animations */}
      {floating.map((g) => (
        <div
          key={g.id}
          className="absolute bottom-full text-3xl pointer-events-none animate-float"
          style={{
            left: `${g.x}%`,
            animation: "floatUp 2.5s ease-out forwards",
          }}
        >
          {g.emoji}
        </div>
      ))}

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-zinc-400 text-xs font-semibold">Send a Gift</p>
          {coins !== null && (
            <span className="text-yellow-400 text-xs font-bold">💰 {coins} coins</span>
          )}
        </div>

        {/* Target selector */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTarget(challengerId)}
            className={`flex-1 py-1.5 rounded-full text-xs font-bold transition ${
              target === challengerId
                ? "bg-yellow-400 text-black"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {challengerName}
          </button>
          <button
            onClick={() => setTarget(opponentId)}
            className={`flex-1 py-1.5 rounded-full text-xs font-bold transition ${
              target === opponentId
                ? "bg-yellow-400 text-black"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {opponentName}
          </button>
        </div>

        {/* Gift buttons */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {GIFT_CATALOG.map((gift) => (
            <button
              key={gift.type}
              onClick={() => sendGift(gift.type, gift.cost, gift.emoji)}
              disabled={sending || (coins !== null && coins < gift.cost)}
              className="flex-shrink-0 flex flex-col items-center gap-1 p-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition disabled:opacity-40"
            >
              <span className="text-xl">{gift.emoji}</span>
              <span className="text-zinc-300 text-xs">{gift.label}</span>
              <span className="text-yellow-400 text-xs font-bold">{gift.cost}</span>
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-120px) scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
