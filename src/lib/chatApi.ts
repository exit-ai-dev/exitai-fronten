// src/lib/chatApi.ts
import { ChatApiError, fetchWithRetry } from "./errors";

export type ChatRole = "system" | "user" | "assistant";
export type ChatMessage = {
  role: ChatRole;
  content: string;
  timestamp?: number;
  reasoning?: string; // o1 model thinking process
  reasoningTokens?: number; // reasoning token count
};

export type ChatRequest = {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
};

type SendChatOptions = {
  temperature?: number;
  max_tokens?: number;
  signal?: AbortSignal;
};

const API_BASE = import.meta.env.VITE_API_BASE !== undefined ? import.meta.env.VITE_API_BASE : "http://127.0.0.1:8000";

export { ChatApiError };

/* ---------- sendChat: オーバーロード ---------- */
// ① ChatRequest そのまま渡す
export async function sendChat(
  req: ChatRequest,
  opts?: { signal?: AbortSignal }
): Promise<{ content: string; reasoning?: string; reasoningTokens?: number }>;
// ② messages[] + options で渡す（ChatBox の呼び方）
export async function sendChat(
  messages: ChatMessage[],
  opts?: SendChatOptions
): Promise<{ content: string; reasoning?: string; reasoningTokens?: number }>;
// 実装
export async function sendChat(
  arg1: ChatRequest | ChatMessage[],
  arg2?: SendChatOptions | { signal?: AbortSignal }
): Promise<{ content: string; reasoning?: string; reasoningTokens?: number }> {
  const isArray = Array.isArray(arg1);

  const req: ChatRequest = isArray
    ? {
        messages: arg1 as ChatMessage[],
        temperature: (arg2 as SendChatOptions | undefined)?.temperature ?? 0.3,
        max_tokens: (arg2 as SendChatOptions | undefined)?.max_tokens ?? 512,
      }
    : (arg1 as ChatRequest);

  const signal: AbortSignal | undefined = isArray
    ? (arg2 as SendChatOptions | undefined)?.signal
    : (arg2 as { signal?: AbortSignal } | undefined)?.signal;

  try {
    const res = await fetchWithRetry(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const detail = data.detail || res.statusText;
      throw ChatApiError.fromResponse(res.status, detail);
    }

    return (await res.json()) as { content: string; reasoning?: string; reasoningTokens?: number };
  } catch (err) {
    if (err instanceof ChatApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') throw ChatApiError.abort();
    throw ChatApiError.network(err instanceof Error ? err.message : String(err));
  }
}

/* ---------- ストリーミング ---------- */
export type ChatStreamHandlers = {
  onToken: (chunk: string) => void;
  onDone?: (reasoning?: string, reasoningTokens?: number) => void;
  onError?: (e: unknown) => void;
};

export function streamChat(
  req: ChatRequest,
  onToken: (chunk: string) => void,
  onDone?: (reasoning?: string, reasoningTokens?: number) => void,
  onError?: (e: ChatApiError) => void
) {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetchWithRetry(`${API_BASE}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        signal: controller.signal,
      }, 0); // ストリーミングはリトライしない

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        const detail = data.detail || res.statusText;
        throw ChatApiError.fromResponse(res.status, detail);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let reasoning: string | undefined;
      let reasoningTokens: number | undefined;

      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          // バッファリングせずに即座にデコード・送信（最大速度）
          const chunk = decoder.decode(value, { stream: !done });

          // ERROR: で始まる場合はエラー
          if (chunk.startsWith("ERROR: ")) {
            throw new ChatApiError(500, 'SERVER', chunk.replace("ERROR: ", ""), false);
          }

          // REASONING: で始まる場合は思考過程（ストリーミング終了時のメタデータ）
          if (chunk.startsWith("REASONING: ")) {
            try {
              const metadata = JSON.parse(chunk.replace("REASONING: ", ""));
              reasoning = metadata.reasoning;
              reasoningTokens = metadata.reasoningTokens;
            } catch {
              // JSONパースエラーは無視
            }
            continue;
          }

          // 即座にトークンを送信（バッファリングなし）
          if (chunk) {
            onToken(chunk);
          }
        }
      }
      onDone?.(reasoning, reasoningTokens);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        onDone?.(); // Abort時も正常終了扱い
        return;
      }
      if (e instanceof ChatApiError) {
        onError?.(e);
      } else {
        onError?.(ChatApiError.network(e instanceof Error ? e.message : String(e)));
      }
    }
  })();

  return controller;
}
