// src/components/MarkdownMessage.tsx
import React, { useMemo, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { copyToClipboard, showCopyFallbackHint } from "../lib/copy";
import "highlight.js/styles/github.css";

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ inline, className, children, ...props }) => {
  const [copied, setCopied] = useState<null | boolean>(null);

  // Extract text content from children
  const extractText = useCallback((node: unknown): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (node && typeof node === 'object' && 'props' in node && node.props && typeof node.props === 'object' && 'children' in node.props) {
      return extractText(node.props.children);
    }
    return '';
  }, []);

  const code = useMemo(() => extractText(children).replace(/\n$/, ''), [children, extractText]);

  if (inline) {
    return (
      <code className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200" {...props}>
        {children}
      </code>
    );
  }

  const lang = (className || "").replace("language-", "");

  return (
    <div className="relative group">
      {/* 言語バッジ */}
      {lang && (
        <span className="absolute left-3 top-2 text-xs font-mono bg-slate-700 dark:bg-slate-600 text-white px-2 py-0.5 rounded z-10">
          {lang}
        </span>
      )}

      <button
        type="button"
        aria-label="コードをコピー"
        title="コードをコピー"
        onClick={async () => {
          const ok = await copyToClipboard(code);
          setCopied(ok);
          if (!ok) showCopyFallbackHint();
          setTimeout(() => setCopied(null), 1200);
        }}
        className="absolute right-2 top-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 text-xs px-2 py-1 shadow hover:bg-white dark:hover:bg-slate-800 focus-visible:ring-2 ring-brand ring-offset-2 opacity-0 group-hover:opacity-100 transition z-10"
      >
        {copied === true ? "Copied!" : copied === false ? "Failed" : "Copy"}
      </button>
      <pre className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-x-auto pt-8 pb-3 px-3">
        <code className={className} data-lang={lang} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
};

const MarkdownMessage = React.memo(({ content }: { content: string }) => {
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none break-words prose-pre:p-0 prose-code:before:content-none prose-code:after:content-none prose-p:my-0 prose-ul:my-0 prose-ol:my-0 prose-li:my-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{ code: CodeBlock as never }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

MarkdownMessage.displayName = 'MarkdownMessage';

export default MarkdownMessage;
