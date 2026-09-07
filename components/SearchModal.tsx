"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SearchIcon, SlackIcon, CloseIcon } from "./Icons";
import { SLACK_CHANNEL_URL, SLACK_CHANNEL_NAME } from "@/lib/links";
import type { ScreenLink } from "@/lib/screens";
import type {
  PagefindApi,
  PagefindDocument,
  PagefindSubResult,
} from "@/lib/pagefind-types";

/**
 * 検索モーダル。記事・質問ログ・画面名を1つのリストに混ぜて出す。
 *
 * ■ 質問ログは「ページ1件」ではなく「Q1件ずつ」出す
 *   Pagefind の `sub_results`（id を持つ見出し単位のヒット）を展開する。
 *   質問ログ側は components/QaLogView.tsx が各Qに <h3 id="qa-xxxxxxxx"> を出しており、
 *   sub_result の url がそのまま `/docs/qa/log/#qa-xxxxxxxx` になる。
 *   QaLogView / QaLogControls 側の id とハッシュ処理が前提。
 *
 * ■ 「画面」は Pagefind ではなく lib/screens.ts の静的マップに対する部分一致
 *   22件規模なので単純一致で十分。サーバー側のデータなので props で受け取る。
 */

const QA_URL_PREFIX = "/docs/qa/";

/** フォーカストラップ対象（MobileNav と同じ基準） */
const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

type Group = "qa" | "article" | "screen";

interface Row {
  key: string;
  group: Group;
  /** 主ラベル */
  title: string;
  /** 補助ラベル（「記事タイトル ＞ 見出し名」など。ハイライト無しのプレーン） */
  context?: string;
  /** Pagefind が返す抜粋。<mark> を含む HTML */
  excerptHtml?: string;
  href: string;
}

const GROUP_LABEL: Record<Group, string> = {
  qa: "質問ログ",
  article: "記事",
  screen: "画面",
};

const GROUP_ORDER: Group[] = ["qa", "article", "screen"];

/**
 * 1つの検索結果ページから展開する sub_result の上限（リストが爆発しないように）。
 * 記事・質問ログの両方に同じ上限を掛ける（質問ログは1ページに全Qが載っているため、
 * 掛け忘れると1ページで十数行に膨らむ）。
 */
const MAX_SUB_RESULTS = 3;

const LISTBOX_ID = "search-results-listbox";
/** 各行の DOM id。aria-activedescendant で指すために連番で振る */
const optionId = (index: number) => `search-result-${index}`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** タイトル側のヒット語ハイライト（Pagefind の抜粋には元から <mark> が入っている） */
function highlight(text: string, query: string): string {
  const escaped = escapeHtml(text);
  const terms = query
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .sort((a, b) => b.length - a.length);
  if (terms.length === 0) return escaped;

  let out = escaped;
  for (const term of terms) {
    const safe = escapeHtml(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(safe, "gi"), (m) => `<mark>${m}</mark>`);
  }
  return out;
}

function isQaUrl(url: string): boolean {
  return url.startsWith(QA_URL_PREFIX);
}

/** Pagefind の1ページぶんの結果を、グループ済みの行に展開する */
function toRows(doc: PagefindDocument): Row[] {
  const pageTitle = doc.meta?.title ?? doc.url;
  const subs = (doc.sub_results ?? []).filter(
    (s): s is PagefindSubResult => Boolean(s?.url)
  );
  // anchor を持つもの＝見出し単位のヒット。持たない1件目はページ自体。
  const anchored = subs.filter((s) => s.anchor?.id);

  if (isQaUrl(doc.url)) {
    // 質問ログ: Qごとに独立した行にする
    if (anchored.length > 0) {
      return anchored.slice(0, MAX_SUB_RESULTS).map((sub) => ({
        key: sub.url,
        group: "qa" as const,
        title: sub.title || pageTitle,
        excerptHtml: sub.excerpt,
        href: sub.url,
      }));
    }
    return [
      {
        key: doc.url,
        group: "qa",
        title: pageTitle,
        excerptHtml: doc.excerpt,
        href: doc.url,
      },
    ];
  }

  // 記事: 見出し単位のヒットがあれば「記事タイトル ＞ 見出し名」で出す
  if (anchored.length > 0) {
    return anchored.slice(0, MAX_SUB_RESULTS).map((sub) => ({
      key: sub.url,
      group: "article" as const,
      title: pageTitle,
      context: sub.title,
      excerptHtml: sub.excerpt,
      href: sub.url,
    }));
  }
  return [
    {
      key: doc.url,
      group: "article",
      title: pageTitle,
      excerptHtml: doc.excerpt,
      href: doc.url,
    },
  ];
}

function GroupIcon({ group }: { group: Group }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (group === "qa") {
    return (
      <svg {...common}>
        <path d="M21 12a8 8 0 01-11.3 7.3L4 21l1.7-5.7A8 8 0 1121 12z" />
      </svg>
    );
  }
  if (group === "screen") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

export default function SearchModal({
  open,
  onClose,
  screens = [],
}: {
  open: boolean;
  onClose: () => void;
  screens?: ScreenLink[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<"all" | Group>("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [pagefind, setPagefind] = useState<PagefindApi | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Pagefind ランタイムの読み込み（初回だけ）
  useEffect(() => {
    if (!open || pagefind) return;
    if (window.pagefind) {
      setPagefind(window.pagefind);
      return;
    }
    (async () => {
      try {
        // バンドラに解決させないための動的 import
        const pf = (await Function(
          `return import("/pagefind/pagefind.js")`
        )()) as PagefindApi;
        window.pagefind = pf;
        setPagefind(pf);
      } catch (error) {
        // 握り潰すと「検索したのに常に0件」に見えて原因が分からなくなる。
        // 利用者には出さないが、開発時に気づけるようログには残す。
        console.warn(
          "[SearchModal] Pagefind の読み込みに失敗しました。`npm run build` でインデックスが生成されているか確認してください。",
          error
        );
      }
    })();
  }, [open, pagefind]);

  useEffect(() => {
    if (open) {
      restoreFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      window.setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setRows([]);
      setTab("all");
      setActiveIndex(0);
      restoreFocusRef.current?.focus();
    }
  }, [open]);

  // 画面名（Pagefind ではなくクライアント側の部分一致）
  const screenRows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return screens
      .filter((s) => s.name.toLowerCase().includes(q))
      .map((s) => ({
        key: `screen:${s.name}:${s.href}`,
        group: "screen" as const,
        title: s.name,
        context: "この画面を扱う記事へ",
        href: s.href,
      }));
  }, [query, screens]);

  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim() || !pagefind) {
        setRows([]);
        return;
      }
      try {
        const { results } = await pagefind.search(q);
        const docs = await Promise.all(
          results.slice(0, 10).map((r) => r.data())
        );
        setRows(docs.flatMap(toRows));
      } catch (error) {
        console.warn("[SearchModal] 検索に失敗しました。", error);
        setRows([]);
      }
    },
    [pagefind]
  );

  useEffect(() => {
    runSearch(query);
  }, [query, runSearch]);

  const allRows = useMemo(() => [...rows, ...screenRows], [rows, screenRows]);

  const counts = useMemo(() => {
    const c: Record<Group, number> = { qa: 0, article: 0, screen: 0 };
    for (const row of allRows) c[row.group]++;
    return c;
  }, [allRows]);

  const visibleRows = useMemo(
    () =>
      GROUP_ORDER.flatMap((group) =>
        tab === "all" || tab === group
          ? allRows.filter((r) => r.group === group)
          : []
      ),
    [allRows, tab]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query, tab]);

  const go = useCallback(
    (href: string) => {
      onClose();
      const [path, hash] = href.split("#");
      const normalized = path || "/";
      const samePage =
        normalized === pathname || normalized === `${pathname}/`;
      if (hash && samePage) {
        // 同じページ内のアンカーは history.pushState だと hashchange が飛ばず、
        // 質問ログの <details> が開かない。location.hash を直接触って発火させる。
        if (window.location.hash === `#${hash}`) {
          // 既に同じハッシュだと location.hash 代入では何も起きないので自前で通知する
          window.dispatchEvent(new Event("hashchange"));
        } else {
          window.location.hash = hash;
        }
      } else {
        router.push(href);
      }
    },
    [onClose, pathname, router]
  );

  // キーボード操作（Escape / ↑↓ / Enter / Tabトラップ）
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        // role="dialog" aria-modal="true" を名乗る以上、背後へ Tab で抜けさせない
        const panel = panelRef.current;
        if (!panel) return;
        const items = Array.from(
          panel.querySelectorAll<HTMLElement>(FOCUSABLE)
        ).filter((el) => el.offsetParent !== null);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || !panel.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (visibleRows.length ? (i + 1) % visibleRows.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) =>
          visibleRows.length ? (i - 1 + visibleRows.length) % visibleRows.length : 0
        );
      } else if (e.key === "Enter") {
        const row = visibleRows[activeIndex];
        if (row) {
          e.preventDefault();
          go(row.href);
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, visibleRows, activeIndex, go]);

  // 選択行を視界に入れる
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  // 並びは結果セクションと同じ GROUP_ORDER に揃える（食い違うと探しにくい）
  const tabs: { key: "all" | Group; label: string; count: number }[] = [
    { key: "all", label: "すべて", count: allRows.length },
    ...GROUP_ORDER.map((group) => ({
      key: group,
      label: GROUP_LABEL[group],
      count: counts[group],
    })),
  ];

  let renderIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] px-4 search-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="マニュアルを検索"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />

      <div
        ref={panelRef}
        className="relative w-full max-w-[720px] bg-white rounded-[14px] border border-line-strong shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        {/* 検索窓 */}
        <div className="flex items-center gap-3 px-4 sm:px-5 h-[60px] shrink-0 border-b border-line-soft">
          <SearchIcon size={19} className="text-brand shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="やりたいこと・エラー文で探す"
            aria-label="検索キーワード"
            role="combobox"
            aria-expanded={visibleRows.length > 0}
            aria-controls={LISTBOX_ID}
            aria-autocomplete="list"
            aria-activedescendant={
              visibleRows.length > 0 ? optionId(activeIndex) : undefined
            }
            className="flex-1 min-w-0 outline-none text-base text-ink placeholder:text-faint bg-transparent"
          />
          {/* 件数の変化は支援技術にも伝える（sr-only 側で常時アナウンス） */}
          <span aria-live="polite" className="sr-only">
            {query ? `${allRows.length}件の検索結果` : ""}
          </span>
          {query && (
            <span className="hidden sm:inline text-xs text-faint shrink-0" aria-hidden>
              {allRows.length}件
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="検索を閉じる"
            className="shrink-0 w-11 h-11 flex items-center justify-center rounded text-faint hover:bg-chip transition-colors"
          >
            <span className="hidden sm:inline text-[11.5px] border border-line rounded px-1.5 py-0.5">
              esc
            </span>
            <CloseIcon size={18} className="sm:hidden" />
          </button>
        </div>

        {/* グループ切り替えチップ */}
        {query && (
          <div className="flex gap-2 px-4 sm:px-5 py-3 shrink-0 border-b border-line-soft overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-pressed={tab === t.key}
                className={`shrink-0 inline-flex items-center min-h-11 rounded-full px-4 py-2 text-[12.5px] transition-colors ${
                  tab === t.key
                    ? "bg-brand text-white font-medium"
                    : "bg-chip text-soft hover:bg-brand-wash hover:text-brand-deep"
                }`}
              >
                {t.label}
                {t.key !== "all" && ` ${t.count}`}
              </button>
            ))}
          </div>
        )}

        {/* 結果 */}
        <div
          ref={listRef}
          id={LISTBOX_ID}
          role="listbox"
          aria-label="検索結果"
          className="flex-1 overflow-y-auto sidebar-scroll py-2"
        >
          {visibleRows.length > 0 ? (
            GROUP_ORDER.map((group) => {
              const groupRows = visibleRows.filter((r) => r.group === group);
              if (groupRows.length === 0) return null;
              return (
                <div key={group} role="group" aria-label={GROUP_LABEL[group]}>
                  <p
                    className="px-4 sm:px-5 pt-3 pb-1.5 text-[11.5px] font-bold tracking-[0.12em] text-faint"
                    aria-hidden
                  >
                    {GROUP_LABEL[group]}
                  </p>
                  {groupRows.map((row) => {
                    renderIndex++;
                    const isActive = renderIndex === activeIndex;
                    const index = renderIndex;
                    return (
                      <a
                        key={row.key}
                        id={optionId(index)}
                        role="option"
                        aria-selected={isActive}
                        href={row.href}
                        data-active={isActive}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={(e) => {
                          e.preventDefault();
                          go(row.href);
                        }}
                        className={`flex gap-3 px-4 sm:px-5 py-3 border-l-[3px] transition-colors ${
                          isActive
                            ? "bg-brand-wash-2 border-brand"
                            : "border-transparent hover:bg-surface"
                        }`}
                      >
                        <span
                          className={`shrink-0 mt-0.5 ${isActive ? "text-brand" : "text-faint"}`}
                        >
                          <GroupIcon group={row.group} />
                        </span>
                        <span className="flex-1 min-w-0 flex flex-col gap-1">
                          <span
                            className="text-[14.5px] font-medium leading-[1.65] text-ink [&_mark]:bg-[#f7e8b8] [&_mark]:text-ink [&_mark]:px-0.5 [&_mark]:rounded-[2px]"
                            dangerouslySetInnerHTML={{
                              __html: highlight(row.title, query),
                            }}
                          />
                          {row.context && (
                            <span className="text-[13px] leading-[1.75] text-muted truncate">
                              {row.group === "article" ? "＞ " : ""}
                              {row.context}
                            </span>
                          )}
                          {row.excerptHtml && (
                            <span
                              className="text-[13px] leading-[1.75] text-muted line-clamp-2 [&_mark]:bg-[#f7e8b8] [&_mark]:text-ink [&_mark]:px-0.5 [&_mark]:rounded-[2px]"
                              dangerouslySetInnerHTML={{ __html: row.excerptHtml }}
                            />
                          )}
                        </span>
                      </a>
                    );
                  })}
                </div>
              );
            })
          ) : query ? (
            <div className="px-5 py-10 text-center flex flex-col items-center gap-3">
              <p className="text-sm text-soft">
                「{query}」に一致する記事・質問ログが見つかりませんでした。
              </p>
              <a
                href={SLACK_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-[13.5px] font-medium text-white hover:bg-brand-deep transition-colors"
              >
                <SlackIcon size={15} />
                {SLACK_CHANNEL_NAME} で聞く
              </a>
            </div>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-faint">
              キーワードを入力してください（記事・質問ログ・画面名から探します）
            </p>
          )}
        </div>

        {/* フッターのキーヒント */}
        <div className="shrink-0 flex items-center gap-4 px-4 sm:px-5 py-2.5 border-t border-line-soft bg-surface-2">
          <span className="hidden sm:inline text-xs text-faint">↑↓ 移動</span>
          <span className="hidden sm:inline text-xs text-faint">⏎ 開く</span>
          <span className="hidden sm:inline text-xs text-faint">esc 閉じる</span>
          <span className="flex-1" />
          <a
            href={SLACK_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12.5px] text-brand hover:text-brand-deep transition-colors"
          >
            見つからない → Slack {SLACK_CHANNEL_NAME} で聞く
          </a>
        </div>
      </div>
    </div>
  );
}
