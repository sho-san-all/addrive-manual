import Link from "next/link";
import { SlackIcon } from "./Icons";
import { SLACK_CHANNEL_URL, SLACK_CHANNEL_NAME } from "@/lib/links";
import { QA_LOG_HREF, type QaEntry } from "@/lib/qa";

/**
 * 記事末尾の「それでも解決しないときは」。
 * 関連する質問ログ（記事の aliases と質問文の単純なキーワード一致）と Slack 導線を出す。
 * 関連0件なら Slack 導線だけを出す。
 */
export default function StillStuck({ entries }: { entries: QaEntry[] }) {
  return (
    <section
      className="mt-12 rounded-xl border border-line px-5 py-5 sm:px-6"
      data-pagefind-ignore
    >
      <p className="text-[15px] font-bold text-ink">それでも解決しないときは</p>

      {entries.length > 0 && (
        <div className="mt-4">
          <p className="text-[11.5px] font-bold tracking-[0.1em] text-faint mb-2.5">
            同じことで困った人の記録
          </p>
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              // permalink が唯一の安定ID（Q番号は新着で繰り上がるので使わない）
              <li key={entry.permalink || entry.plainQuestion}>
                <Link
                  href={QA_LOG_HREF}
                  className="flex items-center gap-3 rounded-[9px] border border-line-soft px-3.5 py-2.5 hover:border-brand-line hover:bg-surface transition-colors"
                >
                  <span className="flex-1 min-w-0 text-sm leading-relaxed text-ink-2 line-clamp-2">
                    {entry.plainQuestion}
                  </span>
                  {entry.date && (
                    <span className="shrink-0 text-xs text-faint">
                      {entry.date.slice(5)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        className={`flex flex-col sm:flex-row sm:items-center gap-3 ${
          entries.length > 0 ? "mt-5 pt-5 border-t border-line-soft" : "mt-3"
        }`}
      >
        <p className="flex-1 text-sm leading-[1.85] text-soft">
          解決しなければ Slack の <strong className="font-bold">{SLACK_CHANNEL_NAME}</strong>{" "}
          で聞いてください。やり取りは
          <Link href={QA_LOG_HREF} className="text-brand hover:text-brand-deep">
            質問ログ
          </Link>
          に自動で溜まり、次に同じことで困った人が引けるようになります。
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
    </section>
  );
}
