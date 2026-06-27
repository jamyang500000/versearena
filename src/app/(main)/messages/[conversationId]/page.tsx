"use client";

import { useEffect, useRef, useState, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Send, Mic, ImageIcon, Camera, Plus, ThumbsUp, X, Square, Play, Pause, MoreVertical, Flag,
} from "lucide-react";
import toast from "react-hot-toast";

interface Sender {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
}

interface Message {
  id: string;
  content: string | null;
  messageType: "TEXT" | "AUDIO" | "IMAGE";
  audioUrl: string | null;
  imageUrl: string | null;
  audioDuration: number | null;
  senderId: string;
  isRead: boolean;
  createdAt: string;
  sender: Sender;
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: string) {
  const d = new Date(date);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ──────────────────────────────────────────────
// Audio Message Bubble
// ──────────────────────────────────────────────
function AudioBubble({ url, duration, isMe }: { url: string; duration: number | null; isMe: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const total = duration ?? 0;

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play(); setPlaying(true); }
  }

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrent(Math.floor(el.currentTime));
    const onEnd = () => { setPlaying(false); setCurrent(0); };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    return () => { el.removeEventListener("timeupdate", onTime); el.removeEventListener("ended", onEnd); };
  }, []);

  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl min-w-[160px] max-w-[220px] ${
      isMe ? "bg-yellow-400 rounded-br-sm" : "bg-zinc-800 rounded-bl-sm"
    }`}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          isMe ? "bg-black/20 text-black" : "bg-yellow-400 text-black"
        }`}
      >
        {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>
      <div className="flex flex-col flex-1 gap-1">
        {/* Progress bar */}
        <div className={`h-1 rounded-full overflow-hidden ${isMe ? "bg-black/20" : "bg-zinc-600"}`}>
          <div
            className={`h-full rounded-full transition-all ${isMe ? "bg-black/50" : "bg-yellow-400"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={`text-[10px] ${isMe ? "text-black/60" : "text-zinc-500"}`}>
          {playing ? formatDuration(current) : formatDuration(total)}
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Image Message Bubble
// ──────────────────────────────────────────────
function ImageBubble({ url, isMe }: { url: string; isMe: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        src={url}
        onClick={() => setOpen(true)}
        className={`max-w-[220px] rounded-2xl object-cover cursor-pointer ${
          isMe ? "rounded-br-sm" : "rounded-bl-sm"
        }`}
      />
      {open && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setOpen(false)}>
          <img src={url} className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </>
  );
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────
export default function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = use(params);
  const router = useRouter();

  const [myId, setMyId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<Sender | null>(null);
  const [dbError, setDbError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDelayRef = useRef(500);
  const failCountRef = useRef(0); // only show banner after 3 consecutive failures
  const inFlightRef = useRef<Set<string>>(new Set()); // optimistic IDs currently sending

  // Recording state
  const [recording, setRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordStartRef = useRef<number>(0);

  // Refs
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // ── Auth ──
  useEffect(() => {
    function tryGetMe() {
      fetch("/api/users/me")
        .then(r => r.ok ? r.json() : null)
        .then(u => {
          if (u?.id) setMyId(u.id);
          else setTimeout(tryGetMe, 2000); // retry if DB not ready yet
        })
        .catch(() => setTimeout(tryGetMe, 2000));
    }
    tryGetMe();
  }, []);

  // ── Fetch messages ──
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages/${conversationId}`);
      if (res.ok) {
        const data: Message[] = await res.json();
        setMessages(prev => {
          const pending = prev.filter(m => inFlightRef.current.has(m.id));
          // Skip update if nothing changed (avoids flicker)
          const confirmed = prev.filter(m => !inFlightRef.current.has(m.id));
          const same =
            confirmed.length === data.length &&
            confirmed.every((m, i) => m.id === data[i]?.id && m.isRead === data[i]?.isRead);
          if (same && pending.length === 0) return prev;
          return [...data, ...pending];
        });
        if (data.length > 0 && myId) {
          const other = data.find(m => m.senderId !== myId)?.sender ?? data[0].sender;
          setOtherUser(u => u ?? other);
        }
        failCountRef.current = 0;
        pollDelayRef.current = 1000;
        setDbError(false);
      } else {
        throw new Error("fetch failed");
      }
    } catch {
      failCountRef.current += 1;
      pollDelayRef.current = Math.min(pollDelayRef.current * 2, 5000);
      if (failCountRef.current >= 3) setDbError(true);
    }
  }, [conversationId, myId]);

  // Adaptive polling — stops when tab hidden, resumes when visible
  useEffect(() => {
    if (!myId) return;
    let stopped = false;
    fetchMessages();

    function schedule() {
      if (stopped) return;
      pollIntervalRef.current = setTimeout(async () => {
        if (!document.hidden) await fetchMessages();
        schedule();
      }, pollDelayRef.current);
    }
    schedule();

    // Resume immediately when tab becomes visible again
    function onVisibility() {
      if (!document.hidden) {
        if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current);
        fetchMessages().then(schedule);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [conversationId, myId, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send helper ──
  async function sendMessage(body: object, optimistic: Message) {
    inFlightRef.current.add(optimistic.id); // mark as in-flight before adding to UI
    setMessages(prev => [...prev, optimistic]);
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const real: Message = await res.json();
        inFlightRef.current.delete(optimistic.id); // confirmed — remove from in-flight
        setMessages(prev => prev.map(m => m.id === optimistic.id ? real : m));
      } else {
        inFlightRef.current.delete(optimistic.id);
      }
    } catch {
      inFlightRef.current.delete(optimistic.id);
    } finally {
      setSending(false);
    }
  }

  // ── Text message ──
  async function handleSendText(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const content = input.trim();
    setInput("");
    inputRef.current?.focus();
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      content,
      messageType: "TEXT",
      audioUrl: null,
      imageUrl: null,
      audioDuration: null,
      senderId: myId,
      isRead: false,
      createdAt: new Date().toISOString(),
      sender: { id: myId, name: null, username: "", image: null },
    };
    // Don't await — fire and forget so user can keep typing
    sendMessage({ content, messageType: "TEXT" }, optimistic);
  }

  // ── Thumbs up ──
  async function sendThumbsUp() {
    if (sending) return;
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      content: "👍",
      messageType: "TEXT",
      audioUrl: null,
      imageUrl: null,
      audioDuration: null,
      senderId: myId,
      isRead: false,
      createdAt: new Date().toISOString(),
      sender: { id: myId, name: null, username: "", image: null },
    };
    await sendMessage({ content: "👍", messageType: "TEXT" }, optimistic);
  }

  // ── Voice recording ──
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      recordStartRef.current = Date.now();
      setRecordDuration(0);
      setRecording(true);
      recordTimerRef.current = setInterval(() => {
        setRecordDuration(Math.floor((Date.now() - recordStartRef.current) / 1000));
      }, 1000);
    } catch {
      alert("Microphone access denied");
    }
  }

  function stopRecordingTracks() {
    mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setRecording(false);
  }

  async function sendVoiceMessage() {
    const duration = Math.floor((Date.now() - recordStartRef.current) / 1000);
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    recorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = async () => {
        const audioUrl = reader.result as string;
        const optimistic: Message = {
          id: `tmp-${Date.now()}`,
          content: null,
          messageType: "AUDIO",
          audioUrl,
          imageUrl: null,
          audioDuration: duration,
          senderId: myId,
          isRead: false,
          createdAt: new Date().toISOString(),
          sender: { id: myId, name: null, username: "", image: null },
        };
        await sendMessage({ messageType: "AUDIO", audioUrl, audioDuration: duration }, optimistic);
      };
    };
    recorder.stop();
    stopRecordingTracks();
  }

  function cancelRecording() {
    mediaRecorderRef.current?.stop();
    stopRecordingTracks();
    audioChunksRef.current = [];
  }

  // ── Image send ──
  async function handleImageFile(file: File) {
    if (!file) return;
    // Compress with canvas
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = async () => {
        const MAX = 1080;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        const imageUrl = canvas.toDataURL("image/jpeg", 0.8);
        const optimistic: Message = {
          id: `tmp-${Date.now()}`,
          content: null,
          messageType: "IMAGE",
          audioUrl: null,
          imageUrl,
          audioDuration: null,
          senderId: myId,
          isRead: false,
          createdAt: new Date().toISOString(),
          sender: { id: myId, name: null, username: "", image: null },
        };
        await sendMessage({ messageType: "IMAGE", imageUrl }, optimistic);
      };
    };
  }

  // ── Report user ──
  async function reportUser() {
    if (!otherUser) return;
    setMenuOpen(false);
    await fetch(`/api/users/${otherUser.id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "HARASSMENT" }),
    });
    toast.success("User reported");
  }

  // ── Group messages by date ──
  const grouped: { date: string; messages: Message[] }[] = [];
  messages.forEach(msg => {
    const date = formatDate(msg.createdAt);
    const last = grouped[grouped.length - 1];
    if (last?.date === date) last.messages.push(msg);
    else grouped.push({ date, messages: [msg] });
  });

  const hasText = input.trim().length > 0;

  return (
    <div className="max-w-lg mx-auto flex flex-col h-screen bg-black">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-black/90 backdrop-blur-md">
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white transition">
          <ArrowLeft size={20} />
        </button>
        {otherUser ? (
          <div className="flex items-center gap-2 flex-1">
            {otherUser.image ? (
              <img src={otherUser.image} className="w-9 h-9 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center font-black text-white text-sm">
                {(otherUser.name ?? otherUser.username)[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-white font-semibold text-sm">{otherUser.name ?? otherUser.username}</p>
              <p className="text-zinc-500 text-xs">@{otherUser.username}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 h-4 bg-zinc-800 rounded animate-pulse w-32" />
        )}

        {/* ⋯ menu */}
        {otherUser && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-800 transition text-zinc-400"
            >
              <MoreVertical size={20} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-11 w-44 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl z-50">
                  <button
                    onClick={reportUser}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-800 transition text-left"
                  >
                    <Flag size={15} className="text-yellow-400" />
                    <span className="text-sm font-semibold text-white">Report</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* DB wake-up banner */}
      {dbError && (
        <div className="shrink-0 bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-zinc-500 text-xs">Reconnecting to server…</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {grouped.map(group => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-zinc-600 text-xs">{group.date}</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
            <div className="space-y-1.5">
              {group.messages.map((msg, i) => {
                const isMe = msg.senderId === myId;
                const showAvatar = !isMe && (i === 0 || group.messages[i - 1]?.senderId !== msg.senderId);
                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                    {!isMe && (
                      <div className="w-7 h-7 shrink-0">
                        {showAvatar ? (
                          msg.sender.image ? (
                            <img src={msg.sender.image} className="w-7 h-7 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-black text-white">
                              {(msg.sender.name ?? msg.sender.username)[0]?.toUpperCase() ?? "?"}
                            </div>
                          )
                        ) : null}
                      </div>
                    )}
                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[72%]`}>
                      {msg.messageType === "AUDIO" && msg.audioUrl ? (
                        <AudioBubble url={msg.audioUrl} duration={msg.audioDuration} isMe={isMe} />
                      ) : msg.messageType === "IMAGE" && msg.imageUrl ? (
                        <ImageBubble url={msg.imageUrl} isMe={isMe} />
                      ) : (
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? "bg-yellow-400 text-black rounded-br-sm font-medium"
                            : "bg-zinc-800 text-white rounded-bl-sm"
                        }`}>
                          {msg.content}
                        </div>
                      )}
                      <span className="text-zinc-700 text-[10px] mt-0.5 px-1">
                        {formatTime(msg.createdAt)}
                        {isMe && msg.isRead && <span className="ml-1 text-yellow-400">✓✓</span>}
                        {isMe && !msg.isRead && <span className="ml-1">✓</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center">
            <p className="text-zinc-500 text-sm">No messages yet</p>
            <p className="text-zinc-700 text-xs mt-1">Say something! 🎤</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Hidden file inputs */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }}
      />

      {/* Input Bar */}
      <div className="shrink-0 border-t border-zinc-800 bg-black px-3 py-2">
        {recording ? (
          /* ── Recording UI ── */
          <div className="flex items-center gap-3 h-12">
            <button onClick={cancelRecording} className="text-zinc-400 hover:text-red-400 transition">
              <X size={22} />
            </button>
            <div className="flex-1 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <div className="flex gap-0.5 items-end h-5">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-yellow-400 rounded-full animate-pulse"
                    style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 50}ms` }}
                  />
                ))}
              </div>
              <span className="text-red-400 text-sm font-mono ml-1">{formatDuration(recordDuration)}</span>
            </div>
            <button
              onClick={sendVoiceMessage}
              className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center hover:bg-yellow-300 transition"
            >
              <Send size={16} className="text-black" />
            </button>
          </div>
        ) : (
          /* ── Normal input bar ── */
          <form onSubmit={handleSendText} className="flex items-center gap-2">
            {/* Left icons — hidden when typing */}
            {!hasText && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:text-white transition"
                >
                  <Plus size={22} />
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:text-white transition"
                >
                  <Camera size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:text-white transition"
                >
                  <ImageIcon size={20} />
                </button>
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:text-yellow-400 transition"
                >
                  <Mic size={20} />
                </button>
              </div>
            )}

            {/* Text input */}
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Message..."
              maxLength={500}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400 transition min-w-0"
            />

            {/* Right button — send or thumbs up */}
            {hasText ? (
              <button
                type="submit"
                className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center hover:bg-yellow-300 transition shrink-0"
              >
                <Send size={16} className="text-black" />
              </button>
            ) : (
              <button
                type="button"
                onClick={sendThumbsUp}
                disabled={sending}
                className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition disabled:opacity-40 shrink-0"
              >
                <ThumbsUp size={18} className="text-yellow-400" />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
