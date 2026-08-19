'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function SearchSort({ sorts }: { sorts: { value: string; label: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`?${next.toString()}`);
  }

  return (
    <div className="mb-6 flex gap-3">
      <input
        type="search"
        placeholder="Search..."
        defaultValue={params.get('q') ?? ''}
        onKeyDown={(e) => {
          if (e.key === 'Enter') update('q', (e.target as HTMLInputElement).value);
        }}
        className="w-64 rounded-card border border-line px-3 py-2 text-sm outline-none focus:border-brand"
      />
      <select
        defaultValue={params.get('sort') ?? sorts[0]?.value}
        onChange={(e) => update('sort', e.target.value)}
        className="rounded-card border border-line px-3 py-2 text-sm outline-none focus:border-brand"
      >
        {sorts.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
