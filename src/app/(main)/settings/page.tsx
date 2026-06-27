"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut, signIn } from "next-auth/react";
import toast from "react-hot-toast";
import {
  User, Lock, BarChart2, Coins, LogOut, UserPlus,
  ChevronRight, Camera, Save, ImageIcon, X, Bell, Shield, Trash2,
} from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing-client";

type Section = "main" | "profile" | "password" | "notifications" | "privacy";

interface NotificationPrefs {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  battleResults: boolean;
  gifts: boolean;
  crew: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [section, setSection] = useState<Section>("main");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", bio: "" });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [showPicker, setShowPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    likes: true, comments: true, follows: true,
    battleResults: true, gifts: true, crew: true,
  });
  const [savingNotif, setSavingNotif] = useState(false);
  const [privacy, setPrivacy] = useState({
    privateProfile: false,
    challengePermission: "EVERYONE" as "EVERYONE" | "FOLLOWERS_ONLY" | "NOBODY",
  });
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const { startUpload } = useUploadThing("avatarUploader");

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((u) => {
        setForm({ name: u.name ?? "", username: u.username ?? "", bio: u.bio ?? "" });
        setAvatar(u.image ?? null);
        setLinkedProviders((u.accounts ?? []).map((a: { provider: string }) => a.provider));
        setHasPassword(u.hasPassword ?? false);
        setUserEmail(u.email ?? "");
      });

    fetch("/api/users/me/notification-prefs")
      .then((r) => r.json())
      .then((prefs) => { if (prefs && !prefs.error) setNotifPrefs(prefs); });

    fetch("/api/users/me/privacy")
      .then((r) => r.json())
      .then((p) => { if (p && !p.error) setPrivacy(p); });
  }, []);

  async function handleImageFile(file: File) {
    setShowPicker(false);
    setUploading(true);
    try {
      const res = await startUpload([file]);
      const url = res?.[0]?.url;
      if (!url) throw new Error("Upload failed");

      const patch = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: url }),
      });
      if (!patch.ok) throw new Error("Save failed");

      setAvatar(url);
      toast.success("Profile picture updated!");
      router.refresh();
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  async function deleteAccount() {
    if (!deletePassword) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (res.ok) {
        await signOut({ callbackUrl: "/" });
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to delete account");
        setDeleting(false);
      }
    } catch {
      toast.error("Something went wrong");
      setDeleting(false);
    }
  }

  async function savePrivacy(updates: Partial<typeof privacy>) {
    const next = { ...privacy, ...updates };
    setPrivacy(next);
    setSavingPrivacy(true);
    try {
      await fetch("/api/users/me/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      toast.success("Privacy settings saved");
    } catch {
      toast.error("Failed to save");
      setPrivacy(privacy); // revert
    } finally {
      setSavingPrivacy(false);
    }
  }

  async function toggleNotifPref(key: keyof NotificationPrefs) {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    setSavingNotif(true);
    try {
      await fetch("/api/users/me/notification-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next[key] }),
      });
    } catch {
      toast.error("Failed to save");
      setNotifPrefs(notifPrefs); // revert
    } finally {
      setSavingNotif(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Profile updated!");
        setSection("main");
        router.refresh();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to update");
      }
    } finally {
      setLoading(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (passwords.next.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.next }),
      });
      if (res.ok) {
        toast.success("Password changed!");
        setPasswords({ current: "", next: "", confirm: "" });
        setSection("main");
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to change password");
      }
    } finally {
      setLoading(false);
    }
  }

  // ── PROFILE EDIT ──────────────────────────────
  if (section === "profile") {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <button onClick={() => setSection("main")} className="text-zinc-400 text-sm mb-6 flex items-center gap-1 hover:text-white transition">
          ← Back
        </button>
        <h2 className="text-xl font-bold text-white mb-6">Edit Profile</h2>

        {/* Hidden file inputs */}
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }}
        />

        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-zinc-800 overflow-hidden border-2 border-zinc-700">
              {avatar ? (
                <img src={avatar} className="w-full h-full object-cover" alt="avatar" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white">
                  {form.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              disabled={uploading}
              className="absolute bottom-0 right-0 p-2 bg-yellow-400 rounded-full text-black hover:bg-yellow-300 transition disabled:opacity-50"
            >
              {uploading ? (
                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={14} />
              )}
            </button>
          </div>
        </div>

        {/* Image source picker sheet */}
        {showPicker && (
          <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowPicker(false)}>
            <div
              className="w-full max-w-lg mx-auto bg-zinc-900 rounded-t-2xl p-4 pb-24 space-y-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-bold">Change Profile Photo</p>
                <button onClick={() => setShowPicker(false)} className="text-zinc-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <button
                onClick={() => { setShowPicker(false); setTimeout(() => cameraRef.current?.click(), 50); }}
                className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 transition rounded-xl px-4 py-3.5 text-white"
              >
                <Camera size={20} className="text-yellow-400" />
                <span className="font-semibold">Take Photo</span>
              </button>
              <button
                onClick={() => { setShowPicker(false); setTimeout(() => galleryRef.current?.click(), 50); }}
                className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 transition rounded-xl px-4 py-3.5 text-white"
              >
                <ImageIcon size={20} className="text-yellow-400" />
                <span className="font-semibold">Choose from Gallery</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Display Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, "") })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              placeholder="Tell the arena who you are..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={16} />
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    );
  }

  // ── CHANGE PASSWORD ───────────────────────────
  if (section === "password") {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <button onClick={() => setSection("main")} className="text-zinc-400 text-sm mb-6 flex items-center gap-1 hover:text-white transition">
          ← Back
        </button>
        <h2 className="text-xl font-bold text-white mb-6">Change Password</h2>

        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Current Password</label>
            <input
              type="password"
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">New Password</label>
            <input
              type="password"
              value={passwords.next}
              onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition"
              placeholder="Min. 8 characters"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    );
  }

  // ── PRIVACY SETTINGS ──────────────────────────
  if (section === "privacy") {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <button onClick={() => setSection("main")} className="text-zinc-400 text-sm mb-6 flex items-center gap-1 hover:text-white transition">
          ← Back
        </button>
        <h2 className="text-xl font-bold text-white mb-1">Privacy</h2>
        <p className="text-zinc-500 text-sm mb-6">Control who can see your content and challenge you.</p>

        <div className="space-y-4">
          {/* Private profile toggle */}
          <div className="bg-zinc-900 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm">Private Profile</p>
                <p className="text-zinc-500 text-xs mt-0.5">Only followers can see your posts</p>
              </div>
              <button
                onClick={() => savePrivacy({ privateProfile: !privacy.privateProfile })}
                disabled={savingPrivacy}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                  privacy.privateProfile ? "bg-yellow-400" : "bg-zinc-700"
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  privacy.privateProfile ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>
          </div>

          {/* Who can challenge you */}
          <div className="bg-zinc-900 rounded-2xl p-4">
            <p className="text-white font-semibold text-sm mb-1">Who can challenge you?</p>
            <p className="text-zinc-500 text-xs mb-4">Control who can send you battle challenges</p>

            <div className="space-y-2">
              {(["EVERYONE", "FOLLOWERS_ONLY", "NOBODY"] as const).map((opt) => {
                const labels = {
                  EVERYONE: { title: "Everyone", desc: "Anyone on VerseArena" },
                  FOLLOWERS_ONLY: { title: "People I follow", desc: "Only users you follow back" },
                  NOBODY: { title: "Nobody", desc: "Turn off all challenges" },
                };
                const selected = privacy.challengePermission === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => savePrivacy({ challengePermission: opt })}
                    disabled={savingPrivacy}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition text-left ${
                      selected
                        ? "border-yellow-400 bg-yellow-400/10"
                        : "border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selected ? "border-yellow-400" : "border-zinc-600"
                    }`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-yellow-400" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${selected ? "text-yellow-400" : "text-white"}`}>
                        {labels[opt].title}
                      </p>
                      <p className="text-zinc-500 text-xs">{labels[opt].desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── NOTIFICATION PREFERENCES ──────────────────
  if (section === "notifications") {
    const ITEMS: { key: keyof NotificationPrefs; label: string; desc: string; emoji: string }[] = [
      { key: "likes",         label: "Likes",          desc: "When someone likes your post",        emoji: "❤️" },
      { key: "comments",      label: "Comments",       desc: "When someone comments on your post",  emoji: "💬" },
      { key: "follows",       label: "New Followers",  desc: "When someone follows you",            emoji: "👤" },
      { key: "battleResults", label: "Battle Results", desc: "Battle invites, results & rankings",  emoji: "⚔️" },
      { key: "gifts",         label: "Gifts",          desc: "When you receive a gift in a battle", emoji: "🎁" },
      { key: "crew",          label: "Crew",           desc: "Crew invites and crew updates",       emoji: "🛡️" },
    ];

    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <button onClick={() => setSection("main")} className="text-zinc-400 text-sm mb-6 flex items-center gap-1 hover:text-white transition">
          ← Back
        </button>
        <h2 className="text-xl font-bold text-white mb-1">Notifications</h2>
        <p className="text-zinc-500 text-sm mb-6">Choose what you want to be notified about.</p>

        <div className="bg-zinc-900 rounded-2xl overflow-hidden divide-y divide-zinc-800">
          {ITEMS.map(({ key, label, desc, emoji }) => (
            <div key={key} className="flex items-center gap-3 px-4 py-4">
              <span className="text-xl w-8 text-center">{emoji}</span>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{label}</p>
                <p className="text-zinc-500 text-xs">{desc}</p>
              </div>
              {/* Toggle */}
              <button
                onClick={() => toggleNotifPref(key)}
                disabled={savingNotif}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                  notifPrefs[key] ? "bg-yellow-400" : "bg-zinc-700"
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  notifPrefs[key] ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>
          ))}
        </div>

        {savingNotif && (
          <p className="text-zinc-600 text-xs text-center mt-4">Saving...</p>
        )}
      </div>
    );
  }

  // ── MAIN SETTINGS ─────────────────────────────
  return (
    <div className="max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
        <h1 className="text-xl font-bold text-white">Settings</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Account section */}
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 px-1">Account</p>
          <div className="bg-zinc-900 rounded-2xl overflow-hidden divide-y divide-zinc-800">
            <button
              onClick={() => setSection("profile")}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-zinc-800 transition text-left"
            >
              <div className="w-9 h-9 rounded-full bg-yellow-400/10 flex items-center justify-center">
                <User size={16} className="text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Edit Profile</p>
                <p className="text-zinc-500 text-xs">Name, username, bio, avatar</p>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
            </button>

            <button
              onClick={() => setSection("password")}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-zinc-800 transition text-left"
            >
              <div className="w-9 h-9 rounded-full bg-yellow-400/10 flex items-center justify-center">
                <Lock size={16} className="text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Change Password</p>
                <p className="text-zinc-500 text-xs">Update your password</p>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
            </button>

            <button
              onClick={() => setSection("privacy")}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-zinc-800 transition text-left"
            >
              <div className="w-9 h-9 rounded-full bg-yellow-400/10 flex items-center justify-center">
                <Shield size={16} className="text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Privacy</p>
                <p className="text-zinc-500 text-xs">Private profile, challenge permissions</p>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
            </button>

            <button
              onClick={() => setSection("notifications")}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-zinc-800 transition text-left"
            >
              <div className="w-9 h-9 rounded-full bg-yellow-400/10 flex items-center justify-center">
                <Bell size={16} className="text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Notifications</p>
                <p className="text-zinc-500 text-xs">Likes, comments, follows, battles</p>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
            </button>

            <button
              onClick={() => router.push("/stats")}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-zinc-800 transition text-left"
            >
              <div className="w-9 h-9 rounded-full bg-yellow-400/10 flex items-center justify-center">
                <BarChart2 size={16} className="text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">My Stats</p>
                <p className="text-zinc-500 text-xs">Battles, wins, gifts, rankings</p>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
            </button>

            <button
              onClick={() => router.push("/earnings")}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-zinc-800 transition text-left"
            >
              <div className="w-9 h-9 rounded-full bg-green-400/10 flex items-center justify-center">
                <Coins size={16} className="text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Earnings</p>
                <p className="text-zinc-500 text-xs">Gift revenue, payout requests</p>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
            </button>

            {userEmail === "jamyangbeckham5@gmail.com" && (
              <button
                onClick={() => router.push("/jarvis")}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-zinc-800 transition text-left"
              >
                <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Shield size={16} className="text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">Jarvis</p>
                  <p className="text-zinc-500 text-xs">Admin panel</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
              </button>
            )}

            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-500/5 transition text-left"
            >
              <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 size={16} className="text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-red-400 font-semibold text-sm">Delete Account</p>
                <p className="text-zinc-500 text-xs">Permanently remove your account and all data</p>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
            </button>
          </div>
        </div>

        {/* Linked Accounts */}
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 px-1">Linked Accounts</p>
          <div className="bg-zinc-900 rounded-2xl overflow-hidden divide-y divide-zinc-800">
            {/* Email / password */}
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-base">
                ✉️
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Email</p>
                <p className="text-zinc-500 text-xs">{hasPassword ? "Password set" : "No password — sign in via provider"}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${hasPassword ? "bg-green-500/10 text-green-400" : "bg-zinc-800 text-zinc-500"}`}>
                {hasPassword ? "Active" : "—"}
              </span>
            </div>

            {/* Google */}
            <button
              onClick={() => !linkedProviders.includes("google") && signIn("google", { callbackUrl: "/settings" })}
              disabled={linkedProviders.includes("google")}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-zinc-800 transition text-left disabled:cursor-default"
            >
              <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-black text-white text-sm">
                G
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Google</p>
                <p className="text-zinc-500 text-xs">
                  {linkedProviders.includes("google") ? "Connected to your Google account" : "Tap to connect Google"}
                </p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${linkedProviders.includes("google") ? "bg-green-500/10 text-green-400" : "bg-yellow-400/10 text-yellow-400"}`}>
                {linkedProviders.includes("google") ? "Active" : "Connect"}
              </span>
            </button>
          </div>
        </div>

        {/* Session section */}
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 px-1">Session</p>
          <div className="bg-zinc-900 rounded-2xl overflow-hidden divide-y divide-zinc-800">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-zinc-800 transition text-left"
            >
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
                <UserPlus size={16} className="text-zinc-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Switch Account</p>
                <p className="text-zinc-500 text-xs">Sign in with a different account</p>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
            </button>

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-zinc-800 transition text-left"
            >
              <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center">
                <LogOut size={16} className="text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-red-400 font-semibold text-sm">Log Out</p>
                <p className="text-zinc-500 text-xs">Sign out of VerseArena</p>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
            </button>
          </div>
        </div>

        {/* About */}
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 px-1">About</p>
          <div className="bg-zinc-900 rounded-2xl overflow-hidden divide-y divide-zinc-800">
            <div className="flex items-center justify-between px-4 py-4">
              <p className="text-white font-semibold text-sm">App Version</p>
              <span className="text-zinc-500 text-sm">v1.0.0</span>
            </div>
            <a
              href="#"
              className="flex items-center justify-between px-4 py-4 hover:bg-zinc-800 transition"
            >
              <p className="text-white font-semibold text-sm">Terms of Service</p>
              <ChevronRight size={16} className="text-zinc-600" />
            </a>
            <a
              href="#"
              className="flex items-center justify-between px-4 py-4 hover:bg-zinc-800 transition"
            >
              <p className="text-white font-semibold text-sm">Privacy Policy</p>
              <ChevronRight size={16} className="text-zinc-600" />
            </a>
            <a
              href="mailto:support@versearena.app"
              className="flex items-center justify-between px-4 py-4 hover:bg-zinc-800 transition"
            >
              <p className="text-white font-semibold text-sm">Contact Support</p>
              <ChevronRight size={16} className="text-zinc-600" />
            </a>
          </div>
        </div>

        <div className="text-center py-4 space-y-1">
          <p className="text-2xl font-black">
            <span className="text-yellow-400">VERSE</span>
            <span className="text-white">ARENA</span>
          </p>
          <p className="text-zinc-600 text-xs">v1.0.0 · Built with 🎤 for the culture</p>
        </div>
      </div>

      {/* ── DELETE ACCOUNT MODAL ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setShowDeleteModal(false); setDeletePassword(""); }} />
          <div className="relative w-full max-w-sm bg-zinc-900 border border-red-500/30 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <button onClick={() => { setShowDeleteModal(false); setDeletePassword(""); }} className="text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <h3 className="text-white font-black text-lg mb-1">Delete your account?</h3>
            <p className="text-zinc-400 text-sm mb-5">
              This is permanent. Your profile, posts, battles, crew memberships and all data will be erased. There is no undo.
            </p>

            <p className="text-zinc-500 text-xs mb-2">Enter your password to confirm</p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 transition mb-4"
            />

            <button
              onClick={deleteAccount}
              disabled={!deletePassword || deleting}
              className="w-full py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleting ? "Deleting..." : "Yes, delete my account"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
