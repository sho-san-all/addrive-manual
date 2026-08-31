import fs from "fs";
import path from "path";

/**
 * content/qa/log.mdx（Slackの質問ログ）を読んでエントリ配列にするパーサ。
 *
 * ⚠ この正規表現は scripts/qa_export.py の `_format_entry` / `render_mdx` と対になっている。
 *   向こうの出力書式が変わったらここは壊れる。qa_export.py 側の書式は:
 *     ### Q{n}. {question}
 *     （空行）
 *     {answer}
 *     （空行）
 *     > 出典: [Slackで見る]({permalink}) ・ {YYYY-MM-DD}
 *   並び順は created_at 降順（新しい順）で書き出されるため、ファイル順をそのまま使う。
 *
 * ⚠ Q番号は新着が入るたび繰り上がるので安定IDに使ってはいけない。
 *   永続的に同じエントリを指せるのは permalink（Slackのpermalink）だけ。
 *
 * ⚠ log.mdx は CI（scripts/qa_export.py）が全文置換で生成する。人手で書き足さないこと。
 *
 * パースに失敗した場合・ファイルが無い場合は必ず空配列を返す。
 * 呼び出し側は 0 件ならセクションごと出さないこと（壊れた見出しだけ残さない）。
 */

const QA_LOG_PATH = path.join(process.cwd(), "content", "qa", "log.mdx");

/** 質問ログページ自体の URL（trailingSlash: true なので末尾スラッシュ付き） */
export const QA_LOG_HREF = "/docs/qa/log/";

export interface QaEntry {
  /** 質問文（先頭の1段落。改行を含みうる） */
  question: string;
  /** 一覧表示用に1行へ潰し、Markdown記法を落とした質問文 */
  plainQuestion: string;
  /** 回答文（Markdown のまま） */
  answer: string;
  /** Slack permalink。唯一の安定ID。取得できなければ空文字 */
  permalink: string;
  /** YYYY-MM-DD。取得できなければ空文字 */
  date: string;
}

const ENTRY_SPLIT_RE = /^### Q\d+\.\s*/m;
const SOURCE_LINE_RE =
  /^>\s*出典:\s*(?:\[[^\]]*\]\(([^)]+)\))?\s*(?:・\s*(\d{4}-\d{2}-\d{2}))?\s*$/m;

/** 一覧表示用に Markdown 記法（リンク・強調・コード）を落として1行にする */
function toPlainLine(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`>#]/g, "")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseEntries(raw: string): QaEntry[] {
  // frontmatter とページ冒頭の説明は捨てる（最初の見出しより前）
  const blocks = raw.split(ENTRY_SPLIT_RE).slice(1);
  const entries: QaEntry[] = [];

  for (const block of blocks) {
    const sourceMatch = block.match(SOURCE_LINE_RE);
    const permalink = sourceMatch?.[1] ?? "";
    const date = sourceMatch?.[2] ?? "";

    // 出典行より前が本文（質問＋回答）
    const body = (
      sourceMatch && sourceMatch.index !== undefined
        ? block.slice(0, sourceMatch.index)
        : block
    ).trim();
    if (!body) continue;

    // qa_export.py は「質問」「空行」「回答」の順に書く。
    // 質問自体が複数行を含むことがあるため、最初の空行で切る。
    const sep = body.search(/\n[ \t]*\n/);
    const question = sep === -1 ? body : body.slice(0, sep).trim();
    const answer = sep === -1 ? "" : body.slice(sep).trim();

    const plainQuestion = toPlainLine(question);
    if (!plainQuestion) continue;

    entries.push({ question, plainQuestion, answer, permalink, date });
  }

  return entries;
}

let cache: QaEntry[] | null = null;

/** 質問ログ全件（created_at 降順＝新しい順）。取得できなければ空配列。 */
export function getQaEntries(): QaEntry[] {
  if (cache) return cache;
  try {
    if (!fs.existsSync(QA_LOG_PATH)) {
      cache = [];
      return cache;
    }
    cache = parseEntries(fs.readFileSync(QA_LOG_PATH, "utf-8"));
  } catch {
    cache = [];
  }
  return cache;
}

/**
 * 新しい順に n 件。
 * 同一スレッドの往復がそのまま別エントリになる仕様（Q1〜Q5が同じ質問文、など）のため、
 * 一覧に出すときは質問文で重複を落とす。
 */
export function getRecentQaEntries(limit: number): QaEntry[] {
  const seen = new Set<string>();
  const result: QaEntry[] = [];
  for (const entry of getQaEntries()) {
    if (seen.has(entry.plainQuestion)) continue;
    seen.add(entry.plainQuestion);
    result.push(entry);
    if (result.length >= limit) break;
  }
  return result;
}

/**
 * キーワード（記事の aliases など）に単純一致する質問ログを返す。
 * 形態素解析はしない。ヒット0件なら空配列（呼び出し側は Slack導線だけ出す）。
 */
export function findRelatedQaEntries(
  keywords: string[],
  limit = 3
): QaEntry[] {
  const terms = keywords
    .map((k) => k.trim())
    .filter((k) => k.length >= 2)
    .map((k) => k.toLowerCase());
  if (terms.length === 0) return [];

  const scored = getQaEntries()
    .map((entry) => {
      const haystack = `${entry.plainQuestion} ${entry.answer}`.toLowerCase();
      const score = terms.reduce(
        (acc, t) => acc + (haystack.includes(t) ? 1 : 0),
        0
      );
      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  // permalink（唯一の安定ID）で重複を落とす。Slackの同一スレッドから
  // 複数エントリが出ることがあるため、質問文が同一のものも1件に潰す。
  const seen = new Set<string>();
  const result: QaEntry[] = [];
  for (const { entry } of scored) {
    const key = entry.permalink || entry.plainQuestion;
    if (seen.has(key) || seen.has(entry.plainQuestion)) continue;
    seen.add(key);
    seen.add(entry.plainQuestion);
    result.push(entry);
    if (result.length >= limit) break;
  }
  return result;
}
