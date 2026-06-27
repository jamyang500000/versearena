"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

interface ChatMsg {
  id: string;
  userId: string;
  username: string;
  content: string;
  type: "TEXT" | "GIFT" | "SYSTEM" | "VOTE";
  createdAt: string;
}

interface AudienceChatProps {
  battleId: string;
  currentUserId?: string;
}

export default function AudienceChat({ battleId, currentUserId }: AudienceChatProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Poll for new messages (Socket.io can be wired later for true real-time)
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [battleId]);

  async function fetchMessages() {
    const res = await fetch(`/api/battles/${battleId}/chat`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !currentUserId || sending) return;
    setSending(true);
    try {
      await fetch(`/api/battles/${battleId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      });
      setInput("");
      await fetchMessages();
    } finally {
      setSending(false);
    }
  }

  const unread = messages.length;

  return (
    <div className="bg-zinc-950">
      {/* Toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-sm text-zinc-400 hover:text-white transition"
      >
        <span className="font-semibold">
          💬 Live Chat {!open && unread > 0 && <span className="ml-1 text-yellow-400">({unread})</span>}
        </span>
        <span className="text-xs">{open ? "▼" : "▲"}</span>
      </button>

      {open && (
        <>
          {/* Messages */}
          <div className="h-48 overflow-y-auto px-3 py-2 space-y-1.5">
            {messages.length === 0 && (
              <p className="text-zinc-600 text-xs text-center pt-4">
                No messages yet — start the hype! 🔥
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className="flex gap-1.5 items-start">
                {m.type === "SYSTEM" ? (
                  <p className="text-yellow-400/70 text-xs italic w-full text-center">{m.content}</p>
                ) : m.type === "GIFT" ? (
                  <p className="text-pink-400 text-xs w-full">
                    🎁 <span className="font-bold">{m.username}</span>: {m.content}
                  </p>
                ) : (
                  <>
                    <span className="text-yellow-400 font-bold text-xs flex-shrink-0">{m.username}</span>
                    <span className="text-zinc-300 text-xs leading-relaxed">{m.content}</span>
                  </>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {currentUserId ? (
            <form onSubmit={sendMessage} className="flex gap-2 px-3 pb-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Say something..."
                maxLength={200}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-full px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400 transition"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="p-2 bg-yellow-400 text-black rounded-full hover:bg-yellow-300 transition disabled:opacity-50"
              >
                <Send size={14} />
              </button>
            </form>
          ) : (
            <p className="text-zinc-600 text-xs text-center pb-3">Sign in to chat</p>
          )}
        </>
      )}
    </div>
  );
}
