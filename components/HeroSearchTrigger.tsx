"use client";

import { useState } from "react";
import SearchModal from "./SearchModal";
import { SearchIcon } from "./Icons";
import type { ScreenLink } from "@/lib/screens";

export default function HeroSearchTrigger({
  screens = [],
}: {
  screens?: ScreenLink[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 w-full min-h-[54px] px-4 sm:px-5 rounded-xl border-[1.5px] border-brand bg-white text-left cursor-pointer hover:bg-brand-wash-2 transition-colors"
      >
        <SearchIcon size={20} className="text-brand shrink-0" />
        <span className="flex-1 text-[14.5px] sm:text-[15.5px] text-faint truncate">
          例：バナーが反映されない／担当者名が出てこない
        </span>
      </button>
      <SearchModal open={open} onClose={() => setOpen(false)} screens={screens} />
    </>
  );
}
