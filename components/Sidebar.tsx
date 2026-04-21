"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { SidebarCategory } from "@/lib/sidebar";

export default function Sidebar({
  categories,
}: {
  categories: SidebarCategory[];
}) {
  const pathname = usePathname();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      categories.forEach((c) => {
        initial[c.slug] = c.items.some((item) =>
          pathname.startsWith(item.href)
        );
      });
      return initial;
    }
  );

  const toggle = (slug: string) => {
    setOpenCategories((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  return (
    <nav className="py-6 px-3">
      <ul className="space-y-1">
        {categories.map((cat) => {
          const isOpen = openCategories[cat.slug] ?? true;
          return (
            <li key={cat.slug}>
              <button
                onClick={() => toggle(cat.slug)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <span>{cat.emoji}</span>
                <span className="flex-1 text-left">{cat.label}</span>
                <svg
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              {isOpen && cat.items.length > 0 && (
                <ul className="mt-0.5 ml-4 space-y-0.5">
                  {cat.items.map((item) => {
                    const isActive = pathname === item.href || pathname === item.href + "/";
                    return (
                      <li key={item.slug}>
                        <Link
                          href={item.href}
                          className={`block px-2 py-1.5 text-sm rounded-md transition-colors ${
                            isActive
                              ? "nav-active"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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
