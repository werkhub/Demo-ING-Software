import { Container } from "@/components/container";

export function PageSkeleton({ kicker }: { kicker?: string }) {
  return (
    <Container>
      <section className="pt-14 pb-10 animate-pulse">
        {kicker ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
            {kicker}
          </p>
        ) : (
          <div className="h-3 w-32 rounded bg-[color:var(--color-bg-subtle)]" />
        )}
        <div className="mt-5 h-10 w-2/3 rounded bg-[color:var(--color-bg-subtle)]" />
        <div className="mt-4 h-4 w-1/2 rounded bg-[color:var(--color-bg-subtle)]" />
      </section>
      <section className="border-t border-[color:var(--color-border)] pt-10 pb-14">
        <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-[color:var(--color-bg)] p-6">
              <div className="h-3 w-24 rounded bg-[color:var(--color-bg-subtle)]" />
              <div className="mt-4 h-8 w-16 rounded bg-[color:var(--color-bg-subtle)]" />
            </div>
          ))}
        </div>
      </section>
    </Container>
  );
}
