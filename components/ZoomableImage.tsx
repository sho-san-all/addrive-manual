"use client";

import { useEffect, useState } from "react";

interface Props {
  src?: string;
  alt?: string;
}

export function ZoomableImage({ src, alt = "" }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!src) return null;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={() => setOpen(true)}
        className="cursor-zoom-in rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
      />

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={alt || "拡大画像"}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            aria-label="閉じる"
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 text-gray-700 hover:bg-white shadow"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl cursor-zoom-out"
          />

          {alt && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[90%] text-center text-sm text-white/90 bg-black/40 px-3 py-1 rounded">
              {alt}
            </p>
          )}
        </div>
      )}
    </>
  );
}
