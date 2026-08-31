import { LightbulbIcon, AlertIcon } from "./Icons";

type Variant = "tip" | "warn" | "alarm";

interface Props {
  /**
   * 種別。既定は tip。
   * 旧 API では絵文字文字列を受けていたが、絵文字は全廃したので種別キーに変更した。
   * 未知の値・絵文字が渡っても tip として描画する（既存 mdx を壊さないため）。
   */
  variant?: string;
  children: React.ReactNode;
}

const STYLES: Record<Variant, string> = {
  tip: "bg-surface border-line text-ink-2",
  warn: "bg-warn-wash border-warn/30 text-ink-2",
  alarm: "bg-alarm-wash border-alarm/30 text-ink-2",
};

const ICON_COLOR: Record<Variant, string> = {
  tip: "text-brand",
  warn: "text-warn",
  alarm: "text-alarm",
};

export function Callout({ variant = "tip", children }: Props) {
  const v: Variant =
    variant === "warn" || variant === "alarm" ? variant : "tip";

  return (
    <div
      className={`flex gap-3 my-5 px-4 py-3.5 rounded-[10px] border text-sm leading-[1.9] ${STYLES[v]}`}
    >
      <span className={`shrink-0 mt-1 ${ICON_COLOR[v]}`}>
        {v === "tip" ? <LightbulbIcon size={17} /> : <AlertIcon size={17} />}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
