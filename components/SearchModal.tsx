"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

interface SearchResult {
  url: string;
  meta: { title: string };
  excerpt: string;
}

declare global {
  interface Window {
    pagefind?: {
      search: (query: string) => Promise<{
        results: Array<{ data: () => Promise<SearchResult> }>;
      }>;
    };
  }
}

export default function SearchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [pagefindReady, setPagefindReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      if (!window.pagefind) {
        const script = document.createElement("script");
        script.src = "/pagefind/pagefind.js";
        script.onload = () => setPagefindReady(true);
        script.onerror = () => {
          /* pagefind not built yet */
        };
        document.head.appendChild(script);
      } else {
        setPagefindReady(true);
      }
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const search = useCallback(
    async (q: string) => {
      if (!q || !pagefindReady || !window.pagefind) {
        setResults([]);
        return;
      }
      const { results: raw } = await window.pagefind.search(q);
      const loaded = await Promise.all(raw.slice(0, 8).map((r) => r.data()));
      setResults(loaded);
    },
    [pagefindReady]
  );

  useEffect(() => {
    search(query);
  }, [query, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 search-backdrop">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <svg
            className="w-5 h-5 text-gray-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="キーワードで検索..."
            className="flex-1 outline-none text-gray-900 placeholder:text-gray-400"
          />
          <button
            onClick={onClose}
            className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 hover:bg-gray-50"
          >
            ESC
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {results.length > 0 ? (
            <ul>
              {results.map((r, i) => (
                <li key={i}>
                  <Link
                    href={r.url}
                    onClick={onClose}
                    className="block px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {r.meta.title}
                    </p>
                    <p
                      className="text-xs text-gray-500 mt-0.5 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: r.excerpt }}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : query ? (
            <p className="px-4 py-10 text-center text-sm text-gray-400">
              「{query}」の結果が見つかりませんでした
            </p>
          ) : (
            <p className="px-4 py-10 text-center text-sm text-gray-400">
              キーワードを入力してください
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
