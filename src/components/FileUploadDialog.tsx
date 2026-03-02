// src/components/FileUploadDialog.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, Upload, Trash2, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

// ─── types ────────────────────────────────────────────────────────────────────

interface IndexedFile {
  file_id: string;
  filename: string;
  chunk_count: number;
  indexed_at: string;
}

interface FileUploadDialogProps {
  open: boolean;
  onClose: () => void;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_API_BASE || "";

async function fetchFiles(): Promise<IndexedFile[]> {
  const res = await fetch(`${API}/api/files/list`);
  if (!res.ok) throw new Error("Failed to fetch files");
  const data = await res.json();
  return data.files as IndexedFile[];
}

async function uploadFile(file: File): Promise<{ chunk_count: number }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/api/files/upload`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Upload failed");
  }
  return res.json();
}

async function deleteFile(file_id: string): Promise<void> {
  const res = await fetch(`${API}/api/files/${file_id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Delete failed");
}

// ─── component ────────────────────────────────────────────────────────────────

export function FileUploadDialog({ open, onClose }: FileUploadDialogProps) {
  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      setFiles(await fetchFiles());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadFiles();
  }, [open, loadFiles]);

  const handleUpload = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setUploadMsg(null);
    const errors: string[] = [];
    for (const file of Array.from(fileList)) {
      try {
        const r = await uploadFile(file);
        setUploadMsg({
          type: "ok",
          text: `「${file.name}」を ${r.chunk_count} チャンクでインデックス化しました`,
        });
      } catch (e) {
        errors.push(`${file.name}: ${(e as Error).message}`);
      }
    }
    if (errors.length) {
      setUploadMsg({ type: "err", text: errors.join(" / ") });
    }
    setUploading(false);
    loadFiles();
  }, [loadFiles]);

  const handleDelete = useCallback(async (file_id: string, filename: string) => {
    if (!confirm(`「${filename}」を削除しますか？`)) return;
    setDeletingId(file_id);
    try {
      await deleteFile(file_id);
      setFiles((prev) => prev.filter((f) => f.file_id !== file_id));
    } catch {
      /* ignore */
    } finally {
      setDeletingId(null);
    }
  }, []);

  // Drag & drop
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleUpload(e.dataTransfer.files);
    },
    [handleUpload]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.3)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-blue-100">
          <h2 className="text-sm font-semibold text-foreground">ファイル管理 (RAG)</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-blue-50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 56px)" }}>
          {/* Drop zone */}
          <div className="p-5">
            <div
              ref={dropRef}
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-blue-200 rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-blue-50/50 transition-all"
            >
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.xlsx,.txt,.md"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">インデックス化中...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-blue-300" />
                  <p className="text-sm font-medium text-foreground">
                    ファイルをドロップ、またはクリックして選択
                  </p>
                  <p className="text-xs text-muted-foreground">PDF · DOCX · XLSX · TXT · MD</p>
                </div>
              )}
            </div>

            {/* Upload result message */}
            {uploadMsg && (
              <div
                className={`mt-3 flex items-start gap-2 text-xs rounded-xl px-3 py-2.5 ${
                  uploadMsg.type === "ok"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {uploadMsg.type === "ok" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                )}
                <span>{uploadMsg.text}</span>
              </div>
            )}
          </div>

          {/* File list */}
          <div className="px-5 pb-5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
              インデックス済みファイル
            </p>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
              </div>
            ) : files.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                ファイルがありません
              </p>
            ) : (
              <ul className="space-y-2">
                {files.map((f) => (
                  <li
                    key={f.file_id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-blue-100/80 bg-blue-50/30"
                  >
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{f.filename}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {f.chunk_count} チャンク
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(f.file_id, f.filename)}
                      disabled={deletingId === f.file_id}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {deletingId === f.file_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
