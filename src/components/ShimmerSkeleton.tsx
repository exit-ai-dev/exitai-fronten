// src/components/ShimmerSkeleton.tsx
import { AIAvatar } from "./AIAvatar";

const BARS = ["92%", "76%", "60%"] as const;

export function ShimmerSkeleton() {
  return (
    <div className="flex gap-3" aria-hidden="true">
      <AIAvatar size="sm" />
      <div className="glass rounded-2xl rounded-tl-sm shadow-smooth p-4 flex-1 max-w-[65%]">
        <div className="space-y-2.5">
          {BARS.map((w) => (
            <div key={w} className="skeleton-shimmer h-3.5 rounded-full" style={{ width: w }} />
          ))}
        </div>
      </div>
    </div>
  );
}
