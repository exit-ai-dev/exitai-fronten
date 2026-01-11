// src/components/UserMessage.tsx
import React from "react";
import { User } from "lucide-react";
import { formatRelativeTime } from "../lib/time";

type Props = {
  content: string;
  timestamp?: number;
};

const UserMessage = React.memo(({ content, timestamp }: Props) => {
  return (
    <div className="flex justify-end animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start gap-3 max-w-[85%]">
        <div className="glass-light rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
          {timestamp && (
            <span className="text-[10px] text-muted-foreground/50 mt-2 block text-right">
              {formatRelativeTime(timestamp)}
            </span>
          )}
        </div>
        <div className="h-8 w-8 rounded-lg glass border border-border flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
});

UserMessage.displayName = 'UserMessage';

export default UserMessage;
