import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");

export interface ArticleMeta {
  title: string;
  category: string;
  aliases?: string[];
  updated?: string;
  description?: string;
  slug?: string;
  /**
   * true の場合、生成バッチが未投入のプレースホルダページとして扱う。
   * 一覧・カテゴリページ・サイドバーからは除外するが、個別ページ自体は
   * ビルド対象として残す（直接URLでのアクセスは許容する）。
   */
  draft?: boolean;
}

export interface ArticleFile {
  meta: ArticleMeta;
  slug: string;
  category: string;
  rawContent: string;
}

export function getAllCategories(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((name) =>
      fs.statSync(path.join(CONTENT_DIR, name)).isDirectory()
    );
}

export function getArticlesByCategory(
  category: string
): (ArticleMeta & { slug: string })[] {
  const categoryDir = path.join(CONTENT_DIR, category);
  if (!fs.existsSync(categoryDir)) return [];

  return fs
    .readdirSync(categoryDir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const filePath = path.join(categoryDir, file);
      const { data } = matter(fs.readFileSync(filePath, "utf-8"));
      if (data.updated instanceof Date) {
        data.updated = (data.updated as Date).toISOString().split("T")[0];
      }
      return { ...(data as ArticleMeta), slug };
    })
    .filter((article) => article.draft !== true);
}

export function getArticleFile(
  category: string,
  slug: string
): ArticleFile | null {
  const filePath = path.join(CONTENT_DIR, category, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  if (data.updated instanceof Date) {
    data.updated = (data.updated as Date).toISOString().split("T")[0];
  }

  return {
    meta: data as ArticleMeta,
    slug,
    category,
    rawContent: content,
  };
}

export function getAllArticles(): (ArticleMeta & {
  slug: string;
  category: string;
})[] {
  return getAllCategories().flatMap((category) =>
    getArticlesByCategory(category).map((a) => ({ ...a, category }))
  );
}

// 注意: draft:true のページも意図的に含める（一覧からは隠すが、個別ページ
// 自体はビルドしてURLでアクセス可能な状態を維持するため）。
export function generateAllStaticParams() {
  return getAllCategories().flatMap((category) => {
    const categoryDir = path.join(CONTENT_DIR, category);
    if (!fs.existsSync(categoryDir)) return [];
    return fs
      .readdirSync(categoryDir)
      .filter((file) => file.endsWith(".mdx"))
      .map((file) => ({
        category,
        slug: file.replace(/\.mdx$/, ""),
      }));
  });
}
