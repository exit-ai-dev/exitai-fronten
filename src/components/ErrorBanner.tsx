// src/components/ErrorBanner.tsx
import { motion, AnimatePresence } from "framer-motion";
import { ChatApiError } from "../lib/chatApi";

type Props = {
  error: ChatApiError | null;
  onRetry?: () => void;
  onDismiss: () => void;
};

export default function ErrorBanner({ error, onRetry, onDismiss }: Props) {
  if (!error) return null;

  const getIcon = () => {
    switch (error.code) {
      case 'NETWORK': return '🌐';
      case 'AUTH': return '🔒';
      case 'RATE_LIMIT': return '⏱️';
      case 'SERVER': return '⚠️';
      case 'TIMEOUT': return '⏰';
      default: return '❌';
    }
  };

  const getBgColor = () => {
    switch (error.code) {
      case 'AUTH': return 'bg-destructive/10 border-destructive/50';
      case 'RATE_LIMIT': return 'bg-accent/10 border-accent/50';
      default: return 'bg-destructive/10 border-destructive/50';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`mx-4 md:mx-6 mt-2 mb-2 rounded-xl border px-4 py-3 ${getBgColor()}`}
      >
        <div className="flex items-start gap-3">
          <span className="text-lg flex-shrink-0">{getIcon()}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {error.message}
            </p>
            {error.status > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                ステータスコード: {error.status}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {error.canRetry && onRetry && (
              <button
                onClick={onRetry}
                className="text-xs px-3 py-1.5 rounded-lg bg-card border border-border hover:bg-secondary transition"
                aria-label="再試行"
              >
                再試行
              </button>
            )}
            <button
              onClick={onDismiss}
              className="text-xs px-2 py-1.5 rounded-lg hover:bg-secondary/50 transition"
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
