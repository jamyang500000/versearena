"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Flag, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const REPORT_REASONS = [
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "HATE_SPEECH", label: "Hate speech" },
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "FAKE_ACCOUNT", label: "Fake account" },
  { value: "OTHER", label: "Other" },
];

export default function ProfileMenu({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [reported, setReported] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function submitReport() {
    if (!reason) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details }),
      });
      if (res.ok) {
        setReported(true);
        toast.success("Report submitted — thanks for keeping VerseArena safe");
        setTimeout(() => { setShowReport(false); setReported(false); setReason(""); setDetails(""); }, 1500);
      } else {
        toast.error("Failed to submit report");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-800 transition text-zinc-400 hover:text-white"
      >
        <MoreVertical size={20} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-44 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl z-50">
          <button
            onClick={() => { setOpen(false); setShowReport(true); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-800 transition text-left"
          >
            <Flag size={16} className="text-yellow-400" />
            <span className="text-sm font-semibold text-white">Report user</span>
          </button>
        </div>
      )}

      {showReport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowReport(false)} />
          <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 pb-8">
            {reported ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <CheckCircle size={40} className="text-green-400" />
                <p className="text-white font-bold">Report submitted</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-black text-lg">Report user</h3>
                  <button onClick={() => setShowReport(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
                </div>
                <p className="text-zinc-400 text-sm mb-4">Why are you reporting this account?</p>
                <div className="space-y-2 mb-4">
                  {REPORT_REASONS.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setReason(r.value)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition text-left ${
                        reason === r.value ? "border-yellow-400 bg-yellow-400/10 text-yellow-400" : "border-zinc-800 text-white hover:border-zinc-700"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${reason === r.value ? "border-yellow-400" : "border-zinc-600"}`}>
                        {reason === r.value && <div className="w-2 h-2 rounded-full bg-yellow-400" />}
                      </div>
                      <span className="text-sm font-semibold">{r.label}</span>
                    </button>
                  ))}
                </div>
                {reason === "OTHER" && (
                  <textarea
                    value={details}
                    onChange={e => setDetails(e.target.value)}
                    placeholder="Tell us more..."
                    rows={3}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-yellow-400 transition mb-4"
                  />
                )}
                <button
                  onClick={submitReport}
                  disabled={!reason || loading}
                  className="w-full py-3 bg-yellow-400 text-black font-black rounded-xl hover:bg-yellow-300 transition disabled:opacity-40"
                >
                  {loading ? "Submitting..." : "Submit Report"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
