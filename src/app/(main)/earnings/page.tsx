"use client";

import { useEffect, useState } from "react";
import { Coins, TrendingUp, Gift, Clock, CheckCircle, XCircle, Banknote, AlertCircle, ChevronRight, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface PayoutRequest {
  id: string;
  coins: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  note: string | null;
  adminNote: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  PENDING:  { label: "Pending",  icon: <Clock size={14} />,        color: "text-yellow-400 bg-yellow-400/10" },
  APPROVED: { label: "Approved", icon: <CheckCircle size={14} />,  color: "text-green-400 bg-green-400/10"  },
  REJECTED: { label: "Rejected", icon: <XCircle size={14} />,      color: "text-red-400 bg-red-400/10"      },
  PAID:     { label: "Paid",     icon: <Banknote size={14} />,     color: "text-blue-400 bg-blue-400/10"    },
};

export default function EarningsPage() {
  const router = useRouter();
  const [coins, setCoins] = useState(0);
  const [earningsCoins, setEarningsCoins] = useState(0);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Payout form
  const [showForm, setShowForm] = useState(false);
  const [payoutCoins, setPayoutCoins] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function fetchData() {
    const res = await fetch("/api/payout-requests");
    if (res.ok) {
      const data = await res.json();
      setCoins(data.coins);
      setEarningsCoins(data.earningsCoins);
      setRequests(data.requests);
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const hasPending = requests.some(r => r.status === "PENDING");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseInt(payoutCoins);
    if (!amount || amount < 100) { toast.error("Minimum payout is 100 coins"); return; }
    if (amount > earningsCoins) { toast.error("Not enough earnings coins"); return; }

    setSubmitting(true);
    const res = await fetch("/api/payout-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coins: amount, note: payoutNote }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) { toast.error(data.error ?? "Failed to submit request"); return; }

    toast.success("Payout request submitted!");
    setShowForm(false);
    setPayoutCoins("");
    setPayoutNote("");
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-0 py-3 -mx-4 px-4 mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Coins size={20} className="text-yellow-400" />
          Earnings
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">70% of all gifts go to you</p>
      </header>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
            <Coins size={13} />
            Coin Balance
          </div>
          <p className="text-2xl font-black text-white">{coins.toLocaleString()}</p>
          <p className="text-xs text-zinc-500 mt-1">Spendable coins</p>
        </div>
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
            <TrendingUp size={13} />
            Gift Earnings
          </div>
          <p className="text-2xl font-black text-yellow-400">{earningsCoins.toLocaleString()}</p>
          <p className="text-xs text-zinc-500 mt-1">Available for payout</p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Gift size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white mb-1">How earnings work</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              When fans send you gifts during battles, you earn <span className="text-yellow-400 font-bold">70%</span> of the coin value.
              Accumulated earnings can be requested as a payout — we&apos;ll contact you directly to arrange payment.
            </p>
          </div>
        </div>
      </div>

      {/* Buy more coins shortcut */}
      <button
        onClick={() => router.push("/coins")}
        className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4 hover:border-zinc-600 transition text-left"
      >
        <ShoppingCart size={18} className="text-yellow-400" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Buy More Coins</p>
          <p className="text-xs text-zinc-500">Top up your balance to send gifts</p>
        </div>
        <ChevronRight size={16} className="text-zinc-600" />
      </button>

      {/* Request payout button */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          disabled={earningsCoins < 100 || hasPending}
          className="w-full py-3 rounded-2xl bg-yellow-400 text-black font-bold text-sm mb-6 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-yellow-300 transition"
        >
          {hasPending ? "Payout Request Pending…" : earningsCoins < 100 ? `Earn ${100 - earningsCoins} more coins to request payout` : "Request Payout"}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6 space-y-4">
          <h2 className="font-bold text-white">Request Payout</h2>
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Coins to cash out (max {earningsCoins})</label>
            <input
              type="number"
              min={100}
              max={earningsCoins}
              value={payoutCoins}
              onChange={e => setPayoutCoins(e.target.value)}
              placeholder="e.g. 500"
              className="w-full bg-zinc-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400"
              required
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Payment info (how should we pay you?)</label>
            <textarea
              value={payoutNote}
              onChange={e => setPayoutNote(e.target.value)}
              placeholder="e.g. Cash App $username, or bank transfer — include your contact info"
              className="w-full bg-zinc-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400 resize-none"
              rows={3}
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-semibold hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300 transition disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </form>
      )}

      {/* Payout history */}
      <h2 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
        <Clock size={14} />
        Payout History
      </h2>

      {requests.length === 0 ? (
        <div className="text-center py-12 text-zinc-600">
          <Banknote size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No payout requests yet</p>
          <p className="text-xs mt-1">Earn coins from gifts during battles to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => {
            const s = STATUS_STYLES[r.status];
            return (
              <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-lg">{r.coins.toLocaleString()} coins</span>
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${s.color}`}>
                    {s.icon} {s.label}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">{new Date(r.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}</p>
                {r.note && (
                  <p className="text-xs text-zinc-400 mt-2 border-t border-zinc-800 pt-2">{r.note}</p>
                )}
                {r.adminNote && (
                  <div className="mt-2 border-t border-zinc-800 pt-2 flex items-start gap-2">
                    <AlertCircle size={13} className="text-zinc-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-zinc-400">{r.adminNote}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
