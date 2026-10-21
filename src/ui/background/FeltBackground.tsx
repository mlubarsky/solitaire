/** The classic green felt: a radial gradient plus a very faint noise texture (CSS). */
export function FeltBackground({ className = 'background-felt' }: { className?: string }) {
  return <div className={className} aria-hidden="true" />;
}
