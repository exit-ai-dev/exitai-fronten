// src/components/AssistantBubble.tsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import MarkdownMessage from "./MarkdownMessage";
import { copyToClipboard, showCopyFallbackHint } from "../lib/copy";
import TalkingAvatar from "./TalkingAvatar";
import { formatRelativeTime } from "../lib/time";
import ThinkingProcess from "./ThinkingProcess";

type Props = {
  content: string;
  talking?: boolean;
  streamSpeed?: number;
  timestamp?: number;
  reasoning?: string;
  reasoningTokens?: number;
};

const AssistantBubble = React.memo(({ content, talking = false, streamSpeed, timestamp, reasoning, reasoningTokens }: Props) => {
  const [copied, setCopied] = useState<null | boolean>(null);

  // Calculate thinking time from reasoning tokens (rough estimate: ~100 tokens/sec)
  const thinkingTime = reasoningTokens ? Math.round(reasoningTokens / 100) : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      className="flex items-start gap-3"
    >
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
        <div className="relative h-10 w-10 rounded-lg glass flex items-center justify-center border border-primary/20">
          <TalkingAvatar size={40} active={talking} className="rounded-lg" />
        </div>
      </div>

      <div className="flex-1 max-w-[min(860px,calc(100%-8.5rem))]">
        {reasoning && <ThinkingProcess reasoning={reasoning} thinkingTime={thinkingTime} />}

        <div className="relative glass rounded-2xl rounded-tl-sm text-foreground px-4 py-3 text-sm shadow-[0_6px_20px_rgba(0,0,0,0.08)] break-words group border border-primary/10">
          {streamSpeed && streamSpeed > 0 && (
            <div className="absolute left-3 top-3 text-xs text-primary font-mono animate-pulse-glow">
              ⚡ {streamSpeed} char/s
            </div>
          )}
          <button
            type="button"
            aria-label="回答をコピー"
            title="回答をコピー"
            onClick={async () => {
              const ok = await copyToClipboard(content);
              setCopied(ok);
              if (!ok) showCopyFallbackHint();
              setTimeout(() => setCopied(null), 1200);
            }}
            className="absolute right-2 top-2 rounded-md border border-border bg-card/80 text-xs px-2 py-1 shadow hover:bg-secondary focus-visible:ring-2 ring-ring ring-offset-2 transition opacity-0 group-hover:opacity-100 hover:opacity-100"
          >
            {copied === true ? "Copied!" : copied === false ? "Failed" : "Copy"}
          </button>
          <div className="pt-6">
            <MarkdownMessage content={content} />
            {timestamp && (
              <div className="text-xs text-muted-foreground mt-2 text-right">
                {formatRelativeTime(timestamp)}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

AssistantBubble.displayName = 'AssistantBubble';

export default AssistantBubble;
