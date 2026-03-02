// src/components/TypingIndicator.tsx
import { AIAvatar } from "./AIAvatar";

export function TypingIndicator() {
  return (
    <div className="flex gap-3" role="status" aria-label="AIが応答中">
      <AIAvatar size="sm" />
      <div className="glass rounded-2xl rounded-tl-sm shadow-smooth px-4 py-3 flex items-center gap-1.5">
        <span className="animate-wave         h-2 w-2 rounded-full bg-primary inline-block" />
        <span className="animate-wave-delayed  h-2 w-2 rounded-full bg-primary inline-block" />
        <span className="animate-wave-delayed-2 h-2 w-2 rounded-full bg-primary inline-block" />
      </div>
    </div>
  );
}
