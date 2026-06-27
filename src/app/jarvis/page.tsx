"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Shield, Coins, Users, Flag, Clock, CheckCircle, XCircle,
  Banknote, ChevronDown, ChevronUp, AlertTriangle, RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

type Tab = "payouts" | "users" | "reports";

interface PayoutRequest {
  id: string;
  coins: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  note: string | null;
  adminNote: string | null;
  createdAt: string;
  user: { id: string; username: string; email: string; name: string | null; image: string | null };
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  name: string | null;
  image: string | null;
  coins: number;
  earningsCoins: number;
  wins: number;
  losses: number;
  createdAt: string;
  _count: { posts: number; giftsSent: number; giftsReceived: number; payoutRequests: number };
}

interface Report {
  id: string;
  reason: string;
  details: string | null;
  createdAt: string;
  reporter: { id: string; username: string; image: string | null };
  reported: { id: string; username: string; image: string | null };
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:  "bg-yellow-400/10 text-yellow-400",
  APPROVED: "bg-green-400/10 text-green-400",
  REJECTED: "bg-red-400/10 text-red-400",
  PAID:     "bg-blue-400/10 text-blue-400",
};

export default function JarvisPage() {
  const [tab, setTab] = useState<Tab>("payouts");
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  // Payout action state
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);

  async function fetchPayouts() {
    const res = await fetch("/api/admin/payout-requests");
    if (res.status === 403) { setForbidden(true); setLoading(false); return; }
    if (res.ok) setPayouts(await res.json());
    setLoading(false);
  }

  async function fetchUsers() {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
  }

  async function fetchReports() {
    const res = await fetch("/api/admin/reports");
    if (res.ok) setReports(await res.json());
  }

  useEffect(() => {
    fetchPayouts();
    fetchUsers();
    fetchReports();
  }, []);

  async function handlePayoutAction(id: string, status: "APPROVED" | "REJECTED" | "PAID") {
    setActioning(id);
    const res = await fetch(`/api/admin/payout-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNote }),
    });
    const data = await res.json();
    setActioning(null);
    if (!res.ok) { toast.error(data.error ?? "Action failed"); return; }
    toast.success(`Request ${status.toLowerCase()}`);
    setExpanded(null);
    setAdminNote("");
    fetchPayouts();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertTriangle size={48} className="text-red-500" />
        <h1 className="text-2xl font-black text-white">Access Denied</h1>
        <p className="text-zinc-400 text-sm">You are not authorised to access this panel.</p>
      </div>
    );
  }

  const pendingPayouts = payouts.filter(p => p.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-yellow-400" />
            <h1 className="font-black text-lg tracking-tight">JARVIS</h1>
            <span className="text-xs text-zinc-500 font-mono">admin panel</span>
          </div>
          <button onClick={() => { fetchPayouts(); fetchUsers(); fetchReports(); }} className="text-zinc-500 hover:text-white transition">
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center">
            <p className="text-2xl font-black text-yellow-400">{pendingPayouts}</p>
            <p className="text-xs text-zinc-500 mt-1">Pending payouts</p>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center">
            <p className="text-2xl font-black text-white">{users.length}</p>
            <p className="text-xs text-zinc-500 mt-1">Total users</p>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center">
            <p className="text-2xl font-black text-red-400">{reports.length}</p>
            <p className="text-xs text-zinc-500 mt-1">Reports</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-zinc-900 p-1 rounded-2xl">
          {(["payouts", "users", "reports"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition ${
                tab === t ? "bg-yellow-400 text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              {t === "payouts" ? `Payouts${pendingPayouts > 0 ? ` (${pendingPayouts})` : ""}` : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Payouts tab */}
        {tab === "payouts" && (
          <div className="space-y-3">
            {payouts.length === 0 && (
              <p className="text-center text-zinc-600 py-12 text-sm">No payout requests yet</p>
            )}
            {payouts.map(p => (
              <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <button
                  className="w-full p-4 flex items-center gap-3 text-left"
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                >
                  {p.user.image ? (
                    <Image src={p.user.image} alt="" width={36} height={36} className="rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold">
                      {p.user.username[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">@{p.user.username}</p>
                    <p className="text-xs text-zinc-500 truncate">{p.user.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-yellow-400">{p.coins.toLocaleString()} coins</p>
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${STATUS_BADGE[p.status]}`}>
                      {p.status}
                    </span>
                  </div>
                  {expanded === p.id ? <ChevronUp size={16} className="text-zinc-500 flex-shrink-0" /> : <ChevronDown size={16} className="text-zinc-500 flex-shrink-0" />}
                </button>

                {expanded === p.id && (
                  <div className="border-t border-zinc-800 p-4 space-y-3">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Submitted</p>
                      <p className="text-sm text-white">{new Date(p.createdAt).toLocaleString()}</p>
                    </div>
                    {p.note && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Payment info from creator</p>
                        <p className="text-sm text-white bg-zinc-800 rounded-xl p-3">{p.note}</p>
                      </div>
                    )}
                    {p.adminNote && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Admin note</p>
                        <p className="text-sm text-white bg-zinc-800 rounded-xl p-3">{p.adminNote}</p>
                      </div>
                    )}
                    {p.status === "PENDING" && (
                      <>
                        <div>
                          <label className="text-xs text-zinc-500 mb-1 block">Add a note (optional)</label>
                          <input
                            value={adminNote}
                            onChange={e => setAdminNote(e.target.value)}
                            placeholder="e.g. Payment sent via Cash App"
                            className="w-full bg-zinc-800 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePayoutAction(p.id, "APPROVED")}
                            disabled={!!actioning}
                            className="flex-1 py-2 rounded-xl bg-green-500/20 text-green-400 text-sm font-semibold hover:bg-green-500/30 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <CheckCircle size={14} /> Approve
                          </button>
                          <button
                            onClick={() => handlePayoutAction(p.id, "PAID")}
                            disabled={!!actioning}
                            className="flex-1 py-2 rounded-xl bg-blue-500/20 text-blue-400 text-sm font-semibold hover:bg-blue-500/30 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <Banknote size={14} /> Mark Paid
                          </button>
                          <button
                            onClick={() => handlePayoutAction(p.id, "REJECTED")}
                            disabled={!!actioning}
                            className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      </>
                    )}
                    {p.status === "APPROVED" && (
                      <button
                        onClick={() => handlePayoutAction(p.id, "PAID")}
                        disabled={!!actioning}
                        className="w-full py-2 rounded-xl bg-blue-500/20 text-blue-400 text-sm font-semibold hover:bg-blue-500/30 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Banknote size={14} /> Mark as Paid
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Users tab */}
        {tab === "users" && (
          <div className="space-y-3">
            {users.map(u => (
              <div key={u.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
                {u.image ? (
                  <Image src={u.image} alt="" width={40} height={40} className="rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {u.username[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">@{u.username}</p>
                  <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                  <div className="flex gap-3 mt-1 text-xs text-zinc-600">
                    <span className="text-green-400">{u.wins}W</span>
                    <span className="text-red-400">{u.losses}L</span>
                    <span>{u._count.posts} posts</span>
                    <span>{u._count.giftsReceived} gifts rcv</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-yellow-400 font-bold text-sm">{u.coins.toLocaleString()}</p>
                  <p className="text-xs text-zinc-500">coins</p>
                  <p className="text-blue-400 font-semibold text-xs mt-1">{u.earningsCoins.toLocaleString()} earnings</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reports tab */}
        {tab === "reports" && (
          <div className="space-y-3">
            {reports.length === 0 && (
              <p className="text-center text-zinc-600 py-12 text-sm">No reports yet</p>
            )}
            {reports.map(r => (
              <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Flag size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">
                      <span className="text-yellow-400">@{r.reporter.username}</span>
                      <span className="text-zinc-500"> reported </span>
                      <span className="text-red-400">@{r.reported.username}</span>
                    </p>
                    <span className="inline-block mt-1 text-xs font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-lg">
                      {r.reason.replace(/_/g, " ")}
                    </span>
                    {r.details && (
                      <p className="text-xs text-zinc-400 mt-2">{r.details}</p>
                    )}
                    <p className="text-xs text-zinc-600 mt-2">{new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
