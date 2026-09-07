"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { CloseIcon } from "./Icons";
import type { SidebarCategory } from "@/lib/sidebar";

const FOCUSABLE =
  'a[href], button:not([disabled]), summary, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * lg未満で使うナビゲーションドロワー。中身は既存 Sidebar をそのまま再利用する。
 * body のスクロールロックは ZoomableImage.tsx と同じ方式
 * （overflow を退避して復元する）に揃えている。
 *
 * キーボード操作のために、開いたら中へフォーカスを移し、Tab をドロワー内に閉じ込め、
 * 閉じたら呼び出し元（ハンバーガーボタン）へフォーカスを戻す。
 */
export default function MobileNav({
  open,
  onClose,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  categories: SidebarCategory[];
}) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  // onClose は親が毎レンダー新しい関数を渡してくる。effect の deps に入れると
  // 親が再レンダーするたびに cleanup が走り、フォーカスがドロワー外へ飛ぶ。
  // ref 経由で最新版を呼ぶことで、effect の依存は [open] だけに保つ。
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  /** 開く直前にフォーカスがあった要素（＝ハンバーガー）。閉じたらここへ戻す */
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // ページ遷移したら閉じる。マウント時には発火させない
  // （初回レンダーで onClose を呼ぶと親の state を無駄に触るため）。
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    onCloseRef.current();
    // pathname の変化だけをトリガにする
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // 開いている間だけ: Escape / スクロールロック / フォーカストラップ
  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 開いたらドロワー内（閉じるボタン）へフォーカスを移す
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      // 閉じたら呼び出し元（ハンバーガー）へフォーカスを戻す
      restoreFocusRef.current?.focus();
    };
    // deps は open のみ。onClose は onCloseRef 経由で参照する。
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="lg:hidden fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="メニュー"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        className="absolute left-0 top-0 bottom-0 w-[86%] max-w-[320px] bg-white shadow-2xl flex flex-col"
      >
        <div className="h-[60px] shrink-0 border-b border-line flex items-center px-3">
          <span className="text-[15px] font-bold text-ink flex-1 pl-1">
            AdDrive マニュアル
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="メニューを閉じる"
            className="w-11 h-11 flex items-center justify-center rounded-lg text-ink hover:bg-chip transition-colors"
          >
            <CloseIcon size={22} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto sidebar-scroll">
          {/* touch: タップ領域を 44px 以上に / expandAll: 行き止まりにしないため常に展開 */}
          <Sidebar categories={categories} touch expandAll />
        </div>
      </div>
    </div>
  );
}
