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
  start: { label: "はじめに", emoji: "🚀", order: 0 },
  view: { label: "数値を見る・分析する", emoji: "📊", order: 1 },
  setup: { label: "案件を通す", emoji: "🔧", order: 2 },
  report: { label: "レポートを出す", emoji: "📄", order: 3 },
  help: { label: "困ったとき・小ワザ", emoji: "❓", order: 4 },
  updates: { label: "アップデート情報", emoji: "🆕", order: 5 },
  qa: { label: "みんなの質問ログ", emoji: "💬", order: 6 },
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
            draft: data.draft === true,
          };
        })
        // draft: true のページ（生成バッチ未投入のプレースホルダ）は一覧から隠す
        .filter((item) => !item.draft)
        .map(({ title, slug, href }) => ({ title, slug, href }));

      return {
        slug: categorySlug,
        label: config.label,
        emoji: config.emoji,
        items,
      };
    })
    // カテゴリ内の全ページが draft の場合、カテゴリ自体もサイドバーから隠す
    .filter((category) => category.items.length > 0);
}
