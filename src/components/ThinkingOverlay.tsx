// src/components/ThinkingOverlay.tsx
import { ExitotrinityLogo } from "./ExitotrinityLogo";

export function ThinkingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="relative">
        {/* Outer glow rings */}
        <div className="absolute inset-0 -m-16 rounded-full bg-red-500/10 blur-2xl animate-pulse" />
        <div
          className="absolute inset-0 -m-8 rounded-full bg-red-500/20 blur-xl animate-pulse"
          style={{ animationDelay: "0.5s" }}
        />

        {/* Exitotrinity Logo */}
        <div className="relative">
          <ExitotrinityLogo size={200} />
        </div>

        {/* Processing label */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-light border border-red-500/20 bg-white/80 backdrop-blur-sm">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-900">AI is thinking...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
