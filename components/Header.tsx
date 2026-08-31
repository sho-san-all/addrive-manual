"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SearchModal from "./SearchModal";
import MobileNav from "./MobileNav";
import { SearchIcon, SlackIcon, MenuIcon } from "./Icons";
import type { SidebarCategory } from "@/lib/sidebar";
import { SLACK_CHANNEL_URL } from "@/lib/links";

export default function Header({
  categories = [],
}: {
  categories?: SidebarCategory[];
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

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
      <header className="fixed top-0 left-0 right-0 z-40 h-[60px] bg-white border-b border-line flex items-center px-3 sm:px-6 gap-3 sm:gap-4">
        {/* ハンバーガー（lg未満のみ）。タップ領域 44px 以上 */}
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          aria-label="メニューを開く"
          className="lg:hidden -ml-1 w-11 h-11 shrink-0 flex items-center justify-center rounded-lg text-ink hover:bg-chip transition-colors"
        >
          <MenuIcon size={22} />
        </button>

        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 text-ink hover:opacity-80 transition-opacity"
        >
          <span className="w-[26px] h-[26px] rounded-md bg-brand text-white text-[13px] font-bold flex items-center justify-center">
            A
          </span>
          <span className="text-[15px] font-bold whitespace-nowrap">
            <span className="hidden sm:inline">AdDrive マニュアル</span>
            <span className="sm:hidden">AdDrive</span>
          </span>
        </Link>

        {/* 検索バーをヘッダー内に常設（既存 SearchModal を開くトリガ） */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="hidden sm:flex items-center gap-2.5 flex-1 max-w-[560px] h-[38px] px-3 border border-line-strong rounded-[9px] bg-surface-2 text-left hover:border-brand-line transition-colors cursor-pointer"
        >
          <SearchIcon size={16} className="text-faint shrink-0" />
          <span className="flex-1 text-[13.5px] text-faint truncate">
            やりたいこと・エラー文で探す
          </span>
          <kbd className="hidden md:inline-flex text-[11px] text-faint border border-line rounded px-1.5 py-0.5 bg-white">
            ⌘K
          </kbd>
        </button>

        {/* スマホでは検索はアイコンボタン（タップ領域 44px） */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="検索"
          className="sm:hidden ml-auto w-11 h-11 shrink-0 flex items-center justify-center rounded-lg text-ink hover:bg-chip transition-colors"
        >
          <SearchIcon size={21} />
        </button>

        <div className="hidden sm:block flex-1" />

        <a
          href={SLACK_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-2 shrink-0 text-[13px] text-brand-deep border border-brand-line rounded-lg px-3.5 py-2 hover:bg-brand-wash transition-colors"
        >
          <SlackIcon size={15} className="text-brand" />
          Slackで聞く
        </a>
      </header>

      <MobileNav
        open={navOpen}
        onClose={() => setNavOpen(false)}
        categories={categories}
      />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
