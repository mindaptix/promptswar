/** Original orbit mark: a small companion moving alongside the worker. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M29 10a14 14 0 1 0 4 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 14a8 8 0 1 0 3 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="12" r="4" fill="currentColor" />
      <circle cx="20" cy="20" r="2.5" fill="currentColor" />
    </svg>
  );
}
