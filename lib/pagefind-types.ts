/**
 * Pagefind の最小限の型定義。
 *
 * Pagefind の型は同梱ランタイム（public/pagefind/pagefind.js）にしか無く、
 * ビルド時には存在しない（`npm run build` の1回目の next build より後に生成される）。
 * そのため npm パッケージからは import せず、使う分だけここに手で置く。
 *
 * 参照した実データ: out/pagefind/fragment/*.pf_fragment（gzip されたJSON）。
 * `anchors` は id を持つ見出しから作られ、検索時に `sub_results` として返る。
 */

export interface PagefindAnchor {
  element: string;
  id: string;
  text?: string;
  location: number;
}

/** 見出し単位のヒット。ページ自体を指す1件目は anchor を持たない。 */
export interface PagefindSubResult {
  title: string;
  /** ページURL + "#" + アンカーID（アンカー無しのときはページURLのみ） */
  url: string;
  excerpt: string;
  anchor?: PagefindAnchor;
}

export interface PagefindDocument {
  url: string;
  excerpt: string;
  meta: { title?: string } & Record<string, string | undefined>;
  sub_results?: PagefindSubResult[];
}

export interface PagefindSearchResult {
  id: string;
  data: () => Promise<PagefindDocument>;
}

export interface PagefindApi {
  search: (query: string) => Promise<{ results: PagefindSearchResult[] }>;
  options?: (opts: Record<string, unknown>) => Promise<void>;
  init?: () => Promise<void>;
}

declare global {
  interface Window {
    pagefind?: PagefindApi;
  }
}
