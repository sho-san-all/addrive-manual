/**
 * 「画面の名前から引く」用の静的マップ。
 *
 * 種は各 mdx frontmatter の `aliases`。ただし aliases は症状語も混ざっているため、
 * ここには「AdDrive（および周辺ツール）の画面名」だけを手で選んで置いている。
 * 記事を増やす／画面名が変わったときは、この配列を手で直すこと（自動生成ではない）。
 * href は trailingSlash: true に合わせて末尾スラッシュ付きで書く。
 */

export interface ScreenLink {
  /** 画面名（そのまま表示ラベルになる） */
  name: string;
  /** その画面の説明がある記事 */
  href: string;
}

export const SCREENS: ScreenLink[] = [
  { name: "マイページ", href: "/docs/view/my-drive/" },
  { name: "社内ビュー", href: "/docs/view/my-drive/" },
  { name: "クライアントビュー", href: "/docs/start/login/" },
  { name: "キャンペーン登録", href: "/docs/setup/campaign/" },
  { name: "選択項目設定", href: "/docs/start/my-page-setup/" },
  { name: "メンバー設定", href: "/docs/start/my-page-setup/" },
  { name: "マーケット分析", href: "/docs/view/my-drive/" },
  { name: "ADエキスパちゃん", href: "/docs/view/ad-expert-chan/" },
  { name: "DataBeat", href: "/docs/setup/new-client/" },
  { name: "広告管理シート", href: "/docs/setup/new-client/" },
];
