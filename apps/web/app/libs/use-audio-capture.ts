"use client";

import { useState, useCallback, useRef } from "react";

interface UseAudioCaptureOptions {
  onAudioReady: (audioBase64: string, mimeType: string) => void;
}

interface UseAudioCaptureReturn {
  isRecording:    boolean;
  hasPermission:  boolean | null;
  audioLevel:     number;
  startRecording: () => Promise<void>;
  stopRecording:  () => void;
}

export function useAudioCapture(
  { onAudioReady }: UseAudioCaptureOptions
): UseAudioCaptureReturn {
  const [isRecording,   setIsRecording]   = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [audioLevel,    setAudioLevel]    = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef  = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef   = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef     = useRef<AnalyserNode | null>(null);
  const streamRef       = useRef<MediaStream | null>(null);
  const chunksRef       = useRef<Int16Array[]>([]);
  const rafRef          = useRef<number>(0);

  const startRecording = useCallback(async () => {
    if (isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate:       16000,
          channelCount:     1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setHasPermission(true);
      streamRef.current = stream;
      chunksRef.current = [];

      const ctx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = ctx;

      await ctx.audioWorklet.addModule("/audio-processor.js");

      const source   = ctx.createMediaStreamSource(stream);
      const worklet  = new AudioWorkletNode(ctx, "audio-processor");
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      worklet.port.onmessage = (e: MessageEvent<{ pcm: ArrayBuffer }>) => {
        chunksRef.current.push(new Int16Array(e.data.pcm));
      };

      source.connect(analyser);
      source.connect(worklet);

      sourceNodeRef.current  = source;
      workletNodeRef.current = worklet;
      analyserRef.current    = analyser;

      // Audio level animation
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(avg / 255);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      setIsRecording(true);

    } catch (err) {
      console.error("Microphone error:", err);
      setHasPermission(false);
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    cancelAnimationFrame(rafRef.current);
    setAudioLevel(0);

    workletNodeRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current?.close();

    setIsRecording(false);

    // Combine all PCM chunks
    const chunks = chunksRef.current;
    if (chunks.length === 0) return;

    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const combined    = new Int16Array(totalLength);
    let   offset      = 0;

    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // Encode as WAV and convert to base64
    const wav      = encodeWAV(combined, 16000);
    const base64   = arrayBufferToBase64(wav);

    onAudioReady(base64, "audio/wav");

  }, [isRecording, onAudioReady]);

  return { isRecording, hasPermission, audioLevel, startRecording, stopRecording };
}

// ── WAV encoder ────────────────────────────────────────────────────────────
function encodeWAV(samples: Int16Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view   = new DataView(buffer);

  writeString(view, 0,  "RIFF");
  view.setUint32(4,  36 + samples.length * 2, true);
  writeString(view, 8,  "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16,         true);
  view.setUint16(20, 1,          true); // PCM
  view.setUint16(22, 1,          true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2,          true);
  view.setUint16(34, 16,         true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset, samples[i]!, true);
    offset += 2;
  }

  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes  = new Uint8Array(buffer);
  let   binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}