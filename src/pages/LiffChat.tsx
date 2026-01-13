// src/pages/LiffChat.tsx
/**
 * LINE LIFF対応のAIチャットページ
 * LINE内ブラウザで動作し、LINEユーザー情報を取得してチャット
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import liff from "@line/liff";
import { motion } from "framer-motion";
import { streamChat, ChatApiError } from "../lib/chatApi";
import type { ChatMessage } from "../lib/chatApi";
import AssistantBubble from "../components/AssistantBubble";
import UserMessage from "../components/UserMessage";
import ErrorBanner from "../components/ErrorBanner";

const LIFF_ID = import.meta.env.VITE_LINE_LIFF_ID || "";
type LiffProfile = Awaited<ReturnType<typeof liff.getProfile>>;

export default function LiffChat() {
  const [liffReady, setLiffReady] = useState(false);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<LiffProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<ChatApiError | null>(null);
  const [streamSpeed, setStreamSpeed] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const streamStartRef = useRef<number>(0);
  const streamCharsRef = useRef<number>(0);

  // LIFF初期化
  useEffect(() => {
    if (!LIFF_ID) {
      setLiffError("LIFF IDが設定されていません。環境変数 VITE_LINE_LIFF_ID を設定してください。");
      return;
    }

    liff
      .init({ liffId: LIFF_ID })
      .then(() => {
        setLiffReady(true);

        // ログインチェック
        if (!liff.isLoggedIn()) {
          liff.login();
        } else {
          // プロフィール取得
          liff.getProfile().then((profile) => {
            setUserProfile(profile);
            console.log("[LIFF] User profile:", profile);
          }).catch((err) => {
            console.error("[LIFF] Failed to get profile:", err);
          });
        }
      })
      .catch((err) => {
        console.error("[LIFF] Initialization failed:", err);
        setLiffError(`LIFF初期化エラー: ${err.message}`);
      });
  }, []);

  // 自動スクロール
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming]);

  const systemPrompt = useMemo(() => {
    return "あなたは親切なAIアシスタントです。ユーザーの質問に簡潔かつ丁寧に答えてください。";
  }, []);

  const base: ChatMessage[] = useMemo(
    () => [{ role: "system" as const, content: systemPrompt }],
    [systemPrompt]
  );

  const sendMessage = (userMessages: ChatMessage[]) => {
    setError(null);

    // Add assistant message placeholder
    const tempAssistant: ChatMessage = { role: "assistant", content: "", timestamp: Date.now() };
    setMessages((prev) => [...prev, tempAssistant]);

    setIsStreaming(true);
    streamStartRef.current = Date.now();
    streamCharsRef.current = 0;
    setStreamSpeed(0);

    abortRef.current = streamChat(
      { messages: [...base, ...userMessages], temperature: 0.7, max_tokens: 500 },
      (chunk) => {
        streamCharsRef.current += chunk.length;
        const elapsed = (Date.now() - streamStartRef.current) / 1000;
        if (elapsed > 0) {
          setStreamSpeed(Math.round(streamCharsRef.current / elapsed));
        }

        // Update the last message
        setMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === "assistant") {
            lastMsg.content += chunk;
          }
          return updated;
        });
      },
      () => {
        setIsStreaming(false);
        setStreamSpeed(0);
        abortRef.current = null;
      },
      (err) => {
        console.error(err);
        setIsStreaming(false);
        setStreamSpeed(0);
        abortRef.current = null;
        setError(err);
      }
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const userMsg: ChatMessage = { role: "user", content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    sendMessage([...messages, userMsg]);
  };

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const handleResend = (index: number) => {
    const resendMessages = messages.slice(0, index + 1);
    setMessages(resendMessages);
    sendMessage(resendMessages);
  };

  // LIFF準備中
  if (!liffReady) {
    return (
      <div className="min-h-dvh w-full flex items-center justify-center bg-[var(--bg)]">
        <div className="text-center">
          {liffError ? (
            <>
              <div className="text-4xl mb-4">❌</div>
              <p className="text-red-500">{liffError}</p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-4 animate-spin">⏳</div>
              <p className="text-[var(--muted)]">LIFFを初期化中...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-[var(--bg)]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1200px] flex-col">
        {/* ヘッダー */}
        <header className="sticky top-0 backdrop-blur-sm bg-[var(--bg)]/95 z-10 flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 border-b border-[var(--border)]">
          <div className="text-lg md:text-xl font-semibold">EXIT GPT</div>
          {userProfile && (
            <div className="ml-auto flex items-center gap-2">
              <img
                src={userProfile.pictureUrl}
                alt={userProfile.displayName}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm text-[var(--muted)]">{userProfile.displayName}</span>
            </div>
          )}
        </header>

        {/* エラーバナー */}
        <ErrorBanner
          error={error}
          onRetry={() => {
            setError(null);
            if (messages.length > 0) {
              handleResend(messages.length - 1);
            }
          }}
          onDismiss={() => setError(null)}
        />

        {/* メッセージリスト */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4 overscroll-contain"
        >
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-[var(--muted)] text-center mt-8"
            >
              LINE上でAIに質問できます。<br />
              何でも聞いてください！
            </motion.div>
          )}
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`flex flex-col gap-1 w-full ${isUser ? "items-end" : "items-start"}`}
              >
                <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
                  {isUser ? (
                    <UserMessage
                      content={m.content || (i === messages.length - 1 && isStreaming ? "…" : "")}
                      timestamp={m.timestamp}
                    />
                  ) : (
                    <AssistantBubble
                      content={m.content || (i === messages.length - 1 && isStreaming ? "…" : "")}
                      talking={m.role === "assistant" && i === messages.length - 1 && isStreaming}
                      streamSpeed={m.role === "assistant" && i === messages.length - 1 && isStreaming ? streamSpeed : undefined}
                      timestamp={m.timestamp}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 入力エリア */}
        <form
          onSubmit={onSubmit}
          className="px-4 md:px-6 py-3 border-t border-[var(--border)] bg-[var(--bg)]"
        >
          <div className="flex items-end gap-2">
            <label htmlFor="chat-input" className="sr-only">
              メッセージ入力
            </label>
            <textarea
              id="chat-input"
              title="メッセージ入力"
              aria-label="メッセージ入力"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="質問を入力…（Shift+Enterで改行）"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
              className="flex-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm bg-[var(--bg)] text-[var(--fg)] focus:outline-none focus-visible:ring-2 ring-brand ring-offset-2 resize-none transition"
            />
            <button
              type={isStreaming ? "button" : "submit"}
              onClick={isStreaming ? stop : undefined}
              className="rounded-xl px-4 py-3 text-sm font-medium shadow-[0_6px_20px_rgba(0,0,0,0.08)] bg-brand text-white hover:bg-brand-hover focus-visible:ring-2 ring-brand ring-offset-2 transition"
              aria-label={isStreaming ? "停止" : "送信"}
            >
              {isStreaming ? "停止" : "送信"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
