import Link from "next/link";
import CategoryIcon from "./CategoryIcon";

interface Props {
  icon: string;
  label: string;
  slug: string;
  count: number;
  /** カード内に直接出す記事リンク（最大3件想定） */
  items?: { title: string; href: string }[];
}

export default function CategoryCard({
  icon,
  label,
  slug,
  count,
  items = [],
}: Props) {
  const shown = items.slice(0, 3);
  const rest = count - shown.length;

  return (
    <div className="flex flex-col gap-3 p-5 rounded-xl border border-line bg-white hover:border-brand-line transition-colors">
      <Link
        href={`/docs/${slug}`}
        className="group flex items-center gap-2.5 min-h-11 text-ink hover:text-brand transition-colors"
      >
        <CategoryIcon name={icon} size={19} className="text-brand shrink-0" />
        <span className="text-[15.5px] font-bold">{label}</span>
      </Link>

      {shown.length > 0 ? (
        // スマホからトップ→記事へ入る主動線なので、タップ領域は 44px 以上
        // （ヘッダー・チップ・ハンバーガーと同じ基準）に揃える。
        <div className="flex flex-col">
          {shown.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center min-h-11 py-1 text-sm leading-relaxed text-brand hover:text-brand-deep transition-colors"
            >
              {item.title}
            </Link>
          ))}
          {rest > 0 && (
            <Link
              href={`/docs/${slug}`}
              className="flex items-center min-h-11 py-1 text-[13px] text-faint hover:text-soft transition-colors"
            >
              ほか{rest}件
            </Link>
          )}
        </div>
      ) : (
        <p className="text-sm text-faint">{count}件の記事</p>
      )}
    </div>
  );
}
