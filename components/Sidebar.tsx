"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import CategoryIcon from "./CategoryIcon";
import { ChevronRightIcon } from "./Icons";
import type { SidebarCategory } from "@/lib/sidebar";

export default function Sidebar({
  categories,
  touch = false,
  expandAll = false,
}: {
  categories: SidebarCategory[];
  /** true のときタップ領域を 44px 以上にする（モバイルドロワー用） */
  touch?: boolean;
  /**
   * true のとき初期状態で全カテゴリを開く（モバイルドロワー用）。
   * ドロワーは唯一のナビゲーション手段なので、見出しだけ7個並んで
   * 記事に到達できない行き止まりを作らないため。
   */
  expandAll?: boolean;
}) {
  const pathname = usePathname();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      // どのカテゴリにも属さないページ（トップ等）では全部開く。
      // 閉じたままだと見出しだけが並んで記事に到達できないため。
      const inSomeCategory = categories.some((c) =>
        c.items.some((item) => pathname.startsWith(item.href))
      );
      categories.forEach((c) => {
        initial[c.slug] =
          expandAll ||
          !inSomeCategory ||
          c.items.some((item) => pathname.startsWith(item.href));
      });
      return initial;
    }
  );

  const toggle = (slug: string) => {
    setOpenCategories((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  const rowPad = touch ? "px-3 py-3 min-h-11" : "px-2 py-1.5";
  const itemPad = touch ? "px-3 py-3 min-h-11" : "px-2 py-1.5";

  return (
    <nav className="py-5 px-3">
      <ul className="space-y-1">
        {categories.map((cat) => {
          const isOpen = openCategories[cat.slug] ?? true;
          return (
            <li key={cat.slug}>
              <button
                onClick={() => toggle(cat.slug)}
                aria-expanded={isOpen}
                className={`w-full flex items-center gap-2.5 ${rowPad} text-sm font-bold text-ink hover:bg-chip rounded-md transition-colors`}
              >
                <CategoryIcon
                  name={cat.icon}
                  size={17}
                  className="text-brand shrink-0"
                />
                <span className="flex-1 text-left">{cat.label}</span>
                <ChevronRightIcon
                  size={14}
                  className={`text-faint transition-transform ${isOpen ? "rotate-90" : ""}`}
                />
              </button>

              {isOpen && cat.items.length > 0 && (
                <ul className="mt-0.5 ml-4 space-y-0.5">
                  {cat.items.map((item) => {
                    const isActive =
                      pathname === item.href || pathname === item.href + "/";
                    return (
                      <li key={item.slug}>
                        <Link
                          href={item.href}
                          className={`flex items-center ${itemPad} text-[13.5px] leading-relaxed rounded-md transition-colors ${
                            isActive
                              ? "nav-active"
                              : "text-soft hover:bg-chip hover:text-ink"
                          }`}
                        >
                          {item.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
