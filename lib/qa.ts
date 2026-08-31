import fs from "fs";
import path from "path";
import crypto from "crypto";
import { inferQaTag, isQaTag, type QaTag } from "./qa-rules";

/**
 * content/qa/log.mdx（Slackの質問ログ）を読んでスレッド単位に組み直すパーサ。
 *
 * ⚠ この正規表現は scripts/qa_export.py の `_format_entry` / `render_mdx` と対になっている。
 *   向こうの出力書式が変わったらここは壊れる。qa_export.py 側の書式は:
 *     ### Q{n}. {question}
 *     （空行）
 *     {answer}
 *     （空行）
 *     > 出典: [Slackで見る]({permalink}) ・ {YYYY-MM-DD}
 *   並び順は created_at 降順（新しい順）。
 *
 * ⚠ 1エントリ＝Slackの1メッセージであり、1つの質問ではない。
 *   同じスレッドの往復が「同じ質問文＋別々の回答」として何件も並ぶ
 *   （実データでは 22 エントリ＝ 11 スレッド）。
 *   なので質問文で単純に重複除去すると、回答本文が10件以上消える。
 *   ここでは permalink の `thread_ts` でスレッドにまとめ、
 *   回答は全部 replies として保持する（＝表示は1件、中身は全部）。
 *
 * ⚠ Q番号は新着が入るたび繰り上がるので安定IDに使ってはいけない。
 *   安定しているのは permalink（とその中の thread_ts）だけ。
 *
 * ⚠ log.mdx は CI（scripts/qa_export.py）が全文置換で生成する。人手で書き足さないこと。
 *   見出しやタグを手で直したいときは content/qa/curation.json を使う。
 *
 * パースに失敗した場合・ファイルが無い場合は必ず空配列を返す。
 * 呼び出し側は 0 件ならセクションごと出さないこと（壊れた見出しだけ残さない）。
 */

const QA_LOG_PATH = path.join(process.cwd(), "content", "qa", "log.mdx");
const QA_CURATION_PATH = path.join(
  process.cwd(),
  "content",
  "qa",
  "curation.json"
);

/** 質問ログページ自体の URL（trailingSlash: true なので末尾スラッシュ付き） */
export const QA_LOG_HREF = "/docs/qa/log/";

/** 見出しに出す質問文の最大文字数（超えたら切って「…」） */
const TITLE_MAX = 60;

export interface QaReply {
  /** 回答文（Markdown のまま） */
  answer: string;
  /** この発言の Slack permalink */
  permalink: string;
  /** YYYY-MM-DD */
  date: string;
}

export interface QaThread {
  /** thread_ts 由来の安定ID。要素の id 属性・アンカーに使う */
  id: string;
  /** このスレッドへの直リンク（/docs/qa/log/#qa-xxxxxxxx） */
  href: string;
  /** 見出しに出す短いタイトル（curation.json 優先 → 質問文から自動生成） */
  title: string;
  /** 分類タグ（curation.json 優先 → lib/qa-rules.ts のキーワード規則） */
  tag: QaTag;
  /** 質問文（スレッド冒頭。改行を含みうる） */
  question: string;
  /** 1行に潰し Markdown 記法を落とした質問文 */
  plainQuestion: string;
  /** スレッド内の回答（古い順）。完全に同一の本文は1つに畳んである */
  replies: QaReply[];
  /** スレッド代表の permalink（最新の発言） */
  permalink: string;
  /** スレッド最新の日付 YYYY-MM-DD */
  date: string;
}

const ENTRY_SPLIT_RE = /^### Q\d+\.\s*/m;
const SOURCE_LINE_RE =
  /^>\s*出典:\s*(?:\[[^\]]*\]\(([^)]+)\))?\s*(?:・\s*(\d{4}-\d{2}-\d{2}))?\s*$/m;

/**
 * Markdown 記法（リンク・画像・URL・強調・コード）を落として1行のプレーンテキストにする。
 * 一覧表示にも、クライアント側のページ内検索用テキスト（data-qa-text）にも使う。
 * 生Markdownのまま検索対象にすると「https」「vercel」等で全件ヒットしてしまう。
 */
export function toQaPlainText(text: string): string {
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

/**
 * Slack のタイムスタンプ表記を `1787566683.530409` の形に揃える。
 * permalink のパス側は小数点が抜けた `p1787566683530409` になるため、
 * クエリの thread_ts と突き合わせられるよう下6桁の前に小数点を戻す。
 */
function normalizeSlackTs(ts: string): string {
  const digits = ts.replace(/\./g, "");
  if (digits.length < 7) return ts;
  return `${digits.slice(0, digits.length - 6)}.${digits.slice(-6)}`;
}

/**
 * permalink からスレッドの識別子を取り出す。
 * Slack permalink は `.../archives/{cid}/p{ts}?thread_ts={thread_ts}&cid={cid}` の形。
 *
 * - 返信は `thread_ts` クエリを持つ → それがスレッドキー
 * - スレッド親メッセージは `thread_ts` を持たないが、パスの `p{ts}` が
 *   そのまま thread_ts（小数点抜き）なので、正規化すれば同じキーに落ちる。
 *   これをやらないと、親だけ別スレッド扱いになって同じ質問が2つ並ぶ。
 *
 * 既知の限界:
 *   permalink がそもそも取れなかったエントリだけは fallback（質問文）をキーにする。
 *   この場合は質問文が変わるとIDも変わる＝配布済みリンクが切れる。
 *   実データでは未発現だが、qa_export.py が permalink を落とすようになったら顕在化する。
 */
function threadKeyOf(permalink: string, fallback: string): string {
  if (!permalink) return fallback;
  const cid =
    permalink.match(/[?&]cid=([A-Z0-9]+)/)?.[1] ??
    permalink.match(/\/archives\/([A-Z0-9]+)\//)?.[1] ??
    "";
  const threadTs = permalink.match(/thread_ts=([\d.]+)/)?.[1];
  if (threadTs) return `${cid}#${normalizeSlackTs(threadTs)}`;
  // 親メッセージ: パスの p{ts} が thread_ts そのもの
  const ownTs = permalink.match(/\/p(\d{10,})(?:[?#]|$)/)?.[1];
  if (ownTs) return `${cid}#${normalizeSlackTs(ownTs)}`;
  return permalink;
}

/**
 * 安定した要素IDを作る。
 *
 * Q番号（Q1, Q2, ...）は新着が入るたび繰り上がるので絶対に使わない。
 * スレッドキー（thread_ts）は新しい返信が付いても変わらないので、
 * 一度配ったリンクが後から切れない。
 */
export function qaIdFromThreadKey(threadKey: string): string {
  if (!threadKey) return "qa-unknown";
  return (
    "qa-" + crypto.createHash("sha1").update(threadKey).digest("hex").slice(0, 8)
  );
}

/**
 * Slack permalink から、そのスレッドの質問ログ内アンカーIDを引く。
 * app/page.tsx / StillStuck などリンク先を作る側はこれを使う。
 */
export function qaIdForPermalink(permalink: string): string {
  return qaIdFromThreadKey(threadKeyOf(permalink, permalink));
}

/**
 * Slack permalink から質問ログの個別アンカーURLを作る。
 * 該当スレッドが実在しないときは、リンク切れにせず一覧トップへ落とす。
 */
export function qaHrefForPermalink(permalink: string): string {
  const id = qaIdForPermalink(permalink);
  const exists = getQaThreads().some((t) => t.id === id);
  return exists ? `${QA_LOG_HREF}#${id}` : QA_LOG_HREF;
}

interface CurationEntry {
  /** 一覧・検索結果に出る短い見出し。省略すると質問文から自動生成する */
  title?: string;
  /** lib/qa-rules.ts の QA_TAGS のいずれか。省略するとキーワード規則で自動付与 */
  tag?: string;
}

/**
 * content/qa/curation.json（人手管理）を読む。
 *
 * 見出しやタグの自動生成が的外れなときに、手で上書きするためのファイル。
 * log.mdx は CI が全文置換するので、人手の調整はすべてこちら側に置く。
 *
 * キーは Slack の permalink（スレッド内のどの発言のものでもよい）。
 * Q番号は新着が入るたび繰り上がるので、キーには絶対に使わない。
 *
 *   {
 *     "https://sho-san.slack.com/archives/C096FLQ19NU/p1787632475175339?thread_ts=...": {
 *       "title": "Metaで配信しているバナーがAdDriveに反映されない",
 *       "tag": "数値が合わない"
 *     }
 *   }
 *
 * ファイルが無い / 空 {} / キーが無い / 壊れた JSON でも、
 * 必ず空オブジェクトにフォールバックして動くこと。
 */
function loadCuration(): Record<string, CurationEntry> {
  try {
    if (!fs.existsSync(QA_CURATION_PATH)) return {};
    const parsed: unknown = JSON.parse(
      fs.readFileSync(QA_CURATION_PATH, "utf-8")
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, CurationEntry>;
  } catch {
    return {};
  }
}

/**
 * Slack原文の冒頭に来がちな、中身を持たない書き出し。
 * 「@グループ」「お疲れ様です！」だけの1文目を見出しにしても何も伝わらないので飛ばす。
 */
const GREETING_RE =
  /(お疲れ|おつかれ|お世話に|失礼し|こんにちは|おはよう|ありがとうございま|よろしくお願い|すみません|恐れ入り)/;

/** @メンション・記号を落として、中身の文字数を測るための正規化 */
function stripNoise(text: string): string {
  return text
    .replace(/[@＠]\S+/g, "")
    .replace(/[\s、。，．!！?？:：・…]/g, "")
    .trim();
}

/**
 * 見出し用の短いタイトルを作る。
 *
 * Slack原文は200字級になることがあるので、
 *   1) 「@グループ」「お疲れ様です！」のような中身の無い書き出しを読み飛ばし、
 *   2) 最初の実質的な1文を取り、
 *   3) TITLE_MAX 字を超えるなら切って「…」を付ける。
 * どうしても実質的な文が見つからなければ、全文を切って使う（見出しが空にならないこと優先）。
 *
 * 自動生成が的外れなときは content/qa/curation.json に手で title を書けば上書きできる。
 */
function toTitle(plainQuestion: string): string {
  const sentences =
    plainQuestion.match(/[^。？?！!]+[。？?！!]?/g)?.map((t) => t.trim()) ?? [];

  const substantive = sentences.find((sentence) => {
    const core = stripNoise(sentence);
    if (core.length < 8) return false; // 「@グループ」等の短すぎる断片
    if (GREETING_RE.test(sentence) && core.length < 20) return false; // 挨拶だけの文
    return true;
  });

  const base = (substantive ?? plainQuestion).trim().replace(/[。]$/, "");
  if (base.length <= TITLE_MAX) return base;
  return base.slice(0, TITLE_MAX) + "…";
}

interface RawEntry {
  question: string;
  plainQuestion: string;
  answer: string;
  permalink: string;
  date: string;
}

/** log.mdx を1メッセージ＝1件のフラットな配列にする（新しい順のまま） */
function parseRawEntries(raw: string): RawEntry[] {
  const blocks = raw.split(ENTRY_SPLIT_RE).slice(1);
  const entries: RawEntry[] = [];

  for (const block of blocks) {
    const sourceMatch = block.match(SOURCE_LINE_RE);
    const permalink = sourceMatch?.[1] ?? "";
    const date = sourceMatch?.[2] ?? "";

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

    const plainQuestion = toQaPlainText(question);
    if (!plainQuestion) continue;

    entries.push({ question, plainQuestion, answer, permalink, date });
  }

  return entries;
}

/** フラットなメッセージ列をスレッドにまとめる */
function buildThreads(rows: RawEntry[]): QaThread[] {
  const curation = loadCuration();
  const order: string[] = [];
  const groups = new Map<string, RawEntry[]>();

  for (const row of rows) {
    const key = threadKeyOf(row.permalink, row.plainQuestion);
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key); // 元ファイルの順（＝新しい順）を保つ
    }
    groups.get(key)!.push(row);
  }

  return order.map((key) => {
    const rows = groups.get(key)!;
    // 元ファイルは新しい順。会話として読めるよう、回答は古い順に並べ替える。
    const chronological = [...rows].reverse();

    // 完全に同一の回答本文は1つに畳む（同じ発言が2エントリに出ることがある）
    const seenAnswers = new Set<string>();
    const replies: QaReply[] = [];
    for (const row of chronological) {
      const body = row.answer.trim();
      if (!body || seenAnswers.has(body)) continue;
      seenAnswers.add(body);
      replies.push({
        answer: row.answer,
        permalink: row.permalink,
        date: row.date,
      });
    }

    const head = rows[0]; // 最新の発言＝スレッド代表
    const id = qaIdFromThreadKey(key);
    // curation.json はスレッド内のどの permalink をキーにしても引けるようにする
    const curated =
      rows.map((r) => curation[r.permalink]).find(Boolean) ?? {};

    const title =
      typeof curated.title === "string" && curated.title.trim()
        ? curated.title.trim()
        : toTitle(head.plainQuestion);

    // タグは「質問文」だけで判定する。回答文まで混ぜると、回答中のたまたまの語
    //（例:「編集中で見れないので」）に引っ張られて分類がずれる。
    const tag: QaTag = isQaTag(curated.tag)
      ? curated.tag
      : inferQaTag(head.plainQuestion);

    return {
      id,
      href: `${QA_LOG_HREF}#${id}`,
      title,
      tag,
      question: head.question,
      plainQuestion: head.plainQuestion,
      replies,
      permalink: head.permalink,
      date: head.date,
    };
  });
}

let cache: QaThread[] | null = null;

/** 質問ログ全スレッド（新しい順）。取得できなければ空配列。 */
export function getQaThreads(): QaThread[] {
  if (cache) return cache;
  try {
    if (!fs.existsSync(QA_LOG_PATH)) {
      cache = [];
      return cache;
    }
    cache = buildThreads(parseRawEntries(fs.readFileSync(QA_LOG_PATH, "utf-8")));
  } catch {
    cache = [];
  }
  return cache;
}

/** 新しい順に n 件。 */
export function getRecentQaThreads(limit: number): QaThread[] {
  return getQaThreads().slice(0, limit);
}

/** タグごとの件数（チップの件数バッジ用） */
export function getQaTagCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const thread of getQaThreads()) {
    counts[thread.tag] = (counts[thread.tag] ?? 0) + 1;
  }
  return counts;
}

/**
 * キーワード（記事の aliases など）に単純一致する質問スレッドを返す。
 * 形態素解析はしない。ヒット0件なら空配列（呼び出し側は Slack導線だけ出す）。
 */
export function findRelatedQaThreads(
  keywords: string[],
  limit = 3
): QaThread[] {
  const terms = keywords
    .map((k) => k.trim())
    .filter((k) => k.length >= 2)
    .map((k) => k.toLowerCase());
  if (terms.length === 0) return [];

  return getQaThreads()
    .map((thread) => {
      const haystack = `${thread.plainQuestion} ${thread.replies
        .map((r) => r.answer)
        .join(" ")}`.toLowerCase();
      const score = terms.reduce(
        (acc, t) => acc + (haystack.includes(t) ? 1 : 0),
        0
      );
      return { thread, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ thread }) => thread);
}
