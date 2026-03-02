// src/components/TypingIndicator.tsx
// Reference: futuristic-ai-terminal/components/chat/thinking-indicator.tsx
// One unified component: avatar + wave dots + skeleton preview card
import { AIAvatar } from "./AIAvatar";

const SKELETON_BARS = ["92%", "76%", "60%"] as const;

export function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start" role="status" aria-label="AIが応答中">
      <AIAvatar size="sm" />

      <div className="flex flex-col gap-3 flex-1">
        {/* Wave dots + label */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">AIが考え中</span>
          <span className="flex gap-1">
            <span className="animate-wave          h-1.5 w-1.5 rounded-full bg-primary inline-block" />
            <span className="animate-wave-delayed   h-1.5 w-1.5 rounded-full bg-primary inline-block" />
            <span className="animate-wave-delayed-2 h-1.5 w-1.5 rounded-full bg-primary inline-block" />
          </span>
        </div>

        {/* Skeleton preview — single bubble, same style as AI messages */}
        <div className="bg-white border border-blue-100/80 shadow-smooth rounded-2xl rounded-tl-sm p-4 max-w-sm">
          <div className="space-y-2.5">
            {SKELETON_BARS.map((w) => (
              <div key={w} className="skeleton-shimmer h-3.5 rounded-full" style={{ width: w }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
