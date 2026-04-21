import { getAllArticles } from "@/lib/content";
import { getSidebar } from "@/lib/sidebar";
import CategoryCard from "@/components/CategoryCard";
import Link from "next/link";

export default function HomePage() {
  const sidebar = getSidebar();
  const articles = getAllArticles().slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Hero search */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AdDrive マニュアル
        </h1>
        <p className="text-gray-500 mb-8">
          機能の使い方・操作手順を素早く検索できます
        </p>
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 text-gray-400 bg-gray-100 rounded-xl text-sm w-full max-w-md cursor-pointer hover:bg-gray-200 transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="flex-1 text-left">キーワードで検索... (⌘K)</span>
          </div>
        </div>
      </div>

      {/* Category cards */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">カテゴリ</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sidebar.map((cat) => (
            <CategoryCard
              key={cat.slug}
              emoji={cat.emoji}
              label={cat.label}
              slug={cat.slug}
              count={cat.items.length}
            />
          ))}
        </div>
      </section>

      {/* Recent articles */}
      {articles.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            よく見られる記事
          </h2>
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {articles.map((article) => (
              <li key={`${article.category}/${article.slug}`}>
                <Link
                  href={`/docs/${article.category}/${article.slug}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <span className="text-gray-300 group-hover:text-indigo-400 transition-colors text-lg">
                    →
                  </span>
                  <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors">
                    {article.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
