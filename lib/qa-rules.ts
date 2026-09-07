/**
 * 質問ログのタグ自動付与ルール。
 *
 * 形態素解析はしない。単純な部分一致で、上から最初にマッチした1つを「主タグ」にする
 * （デザイン上もチップは1件ぶんしか出さない）。どれにも当たらなければ「その他」。
 *
 * 手動で上書きしたいものは content/qa/curation.json に permalink をキーにして
 * `{ "tag": "..." }` を書く（そちらが優先）。
 *
 * このファイルは fs を使わない純ロジック。クライアント側からも import してよい。
 */

export const QA_TAGS = [
  "数値が合わない",
  "登録・設定",
  "権限・共有",
  "レポート",
  "その他",
] as const;

export type QaTag = (typeof QA_TAGS)[number];

/**
 * 上から順に評価し、最初にマッチしたタグを採用する。
 *
 * 「数値が合わない」を最上位に置いているのは、実データの大半が
 * 「登録したのに出てこない / 表示されない」という“出ない系”の症状で、
 * 「登録」の語に引っ張られて登録・設定に落ちると分類の役に立たなくなるため。
 * 規則はここまで。これ以上細かい判定は curation.json で手当てする。
 */
const RULES: { tag: QaTag; keywords: string[] }[] = [
  {
    tag: "数値が合わない",
    // 「出ない・出てこない・表示されない」も同じ症状として寄せる
    keywords: [
      "反映され",
      "合わない",
      "ずれ",
      "ズレ",
      "表示されない",
      "表示されず",
      "出てこない",
      "映らない",
      "数値が出ない",
      "おかしい",
    ],
  },
  {
    tag: "登録・設定",
    keywords: ["登録", "設定", "プルダウン", "選択項目"],
  },
  {
    tag: "権限・共有",
    keywords: ["共有", "権限", "見れない", "見えない", "ログイン"],
  },
  {
    tag: "レポート",
    keywords: ["レポート"],
  },
];

export const FALLBACK_TAG: QaTag = "その他";

/**
 * タグを1つ決める。
 * 渡すのは「質問文」だけ（lib/qa.ts の呼び出し側もそうしている）。
 * 回答文を混ぜると、回答中のたまたまの語に引っ張られて分類がずれる。
 */
export function inferQaTag(text: string): QaTag {
  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.includes(k))) return rule.tag;
  }
  return FALLBACK_TAG;
}

/** curation.json の手動タグが有効な値かどうか */
export function isQaTag(value: unknown): value is QaTag {
  return (
    typeof value === "string" && (QA_TAGS as readonly string[]).includes(value)
  );
}
