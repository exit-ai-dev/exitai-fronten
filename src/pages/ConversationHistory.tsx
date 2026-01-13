// src/pages/ConversationHistory.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { listConversations, deleteConversation, type SavedConversation } from "../lib/conversationApi";
import { formatRelativeTime } from "../lib/time";

export default function ConversationHistory() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    const data = await listConversations();
    setConversations(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この会話を削除しますか？")) return;

    const success = await deleteConversation(id);
    if (success) {
      setConversations(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleLoadConversation = (id: string) => {
    // 会話を読み込んでAIChatページへ遷移
    navigate(`/?conversation=${id}`);
  };

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-[var(--bg)]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1200px] flex-col">
        {/* ヘッダー */}
        <header className="sticky top-0 backdrop-blur-sm bg-[var(--bg)]/95 z-10 flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 border-b border-[var(--border)]">
          <button
            onClick={() => navigate("/")}
            className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm bg-[var(--bg)] hover:bg-[var(--surface)] focus-visible:ring-2 ring-brand ring-offset-2 transition"
          >
            ← 戻る
          </button>
          <div className="text-lg md:text-xl font-semibold">会話履歴</div>
          <div className="ml-auto">
            <button
              onClick={loadConversations}
              className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm bg-[var(--bg)] hover:bg-[var(--surface)] focus-visible:ring-2 ring-brand ring-offset-2 transition"
              disabled={loading}
            >
              🔄 更新
            </button>
          </div>
        </header>

        {/* 会話一覧 */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
          {loading ? (
            <div className="text-center text-[var(--muted)] py-8">読み込み中...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-[var(--muted)] py-8">
              保存された会話はありません
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)] hover:bg-[var(--bg)] transition cursor-pointer group"
                  onClick={() => handleLoadConversation(conv.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[var(--fg)] mb-1">
                        {conv.title || "無題の会話"}
                      </h3>
                      <div className="text-xs text-[var(--muted)] space-y-0.5">
                        <div>作成: {formatRelativeTime(new Date(conv.created_at).getTime())}</div>
                        <div>更新: {formatRelativeTime(new Date(conv.updated_at).getTime())}</div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(conv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 rounded-lg border border-red-200 dark:border-red-800 px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition"
                    >
                      削除
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
