import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import {
  getQaThreads,
  getQaTagCounts,
  toQaPlainText,
  type QaThread,
} from "@/lib/qa";
import { QA_TAGS } from "@/lib/qa-rules";
import { SLACK_CHANNEL_URL, SLACK_CHANNEL_NAME } from "@/lib/links";
import { ChevronDownIcon, SlackIcon, LinkIcon } from "./Icons";
import QaLogControls from "./QaLogControls";

/**
 * 質問ログ（/docs/qa/log）の本体。サーバーコンポーネント。
 *
 * ■ 全エントリを常に静的HTMLとして出すこと（絶対）
 *   `<details>` の中身を「開いたときだけ描画」にすると、静的エクスポートの
 *   HTML から回答本文が消え、Pagefind の質問ログヒットが全滅する。
 *   閉じた見た目は `<details>` のネイティブ挙動に任せる。
 *   絞り込みも DOM から外さず、CSS（hidden クラス）で隠す＝ QaLogControls 側の責務。
 *
 * ■ 見出しの id は permalink 由来の安定ID（lib/qa.ts の qaEntryId）
 *   Pagefind は id を持つ見出しを anchors として拾い、検索結果の sub_results
 *   （`/docs/qa/log/#qa-xxxxxxxx`）になる。ここを消すと検索から個別Qへ飛べなくなる。
 */

/** 回答本文。Markdown のままなので MDX で描画する。 */
async function QaAnswer({ markdown }: { markdown: string }) {
  if (!markdown.trim()) return null;
  return (
    <div className="prose prose-gray max-w-none article-prose prose-sm">
      <MDXRemote
        source={markdown}
        options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
      />
    </div>
  );
}

function QaItem({ entry }: { entry: QaThread }) {
  // クライアント側フィルタ（QaLogControls）が読む検索対象テキスト。
  // 回答は生Markdownのまま入れないこと。URL・リンク記法が混ざると
  // 「https」「vercel」等で全件ヒットするうえ、属性だけで10KB以上肥大する。
  const haystack = toQaPlainText(
    `${entry.title} ${entry.plainQuestion} ${entry.replies
      .map((r) => r.answer)
      .join(" ")}`
  ).toLowerCase();

  return (
    <details
      className="group border-b border-line-soft last:border-b-0 open:bg-[#fbfdfd]"
      data-qa-entry=""
      data-qa-id={entry.id}
      data-qa-tag={entry.tag}
      data-qa-text={haystack}
    >
      <summary className="flex items-start gap-3 px-4 sm:px-5 py-4 cursor-pointer list-none min-h-14 [&::-webkit-details-marker]:hidden hover:bg-surface transition-colors">
        {/*
          この h3 と id が Pagefind の anchor（=検索結果の sub_results）になる。
          id は permalink 由来の安定ID。Q番号は新着で繰り上がるので使わない。
        */}
        <h3
          id={entry.id}
          className="flex-1 min-w-0 m-0 text-[15px] sm:text-base font-bold leading-[1.7] text-ink scroll-mt-[76px]"
        >
          {entry.title}
        </h3>
        {/*
          タグ・日付は data-pagefind-ignore 必須。
          外すと検索抜粋に「…表示されない. その他2026-08-05」のように紛れ込み、
          さらにタグ文字列自体がヒット語になって「レポート」等で無関係な行が
          本文一致扱いされる。
        */}
        <span
          className="shrink-0 flex items-center gap-2 pt-0.5"
          data-pagefind-ignore
        >
          <span className="hidden sm:inline rounded-full bg-chip px-2.5 py-0.5 text-[11.5px] text-soft">
            {entry.tag}
          </span>
          {entry.date && (
            <span className="text-xs text-faint tabular-nums">
              {entry.date}
            </span>
          )}
          <ChevronDownIcon
            size={16}
            className="text-faint transition-transform group-open:rotate-180"
          />
        </span>
      </summary>

      <div className="px-4 sm:px-5 pb-5 flex flex-col gap-4">
        {/* スマホ用のタグ表示。こちらも索引から外す（A と同じ理由） */}
        <div className="sm:hidden" data-pagefind-ignore>
          <span className="rounded-full bg-chip px-2.5 py-0.5 text-[11.5px] text-soft">
            {entry.tag}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <p
            className="text-[11.5px] font-bold tracking-[0.1em] text-faint"
            data-pagefind-ignore
          >
            質問（Slack原文）
          </p>
          {/* 見出しは短縮しているので、全文はここに必ず出す（検索の当たり判定もここ） */}
          <p className="m-0 whitespace-pre-wrap text-[14.5px] leading-[1.9] text-ink-2">
            {entry.plainQuestion}
          </p>
        </div>

        {entry.replies.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p
              className="text-[11.5px] font-bold tracking-[0.1em] text-faint"
              data-pagefind-ignore
            >
              やり取り（{entry.replies.length}件・古い順）
            </p>
            {/*
              スレッド内の返信は全部出す。1件に間引くと、そのスレッドでしか
              語られていない解決手順が静的HTMLから落ちて検索に出なくなる。
            */}
            <div className="flex flex-col gap-3">
              {entry.replies.map((reply, i) => (
                <div
                  key={reply.permalink || i}
                  className="border-l-2 border-brand-line pl-4"
                >
                  <QaAnswer markdown={reply.answer} />
                  {reply.date && (
                    <p
                      className="m-0 mt-1 text-[11.5px] text-faint"
                      data-pagefind-ignore
                    >
                      {reply.date}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {entry.permalink && (
          <div className="flex items-center gap-2 border-t border-line-soft pt-3">
            <a
              href={entry.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[12.5px] text-muted hover:text-brand transition-colors"
            >
              <LinkIcon size={14} />
              Slackで元スレッドを見る
            </a>
            <span className="flex-1" />
            <a
              href={`#${entry.id}`}
              className="text-[12.5px] text-faint hover:text-brand transition-colors"
              title="このQへの直リンク"
            >
              #{entry.id}
            </a>
          </div>
        )}
      </div>
    </details>
  );
}

export default function QaLogView({ updated }: { updated?: string }) {
  const entries = getQaThreads();
  const counts = getQaTagCounts();
  const tags = QA_TAGS.filter((tag) => (counts[tag] ?? 0) > 0);

  // パース結果が0件のときは壊れた見出しだけ残さない
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-line px-5 py-8 text-center">
        <p className="text-sm text-soft">
          まだ質問ログがありません。
          <a
            href={SLACK_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:text-brand-deep"
          >
            {SLACK_CHANNEL_NAME}
          </a>
          での質問が、ここに自動で溜まります。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 text-[14.5px] leading-[1.9] text-muted" data-pagefind-ignore>
        Slackで交わされた質問と回答が{entries.length}件。記事になっていない実例はここにあります。
        {updated && `最終更新 ${updated}（Slackから自動更新）。`}
      </p>

      <QaLogControls
        tags={tags.map((tag) => ({ tag, count: counts[tag] ?? 0 }))}
        total={entries.length}
        slackUrl={SLACK_CHANNEL_URL}
        slackName={SLACK_CHANNEL_NAME}
      />

      <div
        className="rounded-xl border border-line overflow-hidden"
        data-qa-list=""
      >
        {entries.map((entry) => (
          <QaItem key={entry.id} entry={entry} />
        ))}
      </div>

      <div
        className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-brand-line bg-brand-wash-2 px-5 py-4"
        data-pagefind-ignore
      >
        <p className="m-0 flex-1 text-sm leading-[1.85] text-soft">
          ここにも無ければ Slack の{" "}
          <strong className="font-bold">{SLACK_CHANNEL_NAME}</strong>{" "}
          で聞いてください。やり取りはこのページに自動で追加されます。
        </p>
        <a
          href={SLACK_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-[13.5px] font-medium text-white hover:bg-brand-deep transition-colors"
        >
          <SlackIcon size={15} />
          {SLACK_CHANNEL_NAME} で聞く
        </a>
      </div>

      <p className="text-[12.5px] text-faint" data-pagefind-ignore>
        このページは Slack のやり取りから自動生成しています（
        <Link href="/docs/help/index" className="text-brand hover:text-brand-deep">
          困ったときの索引
        </Link>
        も参照）。
      </p>
    </div>
  );
}
