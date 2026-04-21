import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllCategories, getArticlesByCategory } from "@/lib/content";
import { getSidebar } from "@/lib/sidebar";

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

  const articles = getArticlesByCategory(category);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {cat.emoji} {cat.label}
      </h1>
      <p className="text-gray-500 mb-8">{articles.length}件の記事</p>

      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
        {articles.map((article) => (
          <li key={article.slug}>
            <Link
              href={`/docs/${category}/${article.slug}`}
              className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {article.title}
                </p>
                {article.description && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {article.description}
                  </p>
                )}
              </div>
              <span className="text-gray-300 group-hover:text-indigo-400 transition-colors mt-0.5">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
