export function Logo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M9 21.5V14C9 11.79 10.79 10 13 10H16.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 11.8L22 16.6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <circle cx="9" cy="21.5" r="2.7" fill="currentColor" />
      <circle cx="16.5" cy="10" r="2.7" fill="currentColor" />
      <circle cx="23" cy="18.5" r="2.7" fill="currentColor" />
    </svg>
  );
}
