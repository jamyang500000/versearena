"use client";

import { useRef, useState, useCallback } from "react";

export type VoiceEffect = "none" | "reverb" | "pitch_up" | "pitch_down" | "echo" | "robot";

const EFFECT_LABELS: Record<VoiceEffect, string> = {
  none:        "🎙️ Clean",
  reverb:      "🏟️ Reverb",
  pitch_up:    "🐿️ Chipmunk",
  pitch_down:  "👹 Deep",
  echo:        "🔁 Echo",
  robot:       "🤖 Robot",
};

export function useVoiceEffects() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const [activeEffect, setActiveEffect] = useState<VoiceEffect>("none");

  function getOrCreateCtx() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }

  const applyEffect = useCallback(
    async (stream: MediaStream, effect: VoiceEffect): Promise<MediaStream> => {
      const ctx = getOrCreateCtx();

      // Disconnect old source
      sourceRef.current?.disconnect();

      const source = ctx.createMediaStreamSource(stream);
      const dest = ctx.createMediaStreamDestination();
      sourceRef.current = source;
      destRef.current = dest;

      if (effect === "none") {
        source.connect(dest);
        setActiveEffect("none");
        return dest.stream;
      }

      if (effect === "reverb") {
        const convolver = ctx.createConvolver();
        const impulseLength = ctx.sampleRate * 2;
        const impulse = ctx.createBuffer(2, impulseLength, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
          const channel = impulse.getChannelData(c);
          for (let i = 0; i < impulseLength; i++) {
            channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 2);
          }
        }
        convolver.buffer = impulse;
        source.connect(convolver);
        convolver.connect(dest);
      }

      if (effect === "pitch_up" || effect === "pitch_down") {
        // Simple pitch shift via playback rate manipulation
        const rate = effect === "pitch_up" ? 1.4 : 0.7;
        const scriptProcessor = ctx.createScriptProcessor(4096, 1, 1);
        scriptProcessor.onaudioprocess = (e) => {
          const input = e.inputBuffer.getChannelData(0);
          const output = e.outputBuffer.getChannelData(0);
          for (let i = 0; i < output.length; i++) {
            const srcIndex = Math.floor(i * rate);
            output[i] = srcIndex < input.length ? input[srcIndex] : 0;
          }
        };
        source.connect(scriptProcessor);
        scriptProcessor.connect(dest);
      }

      if (effect === "echo") {
        const delay = ctx.createDelay(0.5);
        delay.delayTime.value = 0.3;
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.4;
        source.connect(dest);
        source.connect(delay);
        delay.connect(gainNode);
        gainNode.connect(delay);
        gainNode.connect(dest);
      }

      if (effect === "robot") {
        const oscillator = ctx.createOscillator();
        oscillator.frequency.value = 100;
        const ringMod = ctx.createGain();
        source.connect(ringMod);
        oscillator.connect(ringMod.gain);
        ringMod.connect(dest);
        oscillator.start();
      }

      setActiveEffect(effect);
      return dest.stream;
    },
    []
  );

  const cleanup = useCallback(() => {
    sourceRef.current?.disconnect();
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
  }, []);

  return { applyEffect, activeEffect, effectLabels: EFFECT_LABELS, cleanup };
}
