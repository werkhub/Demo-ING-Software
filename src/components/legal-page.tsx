import { Container } from "@/components/container";

export function LegalPage({
  kicker,
  title,
  intro,
  children,
}: {
  kicker: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <Container size="narrow">
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {kicker}
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          {title}
        </h1>
        {intro ? (
          <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
            {intro}
          </p>
        ) : null}
      </section>
      <article className="pb-20 prose-legal space-y-6 text-[15px] leading-relaxed text-[color:var(--color-fg)]">
        {children}
      </article>
    </Container>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight pt-6 border-t border-[color:var(--color-border)]">
        {title}
      </h2>
      <div className="space-y-3 text-[color:var(--color-fg-muted)]">{children}</div>
    </section>
  );
}

export function LegalNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-[color:var(--color-warning)] pl-5 py-2 my-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)]">
        Hinweis
      </p>
      <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">{children}</p>
    </div>
  );
}
