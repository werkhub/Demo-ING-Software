type Tone = "default" | "accent" | "warning" | "critical" | "success";

const TONE_CLASSES: Record<Tone, string> = {
  default: "text-[color:var(--color-fg-muted)]",
  accent: "text-[color:var(--color-accent)]",
  warning: "text-[color:var(--color-warning)]",
  critical: "text-[color:var(--color-critical)]",
  success: "text-[color:var(--color-success)]",
};

export function StatCard({
  label,
  value,
  caption,
  tone = "default",
}: {
  label: string;
  value: string | number;
  caption?: string;
  tone?: Tone;
}) {
  return (
    <div className="bg-[color:var(--color-bg)] p-6">
      <p
        className={`font-mono text-[10px] uppercase tracking-[0.22em] ${TONE_CLASSES[tone]}`}
      >
        {caption ?? label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--color-fg)]">
        {value}
      </p>
      {caption ? (
        <p className="mt-2 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
          {label}
        </p>
      ) : null}
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-3">
      {children}
    </div>
  );
}

export function StatGrid4({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-4">
      {children}
    </div>
  );
}
