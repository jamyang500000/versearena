"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Search } from "lucide-react";

interface OtherUser {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
}

interface Conversation {
  id: string;
  other: OtherUser;
  unread: number;
  lastMessageAt: string;
  preview: string;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/messages")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setConversations(data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <MessageCircle size={20} className="text-yellow-400" />
          Messages
        </h1>
        <Link href="/messages/new" className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 hover:border-yellow-400 transition">
          <Search size={16} className="text-zinc-400" />
        </Link>
      </header>

      {loading && (
        <div className="space-y-0 divide-y divide-zinc-800">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-4 animate-pulse">
              <div className="w-14 h-14 rounded-full bg-zinc-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-zinc-800 rounded w-1/3" />
                <div className="h-2 bg-zinc-800 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && conversations.length === 0 && (
        <div className="text-center py-24">
          <MessageCircle size={48} className="text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400 font-semibold">No messages yet</p>
          <p className="text-zinc-600 text-sm mt-1">Search for a rapper and start a conversation</p>
          <Link href="/messages/new" className="inline-block mt-6 px-6 py-3 bg-yellow-400 text-black font-bold rounded-full hover:bg-yellow-300 transition text-sm">
            New Message
          </Link>
        </div>
      )}

      {!loading && conversations.length > 0 && (
        <div className="divide-y divide-zinc-800/60">
          {conversations.map(conv => (
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              className="flex items-center gap-3 px-4 py-4 hover:bg-zinc-900/50 transition"
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                {conv.other.image ? (
                  <img src={conv.other.image} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-black text-white">
                    {(conv.other.name ?? conv.other.username)[0].toUpperCase()}
                  </div>
                )}
                {conv.unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-yellow-400 text-black text-xs font-black rounded-full flex items-center justify-center">
                    {conv.unread > 9 ? "9+" : conv.unread}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`font-semibold text-sm truncate ${conv.unread > 0 ? "text-white" : "text-zinc-300"}`}>
                    {conv.other.name ?? conv.other.username}
                  </p>
                  <span className="text-zinc-600 text-xs ml-2 shrink-0">{timeAgo(conv.lastMessageAt)}</span>
                </div>
                <p className={`text-xs truncate mt-0.5 ${conv.unread > 0 ? "text-zinc-300 font-medium" : "text-zinc-600"}`}>
                  {conv.preview}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
