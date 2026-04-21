import Link from "next/link";

interface Props {
  emoji: string;
  label: string;
  slug: string;
  count: number;
}

export default function CategoryCard({ emoji, label, slug, count }: Props) {
  return (
    <Link
      href={`/docs/${slug}`}
      className="group flex flex-col gap-3 p-5 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all bg-white"
    >
      <span className="text-3xl">{emoji}</span>
      <div>
        <p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
          {label}
        </p>
        <p className="text-sm text-gray-500 mt-0.5">{count}件の記事</p>
      </div>
    </Link>
  );
}
