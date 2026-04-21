export interface TocItem {
  id: string;
  title: string;
  level: 2 | 3;
}

export function extractToc(mdxContent: string): TocItem[] {
  const lines = mdxContent.split("\n");
  const items: TocItem[] = [];

  for (const line of lines) {
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    const match = h2 || h3;
    if (!match) continue;

    const title = match[1].replace(/[*_`]/g, "").trim();
    const id = title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-ぁ-んァ-ヶ一-龯]/g, "");

    items.push({ id, title, level: h2 ? 2 : 3 });
  }

  return items;
}
