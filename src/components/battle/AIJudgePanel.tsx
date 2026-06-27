"use client";

import { useState } from "react";
import { Bot, Zap } from "lucide-react";
import toast from "react-hot-toast";

interface AIJudgePanelProps {
  roomCode: string;
  challengerName: string;
  opponentName: string;
  isParticipant: boolean;
}

interface JudgeScore {
  flow: number;
  lyrics: number;
  delivery: number;
  total: number;
}

interface JudgeResult {
  winnerId: string;
  analysis: string;
  scores: { challenger: JudgeScore; opponent: JudgeScore };
  provider: string;
}

export default function AIJudgePanel({
  roomCode,
  challengerName,
  opponentName,
  isParticipant,
}: AIJudgePanelProps) {
  const [open, setOpen] = useState(false);
  const [challengerLyrics, setChallengerLyrics] = useState("");
  const [opponentLyrics, setOpponentLyrics] = useState("");
  const [provider, setProvider] = useState<"claude" | "openai">("claude");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<JudgeResult | null>(null);

  async function handleJudge() {
    if (!challengerLyrics.trim() || !opponentLyrics.trim()) {
      toast.error("Enter lyrics for both battlers");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai-judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, challengerLyrics, opponentLyrics, provider }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.result);
        toast.success("AI Judge has spoken! 🤖");
      } else {
        toast.error(data.error || "AI judging failed");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!isParticipant) return null;

  return (
    <div className="border border-zinc-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 transition text-left"
      >
        <Bot size={16} className="text-yellow-400" />
        <span className="text-white font-semibold text-sm">AI Judge</span>
        <span className="ml-auto text-xs text-zinc-500">{open ? "▼" : "▲"}</span>
      </button>

      {open && (
        <div className="p-4 bg-zinc-950 space-y-4">
          {result ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Bot size={20} className="text-yellow-400" />
                <p className="font-bold text-white">Judge&apos;s Verdict</p>
                <span className="ml-auto text-xs text-zinc-500 capitalize">{result.provider}</span>
              </div>
              <p className="text-zinc-300 text-sm italic">&quot;{result.analysis}&quot;</p>

              <div className="grid grid-cols-2 gap-3">
                {(["challenger", "opponent"] as const).map((key) => {
                  const score = result.scores[key];
                  const name = key === "challenger" ? challengerName : opponentName;
                  return (
                    <div key={key} className="bg-zinc-900 rounded-xl p-3">
                      <p className="font-bold text-white text-sm mb-2">{name}</p>
                      {[
                        { label: "Flow", value: score.flow },
                        { label: "Lyrics", value: score.lyrics },
                        { label: "Delivery", value: score.delivery },
                      ].map(({ label, value }) => (
                        <div key={label} className="mb-1.5">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-zinc-400">{label}</span>
                            <span className="text-white font-bold">{value}/10</span>
                          </div>
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-400 rounded-full"
                              style={{ width: `${value * 10}%` }}
                            />
                          </div>
                        </div>
                      ))}
                      <div className="mt-2 pt-2 border-t border-zinc-800">
                        <p className="text-yellow-400 font-black text-sm">Total: {score.total}/30</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-zinc-400 text-xs">
                Submit the verses for AI judging. Copy/paste or type what was said.
              </p>

              {/* Provider toggle */}
              <div className="flex gap-2">
                {(["claude", "openai"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`flex-1 py-1.5 rounded-full text-xs font-bold transition ${
                      provider === p
                        ? "bg-yellow-400 text-black"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {p === "claude" ? "🤖 Claude" : "⚡ GPT-4o"}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">{challengerName}&apos;s verse</label>
                <textarea
                  value={challengerLyrics}
                  onChange={(e) => setChallengerLyrics(e.target.value)}
                  rows={3}
                  placeholder="Paste their lyrics here..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400 transition resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">{opponentName}&apos;s verse</label>
                <textarea
                  value={opponentLyrics}
                  onChange={(e) => setOpponentLyrics(e.target.value)}
                  rows={3}
                  placeholder="Paste their lyrics here..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400 transition resize-none"
                />
              </div>

              <button
                onClick={handleJudge}
                disabled={loading}
                className="w-full py-2.5 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Zap size={16} />
                {loading ? "Judging..." : "Get AI Verdict"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
