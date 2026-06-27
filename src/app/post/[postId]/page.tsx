"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, Send, Trash2, MoreVertical, CornerDownRight } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface User {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
}

interface Reply {
  id: string;
  content: string;
  createdAt: string;
  user: User;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: User;
  replies: Reply[];
}

interface Post {
  id: string;
  videoUrl: string;
  caption: string | null;
  createdAt: string;
  user: User;
  isLiked: boolean;
  _count: { likes: number; comments: number };
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

function Avatar({ user, size = 8 }: { user: User; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full bg-zinc-800 overflow-hidden shrink-0`;
  return (
    <div className={cls}>
      {user.image ? (
        <img src={user.image} className="w-full h-full object-cover" alt="" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs font-black text-white">
          {(user.name ?? user.username)[0].toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default function PostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = use(params);
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [myId, setMyId] = useState("");
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  // Reply state
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/users/me")
      .then(r => r.ok ? r.json() : null)
      .then(u => { if (u?.id) setMyId(u.id); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/posts/${postId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) { setPost(data); setLiked(data.isLiked); setLikeCount(data._count.likes); }
      });
    fetch(`/api/posts/${postId}/comments`)
      .then(r => r.ok ? r.json() : [])
      .then(setComments);
  }, [postId]);

  async function toggleLike() {
    if (!myId) { toast.error("Sign in to like"); return; }
    setLiked(p => !p);
    setLikeCount(p => liked ? p - 1 : p + 1);
    const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    if (!res.ok) { setLiked(p => !p); setLikeCount(p => liked ? p + 1 : p - 1); }
  }

  function startReply(commentId: string, username: string) {
    setReplyTo({ id: commentId, username });
    setInput(`@${username} `);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function cancelReply() {
    setReplyTo(null);
    setInput("");
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !myId) return;
    setSubmitting(true);
    const text = input.trim();
    setInput("");

    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, parentId: replyTo?.id ?? null }),
    });

    if (res.ok) {
      const newComment = await res.json();
      if (replyTo) {
        // Add reply under parent comment
        setComments(prev => prev.map(c =>
          c.id === replyTo.id
            ? { ...c, replies: [...c.replies, newComment] }
            : c
        ));
      } else {
        setComments(prev => [...prev, { ...newComment, replies: [] }]);
        setPost(prev => prev ? { ...prev, _count: { ...prev._count, comments: prev._count.comments + 1 } } : prev);
      }
      setReplyTo(null);
    } else {
      toast.error("Failed to comment");
      setInput(text);
    }
    setSubmitting(false);
  }

  async function deletePost() {
    if (!confirm("Delete this post?")) return;
    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); router.push("/feed"); }
    else toast.error("Failed to delete");
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isOwner = post.user.id === myId;
  const totalComments = comments.reduce((n, c) => n + 1 + c.replies.length, 0);

  return (
    <div className="max-w-lg mx-auto bg-black min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <Link href={`/profile/${post.user.username}`} className="flex items-center gap-2 flex-1">
          <Avatar user={post.user} size={8} />
          <div>
            <p className="text-white font-semibold text-sm">{post.user.name ?? post.user.username}</p>
            <p className="text-zinc-500 text-xs">@{post.user.username}</p>
          </div>
        </Link>
        {isOwner && (
          <div className="relative">
            <button onClick={() => setShowMenu(v => !v)} className="text-zinc-400 hover:text-white p-1">
              <MoreVertical size={20} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden z-50 min-w-[140px]">
                <button onClick={deletePost} className="flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-zinc-800 w-full text-sm">
                  <Trash2 size={14} /> Delete post
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Video */}
      <div className="aspect-[9/16] max-h-[60vh] bg-zinc-900">
        <video src={post.videoUrl} controls playsInline className="w-full h-full object-cover" />
      </div>

      {/* Like + caption */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={toggleLike} className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-red-500" : "text-zinc-400 hover:text-red-400"}`}>
            <Heart size={20} fill={liked ? "currentColor" : "none"} />
            <span className="font-semibold">{likeCount}</span>
          </button>
          <span className="text-zinc-500 text-sm">{totalComments} comments</span>
        </div>
        {post.caption && (
          <p className="text-white text-sm">
            <Link href={`/profile/${post.user.username}`} className="font-bold mr-1 hover:underline">{post.user.username}</Link>
            {post.caption}
          </p>
        )}
        <p className="text-zinc-600 text-xs mt-1">{timeAgo(post.createdAt)}</p>
      </div>

      {/* Comments */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {comments.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-8">No comments yet. Be first! 💬</p>
        )}
        {comments.map(c => (
          <div key={c.id}>
            {/* Top-level comment */}
            <div className="flex items-start gap-3">
              <Link href={`/profile/${c.user.username}`}>
                <Avatar user={c.user} size={8} />
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm">
                  <Link href={`/profile/${c.user.username}`} className="font-bold mr-1 hover:underline">{c.user.username}</Link>
                  {c.content}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-zinc-600 text-xs">{timeAgo(c.createdAt)}</span>
                  <button
                    onClick={() => startReply(c.id, c.user.username)}
                    className="text-zinc-500 text-xs hover:text-yellow-400 transition font-medium"
                  >
                    Reply
                  </button>
                </div>
              </div>
            </div>

            {/* Replies */}
            {c.replies.length > 0 && (
              <div className="ml-11 mt-3 space-y-3 border-l-2 border-zinc-800 pl-3">
                {c.replies.map(r => (
                  <div key={r.id} className="flex items-start gap-2">
                    <Link href={`/profile/${r.user.username}`}>
                      <Avatar user={r.user} size={6} />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">
                        <Link href={`/profile/${r.user.username}`} className="font-bold mr-1 hover:underline">{r.user.username}</Link>
                        {r.content}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-zinc-600 text-xs">{timeAgo(r.createdAt)}</span>
                        <button
                          onClick={() => startReply(c.id, r.user.username)}
                          className="text-zinc-500 text-xs hover:text-yellow-400 transition font-medium"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Comment input */}
      <div className="sticky bottom-0 border-t border-zinc-800 bg-black px-4 pt-2 pb-3">
        {replyTo && (
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
            <span className="flex items-center gap-1">
              <CornerDownRight size={12} className="text-yellow-400" />
              Replying to <span className="text-yellow-400 font-semibold ml-1">@{replyTo.username}</span>
            </span>
            <button onClick={cancelReply} className="text-zinc-600 hover:text-white">Cancel</button>
          </div>
        )}
        <form onSubmit={submitComment} className="flex items-center gap-3">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={replyTo ? `Reply to @${replyTo.username}...` : "Add a comment..."}
            maxLength={300}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400 transition"
          />
          <button
            type="submit"
            disabled={!input.trim() || submitting}
            className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center disabled:opacity-40 hover:bg-yellow-300 transition shrink-0"
          >
            <Send size={16} className="text-black" />
          </button>
        </form>
      </div>
    </div>
  );
}
