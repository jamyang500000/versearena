"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Share2, Music2, Plus, Check, Search } from "lucide-react";
import toast from "react-hot-toast";

interface PostUser {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
}

interface Post {
  id: string;
  videoUrl: string;
  caption: string | null;
  createdAt: string;
  user: PostUser;
  isLiked: boolean;
  isFollowing: boolean;
  _count: { likes: number; comments: number };
}

// ─── Single full-screen video slide ───────────────────────────────────────────
function PostSlide({
  post,
  isActive,
  isNear,
  myId,
  onLike,
  onFollow,
}: {
  post: Post;
  isActive: boolean;
  isNear: boolean; // within 1 slide — preload src but don't play
  myId: string;
  onLike: (id: string, liked: boolean) => void;
  onFollow: (userId: string, currentlyFollowing: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  // Only assign src when nearby — stops all videos downloading simultaneously
  const shouldLoad = isActive || isNear;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [isActive]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPaused(false); }
    else { v.pause(); setPaused(true); }
  }

  async function handleShare() {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      await navigator.share({ url });
    } catch {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  }

  const isMe = post.user.id === myId;

  return (
    <div className="relative w-full h-screen snap-start snap-always flex-shrink-0 bg-black overflow-hidden">
      <video
        ref={videoRef}
        src={shouldLoad ? post.videoUrl : undefined}
        loop
        playsInline
        preload={isActive ? "auto" : "none"}
        className="absolute inset-0 w-full h-full object-cover"
        onClick={togglePlay}
      />

      {paused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
            <div className="w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-l-[20px] border-l-white ml-1" />
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

      {/* Bottom left */}
      <div className="absolute bottom-20 left-4 right-20 space-y-2">
        <Link href={`/profile/${post.user.username}`} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden border-2 border-white/30 relative flex-shrink-0">
            {post.user.image ? (
              <Image src={post.user.image} alt={post.user.username} fill sizes="32px" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-black text-white">
                {(post.user.name ?? post.user.username)[0].toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-white font-bold text-sm drop-shadow">@{post.user.username}</span>
        </Link>

        {post.caption && (
          <p className="text-white text-sm leading-snug drop-shadow line-clamp-3">{post.caption}</p>
        )}

        <div className="flex items-center gap-1.5 text-white/70 text-xs">
          <Music2 size={12} />
          <span>Original sound</span>
        </div>
      </div>

      {/* Right side actions */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-6">
        <div className="relative">
          <Link href={`/profile/${post.user.username}`}>
            <div className="w-12 h-12 rounded-full bg-zinc-700 overflow-hidden border-2 border-white relative">
              {post.user.image ? (
                <Image src={post.user.image} alt={post.user.username} fill sizes="48px" className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-black text-white">
                  {(post.user.name ?? post.user.username)[0].toUpperCase()}
                </div>
              )}
            </div>
          </Link>
          {!isMe && (
            <button
              onClick={() => onFollow(post.user.id, post.isFollowing)}
              className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                post.isFollowing ? "bg-zinc-500" : "bg-yellow-400"
              }`}
            >
              {post.isFollowing ? <Check size={11} className="text-white" /> : <Plus size={12} className="text-black" />}
            </button>
          )}
        </div>

        <button onClick={() => onLike(post.id, post.isLiked)} className="flex flex-col items-center gap-1">
          <div className={`w-12 h-12 rounded-full bg-black/30 flex items-center justify-center transition-transform active:scale-90 ${post.isLiked ? "text-red-500" : "text-white"}`}>
            <Heart size={26} fill={post.isLiked ? "currentColor" : "none"} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{post._count.likes > 0 ? post._count.likes : ""}</span>
        </button>

        <Link href={`/post/${post.id}`} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center text-white">
            <MessageCircle size={26} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{post._count.comments > 0 ? post._count.comments : ""}</span>
        </Link>

        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center text-white">
            <Share2 size={24} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">Share</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Feed ────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [myId, setMyId] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs for scroll listener — avoids stale closures
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const cursorRef = useRef<string | null>(null);
  const postsLengthRef = useRef(0);

  useEffect(() => { postsLengthRef.current = posts.length; }, [posts.length]);

  useEffect(() => {
    fetch("/api/users/me")
      .then(r => r.ok ? r.json() : null)
      .then(u => { if (u?.id) setMyId(u.id); })
      .catch(() => {});
  }, []);

  const loadPosts = useCallback(async (cursorParam?: string) => {
    const url = cursorParam ? `/api/posts?cursor=${cursorParam}` : "/api/posts";
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    setPosts(prev => cursorParam ? [...prev, ...data.posts] : data.posts);
    cursorRef.current = data.nextCursor ?? null;
    hasMoreRef.current = !!data.nextCursor;
  }, []);

  useEffect(() => {
    loadPosts().finally(() => setLoading(false));
  }, [loadPosts]);

  // Scroll listener — all values via refs, no stale closures
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onScroll() {
      const slideH = container!.clientHeight; // container height, not window
      const index = Math.round(container!.scrollTop / slideH);
      setActiveIndex(index);

      if (
        index >= postsLengthRef.current - 3 &&
        hasMoreRef.current &&
        !loadingMoreRef.current
      ) {
        loadingMoreRef.current = true;
        loadPosts(cursorRef.current ?? undefined).finally(() => {
          loadingMoreRef.current = false;
        });
      }
    }

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [loadPosts]);

  async function handleFollow(userId: string, currentlyFollowing: boolean) {
    if (!myId) { toast.error("Sign in to follow"); return; }
    setPosts(prev => prev.map(p =>
      p.user.id === userId ? { ...p, isFollowing: !currentlyFollowing } : p
    ));
    const res = await fetch(`/api/users/${userId}/follow`, { method: "POST" });
    if (!res.ok) {
      setPosts(prev => prev.map(p =>
        p.user.id === userId ? { ...p, isFollowing: currentlyFollowing } : p
      ));
    } else {
      const data = await res.json();
      toast.success(data.following ? "Following!" : "Unfollowed");
    }
  }

  async function handleLike(postId: string, currentlyLiked: boolean) {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, isLiked: !currentlyLiked, _count: { ...p._count, likes: p._count.likes + (currentlyLiked ? -1 : 1) } }
        : p
    ));
    const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    if (!res.ok) {
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, isLiked: currentlyLiked, _count: { ...p._count, likes: p._count.likes + (currentlyLiked ? 1 : -1) } }
          : p
      ));
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="w-10 h-10 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-black gap-4 px-6 text-center">
        <p className="text-white text-xl font-bold">No posts yet 🎤</p>
        <p className="text-zinc-500 text-sm">Be the first to drop some bars</p>
        <Link href="/upload" className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-full">
          Post Now
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => router.push("/search")}
        className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white border border-white/20"
      >
        <Search size={20} />
      </button>

      <div
        ref={containerRef}
        className="h-screen overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {posts.map((post, i) => (
          <PostSlide
            key={post.id}
            post={post}
            isActive={i === activeIndex}
            isNear={Math.abs(i - activeIndex) <= 1}
            myId={myId}
            onLike={handleLike}
            onFollow={handleFollow}
          />
        ))}
        <div className="h-screen snap-start flex items-center justify-center bg-black">
          <div className="text-zinc-600 text-sm text-center">
            {loadingMoreRef.current ? (
              <span className="w-5 h-5 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin inline-block" />
            ) : (
              <span>You&apos;ve seen it all 🎤</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
