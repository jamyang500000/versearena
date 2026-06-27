"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sword, PlusSquare, Bell, MessageCircle, User, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/feed",          icon: Home,          label: "Feed"         },
  { href: "/battle",        icon: Sword,         label: "Battle"       },
  { href: "/upload",        icon: PlusSquare,    label: "Post"         },
  { href: "/crews",         icon: Users,         label: "Crews"        },
  { href: "/notifications", icon: Bell,          label: "Alerts"       },
  { href: "/messages",      icon: MessageCircle, label: "Messages"     },
  { href: "/profile",       icon: User,          label: "Profile"      },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchUnread() {
      try {
        const [notifRes, msgRes] = await Promise.all([
          fetch("/api/notifications"),
          fetch("/api/messages"),
        ]);
        if (cancelled) return;
        if (notifRes.ok) {
          const data = await notifRes.json();
          setUnread(data.unreadCount ?? 0);
        }
        if (msgRes.ok) {
          const convos = await msgRes.json();
          const count = convos.reduce((sum: number, c: { unread: number }) => sum + (c.unread ?? 0), 0);
          setUnreadMessages(count);
        }
      } catch {}
    }

    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (pathname === "/notifications") setUnread(0);
    if (pathname.startsWith("/messages")) setUnreadMessages(0);
  }, [pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const isBell = href === "/notifications";
          const isMessages = href === "/messages";
          const badge = isBell ? unread : isMessages ? unreadMessages : 0;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 text-[10px] transition-colors px-1",
                active ? "text-yellow-400" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <div className="relative">
                <Icon size={19} className={cn(active && "drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]")} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 leading-none">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
