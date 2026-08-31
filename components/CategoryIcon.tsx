/**
 * カテゴリ7種のインラインSVGアイコン。
 * lib/sidebar.ts の CATEGORY_CONFIG が持つ `icon`（アイコン名の文字列キー）と対。
 * 新しいカテゴリを増やすときは、こちらにも同名のキーを足すこと
 * （未定義キーはフォールバックのドキュメントアイコンになる）。
 */

export type CategoryIconName =
  | "start"
  | "view"
  | "setup"
  | "report"
  | "help"
  | "updates"
  | "qa";

interface Props {
  name: string;
  size?: number;
  className?: string;
}

const PATHS: Record<CategoryIconName, React.ReactNode> = {
  // 権限・ログイン（鍵）
  start: (
    <>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 018 0v3" />
    </>
  ),
  // 数値を見る（棒グラフ）
  view: <path d="M4 19h16M7 16V9M12 16V5M17 16v-4" />,
  // 案件を通す（追加する）
  setup: <path d="M12 5v14M5 12h14" />,
  // レポート（書類）
  report: (
    <>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  // 数値がおかしい（警告）
  help: (
    <path d="M12 9v5M12 17.5v.01M10.3 3.9L2.6 17a1.8 1.8 0 001.6 2.7h15.6A1.8 1.8 0 0021.4 17L13.7 3.9a1.9 1.9 0 00-3.4 0z" />
  ),
  // アップデート（きらめき）
  updates: (
    <>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
      <circle cx="12" cy="12" r="3.4" />
    </>
  ),
  // 質問ログ（吹き出し）
  qa: <path d="M21 12a8 8 0 01-11.3 7.3L4 21l1.7-5.7A8 8 0 1121 12z" />,
};

const FALLBACK = (
  <>
    <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
    <path d="M14 3v5h5" />
  </>
);

export default function CategoryIcon({ name, size = 20, className }: Props) {
  const path = PATHS[name as CategoryIconName] ?? FALLBACK;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      focusable="false"
    >
      {path}
    </svg>
  );
}
