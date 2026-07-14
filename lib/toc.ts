import GithubSlugger from "github-slugger";

export interface TocItem {
  id: string;
  title: string;
  level: 2 | 3;
}

export function extractToc(mdxContent: string): TocItem[] {
  const lines = mdxContent.split("\n");
  const items: TocItem[] = [];
  // rehype-slug と同じ github-slugger を使い、見出しに実際に付与される id と
  // 完全一致させる（長音符「ー」等の欠落による TOC リンク切れを防ぐ）。
  // 見出しの出現順に slug() を呼ぶことで、重複見出しの -1, -2 採番も揃う。
  const slugger = new GithubSlugger();

  for (const line of lines) {
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    const match = h2 || h3;
    if (!match) continue;

    const title = match[1].replace(/[*_`]/g, "").trim();
    const id = slugger.slug(title);

    items.push({ id, title, level: h2 ? 2 : 3 });
  }

  return items;
}
