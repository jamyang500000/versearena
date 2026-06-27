"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Coins } from "lucide-react";

export default function CoinsSuccessPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    // Refresh balance after successful payment
    setTimeout(() => {
      fetch("/api/users/me")
        .then(r => r.json())
        .then(u => setBalance(u.coins ?? 0));
    }, 1500); // slight delay for webhook to process
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-green-400/10 flex items-center justify-center mb-6">
        <CheckCircle size={40} className="text-green-400" />
      </div>

      <h1 className="text-2xl font-black text-white mb-2">Payment Successful!</h1>
      <p className="text-zinc-400 text-sm mb-6">
        Your coins have been added to your balance.
      </p>

      {balance !== null && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 flex items-center gap-3 mb-8">
          <Coins size={20} className="text-yellow-400" />
          <div className="text-left">
            <p className="text-xs text-zinc-500">New balance</p>
            <p className="text-2xl font-black text-yellow-400">{balance.toLocaleString()} coins</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => router.push("/battle")}
          className="w-full py-3 rounded-2xl bg-yellow-400 text-black font-bold"
        >
          Go Watch a Battle
        </button>
        <button
          onClick={() => router.push("/coins")}
          className="w-full py-3 rounded-2xl border border-zinc-700 text-zinc-400 font-semibold text-sm"
        >
          Buy More Coins
        </button>
      </div>
    </div>
  );
}
