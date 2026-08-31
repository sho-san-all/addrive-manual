interface Props {
  aliases?: string[];
}

// 記事末尾に別名（現場語彙）を描画する。pagefind は data-pagefind-body の
// 内側だけをインデックスするため、必ず <article> の内側かつ
// data-pagefind-ignore の外側に置くこと（page.tsx の挿入位置を参照）。
//
// 値は lib/content.ts の normalizeAliases() で正規化済みだが、ここでも
// 配列かどうかを確認する。frontmatter に `aliases: 白イルカ` と書かれた場合に
// .join() が TypeError になり、1ページの書き間違いで next build ごと落ちる
// （＝サイト全体の更新が止まる）のを防ぐため。
export function Aliases({ aliases }: Props) {
  if (!Array.isArray(aliases)) return null;
  const items = aliases.filter(
    (a): a is string => typeof a === "string" && a.trim().length > 0
  );
  if (items.length === 0) return null;

  return (
    <div className="mt-10 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700">
      <span className="text-gray-500">別の呼び方：</span>
      <span className="leading-relaxed">{items.join(" / ")}</span>
    </div>
  );
}
