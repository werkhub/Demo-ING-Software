/**
 * Inline-SVG-Sparkline. Punkte werden über die Breite verteilt; nulls
 * unterbrechen die Linie (separate Polyline-Segmente). Ohne Achsen,
 * ohne Tooltip — der Tile zeigt den Hauptwert separat.
 */
type Props = {
  data: ReadonlyArray<number | null>;
  width?: number;
  height?: number;
  className?: string;
};

export function Sparkline({
  data,
  width = 96,
  height = 28,
  className,
}: Props) {
  const valid = data.filter((d): d is number => d !== null);
  if (valid.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={className}
        aria-hidden
      />
    );
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const span = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : 0;

  const segments: Array<Array<{ x: number; y: number }>> = [];
  let current: Array<{ x: number; y: number }> = [];
  data.forEach((d, i) => {
    if (d === null) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
      return;
    }
    const x = i * step;
    const y = height - ((d - min) / span) * height;
    current.push({ x, y });
  });
  if (current.length > 0) segments.push(current);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      {segments.map((seg, i) => (
        <polyline
          key={i}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={seg.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
        />
      ))}
    </svg>
  );
}
