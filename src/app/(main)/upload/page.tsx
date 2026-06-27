"use client";

import { useState } from "react";
import { useUploadThing } from "@/lib/uploadthing-client";
import { Upload, Video, X, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const { startUpload } = useUploadThing("videoUploader", {
    onUploadProgress: (p) => setProgress(p),
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) { toast.error("Only video files allowed"); return; }
    if (f.size > 256 * 1024 * 1024) { toast.error("File must be under 256MB"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error("Select a video first"); return; }
    setUploading(true);
    try {
      const uploaded = await startUpload([file]);
      if (!uploaded?.[0]?.url) throw new Error("Upload failed");

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: uploaded[0].url, caption }),
      });

      if (res.ok) {
        toast.success("Posted! 🔥");
        router.push("/feed");
      } else {
        throw new Error("Failed to save post");
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-1">Drop Your Bars 🎤</h1>
      <p className="text-zinc-500 text-sm mb-6">Upload a video to the Arena</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* File picker */}
        {!preview ? (
          <label className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 text-center cursor-pointer hover:border-yellow-400/60 transition block">
            <Video size={40} className="text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">Tap to select a video</p>
            <p className="text-zinc-600 text-sm mt-1">MP4, MOV up to 256MB</p>
            <input type="file" accept="video/*" onChange={handleFile} className="hidden" />
          </label>
        ) : (
          <div className="relative rounded-2xl overflow-hidden bg-zinc-900">
            <video src={preview} controls className="w-full max-h-72 object-cover" />
            <button
              type="button"
              onClick={() => { setFile(null); setPreview(null); }}
              className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black transition"
            >
              <X size={16} />
            </button>
            <div className="absolute bottom-2 left-2 bg-black/60 rounded-lg px-2 py-1 flex items-center gap-1.5">
              <CheckCircle size={12} className="text-yellow-400" />
              <span className="text-white text-xs">{file?.name}</span>
            </div>
          </div>
        )}

        {/* Caption */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Caption</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="What's this about? Add some bars..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition resize-none text-sm"
          />
          <p className="text-zinc-600 text-xs text-right mt-1">{caption.length}/300</p>
        </div>

        {/* Upload progress */}
        {uploading && progress > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-zinc-500 text-xs text-center">{progress < 100 ? `Uploading... ${progress}%` : "Saving post..."}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!file || uploading}
          className="w-full py-3.5 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Upload size={18} />
          {uploading ? "Uploading..." : "Post to Arena"}
        </button>
      </form>
    </div>
  );
}
