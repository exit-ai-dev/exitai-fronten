// src/components/ThinkingOverlay.tsx
import React from "react";

export function ThinkingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="relative">
        {/* Outer glow rings */}
        <div className="absolute inset-0 -m-8 rounded-full bg-primary/10 blur-2xl animate-pulse" />
        <div
          className="absolute inset-0 -m-4 rounded-full bg-primary/20 blur-xl animate-pulse"
          style={{ animationDelay: "0.5s" }}
        />

        {/* AI Logo Container */}
        <div className="relative h-24 w-24 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/30 animate-pulse">
          {/* AI Icon */}
          <svg
            className="h-12 w-12 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>

          {/* Inner glow */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
        </div>

        {/* Orbiting particles */}
        <div className="absolute inset-0 -m-12">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-primary animate-orbit" />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-accent animate-orbit"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute top-1/2 left-0 -translate-y-1/2 h-2 w-2 rounded-full bg-primary/80 animate-orbit"
            style={{ animationDelay: "0.5s" }}
          />
          <div
            className="absolute top-1/2 right-0 -translate-y-1/2 h-2 w-2 rounded-full bg-accent/80 animate-orbit"
            style={{ animationDelay: "1.5s" }}
          />
        </div>

        {/* Processing label */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-light border border-primary/20">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary">AI is thinking...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
