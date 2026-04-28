import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");

export interface SidebarItem {
  title: string;
  slug: string;
  href: string;
}

export interface SidebarCategory {
  slug: string;
  label: string;
  emoji: string;
  items: SidebarItem[];
}

const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; order: number }> = {
  "getting-started": { label: "はじめに", emoji: "🚀", order: 0 },
  dashboard: { label: "ダッシュボード", emoji: "📊", order: 1 },
  frontend: { label: "フロント向けガイド", emoji: "👤", order: 2 },
  workflow: { label: "マーケ向けガイド", emoji: "💡", order: 3 },
  admin: { label: "管理者向けガイド", emoji: "🛠️", order: 4 },
  faq: { label: "FAQ", emoji: "❓", order: 5 },
};

export function getSidebar(): SidebarCategory[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((name) =>
      fs.statSync(path.join(CONTENT_DIR, name)).isDirectory()
    )
    .sort((a, b) => {
      const orderA = CATEGORY_CONFIG[a]?.order ?? 99;
      const orderB = CATEGORY_CONFIG[b]?.order ?? 99;
      return orderA - orderB;
    })
    .map((categorySlug) => {
      const categoryDir = path.join(CONTENT_DIR, categorySlug);
      const config = CATEGORY_CONFIG[categorySlug] ?? {
        label: categorySlug,
        emoji: "📄",
        order: 99,
      };

      const items: SidebarItem[] = fs
        .readdirSync(categoryDir)
        .filter((file) => file.endsWith(".mdx"))
        .map((file) => {
          const slug = file.replace(/\.mdx$/, "");
          const filePath = path.join(categoryDir, file);
          const { data } = matter(fs.readFileSync(filePath, "utf-8"));
          return {
            title: (data.title as string) ?? slug,
            slug,
            href: `/docs/${categorySlug}/${slug}`,
          };
        });

      return {
        slug: categorySlug,
        label: config.label,
        emoji: config.emoji,
        items,
      };
    });
}
