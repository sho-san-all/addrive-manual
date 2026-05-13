"use client";

import { useState } from "react";
import SearchModal from "./SearchModal";

export default function HeroSearchTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-3 px-6 py-3 text-gray-400 bg-gray-100 rounded-xl text-sm w-full max-w-md cursor-pointer hover:bg-gray-200 transition-colors"
        >
          <svg
            className="w-5 h-5"
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
          <span className="flex-1 text-left">キーワードで検索... (⌘K)</span>
        </button>
      </div>
      <SearchModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
