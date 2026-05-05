# Beitragsleitlinien

## Sprachen-Konvention

| Ebene | Sprache | Beispiele |
|---|---|---|
| Routen, UI-Texte, Labels | Deutsch | `/projekte`, `Auftraggeber`, „Fristen ≤ 7 Tage" |
| Code-Identifier (Variablen, Funktionen, Komponenten, Typen) | Englisch | `getProjects`, `StatCard`, `Urgency` |
| Kommentare im Code | Englisch | (nur wenn das *Warum* nicht offensichtlich ist) |
| DB-Spaltennamen | Englisch (snake\_case) | `workspace_id`, `created_at` |
| Bestandsbegriffe der Bau-Domain | Deutsch | `Bautagebuch`, `Frist`, `Rüge`, `BVS` |

Was schon im Code steht, bleibt — neue Beiträge folgen dieser Regel.

## Server Actions

- Validierung mit Zod-Schemas aus [`src/lib/validation/schemas.ts`](src/lib/validation/schemas.ts).
- Rückgabetyp `ActionResult<T>` aus [`src/lib/action-result.ts`](src/lib/action-result.ts) — kein `throw new Error` für erwartbare Fehler.
- Auf Erfolg: `revalidatePath` für betroffene Routen, dann `redirect` oder `ok()` zurückgeben.
- DB-Fehler (z. B. UNIQUE-Constraint) abfangen und als `fieldFail` an das passende Feld zurückgeben.

## Datenbank-Änderungen

```bash
# 1. Schema in src/db/schema.ts anpassen
# 2. Migration generieren
npm run db:generate
# 3. Migration anwenden
npm run db:migrate
# 4. Optional: Seed
npm run db:seed
```

Indizes immer im zweiten Argument von `sqliteTable(...)` deklarieren — nicht manuell als SQL nachreichen.

## Komponenten

- Server Components per Default. `"use client"` nur, wenn `useState`, `useActionState`, `usePathname`, Framer Motion etc. nötig.
- Wiederverwendbare Bausteine in `src/components/` (z. B. `StatCard`, `LegalPage`, `RdgBanner`).
- Tailwind-Theme-Tokens (`var(--color-…)`) statt freier Hex-Werte.

## VOB-Inhalte ergänzen

Die VOB ist urheberrechtlich geschützt (DIN Media, nicht § 5 UrhG).

- **Eigene Paraphrasen** in [`src/data/legal/vob-b.ts`](src/data/legal/vob-b.ts) — Inhalt frei,
  Wortlaut darf aber nicht aus der Original-VOB übernommen werden. In eigenen Worten
  zusammenfassen.
- **Niemals VOB-Volltexte** in irgendeine Datei der App einfügen, auch nicht „nur intern für
  Tests". Selbst Mock-Tests werden gepusht.
- **KI-Antworten** zitieren über das Zitatrecht (§ 51 UrhG): max. 1–2 Sätze mit Quellenangabe.
- Sobald eine Plattform-Lizenz mit DIN Media aktiviert ist (`licensed_sources`-Eintrag mit
  `status: "active"`), darf `legalChunks.licensedContent` befüllt werden — der Resolver
  schaltet die Anzeige automatisch um.

Externe Anbieter (juris, DIN Media, beck-online) sind in
[`src/lib/legal/external-providers.ts`](src/lib/legal/external-providers.ts) registriert. Für
neue Anbieter: ID + Label + Portal-URL + URL-Builder ergänzen, Schema-Enum
`vobPreferredExternalProvider` erweitern.

## Tests vor Push

```bash
npm run build           # TypeScript + Production-Build
npm run lint            # ESLint
npm run db:studio       # Optional: DB inspizieren
```
