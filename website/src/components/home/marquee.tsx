const ITEMS = [
  "Emergency dental",
  "Mobile dentistry",
  "Aesthetics",
  "General care",
  "Tooth extraction",
  "Whitening",
  "Oral surgery",
  "Same-day treatment",
];

export function Marquee() {
  const loop = [...ITEMS, ...ITEMS];
  return (
    <div className="overflow-hidden border-y border-border py-5" aria-hidden>
      <div className="marquee-track text-sm text-muted">
        {loop.map((t, i) => (
          <span key={`${t}-${i}`} className="flex items-center gap-6">
            {t}
            <span className="size-1 rounded-full bg-primary" />
          </span>
        ))}
      </div>
    </div>
  );
}
