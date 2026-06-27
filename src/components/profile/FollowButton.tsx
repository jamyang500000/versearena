"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { UserCheck, UserMinus, UserPlus } from "lucide-react";

interface Props {
  userId: string;
  initialFollowing: boolean;
  className?: string;
}

export default function FollowButton({ userId, initialFollowing, className }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [hovered, setHovered] = useState(false);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    setFollowing(f => !f); // optimistic
    try {
      const res = await fetch(`/api/users/${userId}/follow`, { method: "POST" });
      if (res.ok) {
        const { following: next } = await res.json();
        setFollowing(next);
        toast.success(next ? "Following! 🔥" : "Unfollowed");
      } else {
        setFollowing(f => !f); // revert
        toast.error("Sign in to follow");
      }
    } catch {
      setFollowing(f => !f);
    } finally {
      setLoading(false);
    }
  }

  if (following) {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm transition disabled:opacity-70 ${
          hovered
            ? "bg-red-500/20 text-red-400 border border-red-500/40"
            : "bg-zinc-800 text-white border border-zinc-700"
        } ${className ?? "w-full"}`}
      >
        {hovered
          ? <><UserMinus size={15} /> Unfollow</>
          : <><UserCheck size={15} /> Following</>}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm bg-yellow-400 text-black hover:bg-yellow-300 transition disabled:opacity-70 ${className ?? "w-full"}`}
    >
      <UserPlus size={15} /> Follow
    </button>
  );
}
