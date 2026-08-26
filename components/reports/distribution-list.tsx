export function DistributionList({
  rows,
  empty = 'No data in this window.',
}: {
  rows?: Array<{ id: string; label: string; value: number }>;
  empty?: string;
}) {
  const safeRows = rows ?? [];
  const total = safeRows.reduce((sum, row) => sum + row.value, 0);
  const max = Math.max(...safeRows.map((row) => row.value), 1);

  if (safeRows.length === 0) {
    return <p className="py-6 text-sm text-zinc-500">{empty}</p>;
  }

  return (
    <div className="space-y-3">
      {safeRows.map((row) => {
        const share = total === 0 ? 0 : Math.round((row.value / total) * 100);
        return (
          <div key={row.id}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-zinc-300">{row.label}</span>
              <span className="shrink-0 font-mono text-[11px] text-zinc-500">
                {row.value}
                <span className="ml-2 text-zinc-600">{share}%</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-200 ease-out"
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
