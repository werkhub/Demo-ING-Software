import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { getCurrentWorkspace } from "@/lib/session";
import { parseDisciplines } from "@/lib/workspace/disciplines";
import type { Discipline } from "@/db/schema/types";
import type { HoaiLeistungsbild } from "@/db/schema";
import { HoaiCalculator } from "./calculator-form";

export const dynamic = "force-dynamic";

/**
 * Mapping Discipline → Leistungsbild. Nur Disziplinen mit eigener
 * HOAI-Tafel kommen vor. Bauphysik, Vermessung, Bauwerksprüfung und SiGeKo
 * triggern keine HOAI-Tafel.
 */
const DISCIPLINE_TO_LEISTUNGSBILD: Partial<Record<Discipline, HoaiLeistungsbild>> = {
  hochbau_objektplanung: "gebaeude",
  ingenieurbauwerke: "ingenieurbau",
  tragwerksplanung: "tragwerk",
  tga: "tga",
  verkehrsanlagen: "verkehr",
};

function visibleLeistungsbilder(
  disciplines: Discipline[]
): HoaiLeistungsbild[] {
  const set = new Set<HoaiLeistungsbild>();
  for (const d of disciplines) {
    const lb = DISCIPLINE_TO_LEISTUNGSBILD[d];
    if (lb) set.add(lb);
  }
  // Fallback: wenn der Workspace keine HOAI-Disziplinen aktiv hat, alle
  // anzeigen (defensiv — Sidebar sollte das Modul ohnehin schon ausgeblendet
  // haben). Verhindert, dass die Seite nach direktem Aufruf leer wirkt.
  if (set.size === 0) {
    return ["gebaeude", "ingenieurbau", "tragwerk", "tga", "verkehr"];
  }
  // Stable Reihenfolge.
  return (["gebaeude", "ingenieurbau", "tragwerk", "tga", "verkehr"] as const).filter((lb) =>
    set.has(lb)
  );
}

export default async function HoaiRechnerPage() {
  const t = await getTranslations("modules.hoaiRechner");
  const workspace = await getCurrentWorkspace();
  const disciplines = parseDisciplines(workspace.disciplinesJson);
  const allowedLeistungsbilder = visibleLeistungsbilder(disciplines);

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {t("kicker")}
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          {t("intro")}
        </p>
        <p className="mt-3 max-w-2xl text-xs text-[color:var(--color-fg-muted)]">
          {t("tipBefore")}
          <Link
            href="/projekte"
            className="underline hover:text-[color:var(--color-accent)]"
          >
            {t("tipLink")}
          </Link>
          {t("tipAfter")}
        </p>
      </section>

      <section className="pb-16">
        <HoaiCalculator allowedLeistungsbilder={allowedLeistungsbilder} />
      </section>
    </Container>
  );
}
