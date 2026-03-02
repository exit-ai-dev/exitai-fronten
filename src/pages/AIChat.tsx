// src/pages/AIChat.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { streamChat, ChatApiError } from "../lib/chatApi";
import type { ChatMessage } from "../lib/chatApi";
import { copyToClipboard } from "../lib/copy";
import {
  createConversationTree,
  appendMessage,
  getCurrentMessages,
  serializeTree,
  deserializeTree,
  type ConversationTree,
} from "../lib/conversationTree";
import { getSessionKeys } from "../lib/session";
import { saveConversation, getConversation } from "../lib/conversationApi";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Send,
  Paperclip,
  Mic,
  Plus,
  MessageSquare,
  Settings,
  HelpCircle,
  Copy,
  Check,
} from "lucide-react";
import MarkdownMessage from "../components/MarkdownMessage";
import { OrbitLogo } from "../components/OrbitLogo";
import ThinkingProcess from "../components/ThinkingProcess";
import { TypingIndicator } from "../components/TypingIndicator";
import { AIAvatar } from "../components/AIAvatar";
import { FileUploadDialog } from "../components/FileUploadDialog";
import { formatRelativeTime } from "../lib/time";

// ─── constants ────────────────────────────────────────────────────────────────

const KUMA_STYLE = [
  "出力ルール：すべての文末に必ず『クマ♡』を付けて返答してください。",
  "コード/コマンド/URL/ファイルパス/JSON/表の中には付けないでください。",
  "箇条書きでも各行の最後に付けてください。",
].join("\n");

const STORAGE_KEYS = getSessionKeys();

const CATS = [
  "インフラ/サーバ",
  "ネットワーク",
  "OS/ミドルウェア",
  "開発/CI",
  "クラウド/Azure",
  "セキュリティ",
  "トラブルシュート",
] as const;
type Category = (typeof CATS)[number];

const DEFAULT_SYS = (cat: string) =>
  `あなたは${cat}領域のシステムエンジニアです。要件の聞き返し→前提の明確化→箇条書きの手順→最後に注意点の順で、簡潔かつ正確に答えてください。`;

// ─── MessageRow ───────────────────────────────────────────────────────────────

type MessageRowProps = {
  message: ChatMessage;
  isUser: boolean;
};

function MessageRow({ message, isUser }: MessageRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    copyToClipboard(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  /* ── User message ── */
  if (isUser) {
    return (
      <div className="flex gap-3 items-start justify-end">
        <div className="max-w-[72%]">
          <div className="gradient-primary text-white rounded-2xl rounded-tr-sm shadow-glow px-4 py-3">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>
    );
  }

  /* ── AI message ── */
  return (
    <div className="flex gap-3 items-start">
      <AIAvatar size="sm" />
      <div className="flex-1 min-w-0">
        {message.reasoning && (
          <ThinkingProcess
            reasoning={message.reasoning}
            thinkingTime={message.reasoningTokens ? Math.round(message.reasoningTokens / 100) : undefined}
          />
        )}
        {/* Bubble — solid white with border for contrast against gradient bg */}
        <div className="bg-white border border-blue-100/80 shadow-smooth rounded-2xl rounded-tl-sm px-4 py-3 text-foreground">
          <div className="text-sm leading-relaxed">
            <MarkdownMessage content={message.content} />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1.5 ml-1">
          <button onClick={handleCopy} className="p-1 text-muted-foreground hover:text-primary transition-colors">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
          {message.timestamp && (
            <span className="text-[10px] text-muted-foreground">{formatRelativeTime(message.timestamp)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AIChat ───────────────────────────────────────────────────────────────────

export default function AIChat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── state (unchanged) ──
  const [conversationTree, setConversationTree] = useState<ConversationTree>(
    () => createConversationTree()
  );
  const [currentConversationId, setCurrentConversationId] = useState<string>(
    () => {
      const p = searchParams.get("conversation");
      return p || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
  );
  const [input, setInput] = useState("");
  const [cat, setCat] = useState<Category>(CATS[0]);
  const [sys, setSys] = useState(DEFAULT_SYS(CATS[0]));
  const [kumaEnabled] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsMode] = useState<"webspeech" | "voicevox">("webspeech");
  const [isFocused, setIsFocused] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);

  // ── refs (unchanged) ──
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamStartRef = useRef<number>(0);
  const streamCharsRef = useRef<number>(0);
  const prevMessageCountRef = useRef<number>(0);
  const loaderDelayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaderMinDisplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaderShownAt = useRef<number | null>(null);
  const isSubmitting = useRef(false);

  const messages = useMemo(
    () => getCurrentMessages(conversationTree),
    [conversationTree]
  );

  // ── effects (unchanged) ──

  useEffect(() => {
    if (isStreaming) {
      loaderDelayTimer.current = setTimeout(() => {
        setShowLoader(true);
        loaderShownAt.current = Date.now();
      }, 150);
    } else {
      if (loaderDelayTimer.current) {
        clearTimeout(loaderDelayTimer.current);
        loaderDelayTimer.current = null;
      }
      if (showLoader && loaderShownAt.current) {
        const elapsed = Date.now() - loaderShownAt.current;
        const remaining = Math.max(0, 300 - elapsed);
        if (remaining > 0) {
          loaderMinDisplayTimer.current = setTimeout(() => {
            setShowLoader(false);
            loaderShownAt.current = null;
          }, remaining);
        } else {
          setShowLoader(false);
          loaderShownAt.current = null;
        }
      }
    }
    return () => {
      if (loaderDelayTimer.current) clearTimeout(loaderDelayTimer.current);
      if (loaderMinDisplayTimer.current) clearTimeout(loaderMinDisplayTimer.current);
    };
  }, [isStreaming, showLoader]);

  // Light theme lock
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  // Restore TTS setting
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEYS.tts) === "enabled") setTtsEnabled(true);
  }, []);

  // Textarea auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        150
      )}px`;
    }
  }, [input]);

  // TTS
  const speakTextWebSpeech = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = 1.0;
    u.pitch = 1.0;
    speechSynthesisRef.current = u;
    window.speechSynthesis.speak(u);
  }, []);

  const speakTextVoicevox = useCallback(async (text: string) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
      const res = await fetch(`${API_BASE}/api/tts/voicevox`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, speaker_id: 1 }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (audioRef.current) audioRef.current.pause();
        audioRef.current = new Audio(url);
        audioRef.current.play();
      }
    } catch (err) {
      console.error("VOICEVOX TTS error:", err);
    }
  }, []);

  const speakText = useCallback(
    (text: string) => {
      if (!ttsEnabled) return;
      if (ttsMode === "voicevox") speakTextVoicevox(text);
      else speakTextWebSpeech(text);
    },
    [ttsEnabled, ttsMode, speakTextVoicevox, speakTextWebSpeech]
  );

  // Load conversation
  useEffect(() => {
    const p = searchParams.get("conversation");
    if (p) {
      getConversation(p)
        .then((conv) => {
          if (conv?.conversation_tree) {
            setConversationTree(conv.conversation_tree);
            setCurrentConversationId(conv.id);
          }
        })
        .catch((err) => console.error("[AIChat] Failed to load conversation:", err));
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.tree);
        if (raw) {
          setConversationTree(deserializeTree(raw));
        } else {
          const oldMsgs = localStorage.getItem(STORAGE_KEYS.messages);
          if (oldMsgs) {
            const msgs: ChatMessage[] = JSON.parse(oldMsgs);
            let tree = createConversationTree();
            msgs.forEach((m) => { tree = appendMessage(tree, m); });
            setConversationTree(tree);
          }
        }
      } catch { /* ignore */ }
    }
  }, [searchParams]);

  // Persist tree
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tree, serializeTree(conversationTree));
    localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages));
  }, [conversationTree, messages]);

  // Auto-save to DB
  useEffect(() => {
    if (messages.length === 0) return;
    const t = setTimeout(() => {
      saveConversation(currentConversationId, conversationTree).catch((err) =>
        console.error("[AIChat] Failed to save conversation:", err)
      );
    }, 2000);
    return () => clearTimeout(t);
  }, [conversationTree, currentConversationId, messages.length]);

  // Auto-scroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming]);

  useEffect(() => {
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  // ── handlers (unchanged) ──

  const stop = useCallback(() => {
    setIsStreaming(false);
    isSubmitting.current = false;
    localStorage.setItem(STORAGE_KEYS.tree, serializeTree(conversationTree));
    localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages));
  }, [conversationTree, messages]);

  const sendMessage = useCallback(
    async (msgs: ChatMessage[]) => {
      if (isStreaming || isSubmitting.current) return;
      isSubmitting.current = true;
      setIsStreaming(true);
      streamStartRef.current = Date.now();
      streamCharsRef.current = 0;

      const systemPrompt = kumaEnabled ? `${sys}\n\n${KUMA_STYLE}` : sys;

      streamChat(
        { messages: [{ role: "system", content: systemPrompt }, ...msgs] },
        (chunk: string) => {
          streamCharsRef.current += chunk.length;
          setConversationTree((prev) => {
            const cur = getCurrentMessages(prev);
            const last = cur[cur.length - 1];
            if (last?.role === "assistant") {
              return {
                ...prev,
                nodes: new Map(prev.nodes).set(
                  prev.currentPath[prev.currentPath.length - 1],
                  {
                    ...prev.nodes.get(prev.currentPath[prev.currentPath.length - 1])!,
                    message: { ...last, content: last.content + chunk },
                  }
                ),
              };
            } else {
              return appendMessage(prev, {
                role: "assistant",
                content: chunk,
                timestamp: Date.now(),
              });
            }
          });
        },
        (reasoning?: string, reasoningTokens?: number) => {
          if (reasoning || reasoningTokens) {
            setConversationTree((prev) => {
              const cur = getCurrentMessages(prev);
              const last = cur[cur.length - 1];
              if (last?.role === "assistant") {
                return {
                  ...prev,
                  nodes: new Map(prev.nodes).set(
                    prev.currentPath[prev.currentPath.length - 1],
                    {
                      ...prev.nodes.get(prev.currentPath[prev.currentPath.length - 1])!,
                      message: { ...last, reasoning, reasoningTokens },
                    }
                  ),
                };
              }
              return prev;
            });
          }
          setIsStreaming(false);
          isSubmitting.current = false;
          const cur = getCurrentMessages(conversationTree);
          const last = cur[cur.length - 1];
          if (last?.role === "assistant" && last.content) speakText(last.content);
        },
        (err: ChatApiError) => {
          console.error(err);
          setIsStreaming(false);
          isSubmitting.current = false;
        }
      );
    },
    [isStreaming, sys, kumaEnabled, conversationTree, speakText]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming || isSubmitting.current) return;
    const userMsg: ChatMessage = { role: "user", content: text, timestamp: Date.now() };
    const updated = appendMessage(conversationTree, userMsg);
    setConversationTree(updated);
    setInput("");
    sendMessage(getCurrentMessages(updated));
  };

  const newChat = () => {
    if (isStreaming) stop();
    setConversationTree(createConversationTree());
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #ecfeff 100%)" }}
    >
      {/* Dot grid */}
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(59,130,246,0.15) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Ambient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "linear-gradient(135deg, #3b82f6, #0ea5e9)" }}
        />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-cyan-400 opacity-10 blur-3xl" />
      </div>

      {/* ── Sidebar ── */}
      <aside className="relative z-10 w-60 h-full flex flex-col bg-white/80 backdrop-blur-xl border-r border-blue-100/50 shrink-0">
        {/* Logo + New Chat */}
        <div className="p-4 border-b border-blue-100/50">
          <div className="flex items-center gap-2 px-1 mb-3">
            <OrbitLogo size={22} showText={false} className="shrink-0" />
            <span className="text-sm font-semibold text-foreground">EXIT GPT</span>
          </div>
          <button
            onClick={newChat}
            className="w-full flex items-center justify-center gap-2 h-10 gradient-primary hover:opacity-90 text-white text-sm font-medium rounded-xl transition-all shadow-glow"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>

        {/* Recent list */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <p className="px-2 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Recent
          </p>
          <div className="space-y-1">
            <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all gradient-subtle border border-blue-100/60">
              <MessageSquare className="h-4 w-4 flex-shrink-0 text-primary" />
              <span className="text-sm truncate text-foreground">現在の会話</span>
              <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            </button>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="p-3 border-t border-blue-100/50 space-y-0.5">
          <button
            onClick={() => navigate("/settings")}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-muted-foreground hover:bg-blue-50 hover:text-foreground transition-all text-sm"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            onClick={() => navigate("/history")}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-muted-foreground hover:bg-blue-50 hover:text-foreground transition-all text-sm"
          >
            <MessageSquare className="h-4 w-4" />
            History
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-muted-foreground hover:bg-blue-50 hover:text-foreground transition-all text-sm">
            <HelpCircle className="h-4 w-4" />
            Help
          </button>

          {/* User */}
          <div className="flex items-center gap-2.5 px-3 py-3 mt-1 border-t border-blue-100/50">
            <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-white shadow-glow shrink-0">
              ET
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Exit Trinity</p>
              <p className="text-[10px] text-muted-foreground">Pro Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── File Upload Dialog ── */}
      <FileUploadDialog open={fileDialogOpen} onClose={() => setFileDialogOpen(false)} />

      {/* ── Main ── */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="glass border-b border-white/30 px-6 py-3 shadow-smooth shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AIAvatar size="sm" />
              <div>
                <h1 className="text-sm font-semibold text-foreground">EXIT GPT AI</h1>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-muted-foreground">オンライン</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={cat}
                onChange={(e) => {
                  const c = e.target.value as Category;
                  setCat(c);
                  setSys(DEFAULT_SYS(c));
                }}
                className="text-xs text-muted-foreground bg-transparent focus:outline-none cursor-pointer"
              >
                {CATS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded-lg">
                gpt-4o-mini
              </span>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto relative"
          aria-busy={isStreaming}
        >
          {/* Welcome heading */}
          <div className="absolute top-8 left-0 right-0 text-center pointer-events-none select-none">
            <h2
              className="font-serif text-4xl font-medium tracking-tight"
              style={{
                background: "linear-gradient(135deg, #1e293b 0%, #3b82f6 50%, #0ea5e9 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              How can I help you today?
            </h2>
          </div>

          <div className="px-8 pt-24 pb-8 space-y-6">
            {messages.map((m, i) => (
              <MessageRow
                key={m.timestamp ?? i}
                message={m}
                isUser={m.role === "user"}
              />
            ))}

            {/* AI waiting animation — single unified component */}
            {showLoader && messages[messages.length - 1]?.role === "user" && (
              <TypingIndicator />
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="px-8 py-4 border-t border-white/30 shrink-0">
          <form onSubmit={onSubmit}>
              <div
                className={`glass rounded-2xl p-2 transition-all ${
                  isFocused ? "shadow-glow" : "shadow-smooth"
                }`}
              >
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => setFileDialogOpen(true)}
                    disabled={isStreaming}
                    className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-xl hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    title="ファイルを管理"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>

                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        onSubmit(e);
                      }
                    }}
                    placeholder="メッセージを入力..."
                    rows={1}
                    disabled={isStreaming}
                    className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground min-h-[24px] max-h-[150px] disabled:opacity-50 disabled:cursor-not-allowed py-2 px-1"
                  />

                  <button
                    type="button"
                    disabled={isStreaming}
                    onClick={() => setTtsEnabled(!ttsEnabled)}
                    className={`p-2 rounded-xl transition-colors shrink-0 ${
                      ttsEnabled
                        ? "text-primary bg-blue-50"
                        : "text-muted-foreground hover:text-primary hover:bg-blue-50"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Mic className="h-4 w-4" />
                  </button>

                  <button
                    type="submit"
                    disabled={!input.trim() || isStreaming}
                    className={`p-2.5 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                      input.trim() && !isStreaming
                        ? "gradient-primary text-white shadow-glow hover:opacity-90"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center mt-2 gap-1">
                <span className="text-[10px] text-muted-foreground">
                  <kbd className="px-1.5 py-0.5 rounded-lg bg-muted font-mono text-[10px]">
                    Enter
                  </kbd>{" "}
                  で送信 ·{" "}
                  <kbd className="px-1.5 py-0.5 rounded-lg bg-muted font-mono text-[10px]">
                    Shift+Enter
                  </kbd>{" "}
                  で改行
                </span>
              </div>
          </form>
        </div>
      </div>
    </div>
  );
}
