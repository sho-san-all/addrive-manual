import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllCategories, getArticlesByCategory } from "@/lib/content";
import { getSidebar } from "@/lib/sidebar";
import CategoryIcon from "@/components/CategoryIcon";
import { ArrowRightIcon } from "@/components/Icons";

export async function generateStaticParams() {
  return getAllCategories().map((category) => ({ category }));
}

export const dynamicParams = false;

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  const sidebar = getSidebar();
  const cat = sidebar.find((c) => c.slug === category);
  if (!cat) return {};
  return { title: cat.label };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const sidebar = getSidebar();
  const cat = sidebar.find((c) => c.slug === category);
  if (!cat) notFound();

  // 並び順は CATEGORY_CONFIG.articleOrder（サイドバー・前後ナビと同じ）
  const articles = getArticlesByCategory(category);

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 py-9 sm:py-10">
      <h1 className="flex items-center gap-3 text-2xl font-bold text-ink mb-2">
        <CategoryIcon name={cat.icon} size={24} className="text-brand shrink-0" />
        {cat.label}
      </h1>
      <p className="text-sm text-faint mb-8">{articles.length}件の記事</p>

      <ul className="rounded-xl border border-line overflow-hidden">
        {articles.map((article, i) => (
          <li
            key={article.slug}
            className={i > 0 ? "border-t border-line-soft" : ""}
          >
            <Link
              href={`/docs/${category}/${article.slug}`}
              className="flex items-start gap-4 px-5 py-4 hover:bg-surface transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink group-hover:text-brand transition-colors">
                  {article.title}
                </p>
                {article.description && (
                  <p className="text-sm leading-relaxed text-faint mt-1">
                    {article.description}
                  </p>
                )}
              </div>
              <ArrowRightIcon
                size={17}
                className="mt-1 shrink-0 text-line-strong group-hover:text-brand transition-colors"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
