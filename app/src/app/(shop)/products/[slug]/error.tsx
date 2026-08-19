'use client';

export default function ProductError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-16 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink-muted">This page could not be loaded.</p>
      <button onClick={reset} className="mt-6 text-sm text-brand hover:underline">
        Try again
      </button>
    </div>
  );
}
