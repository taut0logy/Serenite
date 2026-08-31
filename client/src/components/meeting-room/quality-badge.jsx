'use client';

// Milestone A3 (spec §5.6). mediasoup scores run 0 (unusable) to 10
// (perfect); bucketed into 3 signal bars, matching Meet's convention.
export function QualityBadge({ score }) {
  if (score == null) return null;
  const level = score >= 7 ? 3 : score >= 4 ? 2 : score >= 1 ? 1 : 0;
  const label = level === 3 ? 'Good connection' : level === 0 ? 'Poor connection' : 'Fair connection';

  return (
    <div className="flex items-end gap-0.5" aria-label={label} data-testid="quality-badge" data-level={level}>
      {[1, 2, 3].map((bar) => (
        <span
          key={bar}
          className={`w-1 rounded-sm ${bar <= level ? 'bg-emerald-400' : 'bg-white/25'}`}
          style={{ height: `${bar * 3 + 3}px` }}
        />
      ))}
    </div>
  );
}
