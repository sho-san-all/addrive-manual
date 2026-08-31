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
  /** components/CategoryIcon.tsx のアイコン名キー（旧 emoji の置き換え） */
  icon: string;
  items: SidebarItem[];
}

export interface CategoryConfig {
  label: string;
  icon: string;
  order: number;
  /**
   * カテゴリ内の記事の並び順（slug の配列）。
   * ファイル名のアルファベット順は読み物順になっていないため、ここで明示する。
   * ここに載っていない slug は末尾にファイル名順で回る。
   * サイドバー・カテゴリ一覧・記事の前後ナビはすべてこの順序を参照する。
   */
  articleOrder: string[];
}

/**
 * カテゴリの slug（キー）は変更しないこと。
 * vercel.json に slug 前提のリダイレクトが 21 本あり、既存の共有URLが死ぬ。
 * 変えてよいのは label（表示ラベル）だけ。
 */
export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  start: {
    label: "はじめて使う",
    icon: "start",
    order: 0,
    articleOrder: ["overview", "login", "my-page-setup"],
  },
  view: {
    label: "数値を見る・分析する",
    icon: "view",
    order: 1,
    articleOrder: ["my-drive", "metrics", "ad-expert-chan"],
  },
  setup: {
    label: "案件を通す・登録する",
    icon: "setup",
    order: 2,
    articleOrder: ["new-client", "campaign", "w-check-dolphin", "handover"],
  },
  report: {
    label: "レポートを出す",
    icon: "report",
    order: 3,
    articleOrder: ["creation"],
  },
  help: {
    label: "数値がおかしい・直したい",
    icon: "help",
    order: 4,
    articleOrder: ["index", "data-issues", "tips"],
  },
  updates: {
    label: "アップデート情報",
    icon: "updates",
    order: 5,
    // 新しいものを上に出す
    articleOrder: [
      "2026-08-05-campaign-view-updates",
      "2026-07-17-report-updates",
    ],
  },
  qa: {
    label: "みんなの質問ログ",
    icon: "qa",
    order: 6,
    articleOrder: ["log"],
  },
};

const FALLBACK_CONFIG: CategoryConfig = {
  label: "その他",
  icon: "doc",
  order: 99,
  articleOrder: [],
};

export function getCategoryConfig(categorySlug: string): CategoryConfig {
  return (
    CATEGORY_CONFIG[categorySlug] ?? {
      ...FALLBACK_CONFIG,
      label: categorySlug,
    }
  );
}

/**
 * CATEGORY_CONFIG.articleOrder に沿って並べ替える。
 * 未掲載の slug は末尾（元の順序＝ファイル名順を維持）。
 */
export function sortByArticleOrder<T>(
  categorySlug: string,
  items: T[],
  getSlug: (item: T) => string
): T[] {
  const order = getCategoryConfig(categorySlug).articleOrder;
  const rank = (slug: string) => {
    const i = order.indexOf(slug);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return items
    .map((item, i) => ({ item, i, r: rank(getSlug(item)) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map(({ item }) => item);
}

export function getSidebar(): SidebarCategory[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((name) =>
      fs.statSync(path.join(CONTENT_DIR, name)).isDirectory()
    )
    .sort((a, b) => getCategoryConfig(a).order - getCategoryConfig(b).order)
    .map((categorySlug) => {
      const categoryDir = path.join(CONTENT_DIR, categorySlug);
      const config = getCategoryConfig(categorySlug);

      const items: SidebarItem[] = sortByArticleOrder(
        categorySlug,
        fs
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
          .filter((item) => !item.draft),
        (item) => item.slug
      ).map(({ title, slug, href }) => ({ title, slug, href }));

      return {
        slug: categorySlug,
        label: config.label,
        icon: config.icon,
        items,
      };
    })
    // カテゴリ内の全ページが draft の場合、カテゴリ自体もサイドバーから隠す
    .filter((category) => category.items.length > 0);
}
