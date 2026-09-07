"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SearchIcon, CloseIcon } from "./Icons";

/**
 * 質問ログの絞り込み（タグチップ＋ページ内検索）と、ハッシュ付きURLで開く処理。
 *
 * ■ 絞り込みは DOM を消さずに CSS で隠す
 *   エントリを React の state で出し分けると、静的HTMLから本文が消えて
 *   Pagefind のインデックスが痩せる。だからここでは QaLogView が出力した
 *   `[data-qa-entry]` を querySelector で拾い、hidden クラスを付け外しするだけにする。
 *   （＝このコンポーネントはエントリ本体を一切描画しない）
 *
 * ■ ハッシュで開く
 *   検索結果から `/docs/qa/log/#qa-xxxxxxxx` で飛んできたとき、対象の <details> を
 *   開いて scrollIntoView する。これが無いと閉じたままで行き止まりになる。
 *   load 時（初回）と hashchange の両方で動かす。
 */

const ALL = "__all__";

export default function QaLogControls({
  tags,
  total,
  slackUrl,
  slackName,
}: {
  tags: { tag: string; count: number }[];
  total: number;
  slackUrl: string;
  slackName: string;
}) {
  const [activeTag, setActiveTag] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(total);
  const inputRef = useRef<HTMLInputElement>(null);

  /** いま実際に見えているエントリ数を数え直して state に反映する */
  const recount = useCallback(() => {
    const entries = document.querySelectorAll<HTMLElement>("[data-qa-entry]");
    let shown = 0;
    entries.forEach((el) => {
      if (!el.classList.contains("hidden")) shown++;
    });
    setVisible(shown);
  }, []);

  /** 現在の条件で [data-qa-entry] の表示/非表示を切り替える */
  const applyFilter = useCallback(
    (tag: string, q: string) => {
      const needle = q.trim().toLowerCase();
      const entries = document.querySelectorAll<HTMLElement>("[data-qa-entry]");
      entries.forEach((el) => {
        const matchesTag = tag === ALL || el.dataset.qaTag === tag;
        const matchesQuery =
          !needle || (el.dataset.qaText ?? "").includes(needle);
        // DOM からは外さない（インデックス維持のため）。CSS で隠すだけ。
        el.classList.toggle("hidden", !(matchesTag && matchesQuery));
      });
      recount();
    },
    [recount]
  );

  useEffect(() => {
    applyFilter(activeTag, query);
  }, [activeTag, query, applyFilter]);

  // ハッシュ付きURLで来たら、その <details> を開いてスクロールする
  useEffect(() => {
    const openFromHash = () => {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!id.startsWith("qa-")) return;
      const target = document.getElementById(id);
      const details = target?.closest("details");
      if (!details) return;
      // 絞り込みで隠れていても、名指しで来た以上は必ず見せる。
      // ここで hidden を外すと表示件数が増えるので、必ず数え直すこと
      // （やらないと「11件中 2件を表示中」のまま3件見えている、が起きる）。
      const entry = details as HTMLElement;
      const wasHidden = entry.classList.contains("hidden");
      entry.classList.remove("hidden");
      (details as HTMLDetailsElement).open = true;
      if (wasHidden) recount();
      // レイアウト確定後にスクロール
      requestAnimationFrame(() =>
        target?.scrollIntoView({ block: "start", behavior: "smooth" })
      );
    };

    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    // 画像などの読み込みで位置がずれることがあるので load でも一度合わせる
    window.addEventListener("load", openFromHash);
    return () => {
      window.removeEventListener("hashchange", openFromHash);
      window.removeEventListener("load", openFromHash);
    };
  }, [recount]);

  const reset = () => {
    setActiveTag(ALL);
    setQuery("");
    inputRef.current?.focus();
  };

  const chip = (active: boolean) =>
    `inline-flex items-center min-h-11 rounded-full px-4 py-2 text-[12.5px] transition-colors cursor-pointer ${
      active
        ? "bg-brand text-white font-medium"
        : "bg-chip text-soft hover:bg-brand-wash hover:text-brand-deep"
    }`;

  return (
    // 絞り込みUI自体は検索インデックスに入れない
    <div className="flex flex-col gap-3" data-pagefind-ignore>
      <div className="flex items-center gap-3 h-[46px] px-4 rounded-[10px] border border-line-strong bg-surface-2 focus-within:border-brand transition-colors">
        <SearchIcon size={17} className="text-faint shrink-0" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="質問ログの中を検索"
          aria-label="質問ログの中を検索"
          className="flex-1 min-w-0 bg-transparent outline-none text-[14.5px] text-ink placeholder:text-faint"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="検索条件をクリア"
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-faint hover:bg-chip hover:text-ink transition-colors"
          >
            <CloseIcon size={15} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTag(ALL)}
          aria-pressed={activeTag === ALL}
          className={chip(activeTag === ALL)}
        >
          すべて {total}
        </button>
        {tags.map(({ tag, count }) => (
          <button
            key={tag}
            type="button"
            onClick={() => setActiveTag(tag)}
            aria-pressed={activeTag === tag}
            className={chip(activeTag === tag)}
          >
            {tag} {count}
          </button>
        ))}
        <span className="flex-1" />
        <span className="text-[12.5px] text-muted">新しい順</span>
      </div>

      {/* 0件のときの行き止まり回避 */}
      {visible === 0 && (
        <div className="rounded-[10px] border border-line bg-surface px-4 py-4 text-sm leading-[1.85] text-soft">
          条件に合う質問がありません。
          <button
            type="button"
            onClick={reset}
            className="mx-1 text-brand hover:text-brand-deep underline underline-offset-2"
          >
            条件をリセット
          </button>
          するか、
          <a
            href={slackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-1 text-brand hover:text-brand-deep underline underline-offset-2"
          >
            {slackName}
          </a>
          で聞いてください。
        </div>
      )}

      {visible !== total && visible > 0 && (
        <p className="text-[12.5px] text-faint">
          {total}件中 {visible}件を表示中
        </p>
      )}
    </div>
  );
}
