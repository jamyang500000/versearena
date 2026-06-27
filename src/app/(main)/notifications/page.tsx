"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";

const TYPE_ICONS: Record<string, string> = {
  LIKE: "❤️",
  COMMENT: "💬",
  FOLLOW: "👤",
  BATTLE_REQUEST: "⚔️",
  BATTLE_INVITE: "⚔️",
  BATTLE_RESULT: "🏆",
  GIFT_RECEIVED: "🎁",
  TOURNAMENT_START: "🏟️",
  CREW_INVITE: "🛡️",
  SUBSCRIPTION: "⭐",
};

interface FromUser {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: string;
  fromUser: FromUser | null;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function markAllRead() {
    if (unreadCount === 0 || marking) return;
    setMarking(true);
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    setMarking(false);
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Bell size={20} className="text-yellow-400" />
          Notifications
          {unreadCount > 0 && (
            <span className="bg-yellow-400 text-black text-xs font-black rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={marking}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-yellow-400 transition disabled:opacity-50"
          >
            <Check size={13} />
            Mark all read
          </button>
        )}
      </header>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center px-6">
          <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
            <Bell size={28} className="text-zinc-600" />
          </div>
          <p className="text-white font-semibold mb-1">No notifications yet</p>
          <p className="text-zinc-500 text-sm">When someone likes, comments, or follows you — it'll show up here</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/50">
          {notifications.map(n => {
            const inner = (
              <div
                className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${
                  !n.read ? "bg-yellow-400/5 hover:bg-yellow-400/8" : "hover:bg-zinc-900/50"
                }`}
              >
                {/* Avatar + type badge */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full bg-zinc-800 overflow-hidden">
                    {n.fromUser?.image ? (
                      <img src={n.fromUser.image} className="w-full h-full object-cover" alt="" />
                    ) : n.fromUser ? (
                      <div className="w-full h-full flex items-center justify-center text-base font-black text-white">
                        {(n.fromUser.name ?? n.fromUser.username)[0].toUpperCase()}
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">
                        {TYPE_ICONS[n.type] ?? "🔔"}
                      </div>
                    )}
                  </div>
                  {n.fromUser && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center text-xs border border-zinc-800">
                      {TYPE_ICONS[n.type] ?? "🔔"}
                    </span>
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!n.read ? "text-white" : "text-zinc-300"}`}>
                    {n.message}
                  </p>
                  <p className="text-zinc-600 text-xs mt-0.5">{timeAgo(n.createdAt)}</p>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-yellow-400 shrink-0 mt-1.5" />
                )}
              </div>
            );

            return n.link ? (
              <Link key={n.id} href={n.link}>{inner}</Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
