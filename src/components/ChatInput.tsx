// src/components/ChatInput.tsx
import React, { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Mic } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ value, onChange, onSubmit, disabled = false, placeholder = "質問を入力..." }: ChatInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit(e);
      }
    }
  };

  return (
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
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={1}
                disabled={disabled}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground min-h-[24px] max-h-[120px] disabled:opacity-50"
              />

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  disabled={disabled}
                  title="添付ファイル"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  disabled={disabled}
                  title="音声入力"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  disabled={!value.trim() || disabled}
                  className={`h-8 w-8 rounded-lg transition-all flex items-center justify-center ${
                    value.trim() && !disabled
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-secondary text-muted-foreground cursor-not-allowed"
                  }`}
                  title="送信 (Enter)"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 px-1">
            <span className="text-[10px] text-muted-foreground">
              <kbd className="px-1 py-0.5 rounded bg-secondary text-muted-foreground font-mono text-[9px]">Enter</kbd> で送信
            </span>
            <span className="text-[10px] text-muted-foreground">EXIT GPT AI</span>
          </div>
        </form>
      </div>
    </div>
  );
}
