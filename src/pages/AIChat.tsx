// src/pages/AIChat.tsx - 完全刷新版
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
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
import { Send, Paperclip, Mic, Plus, Search, MessageSquare, Settings, ChevronDown, Copy, Check } from "lucide-react";
import MarkdownMessage from "../components/MarkdownMessage";
import { formatRelativeTime } from "../lib/time";
import { AmbientBackground } from "../components/AmbientBackground";

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

  return (
    <div className={`flex gap-4 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-lg glass border border-primary/20 flex items-center justify-center">
            <img src="/brand.jpg" alt="ET Logo" className="h-6 w-6 object-contain" />
          </div>
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? "order-first" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-primary/10 border border-primary/20 rounded-tr-sm"
              : "glass border border-border rounded-tl-sm"
          }`}
        >
          {isUser ? (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="text-sm text-foreground leading-relaxed">
              <MarkdownMessage content={message.content} />
            </div>
          )}
        </div>

        {!isUser && (
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleCopy}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
            {message.timestamp && (
              <span className="text-[10px] text-muted-foreground">{formatRelativeTime(message.timestamp)}</span>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-lg glass border border-border flex items-center justify-center">
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AIChat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversationTree, setConversationTree] = useState<ConversationTree>(() => createConversationTree());
  const [currentConversationId, setCurrentConversationId] = useState<string>(() => {
    const conversationParam = searchParams.get('conversation');
    return conversationParam || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  });
  const [input, setInput] = useState("");
  const [cat, setCat] = useState<Category>(CATS[0]);
  const [sys, setSys] = useState(DEFAULT_SYS(CATS[0]));
  const [kumaEnabled] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsMode] = useState<'webspeech' | 'voicevox'>('webspeech');
  const [isFocused, setIsFocused] = useState(false);

  // ローディング表示制御（ちらつき防止）
  const [showLoader, setShowLoader] = useState(false);

  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamStartRef = useRef<number>(0);
  const streamCharsRef = useRef<number>(0);
  const prevMessageCountRef = useRef<number>(0);

  // ローディング制御用のタイマー参照（ちらつき防止）
  const loaderDelayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaderMinDisplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaderShownAt = useRef<number | null>(null);

  // 連打防止：送信中フラグ
  const isSubmitting = useRef(false);

  const messages = useMemo(() => getCurrentMessages(conversationTree), [conversationTree]);

  // ローディング表示制御（ちらつき防止: 150ms遅延 + 最低300ms表示）
  useEffect(() => {
    if (isStreaming) {
      // 150ms遅延後にローディングを表示開始（短時間処理でのフラッシュ防止）
      loaderDelayTimer.current = setTimeout(() => {
        setShowLoader(true);
        loaderShownAt.current = Date.now();
      }, 150);
    } else {
      // ローディング終了時
      if (loaderDelayTimer.current) {
        clearTimeout(loaderDelayTimer.current);
        loaderDelayTimer.current = null;
      }

      if (showLoader && loaderShownAt.current) {
        const elapsed = Date.now() - loaderShownAt.current;
        const remaining = Math.max(0, 300 - elapsed); // 最低300ms表示（ちらつき防止）

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

  // テーマ復元
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // TTS設定の復元
  useEffect(() => {
    const savedTts = localStorage.getItem(STORAGE_KEYS.tts);
    if (savedTts === "enabled") {
      setTtsEnabled(true);
    }
  }, []);

  // Textarea auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // TTS関数
  const speakTextWebSpeech = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const speakTextVoicevox = useCallback(async (text: string) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/api/tts/voicevox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speaker_id: 1 })
      });
      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = new Audio(audioUrl);
        audioRef.current.play();
      }
    } catch (err) {
      console.error('VOICEVOX TTS error:', err);
    }
  }, []);

  const speakText = useCallback((text: string) => {
    if (!ttsEnabled) return;
    if (ttsMode === 'voicevox') {
      speakTextVoicevox(text);
    } else {
      speakTextWebSpeech(text);
    }
  }, [ttsEnabled, ttsMode, speakTextVoicevox, speakTextWebSpeech]);

  // 会話読み込み
  useEffect(() => {
    const conversationParam = searchParams.get('conversation');
    if (conversationParam) {
      getConversation(conversationParam).then(conv => {
        if (conv && conv.conversation_tree) {
          setConversationTree(conv.conversation_tree);
          setCurrentConversationId(conv.id);
        }
      }).catch(err => {
        console.error("[AIChat] Failed to load conversation:", err);
      });
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
            msgs.forEach(msg => {
              tree = appendMessage(tree, msg);
            });
            setConversationTree(tree);
          }
        }
      } catch {
        // ignore
      }
    }
  }, [searchParams]);

  // ツリー保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tree, serializeTree(conversationTree));
    localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages));
  }, [conversationTree, messages]);

  // データベースへ自動保存
  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => {
      saveConversation(currentConversationId, conversationTree).catch(err =>
        console.error("[AIChat] Failed to save conversation:", err)
      );
    }, 2000);
    return () => clearTimeout(timer);
  }, [conversationTree, currentConversationId, messages.length]);

  // 自動スクロール
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming]);

  useEffect(() => {
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  const stop = useCallback(() => {
    setIsStreaming(false);
    isSubmitting.current = false; // 二重送信フラグOFF
    localStorage.setItem(STORAGE_KEYS.tree, serializeTree(conversationTree));
    localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages));
  }, [conversationTree, messages]);

  const sendMessage = useCallback(
    async (msgs: ChatMessage[]) => {
      // 連打防止：送信中または既にストリーミング中の場合は無視
      if (isStreaming || isSubmitting.current) return;

      isSubmitting.current = true; // 二重送信フラグON
      setIsStreaming(true);
      streamStartRef.current = Date.now();
      streamCharsRef.current = 0;

      const systemPrompt = kumaEnabled ? `${sys}\n\n${KUMA_STYLE}` : sys;

      streamChat(
        { messages: [{ role: "system", content: systemPrompt }, ...msgs] },
        (chunk: string) => {
          streamCharsRef.current += chunk.length;

          setConversationTree((prev) => {
            const currentMsgs = getCurrentMessages(prev);
            const lastMsg = currentMsgs[currentMsgs.length - 1];
            if (lastMsg && lastMsg.role === "assistant") {
              return {
                ...prev,
                nodes: new Map(prev.nodes).set(
                  prev.currentPath[prev.currentPath.length - 1],
                  {
                    ...prev.nodes.get(prev.currentPath[prev.currentPath.length - 1])!,
                    message: { ...lastMsg, content: lastMsg.content + chunk },
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
        () => {
          // ストリーミング完了
          setIsStreaming(false);
          isSubmitting.current = false; // 二重送信フラグOFF
          const currentMessages = getCurrentMessages(conversationTree);
          const lastMessage = currentMessages[currentMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content) {
            speakText(lastMessage.content);
          }
        },
        (err: ChatApiError) => {
          // エラー時
          console.error(err);
          setIsStreaming(false);
          isSubmitting.current = false; // 二重送信フラグOFF
        }
      );
    },
    [isStreaming, sys, kumaEnabled, conversationTree, speakText]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();

    // 連打防止：空文字、送信中、またはストリーミング中は無視
    if (!text || isStreaming || isSubmitting.current) return;

    const userMsg: ChatMessage = { role: "user", content: text, timestamp: Date.now() };
    const updatedTree = appendMessage(conversationTree, userMsg);
    setConversationTree(updatedTree);
    setInput("");
    sendMessage(getCurrentMessages(updatedTree));
  };

  const newChat = () => {
    if (isStreaming) stop();
    setConversationTree(createConversationTree());
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AmbientBackground />

      {/* Sidebar */}
      <aside className="w-72 h-full flex flex-col glass border-r border-border/50 relative z-10">
        <div className="p-4 border-b border-border/50 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <img src="/brand.jpg" alt="ET Logo" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-sm font-semibold text-foreground">EXIT GPT AI</h1>
              <p className="text-xs text-muted-foreground">AI Chat Assistant</p>
            </div>
          </div>
          <button
            onClick={newChat}
            className="w-full justify-start gap-2 h-10 glass hover:bg-primary/10 text-primary border border-primary/20 rounded-lg transition-all flex items-center px-4"
          >
            <Plus className="h-4 w-4" />
            新しいチャット
          </button>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="チャットを検索..."
              className="w-full h-9 pl-9 pr-3 rounded-lg glass-light border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="mb-2">
            <button className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              <ChevronDown className="h-3 w-3" />
              履歴
            </button>
          </div>
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all bg-primary/10 text-primary border border-primary/20">
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm truncate">現在の会話</span>
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-border/50 space-y-2">
          <button
            onClick={() => navigate("/history")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all text-sm"
          >
            <MessageSquare className="h-4 w-4" />
            会話履歴
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all text-sm"
          >
            <Settings className="h-4 w-4" />
            設定
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-6 glass border-b border-border/50">
          <div className="flex items-center gap-3">
            <img src="/brand.jpg" alt="ET Logo" className="h-8 w-8 object-contain" />
            <span className="text-sm font-medium text-foreground">EXIT GPT AI</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <select
              value={cat}
              onChange={(e) => {
                const c = e.target.value as Category;
                setCat(c);
                setSys(DEFAULT_SYS(c));
              }}
              className="rounded-lg border border-border px-2 py-1 bg-input text-foreground text-xs"
            >
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Messages Area - aria-busyでスクリーンリーダーに状態通知 */}
        <div ref={listRef} className="flex-1 overflow-y-auto relative" aria-busy={isStreaming}>
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center min-h-[60vh] gap-6"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                  <div className="relative h-32 w-32 rounded-2xl glass flex items-center justify-center border border-primary/20">
                    <img src="/brand.jpg" alt="ET Logo" className="h-28 w-28 object-contain" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-semibold text-foreground">EXIT GPT AI</h2>
                  <p className="text-sm text-muted-foreground">カテゴリを選んで質問を入力してください</p>
                </div>
              </motion.div>
            )}

            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return <MessageRow key={m.timestamp ?? i} message={m} isUser={isUser} />;
            })}

            {/* ローディング表示（150ms遅延後に表示、一度表示したら最低300ms表示） */}
            {showLoader && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-lg glass border border-primary/20 flex items-center justify-center">
                    <img
                      src="/brand.jpg"
                      alt="ET Logo"
                      className="h-6 w-6 object-contain motion-reduce:animate-none"
                      style={{ animation: "color-pulse 2s ease-in-out infinite" }}
                      aria-label="読み込み中"
                    />
                  </div>
                </div>
                <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 border border-primary/10">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce motion-reduce:animate-none" style={{ animationDelay: "0ms" }} />
                    <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce motion-reduce:animate-none" style={{ animationDelay: "150ms" }} />
                    <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce motion-reduce:animate-none" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 glass border-t border-border/50">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={onSubmit}>
              <div
                className={`relative rounded-xl border transition-all ${
                  isFocused ? "glass border-primary/30 shadow-lg shadow-primary/5" : "glass-light border-border"
                }`}
              >
                <div className="flex items-end gap-3 p-3">
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
                    placeholder="質問を入力..."
                    rows={1}
                    disabled={isStreaming} // ローディング中は入力無効化
                    className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground min-h-[24px] max-h-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
                  />

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isStreaming}
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Paperclip className="h-4 w-4 mx-auto" />
                    </button>
                    <button
                      type="button"
                      disabled={isStreaming}
                      onClick={() => setTtsEnabled(!ttsEnabled)}
                      className={`h-8 w-8 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        ttsEnabled ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}
                    >
                      <Mic className="h-4 w-4 mx-auto" />
                    </button>
                    <button
                      type="submit"
                      disabled={!input.trim() || isStreaming} // ローディング中または空文字は送信無効化
                      className={`h-8 w-8 rounded-lg transition-all ${
                        input.trim() && !isStreaming
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                          : "bg-secondary text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      <Send className="h-4 w-4 mx-auto" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-[10px] text-muted-foreground">
                  <kbd className="px-1 py-0.5 rounded bg-secondary text-muted-foreground font-mono">Enter</kbd> で送信
                </span>
                <span className="text-[10px] text-muted-foreground">EXIT GPT AI v1.0</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
