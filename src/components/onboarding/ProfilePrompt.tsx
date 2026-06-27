"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, X } from "lucide-react";

const STORAGE_KEY = "va_profile_prompt_dismissed";

export default function ProfilePrompt() {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;

    fetch("/api/users/me")
      .then(r => r.ok ? r.json() : null)
      .then(u => {
        if (u && (!u.bio || !u.name)) setShow(true);
      })
      .catch(() => {});
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto">
      <div className="bg-zinc-900 border border-yellow-400/30 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl shadow-black/50">
        <div className="w-9 h-9 rounded-full bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
          <UserCircle size={18} className="text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold">Complete your profile</p>
          <p className="text-zinc-500 text-xs">Add your name and bio so fans can find you</p>
        </div>
        <button
          onClick={() => { router.push("/settings"); dismiss(); }}
          className="text-yellow-400 text-xs font-bold flex-shrink-0 hover:text-yellow-300 transition"
        >
          Set up
        </button>
        <button onClick={dismiss} className="text-zinc-600 hover:text-zinc-400 transition flex-shrink-0">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
