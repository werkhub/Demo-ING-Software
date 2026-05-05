type Props = {
  className?: string;
  size?: number;
  strokeWidth?: number;
};

/**
 * LexBau Bildmarke — drei waagerechte Linien mit abnehmender Länge.
 * Visualisiert Struktur (kozoa-Familie) + ausgewogene Säule (Recht).
 * Bezieht die Farbe per `currentColor` aus dem umgebenden Kontext.
 */
export function LogoMark({ className, size = 24, strokeWidth = 2.5 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      className={className}
      aria-hidden
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="9" y1="18" x2="15" y2="18" />
    </svg>
  );
}
