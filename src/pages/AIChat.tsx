// src/pages/AIChat.tsx - 完全刷新版
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
  User,
  Bot,
} from "lucide-react";
import MarkdownMessage from "../components/MarkdownMessage";
import { LogoThinkingOverlay } from "../components/LogoThinkingOverlay";
import { OrbitLogo } from "../components/OrbitLogo";
import ThinkingProcess from "../components/ThinkingProcess";
import { formatRelativeTime } from "../lib/time";

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
    <div className={`flex gap-3 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
            <Bot className="h-4 w-4 text-slate-600" />
          </div>
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? "order-first" : ""}`}>
        {/* Show thinking process for assistant messages */}
        {!isUser && message.reasoning && (
          <ThinkingProcess
            reasoning={message.reasoning}
            thinkingTime={message.reasoningTokens ? Math.round(message.reasoningTokens / 100) : undefined}
          />
        )}

        <div className={`rounded-full px-5 py-3 ${isUser ? "bg-red-600 text-white" : "bg-slate-100 text-slate-900"}`}>
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="text-sm leading-relaxed">
              <MarkdownMessage content={message.content} />
            </div>
          )}
        </div>

        {!isUser && (
          <div className="flex items-center gap-2 mt-1.5 ml-2">
            <button
              onClick={handleCopy}
              className="p-1 text-slate-400 hover:text-red-600 transition-colors"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
            {message.timestamp && (
              <span className="text-[10px] text-slate-400">{formatRelativeTime(message.timestamp)}</span>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
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

  // チャット画面はライトテーマ固定
  useEffect(() => {
    document.documentElement.classList.remove("dark");
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
        (reasoning?: string, reasoningTokens?: number) => {
          // ストリーミング完了 - 思考過程を保存
          if (reasoning || reasoningTokens) {
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
                      message: {
                        ...lastMsg,
                        reasoning,
                        reasoningTokens,
                      },
                    }
                  ),
                };
              }
              return prev;
            });
          }

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
    <div className="flex h-screen bg-white text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 h-full flex flex-col bg-white border-r border-slate-100">
        <div className="p-5">
          <button
            onClick={newChat}
            className="w-full flex items-center justify-center gap-2 h-11 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-full transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          <p className="px-3 mb-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Recent</p>
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-left transition-all bg-red-50 text-red-600 font-medium">
              <MessageSquare className="h-4 w-4 flex-shrink-0 text-red-500" />
              <span className="text-sm truncate">現在の会話</span>
              <div className="ml-auto h-2 w-2 rounded-full bg-red-500" />
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 space-y-1">
          <button
            onClick={() => navigate("/settings")}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all text-sm"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            onClick={() => navigate("/history")}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all text-sm"
          >
            <MessageSquare className="h-4 w-4" />
            History
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2 rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all text-sm">
            <HelpCircle className="h-4 w-4" />
            Help
          </button>
          <div className="flex items-center gap-3 px-4 py-3 mt-3 border-t border-slate-100 pt-4">
            <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-white">
              ET
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">Exit Trinity</p>
              <p className="text-[10px] text-slate-400">Pro Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-white">
        <header className="h-12 flex items-center justify-between px-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <OrbitLogo size={28} showText={false} className="shrink-0" />
            <span className="text-sm font-medium text-slate-900">EXIT GPT AI</span>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={cat}
              onChange={(e) => {
                const c = e.target.value as Category;
                setCat(c);
                setSys(DEFAULT_SYS(c));
              }}
              className="text-xs text-slate-400 bg-transparent focus:outline-none"
            >
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-400 font-mono">gpt-4o-mini</span>
          </div>
        </header>

        <div ref={listRef} className="flex-1 overflow-y-auto relative" aria-busy={isStreaming}>
          <div className="absolute top-8 left-0 right-0 text-center pointer-events-none">
            <h1 className="font-serif text-4xl font-medium text-slate-900 tracking-tight">
              How can I help you <span className="text-red-600">today</span>?
            </h1>
          </div>
          <div className="max-w-1xl mx-auto px-6 pt-24 pb-8 space-y-6">
            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return <MessageRow key={m.timestamp ?? i} message={m} isUser={isUser} />;
            })}
          </div>

          {/* Show logo animation overlay when loading */}
          {showLoader && messages[messages.length - 1]?.role === "user" && <LogoThinkingOverlay />}
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={onSubmit}>
              <div
                className={`relative rounded-full transition-all ${
                  isFocused ? "bg-white border-2 border-red-200 shadow-lg" : "bg-slate-50 border-2 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3 px-5 py-3">
                  <button
                    type="button"
                    disabled={isStreaming}
                    className="p-1.5 text-slate-400 hover:text-red-600 transition-colors rounded-full hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    placeholder="Ask a follow-up question..."
                    rows={1}
                    disabled={isStreaming}
                    className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-900 placeholder:text-slate-400 min-h-[24px] max-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
                  />

                  <button
                    type="button"
                    disabled={isStreaming}
                    onClick={() => setTtsEnabled(!ttsEnabled)}
                    className={`p-1.5 rounded-full transition-colors ${
                      ttsEnabled
                        ? "text-red-600 bg-red-50"
                        : "text-slate-400 hover:text-red-600 hover:bg-slate-100"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Mic className="h-4 w-4" />
                  </button>

                  <button
                    type="submit"
                    disabled={!input.trim() || isStreaming}
                    className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                      input.trim() && !isStreaming
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center mt-2">
                <span className="text-[10px] text-slate-400">
                  Press{" "}
                  <kbd className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono text-[10px]">
                    Enter
                  </kbd>{" "}
                  to send
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
