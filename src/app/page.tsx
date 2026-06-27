"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function Home() {
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/feed" });
  }

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
      {/* Logo */}
      <div className="mb-8">
        <h1 className="text-6xl font-black tracking-tighter">
          <span className="text-yellow-400">VERSE</span>
          <span className="text-white">ARENA</span>
        </h1>
        <p className="mt-3 text-zinc-400 text-lg max-w-sm mx-auto">
          The ultimate stage for rap battles. Go live, drop bars, and let the crowd decide.
        </p>
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <Link
          href="/register"
          className="w-full px-8 py-4 bg-yellow-400 text-black font-bold rounded-full text-lg hover:bg-yellow-300 transition-colors text-center"
        >
          Join the Arena
        </Link>

        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-semibold rounded-full text-base hover:bg-zinc-100 transition disabled:opacity-50"
        >
          {googleLoading ? (
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 32.9 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.7-.4-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4c-7.6 0-14.2 4.3-17.7 10.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.5 26.9 36 24 36c-5.1 0-9.5-3.1-11.3-7.5l-6.5 5C9.8 39.7 16.4 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.4-4.6 5.8l6.2 5.2C40.7 35.6 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
            </svg>
          )}
          Continue with Google
        </button>

        <Link
          href="/login"
          className="w-full px-8 py-4 border border-white/20 text-white font-semibold rounded-full text-base hover:bg-white/10 transition-colors text-center"
        >
          Log In
        </Link>
      </div>

      {/* Feature pills */}
      <div className="mt-14 flex flex-wrap gap-3 justify-center max-w-lg">
        {["🎤 Live Battles", "📹 Post Your Bars", "🗳️ Crowd Votes", "🏆 Leaderboard", "🔥 Battle Feed"].map((f) => (
          <span key={f} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-300">
            {f}
          </span>
        ))}
      </div>
    </main>
  );
}
