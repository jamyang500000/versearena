"use client";

import type { VoiceEffect } from "@/hooks/useVoiceEffects";

const EFFECTS: { effect: VoiceEffect; label: string; emoji: string }[] = [
  { effect: "none",       label: "Clean",    emoji: "🎙️" },
  { effect: "reverb",     label: "Reverb",   emoji: "🏟️" },
  { effect: "pitch_up",   label: "Chipmunk", emoji: "🐿️" },
  { effect: "pitch_down", label: "Deep",     emoji: "👹" },
  { effect: "echo",       label: "Echo",     emoji: "🔁" },
  { effect: "robot",      label: "Robot",    emoji: "🤖" },
];

interface VoiceEffectsBarProps {
  activeEffect: VoiceEffect;
  onSelect: (effect: VoiceEffect) => void;
  isParticipant: boolean;
}

export default function VoiceEffectsBar({
  activeEffect,
  onSelect,
  isParticipant,
}: VoiceEffectsBarProps) {
  if (!isParticipant) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
      <p className="text-zinc-400 text-xs font-semibold mb-2">🎛️ Voice Effects</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {EFFECTS.map(({ effect, label, emoji }) => (
          <button
            key={effect}
            onClick={() => onSelect(effect)}
            className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition ${
              activeEffect === effect
                ? "bg-yellow-400 text-black"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            <span className="text-lg">{emoji}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
