"use client";

import { useState, useCallback, useRef } from "react";

const VOICE_LANG_MAP: Record<string, string> = {
  spanish:    "es-ES",
  french:     "fr-FR",
  german:     "de-DE",
  italian:    "it-IT",
  japanese:   "ja-JP",
  mandarin:   "zh-CN",
  portuguese: "pt-BR",
  arabic:     "ar-SA",
};

interface UseSpeechSynthesisReturn {
  isSpeaking:  boolean;
  speak:       (text: string) => void;
  cancel:      () => void;
  isSupported: boolean;
}

export function useSpeechSynthesis(
  language: string
): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return;

    window.speechSynthesis.cancel();

    const utterance  = new SpeechSynthesisUtterance(text);
    utterance.lang   = VOICE_LANG_MAP[language] ?? "en-US";
    utterance.rate   = 0.9;
    utterance.pitch  = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend   = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);

  }, [isSupported, language]);

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return { isSpeaking, speak, cancel, isSupported };
}