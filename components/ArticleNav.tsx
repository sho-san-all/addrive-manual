import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "./Icons";

interface NavItem {
  title: string;
  href: string;
}

/** 同一カテゴリ内の前後記事ナビ。順序は CATEGORY_CONFIG.articleOrder が正。 */
export default function ArticleNav({
  prev,
  next,
}: {
  prev?: NavItem | null;
  next?: NavItem | null;
}) {
  if (!prev && !next) return null;

  return (
    <nav
      className="mt-6 flex flex-col sm:flex-row gap-3"
      data-pagefind-ignore
      aria-label="前後の記事"
    >
      {prev ? (
        <Link
          href={prev.href}
          className="flex-1 min-w-0 rounded-[10px] border border-line px-4 py-3 hover:border-brand-line hover:bg-surface transition-colors"
        >
          <span className="flex items-center gap-1.5 text-[11.5px] text-faint">
            <ArrowLeftIcon size={13} />前の記事
          </span>
          <span className="block mt-1 text-sm font-medium text-ink truncate">
            {prev.title}
          </span>
        </Link>
      ) : (
        <span className="hidden sm:block flex-1" />
      )}

      {next ? (
        <Link
          href={next.href}
          className="flex-1 min-w-0 rounded-[10px] border border-line px-4 py-3 sm:text-right hover:border-brand-line hover:bg-surface transition-colors"
        >
          <span className="flex items-center gap-1.5 text-[11.5px] text-faint sm:justify-end">
            次の記事
            <ArrowRightIcon size={13} />
          </span>
          <span className="block mt-1 text-sm font-medium text-ink truncate">
            {next.title}
          </span>
        </Link>
      ) : (
        <span className="hidden sm:block flex-1" />
      )}
    </nav>
  );
}
