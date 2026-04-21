interface Props {
  icon?: string;
  children: React.ReactNode;
}

export function Callout({ icon = "💡", children }: Props) {
  return (
    <div className="flex gap-3 my-4 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700">
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 leading-relaxed">{children}</div>
    </div>
  );
}
