"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { LogOut, Settings, BarChart2, UserPlus } from "lucide-react";

export default function AccountMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-zinc-500 hover:text-white transition flex items-center gap-1 px-2 py-1"
      >
        ⚙️ Account
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 bottom-10 z-50 w-52 bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden shadow-xl">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-zinc-800 transition"
            >
              <Settings size={15} className="text-zinc-400" />
              Edit Profile
            </Link>
            <Link
              href="/stats"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-zinc-800 transition"
            >
              <BarChart2 size={15} className="text-zinc-400" />
              My Stats
            </Link>

            <div className="border-t border-zinc-800" />

            {/* Switch account = sign out then go to login */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 transition"
            >
              <UserPlus size={15} className="text-zinc-400" />
              Switch Account
            </button>

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-zinc-800 transition"
            >
              <LogOut size={15} />
              Log Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
