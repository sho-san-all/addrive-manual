import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { getSidebar } from "@/lib/sidebar";

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
    <html lang="ja" className="h-full">
      <body className="h-full bg-white">
        <Header />
        <div className="flex pt-14">
          {/* Left sidebar */}
          <aside className="hidden lg:block fixed left-0 top-14 bottom-0 w-64 border-r border-gray-200 overflow-y-auto sidebar-scroll z-30 bg-white">
            <Sidebar categories={categories} />
          </aside>

          {/* Main content */}
          <main className="flex-1 lg:ml-64 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
