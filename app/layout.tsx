import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { getSidebar } from "@/lib/sidebar";
import { SCREENS } from "@/lib/screens";

// 本文フォント。日本語も Noto Sans JP で表示する方針。
// - `subsets` は指定しない。Noto Sans JP は Google Fonts 側が unicode-range で
//   124個の woff2 に分割配信しており、latin だけに絞ることはできない（指定しても
//   日本語グリフを含む全ファイルが同梱される）。実態に合わせて指定を外してある。
// - ビルド成果物に同梱される woff2 は 124 ファイル・約 5.0MB になるが、
//   unicode-range 分割のおかげで、ブラウザが実際に落とすのは
//   そのページで使う字を含むファイルだけ（全部は落ちない）。
// - next/font はビルド時に Google Fonts へ取りに行き、フォントを self-host する
//   （実行時に fonts.googleapis.com へは繋がない）。ビルド環境にネットワークが要る。
// - fallback はフォント取得前・失敗時に効く。globals.css の --font-sans にも
//   同じフォールバック列を書いてある。
const notoSansJP = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  fallback: ["Hiragino Sans", "Hiragino Kaku Gothic ProN", "system-ui"],
});

export const metadata: Metadata = {
  title: {
    default: "AdDrive マニュアル",
    template: "%s | AdDrive マニュアル",
  },
  description: "AdDrive 社内マニュアル - 機能の使い方と逆引きガイド",
  // 社内限定コンテンツ（実クライアント名が写ったスクリーンショットを含む）のため、
  // 検索エンジンへのインデックス登録とリンク追跡を全ページで拒否する。
  // 子ページの generateMetadata は title のみ返すため、この robots 設定は継承される。
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = getSidebar();

  return (
    <html lang="ja" className={`h-full ${notoSansJP.variable}`}>
      {/* pt-[60px] / top-[60px] = 60px。globals.css の --header-height と対。 */}
      <body className="h-full bg-white">
        <Header categories={categories} screens={SCREENS} />
        <div className="flex pt-[60px]">
          {/* Left sidebar (lg以上。lg未満は Header 内の MobileNav ドロワー) */}
          <aside className="hidden lg:block fixed left-0 top-[60px] bottom-0 w-64 border-r border-line-soft bg-surface-2 overflow-y-auto sidebar-scroll z-30">
            <Sidebar categories={categories} />
          </aside>

          {/* Main content */}
          <main className="flex-1 lg:ml-64 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
