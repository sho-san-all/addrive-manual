import Link from "next/link";
import { getAllArticles } from "@/lib/content";
import { getSidebar } from "@/lib/sidebar";
import { getQaEntries, getRecentQaEntries, QA_LOG_HREF } from "@/lib/qa";
import { SCREENS } from "@/lib/screens";
import { SLACK_CHANNEL_URL, SLACK_CHANNEL_NAME } from "@/lib/links";
import CategoryCard from "@/components/CategoryCard";
import HeroSearchTrigger from "@/components/HeroSearchTrigger";
import { ArrowRightIcon, SlackIcon } from "@/components/Icons";

/**
 * 「よく聞かれること」の4件。
 *
 * ここは手で選ぶ。実データ（content/qa/log.mdx の質問ログ）の傾向を見て差し替えること。
 * 質問文はSlackの原文そのままだと長すぎるので、短い言い換えを当てている。
 * 行き先は必ず、実際にその答えが書かれているかを本文で grep して確認すること
 * （記事タイトル・description が近いだけで実際には書かれていない、という空振りが起きやすい）。
 * 答えが記事側に無く質問ログにしかない場合は `qa: true` を付けて行き先を明示する。
 * 記事が増えたら見直す（自動生成ではない）。
 */
const FREQUENT_QUESTIONS: { label: string; href: string; qa?: boolean }[] = [
  // help/data-issues の記事タイトルそのもの
  { label: "数値が出ない・合わない", href: "/docs/help/data-issues/" },
  // start/my-page-setup の記事タイトルそのもの
  {
    label: "自分の名前・クライアント名が選択肢に出てこない",
    href: "/docs/start/my-page-setup/",
  },
  // start/login の description が「クライアントビュー（赤いページ）が見れないときの対処法」
  {
    label: "クライアントビューが見れない・先方に共有したい",
    href: "/docs/start/login/",
  },
  // 答えは記事側になく、質問ログ Q1（広告管理シートの二重登録）にしかない
  {
    label: "Metaのバナーが反映されない",
    href: QA_LOG_HREF,
    qa: true,
  },
];

/** 「やりたいことから引く」に出すカテゴリ（qa は別セクションで扱うので除く） */
const CARD_CATEGORIES = [
  "start",
  "view",
  "setup",
  "report",
  "help",
  "updates",
];

export default function HomePage() {
  const sidebar = getSidebar();
  const totalArticles = getAllArticles().filter(
    (a) => a.category !== "qa"
  ).length;
  const qaEntries = getRecentQaEntries(3);
  const qaTotal = getQaEntries().length;

  const cards = CARD_CATEGORIES.map((slug) =>
    sidebar.find((c) => c.slug === slug)
  ).filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div>
      {/* ① 何を解決したいですか？ + ② よく聞かれること */}
      <section className="border-b border-line bg-surface px-5 sm:px-6 py-10 sm:py-11">
        <div className="mx-auto w-full max-w-[760px] flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-[26px] leading-[1.55] font-bold text-ink">
              何を解決したいですか？
            </h1>
            <p className="text-[14.5px] leading-[1.9] text-muted">
              記事は全{totalArticles}ページ
              {qaTotal > 0 ? `、Slackの質問ログが${qaTotal}件` : ""}
              。上から読まずに、困っていることから引いてください。
            </p>
          </div>

          <HeroSearchTrigger />

          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-bold tracking-[0.1em] text-faint">
              よく聞かれること
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FREQUENT_QUESTIONS.map((q) => (
                <Link
                  key={q.label}
                  href={q.href}
                  className="flex items-center gap-2.5 min-h-[52px] rounded-[9px] border border-line bg-white px-4 py-3 hover:border-brand-line transition-colors"
                >
                  <ArrowRightIcon size={16} className="text-brand shrink-0" />
                  <span className="flex-1 text-sm leading-relaxed text-ink-2">
                    {q.label}
                  </span>
                  {/* 行き先が記事ではなく質問ログのものは区別できるようにラベルを出す */}
                  {q.qa && (
                    <span className="shrink-0 rounded bg-brand-wash px-1.5 py-0.5 text-[11px] font-bold text-brand-deep">
                      質問ログ
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1080px] px-5 sm:px-6 py-10 sm:py-11 flex flex-col gap-11">
        {/* ③ やりたいことから引く */}
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-bold text-ink">やりたいことから引く</h2>
            <span className="text-[13px] text-faint">記事はここから</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {cards.map((cat) => (
              <CategoryCard
                key={cat.slug}
                icon={cat.icon}
                label={cat.label}
                slug={cat.slug}
                count={cat.items.length}
                items={cat.items.map((i) => ({
                  title: i.title,
                  href: i.href,
                }))}
              />
            ))}
          </div>
        </section>

        {/* ④ 画面の名前から引く */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-ink">画面の名前から引く</h2>
          <div className="flex flex-wrap gap-2">
            {SCREENS.map((screen) => (
              <Link
                key={screen.name}
                href={screen.href}
                className="inline-flex items-center min-h-11 sm:min-h-0 rounded-full bg-chip px-4 py-2 text-[13.5px] text-ink-2 hover:bg-brand-wash hover:text-brand-deep transition-colors"
              >
                {screen.name}
              </Link>
            ))}
          </div>
        </section>

        {/* ⑤ みんなの質問ログ ＋ ⑥ 見つからないときは */}
        <section className="flex flex-col lg:flex-row gap-5 items-start">
          {/* パース結果が0件のときはセクションごと出さない */}
          {qaEntries.length > 0 && (
            <div className="flex-1 min-w-0 flex flex-col gap-3 w-full">
              <div className="flex items-baseline gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-ink">みんなの質問ログ</h2>
                <span className="text-[13px] text-faint">
                  Slackから自動更新・{qaTotal}件
                </span>
                <Link
                  href={QA_LOG_HREF}
                  className="ml-auto text-[13px] text-brand hover:text-brand-deep transition-colors"
                >
                  すべて見る →
                </Link>
              </div>
              <ul className="rounded-xl border border-line overflow-hidden">
                {qaEntries.map((entry, i) => (
                  // permalink が唯一の安定ID（Q番号は新着で繰り上がる）
                  <li
                    key={entry.permalink || entry.plainQuestion}
                    className={i > 0 ? "border-t border-line-soft" : ""}
                  >
                    <Link
                      href={QA_LOG_HREF}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface transition-colors"
                    >
                      <span className="flex-1 min-w-0 text-[14.5px] leading-relaxed text-ink-2 line-clamp-2">
                        {entry.plainQuestion}
                      </span>
                      {entry.date && (
                        <span className="shrink-0 text-[12.5px] text-faint">
                          {entry.date.slice(5)}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="w-full lg:w-80 shrink-0 rounded-xl border border-brand-line bg-brand-wash-2 px-5 py-5 flex flex-col gap-2.5">
            <p className="text-[15px] font-bold text-ink">見つからないときは</p>
            <p className="text-sm leading-[1.9] text-soft">
              Slackの <strong className="font-bold">{SLACK_CHANNEL_NAME}</strong>{" "}
              で聞いてください。やり取りは質問ログに自動で溜まり、次に同じことで困った人が引けるようになります。
            </p>
            <a
              href={SLACK_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-[13.5px] font-medium text-white hover:bg-brand-deep transition-colors"
            >
              <SlackIcon size={15} />
              {SLACK_CHANNEL_NAME} を開く
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
