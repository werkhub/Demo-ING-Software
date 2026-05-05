import { Link } from "@/i18n/navigation";
import { LEGAL_LINKS } from "@/lib/legal/links";

export function LegalFooter() {
  return (
    <footer className="mt-16 border-t border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)]">
      <div className="mx-auto w-full max-w-[1440px] px-6 md:px-10 lg:px-14 py-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-[color:var(--color-fg-muted)]">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
          © {new Date().getFullYear()} LexBau
        </span>
        <nav className="flex flex-wrap gap-x-5 gap-y-1">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-[color:var(--color-fg)] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
