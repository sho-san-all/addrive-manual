import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import {
  generateAllStaticParams,
  getAdjacentArticles,
  getArticleFile,
} from "@/lib/content";
import { getCategoryConfig } from "@/lib/sidebar";
import { findRelatedQaThreads } from "@/lib/qa";
import { SLACK_CHANNEL_URL, SLACK_CHANNEL_NAME } from "@/lib/links";
import { extractToc } from "@/lib/toc";
import TOC, { TOCCollapsible } from "@/components/TOC";
import { Callout } from "@/components/Callout";
import { ZoomableImage } from "@/components/ZoomableImage";
import { AnchorHeading } from "@/components/AnchorHeading";
import SolvesBox from "@/components/SolvesBox";
import QaLogView from "@/components/QaLogView";
import StillStuck from "@/components/StillStuck";
import ArticleNav from "@/components/ArticleNav";

const mdxComponents = {
  Callout,
  h2: AnchorHeading,
  img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <ZoomableImage
      src={typeof props.src === "string" ? props.src : undefined}
      alt={props.alt}
    />
  ),
};

export async function generateStaticParams() {
  return generateAllStaticParams();
}

export const dynamicParams = false;

interface Props {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { category, slug } = await params;
  const article = getArticleFile(category, slug);
  if (!article) return {};
  const isDraft = article.meta.draft === true;
  return {
    title: article.meta.title,
    // draft（生成バッチ未投入のプレースホルダ）は検索エンジン・全文検索から隠す
    ...(isDraft ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function ArticlePage({ params }: Props) {
  const { category, slug } = await params;
  const article = getArticleFile(category, slug);
  if (!article) notFound();

  const { meta } = article;
  /**
   * 質問ログだけは MDX 素通しではなく専用ビューで描画する。
   * ここで分岐する（app/docs/qa/log/page.tsx のような別ルートは作らない）。
   * 別ルートを切ると generateStaticParams の出力パスと衝突して静的エクスポートが壊れる。
   */
  const isQaLog = category === "qa" && slug === "log";
  // 質問ログはQごとの <details> になるので、記事用の見出しTOCは出さない
  const toc = isQaLog ? [] : extractToc(article.rawContent);
  const isDraft = meta.draft === true;
  const categoryConfig = getCategoryConfig(category);
  const { prev, next } = getAdjacentArticles(category, slug);

  // 関連する質問ログは記事の aliases とタイトルの単純なキーワード一致で拾う。
  // 質問ログ自体のページでは自分自身を出しても意味がないので出さない。
  const relatedQa =
    category === "qa"
      ? []
      : findRelatedQaThreads([...(meta.aliases ?? []), meta.title], 3);

  return (
    <div className="flex">
      {/* Article content */}
      <div className="flex-1 min-w-0 xl:mr-56">
        <article
          className="max-w-3xl mx-auto px-5 sm:px-6 py-9 sm:py-10"
          data-pagefind-body={isDraft ? undefined : true}
          data-pagefind-ignore={isDraft ? true : undefined}
        >
          {/* Breadcrumb（カテゴリは実際のリンク） */}
          <nav
            className="text-[12.5px] text-faint mb-4 flex items-center gap-2 flex-wrap"
            data-pagefind-ignore
          >
            <Link
              href={`/docs/${category}`}
              className="text-brand hover:text-brand-deep transition-colors"
            >
              {categoryConfig.label}
            </Link>
            <span>／</span>
            <span className="text-soft">{meta.title}</span>
          </nav>

          {/* Title */}
          <h1
            className="text-2xl sm:text-[30px] leading-[1.5] font-bold text-ink mb-2.5"
            data-pagefind-meta="title"
          >
            {meta.title}
          </h1>

          {meta.updated && (
            <p className="text-[12.5px] text-faint mb-7" data-pagefind-ignore>
              更新 {meta.updated}
            </p>
          )}

          {/* このページで解決すること（solves がある記事だけ） */}
          <SolvesBox items={meta.solves} />

          {/* モバイル用の折り畳み目次（xl以上は右カラム固定） */}
          <TOCCollapsible items={toc} />

          {/* 本文 */}
          {isQaLog ? (
            <QaLogView updated={meta.updated} />
          ) : (
            <div className="prose prose-gray max-w-none article-prose">
              <MDXRemote
                source={article.rawContent}
                components={mdxComponents}
                options={{
                  mdxOptions: {
                    remarkPlugins: [remarkGfm],
                    rehypePlugins: [rehypeSlug],
                  },
                }}
              />
            </div>
          )}

          {/* それでも解決しないときは（関連質問ログ＋Slack導線）。
              質問ログページ自体には QaLogView 側に同じ導線があるので出さない。 */}
          {!isQaLog && <StillStuck entries={relatedQa} />}

          {/*
            旧: 👍👎 のフィードバックボタン。
            静的サイトで送信先が無く押せない飾りだったため、Slack導線に置き換えた。
          */}
          <div
            className={`mt-6 pt-5 border-t border-line-soft flex flex-col sm:flex-row sm:items-center gap-3 ${
              isQaLog ? "hidden" : ""
            }`}
            data-pagefind-ignore
          >
            <span className="flex-1 text-[13.5px] text-muted">
              このページで解決しましたか？
            </span>
            <a
              href={SLACK_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center justify-center min-h-11 rounded-[7px] border border-line-strong px-4 text-[13px] text-ink-2 hover:border-brand-line hover:bg-brand-wash transition-colors"
            >
              解決しなかった → {SLACK_CHANNEL_NAME} で聞く
            </a>
          </div>

          {/* 前後記事ナビ */}
          <ArticleNav
            prev={
              prev
                ? { title: prev.title, href: `/docs/${category}/${prev.slug}` }
                : null
            }
            next={
              next
                ? { title: next.title, href: `/docs/${category}/${next.slug}` }
                : null
            }
          />
        </article>
      </div>

      {/* Right TOC */}
      {toc.length > 0 && (
        <aside className="hidden xl:block fixed right-0 top-[60px] bottom-0 w-56 overflow-y-auto sidebar-scroll border-l border-line-soft">
          <TOC items={toc} />
        </aside>
      )}
    </div>
  );
}
