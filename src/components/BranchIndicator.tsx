// src/components/BranchIndicator.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ConversationBranch } from "../lib/conversationTree";

type Props = {
  branches: ConversationBranch[];
  currentIndex: number;
  onSwitchBranch: (nodeId: string) => void;
};

export default function BranchIndicator({ branches, currentIndex, onSwitchBranch }: Props) {
  const [showMenu, setShowMenu] = useState(false);

  if (branches.length === 0) return null;

  const totalBranches = branches.length + 1; // +1 for current branch

  return (
    <div className="relative inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md border border-accent bg-accent/10 text-accent-foreground hover:bg-accent/20 transition"
        title="他の分岐を表示"
        aria-label={`${totalBranches}個の分岐があります`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12M8 17h12M3 7h.01M3 12h.01M3 17h.01" />
        </svg>
        <span className="font-mono">
          {currentIndex + 1}/{totalBranches}
        </span>
      </button>

      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-1 z-50 min-w-[280px] max-w-[400px] glass-light rounded-lg shadow-lg overflow-hidden"
            >
              <div className="px-3 py-2 bg-card/50 border-b border-border">
                <h3 className="text-xs font-semibold text-foreground">会話の分岐</h3>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {currentIndex === 0 && (
                  <div className="px-3 py-2 bg-primary/10 border-l-2 border-primary">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-primary">● 現在</span>
                    </div>
                  </div>
                )}
                {branches.map((branch, idx) => {
                  const isActive = idx + 1 === currentIndex;
                  return (
                    <button
                      key={branch.nodeId}
                      type="button"
                      onClick={() => {
                        onSwitchBranch(branch.nodeId);
                        setShowMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-secondary/50 transition border-l-2 ${
                        isActive
                          ? "bg-primary/10 border-primary"
                          : "border-transparent"
                      }`}
                    >
                      {isActive && (
                        <div className="font-mono text-primary mb-1">● 現在</div>
                      )}
                      <div className="text-foreground line-clamp-2">{branch.preview}</div>
                      <div className="text-muted-foreground mt-1">
                        {new Date(branch.timestamp).toLocaleString("ja-JP", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
