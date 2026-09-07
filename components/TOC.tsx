"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/toc";
import { ChevronDownIcon } from "./Icons";

function useActiveHeading(items: TocItem[]) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      // rootMargin の上端は --header-height（60px）と揃える
      { rootMargin: "-60px 0px -60% 0px" }
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  return activeId;
}

/** xl以上で右カラムに固定表示する版 */
export default function TOC({ items }: { items: TocItem[] }) {
  const activeId = useActiveHeading(items);

  if (items.length === 0) return null;

  return (
    <nav className="py-9 px-4">
      <p className="text-[11.5px] font-bold tracking-[0.12em] text-faint mb-3">
        このページの内容
      </p>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`block text-[13px] leading-relaxed py-1 border-l-2 transition-colors ${
                item.level === 3 ? "pl-6" : "pl-2.5"
              } ${
                activeId === item.id
                  ? "border-brand text-[#14343d] font-medium"
                  : "border-line-soft text-faint hover:text-ink"
              }`}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * モバイル／タブレット（xl未満）で記事上部に置く折り畳み版。
 * details/summary なので JS なしで開閉でき、タップ領域は 48px 確保している。
 */
export function TOCCollapsible({ items }: { items: TocItem[] }) {
  if (items.length === 0) return null;

  return (
    // data-pagefind-ignore は必須。<article data-pagefind-body> の内側にあるため、
    // 外すと全記事の本文インデックス冒頭が目次の見出し列で汚染される（見出し語の二重インデックス）。
    <details
      className="xl:hidden group mb-8 rounded-[10px] border border-line bg-surface-2"
      data-pagefind-ignore
    >
      <summary className="flex items-center justify-between gap-3 min-h-12 px-4 py-3 cursor-pointer list-none text-sm font-medium text-ink-2 [&::-webkit-details-marker]:hidden">
        <span>このページの内容（{items.length}項目）</span>
        <ChevronDownIcon
          size={16}
          className="text-muted shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <ul className="px-4 pb-3 flex flex-col gap-0.5 border-t border-line-soft pt-2">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`block text-sm leading-relaxed py-2 text-soft hover:text-brand transition-colors ${
                item.level === 3 ? "pl-4" : ""
              }`}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
