"use client";

import { useState, useEffect } from "react";
import { Coins, Zap, CheckCircle } from "lucide-react";
import { COIN_PACKAGES } from "@/lib/coin-packages";
import toast from "react-hot-toast";

export default function BuyCoinsPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users/me")
      .then(r => r.json())
      .then(u => setBalance(u.coins ?? 0));
  }, []);

  async function handleBuy(packageId: string) {
    setLoading(packageId);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId }),
    });
    const data = await res.json();
    setLoading(null);

    if (!res.ok) {
      if (res.status === 503) {
        toast.error("Coin purchases coming soon! 🚀");
      } else {
        toast.error(data.error ?? "Something went wrong");
      }
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 -mx-4 px-4 py-3 mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Coins size={20} className="text-yellow-400" />
          Buy Coins
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Use coins to send gifts during battles
        </p>
      </header>

      {/* Current balance */}
      {balance !== null && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-yellow-400/10 flex items-center justify-center">
            <Coins size={18} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Your balance</p>
            <p className="text-xl font-black text-yellow-400">{balance.toLocaleString()} coins</p>
          </div>
        </div>
      )}

      {/* Packages */}
      <div className="space-y-3">
        {COIN_PACKAGES.map(pkg => (
          <button
            key={pkg.id}
            onClick={() => handleBuy(pkg.id)}
            disabled={!!loading}
            className={`w-full rounded-2xl border p-4 flex items-center gap-4 text-left transition relative overflow-hidden disabled:opacity-60 ${
              pkg.highlight
                ? "bg-yellow-400/5 border-yellow-400/50 hover:border-yellow-400"
                : "bg-zinc-900 border-zinc-800 hover:border-zinc-600"
            }`}
          >
            {/* Badge */}
            {"badge" in pkg && (
              <span className={`absolute top-3 right-3 text-[10px] font-black px-2 py-0.5 rounded-full ${
                pkg.highlight ? "bg-yellow-400 text-black" : "bg-zinc-700 text-zinc-300"
              }`}>
                {pkg.badge}
              </span>
            )}

            {/* Emoji */}
            <span className="text-3xl">{pkg.emoji}</span>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-base ${pkg.highlight ? "text-yellow-400" : "text-white"}`}>
                {pkg.coins.toLocaleString()} coins
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">{pkg.label} — {pkg.description}</p>
            </div>

            {/* Price */}
            <div className="text-right flex-shrink-0 mr-8">
              <p className="font-black text-white text-lg">${pkg.priceUsd}</p>
              {loading === pkg.id ? (
                <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mt-1 ml-auto" />
              ) : null}
            </div>
          </button>
        ))}
      </div>

      {/* How it works */}
      <div className="mt-8 space-y-3">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">How it works</p>
        {[
          "Choose a coin package and pay securely via card",
          "Coins are added to your balance instantly",
          "Send gifts to rappers during live battles",
          "Creators earn 70% of every gift you send",
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <CheckCircle size={15} className="text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-zinc-400">{step}</p>
          </div>
        ))}
      </div>

      {/* Security note */}
      <div className="mt-6 flex items-center gap-2 text-xs text-zinc-600">
        <Zap size={12} />
        <span>Payments processed securely by Stripe. We never store your card details.</span>
      </div>
    </div>
  );
}
