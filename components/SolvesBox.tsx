import { CheckIcon } from "./Icons";

/**
 * 記事冒頭の「このページで解決すること」ボックス。
 * frontmatter の `solves`（症状の箇条書き）がある記事だけに出す。
 */
export default function SolvesBox({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div
      className="mb-8 rounded-xl border border-brand-line bg-brand-wash-2 px-5 py-[18px]"
      data-pagefind-ignore
    >
      <p className="text-sm font-bold text-ink mb-2.5">このページで解決すること</p>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 items-start">
            <CheckIcon size={16} className="text-brand shrink-0 mt-1.5" />
            <span className="text-[14.5px] leading-[1.85] text-ink-2">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
