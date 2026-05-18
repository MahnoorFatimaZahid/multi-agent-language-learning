"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Language, Level } from "../libs/api";

export interface ScenarioContext {
  personaName:    string;
  personaRole:    string;
  setting:        string;
  systemPrompt:   string;
  openingMessage: string;
}

export interface ChatMessage {
  id:        string;
  role:      "user" | "assistant";
  content:   string;
  createdAt: string;
}

type ConnectionState =
  | "connecting"
  | "ready"
  | "ended"
  | "error"
  | "reconnecting";

interface UseChatSocketOptions {
  sessionId:       string;
  language:        Language;
  level:           Level;
  scenarioRequest: string;
  onSTTResult?:    (transcript: string) => void;
}

interface UseChatSocketReturn {
  connectionState:  ConnectionState;
  scenario:         ScenarioContext | null;
  messages:         ChatMessage[];
  streamingContent: string;
  error:            string | null;
  sendMessage:      (content: string) => void;
  sendAudio:        (audioBase64: string, mimeType: string) => void;
  endSession:       () => void;
}

const WS_BASE = (process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001")
  .replace(/^http/, "ws");

export function useChatSocket({
  sessionId,
  language,
  level,
  scenarioRequest,
  onSTTResult,
}: UseChatSocketOptions): UseChatSocketReturn {
  const [connectionState,  setConnectionState]  = useState<ConnectionState>("connecting");
  const [scenario,         setScenario]         = useState<ScenarioContext | null>(null);
  const [messages,         setMessages]         = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [error,            setError]            = useState<string | null>(null);

  const wsRef             = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnects     = 5;
  const sessionStartedRef = useRef(false);

  // ── Use a ref for isEnded so onclose never causes reconnect loop ──────
  // This is the key fix. Reading state inside useCallback causes
  // the function to be recreated on every state change, which
  // triggers the useEffect and opens a new connection endlessly.
  const isEndedRef        = useRef(false);
  const isMountedRef      = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const connect = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setConnectionState("error");
      setError("Not authenticated. Please log in again.");
      return;
    }

    const url = `${WS_BASE}/ws?token=${encodeURIComponent(token)}&sessionId=${encodeURIComponent(sessionId)}`;
    const ws  = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) return;
      reconnectAttempts.current = 0;
      setConnectionState("connecting");

      if (!sessionStartedRef.current) {
        sessionStartedRef.current = true;
        ws.send(JSON.stringify({
          type: "start_session",
          sessionId,
          language,
          level,
          scenarioRequest,
        }));
      }
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      if (!isMountedRef.current) return;

      let msg: { type: string; [key: string]: unknown };
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case "session_ready": {
          setScenario(msg.scenario as ScenarioContext);
          setConnectionState("ready");
          break;
        }
        case "user_message_saved": {
          setMessages(prev => [...prev, msg.message as ChatMessage]);
          break;
        }
        case "token": {
          setStreamingContent(prev => prev + (msg.token as string));
          break;
        }
        case "message_done": {
          setMessages(prev => [...prev, msg.message as ChatMessage]);
          setStreamingContent("");
          break;
        }
        case "stt_result": {
          onSTTResult?.(msg.transcript as string);
          break;
        }
        case "session_ended": {
          isEndedRef.current = true;
          setConnectionState("ended");
          ws.close();
          break;
        }
        case "error": {
          setError((msg.message as string) ?? "An error occurred");
          break;
        }
        case "pong": {
          break;
        }
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (!isMountedRef.current) return;

      // Use the ref — NOT connectionState — to check if session ended
      // Reading connectionState here would cause infinite reconnect loop
      if (isEndedRef.current) return;

      if (reconnectAttempts.current < maxReconnects) {
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttempts.current),
          30_000
        );
        reconnectAttempts.current++;
        setConnectionState("reconnecting");
        setError(`Connection lost. Reconnecting in ${Math.round(delay / 1000)}s…`);
        setTimeout(() => {
          if (!isMountedRef.current) return;
          setError(null);
          connect();
        }, delay);
      } else {
        setConnectionState("error");
        setError("Connection lost. Please refresh the page.");
      }
    };

    ws.onerror = () => {
      if (!isMountedRef.current) return;
      setError("WebSocket connection error");
    };

  // Only depends on stable values — sessionId, language, level, scenarioRequest
  // never changes after mount. onSTTResult is a function ref.
  // This means connect() is created ONCE and never recreated.
  }, [sessionId, language, level, scenarioRequest, onSTTResult]);

  // ── Connect once on mount ─────────────────────────────────────────────
  useEffect(() => {
    connect();
    return () => {
      // Prevent reconnect on unmount
      isEndedRef.current = true;
      isMountedRef.current = false;
      reconnectAttempts.current = maxReconnects + 1;
      wsRef.current?.close();
    };
  // Empty deps — run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Heartbeat ─────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 25_000);
    return () => clearInterval(interval);
  }, []);

  // ── sendMessage ───────────────────────────────────────────────────────
  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      setError("Not connected. Please wait.");
      return;
    }
    if (!content.trim()) return;
    wsRef.current.send(JSON.stringify({
      type:    "send_message",
      content: content.trim(),
    }));
  }, []);

  // ── sendAudio ─────────────────────────────────────────────────────────
  const sendAudio = useCallback((audioBase64: string, mimeType: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      setError("Not connected. Please wait.");
      return;
    }
    wsRef.current.send(JSON.stringify({
      type:     "send_audio",
      audio:    audioBase64,
      mimeType,
    }));
  }, []);

  // ── endSession ────────────────────────────────────────────────────────
  const endSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "end_session" }));
    }
  }, []);

  return {
    connectionState,
    scenario,
    messages,
    streamingContent,
    error,
    sendMessage,
    sendAudio,
    endSession,
  };
}