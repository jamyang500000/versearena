"use client";

import { useState, useEffect } from "react";
import { Sword, Gift, Coins, Mic, ChevronRight, X } from "lucide-react";

const STEPS = [
  {
    emoji: "🎤",
    title: "Welcome to VerseArena",
    description: "The home of live rap battles. Watch, compete, and rise to the top.",
    icon: <Mic size={32} className="text-yellow-400" />,
  },
  {
    emoji: "⚔️",
    title: "Battle Live",
    description: "Challenge anyone to a live rap battle. The crowd votes. The best rapper wins.",
    icon: <Sword size={32} className="text-yellow-400" />,
  },
  {
    emoji: "🎁",
    title: "Send Gifts",
    description: "Support your favourite rappers by sending gifts during battles. They earn 70% of every coin you spend.",
    icon: <Gift size={32} className="text-yellow-400" />,
  },
  {
    emoji: "💰",
    title: "You Have 500 Coins!",
    description: "Every new account starts with 500 free coins. Use them to send gifts in your first battle.",
    icon: <Coins size={32} className="text-yellow-400" />,
  },
];

const STORAGE_KEY = "va_onboarding_done";

export default function WelcomeModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Only show once — stored in localStorage
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function next() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      dismiss();
    }
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismiss} />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-zinc-950 border-t border-zinc-800 rounded-t-3xl px-6 pt-6 pb-10 animate-slide-up">
        {/* Dismiss */}
        <button onClick={dismiss} className="absolute top-4 right-4 text-zinc-600 hover:text-white transition">
          <X size={20} />
        </button>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-yellow-400" : "w-1.5 bg-zinc-700"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center mb-6">
            {current.icon}
          </div>

          <h2 className="text-2xl font-black text-white mb-3">{current.title}</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-xs">
            {current.description}
          </p>

          <button
            onClick={next}
            className="w-full py-3.5 rounded-2xl bg-yellow-400 text-black font-bold text-base flex items-center justify-center gap-2 hover:bg-yellow-300 transition active:scale-95"
          >
            {step < STEPS.length - 1 ? (
              <>Next <ChevronRight size={18} /></>
            ) : (
              "Let's Go! 🎤"
            )}
          </button>

          {step < STEPS.length - 1 && (
            <button onClick={dismiss} className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition">
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
