"use client";

import { useState } from "react";
import { CheckIcon, LinkIcon } from "./Icons";

/**
 * 大見出し（h2）用のカスタムコンポーネント。
 * rehype-slug が付与した id をそのまま使い、ホバーで「#」リンクを表示する。
 * クリックすると URL を #id 付きに更新し、共有用のフルURLをクリップボードにコピーする。
 * 「ここ見て」と大見出し単位でリンクを渡せるようにするためのもの。
 */
export function AnchorHeading({
  id,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    if (!id) return;
    // アドレスバーを #id に更新（デフォルトのアンカー挙動と同じ）
    history.replaceState(null, "", `#${id}`);
    // 共有用のフルURLをクリップボードへ
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => {
        /* クリップボード不可でもアンカー移動は機能する */
      }
    );
  };

  return (
    <h2 id={id} className="group relative" {...props}>
      {children}
      {id && (
        <a
          href={`#${id}`}
          onClick={handleClick}
          aria-label="この見出しへのリンクをコピー"
          className="ml-2 inline-flex select-none align-middle text-brand/50 no-underline !border-b-0 opacity-0 transition-opacity hover:text-brand focus:opacity-100 group-hover:opacity-100"
        >
          {copied ? (
            <span className="inline-flex items-center gap-1 text-xs font-normal text-brand">
              <CheckIcon size={13} />
              コピーしました
            </span>
          ) : (
            <LinkIcon size={16} />
          )}
        </a>
      )}
    </h2>
  );
}
