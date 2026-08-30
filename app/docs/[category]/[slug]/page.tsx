import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { generateAllStaticParams, getArticleFile } from "@/lib/content";
import { extractToc } from "@/lib/toc";
import TOC from "@/components/TOC";
import { Callout } from "@/components/Callout";
import { ZoomableImage } from "@/components/ZoomableImage";
import { AnchorHeading } from "@/components/AnchorHeading";
import { Aliases } from "@/components/Aliases";

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

  const toc = extractToc(article.rawContent);
  const { meta } = article;
  const isDraft = meta.draft === true;

  return (
    <div className="flex">
      {/* Article content */}
      <div className="flex-1 min-w-0 xl:mr-56">
        <article
          className="max-w-3xl mx-auto px-6 py-10"
          data-pagefind-body={isDraft ? undefined : true}
          data-pagefind-ignore={isDraft ? true : undefined}
        >
          {/* Breadcrumb */}
          <nav
            className="text-xs text-gray-400 mb-6 flex items-center gap-1.5"
            data-pagefind-ignore
          >
            <span>{meta.category}</span>
            <span>/</span>
            <span className="text-gray-600">{meta.title}</span>
          </nav>

          {/* Title */}
          <h1
            className="text-2xl font-bold text-gray-900 mb-2"
            data-pagefind-meta="title"
          >
            {meta.title}
          </h1>

          {meta.updated && (
            <p className="text-xs text-gray-400 mb-8" data-pagefind-ignore>
              更新日: {meta.updated}
            </p>
          )}

          {/* MDX content */}
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

          {/* 別名（現場語彙）— pagefind に載せるため article の内側に置く */}
          <Aliases aliases={meta.aliases} />

          {/* Footer feedback */}
          <div
            className="mt-12 pt-6 border-t border-gray-100 flex items-center justify-between text-sm text-gray-400"
            data-pagefind-ignore
          >
            <span>この記事は役に立ちましたか？</span>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors">
                👍 はい
              </button>
              <button className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors">
                👎 いいえ
              </button>
            </div>
          </div>
        </article>
      </div>

      {/* Right TOC */}
      {toc.length > 0 && (
        <aside className="hidden xl:block fixed right-0 top-14 bottom-0 w-56 overflow-y-auto sidebar-scroll border-l border-gray-100">
          <TOC items={toc} />
        </aside>
      )}
    </div>
  );
}
