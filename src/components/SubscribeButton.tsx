"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface SubscribeButtonProps {
  creatorId: string;
  tier: "SUPPORTER" | "SUPERFAN" | "RIDE_OR_DIE";
  coinCost: number;
  isCurrentTier: boolean;
  isSubscribed: boolean;
  myCoins: number;
}

export default function SubscribeButton({
  creatorId,
  tier,
  coinCost,
  isCurrentTier,
  isSubscribed,
  myCoins,
}: SubscribeButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    if (myCoins < coinCost) {
      toast.error(`Need ${coinCost} coins — you have ${myCoins}`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, tier }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Subscribed! 🎉");
        window.location.reload();
      } else {
        toast.error(data.error || "Failed to subscribe");
      }
    } finally {
      setLoading(false);
    }
  }

  if (isCurrentTier) {
    return (
      <span className="px-3 py-1.5 bg-yellow-400/20 text-yellow-400 text-xs font-bold rounded-full">
        Current
      </span>
    );
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading || myCoins < coinCost}
      className="px-4 py-1.5 bg-yellow-400 text-black text-xs font-bold rounded-full hover:bg-yellow-300 transition disabled:opacity-50"
    >
      {loading ? "..." : isSubscribed ? "Switch" : "Subscribe"}
    </button>
  );
}
