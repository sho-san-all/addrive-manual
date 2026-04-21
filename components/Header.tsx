"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SearchModal from "./SearchModal";

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-gray-900 shrink-0"
        >
          <span className="text-indigo-600 text-lg">Ad</span>
          <span>Drive マニュアル</span>
        </Link>

        <div className="flex-1" />

        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors w-56 text-left"
        >
          <svg
            className="w-4 h-4 shrink-0"
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
          <span className="flex-1">検索...</span>
          <kbd className="hidden sm:inline-flex text-xs bg-white border border-gray-300 rounded px-1.5 py-0.5 text-gray-500">
            ⌘K
          </kbd>
        </button>
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
