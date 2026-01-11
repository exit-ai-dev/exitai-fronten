// src/components/TypingIndicator.tsx
import React from "react";

export function TypingIndicator() {
  return (
    <div className="flex justify-start animate-in fade-in duration-300">
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full animate-pulse" />
          <div className="relative h-8 w-8 rounded-lg glass flex items-center justify-center border border-primary/20">
            <img
              src="/brand.jpg"
              alt="ET Logo"
              className="h-6 w-6 object-contain"
              style={{ animation: "color-pulse 2s ease-in-out infinite" }}
            />
          </div>
        </div>
        <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 border border-primary/10">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
