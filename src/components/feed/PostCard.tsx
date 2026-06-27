"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Share2, Play } from "lucide-react";
import { formatNumber, formatTimeAgo } from "@/lib/utils";
import type { PostWithUser } from "@/types";
import toast from "react-hot-toast";

interface PostCardProps {
  post: PostWithUser;
  currentUserId?: string;
}

export default function PostCard({ post, currentUserId }: PostCardProps) {
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const [playing, setPlaying] = useState(false);

  async function toggleLike() {
    if (!currentUserId) {
      toast.error("Sign in to like posts");
      return;
    }
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));

    const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    if (!res.ok) {
      setLiked((prev) => !prev);
      setLikeCount((prev) => (liked ? prev + 1 : prev - 1));
    }
  }

  async function share() {
    await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    toast.success("Link copied!");
  }

  return (
    <article className="p-4 hover:bg-zinc-900/40 transition">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Link href={`/profile/${post.user.username}`}>
          <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden">
            {post.user.image ? (
              <Image
                src={post.user.image}
                alt={post.user.name ?? post.user.username}
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white">
                {(post.user.name ?? post.user.username)[0].toUpperCase()}
              </div>
            )}
          </div>
        </Link>
        <div>
          <Link
            href={`/profile/${post.user.username}`}
            className="font-semibold text-white hover:underline text-sm"
          >
            {post.user.name ?? post.user.username}
          </Link>
          <p className="text-zinc-500 text-xs">@{post.user.username} · {formatTimeAgo(post.createdAt)}</p>
        </div>
      </div>

      {/* Caption */}
      {post.caption && (
        <p className="text-white text-sm mb-3">{post.caption}</p>
      )}

      {/* Video */}
      <div
        className="relative rounded-2xl overflow-hidden bg-zinc-900 aspect-[9/16] max-h-96 cursor-pointer"
        onClick={() => setPlaying(!playing)}
      >
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center">
              <Play size={28} className="text-white ml-1" fill="white" />
            </div>
          </div>
        )}
        {post.thumbnailUrl && !playing && (
          <Image
            src={post.thumbnailUrl}
            alt="Video thumbnail"
            fill
            className="object-cover"
          />
        )}
        {playing && (
          <video
            src={post.videoUrl}
            autoPlay
            controls
            className="w-full h-full object-cover"
            onEnded={() => setPlaying(false)}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-5 mt-3">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            liked ? "text-red-500" : "text-zinc-400 hover:text-red-400"
          }`}
        >
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
          <span>{formatNumber(likeCount)}</span>
        </button>
        <Link
          href={`/post/${post.id}`}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <MessageCircle size={18} />
          <span>{formatNumber(post._count.comments)}</span>
        </Link>
        <button
          onClick={share}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors ml-auto"
        >
          <Share2 size={18} />
        </button>
      </div>
    </article>
  );
}
