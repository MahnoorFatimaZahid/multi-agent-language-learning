"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Language, Level } from "../libs/api";

// ── Types ──────────────────────────────────────────────────────────────────
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

type ConnectionState = "connecting" | "ready" | "ended" | "error" | "reconnecting";

interface UseChatSocketReturn {
  connectionState:  ConnectionState;
  scenario:         ScenarioContext | null;
  messages:         ChatMessage[];
  streamingContent: string;
  error:            string | null;
  sendMessage:      (content: string) => void;
  endSession:       () => void;
}

const WS_BASE = (process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001")
  .replace(/^http/, "ws");

export function useChatSocket(
  sessionId: string,
  language: Language,
  level: Level,
  scenarioRequest: string
): UseChatSocketReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [scenario, setScenario]               = useState<ScenarioContext | null>(null);
  const [messages, setMessages]               = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError]                     = useState<string | null>(null);

  const wsRef             = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnects     = 5;
  const sessionStartedRef = useRef(false);
  const intentionalClose  = useRef(false);

  // ── connect ──────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    // Reset intentional-close flag for this new connection attempt.
    // This is needed because React StrictMode in dev runs cleanup+remount,
    // which sets intentionalClose=true for the first (discarded) WS and
    // then immediately calls connect() again for the real one.
    intentionalClose.current = false;

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
      // Ignore events from a stale WS (replaced by a newer connect() call)
      if (wsRef.current !== ws) { ws.close(); return; }

      reconnectAttempts.current = 0;
      setConnectionState("connecting"); // remains "connecting" until session_ready

      if (!sessionStartedRef.current) {
        sessionStartedRef.current = true;
        ws.send(JSON.stringify({ type: "start_session", sessionId, language, level, scenarioRequest }));
      }
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      if (wsRef.current !== ws) return; // stale

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
        case "session_ended": {
          intentionalClose.current = true;
          setConnectionState("ended");
          ws.close();
          break;
        }
        case "error": {
          setError((msg.message as string) ?? "An error occurred");
          break;
        }
        case "pong":
          break;
      }
    };

    ws.onclose = () => {
      // Stale check: cleanup nulls wsRef.current before calling ws.close(),
      // so old-WS close events are ignored once a new WS has taken over.
      if (wsRef.current !== ws) return;
      wsRef.current = null;

      if (intentionalClose.current) return;

      if (reconnectAttempts.current < maxReconnects) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30_000);
        reconnectAttempts.current++;
        // Allow start_session to be sent again to the fresh WSSession on the server
        sessionStartedRef.current = false;
        setConnectionState("reconnecting");
        setError(`Connection lost. Reconnecting in ${Math.round(delay / 1000)}s…`);
        setTimeout(() => {
          setError(null);
          connect();
        }, delay);
      } else {
        setConnectionState("error");
        setError("Connection lost. Please refresh the page to continue.");
      }
    };

    ws.onerror = () => {
      // Only report errors for the active WS (not the StrictMode-discarded one)
      if (wsRef.current !== ws) return;
      setError("WebSocket error occurred");
    };
  }, [sessionId, language, level, scenarioRequest]);

  // ── mount / unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    connect();

    return () => {
      intentionalClose.current  = true;
      sessionStartedRef.current = false; // next connect() must send start_session
      reconnectAttempts.current = maxReconnects + 1;

      // Null wsRef BEFORE closing so the ws.onclose stale-check fires correctly
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  }, [connect]);

  // ── Heartbeat ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 25_000);
    return () => clearInterval(interval);
  }, []);

  // ── sendMessage ───────────────────────────────────────────────────────────
  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      setError("Not connected. Please wait…");
      return;
    }
    if (connectionState !== "ready") {
      setError("Session not ready yet. Please wait.");
      return;
    }
    if (!content.trim()) return;
    wsRef.current.send(JSON.stringify({ type: "send_message", content: content.trim() }));
  }, [connectionState]);

  // ── endSession ────────────────────────────────────────────────────────────
  const endSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "end_session" }));
    }
  }, []);

  return { connectionState, scenario, messages, streamingContent, error, sendMessage, endSession };
}
