# i18n-Workflow (LexBau)

> **Stand:** 2026-05-05 — initial nach Phase-1–5-Rollout.
> **Setup:** [next-intl v4](https://next-intl.dev) + Next.js 16 App Router.

## Sprachen

| Locale | Status | Default |
|---|---|---|
| `de` | ✓ vollständig | ja (Fallback) |
| `en` | ✓ UI vollständig (legal content bleibt deutsch) | nein |

Ergänzbar in [src/i18n/routing.ts](../src/i18n/routing.ts) — eine neue Sprache braucht nur einen Eintrag in `locales` + ein neues `messages/<locale>.json`. Keine Code-Änderung sonst.

---

## Architektur

```
src/
├── i18n/
│   ├── routing.ts          # Locale-Liste + Default + URL-Strategie
│   ├── request.ts          # Lädt Messages pro Request (Server)
│   └── navigation.ts       # Locale-aware Link/usePathname/useRouter
├── proxy.ts                # NextAuth + next-intl Middleware komponiert
├── app/
│   ├── globals.css
│   ├── global-error.tsx    # OUTSIDE [locale] (eigenes <html>)
│   ├── api/                # OUTSIDE [locale] (kein Locale-Prefix)
│   ├── actions/            # OUTSIDE [locale] (Server-Action-Shims)
│   └── [locale]/
│       ├── layout.tsx      # <html lang={locale}> + NextIntlClientProvider
│       ├── page.tsx
│       └── …               # Alle Routen leben hier
└── components/
    └── locale-switcher.tsx # Header-Switcher

messages/
├── de.json   # Source-of-Truth
└── en.json   # Übersetzungen
```

---

## Locale-Auflösung (Reihenfolge)

Beim Login (siehe [src/app/[locale]/login/actions.ts](../src/app/[locale]/login/actions.ts)):

1. **`users.preferredLocale`** — explizite User-Wahl (vom LocaleSwitcher gesetzt)
2. **`workspaces.defaultLocale`** — Workspace-Default (für Onboarding)
3. **URL-Prefix** der Login-Seite (vom Browser-Locale-Detection im next-intl-Middleware bestimmt)
4. **`routing.defaultLocale`** = `de`

Bei jedem Request (Middleware in [src/proxy.ts](../src/proxy.ts)):

1. **URL-Prefix** (`/de/...` ↔ `/en/...`) — gewinnt
2. Cookie aus letzter Session
3. `Accept-Language`-Header
4. `routing.defaultLocale`

---

## Messages-Struktur

```jsonc
{
  "common": {
    "actions":  { "save": "…", "cancel": "…", … },   // Buttons
    "fields":   { "title": "…", "date": "…", … },    // Form-Labels
    "status":   { "open": "…", "completed": "…" },   // Generische Status
    "urgency":  { "today": "…", "inDays": "…" },     // ICU plural
    "empty":    { "noResults": "…" },
    "confirm":  { "delete": "…" }
  },
  "nav":       { "sections": …, "items": … },        // Sidebar
  "sidebar":   { "ariaLabel": …, "lawyerCard": … },
  "localeSwitcher": { … },
  "modules": {                                       // Pro Modul ein Namespace
    "dashboard": { … },
    "vorgaenge": { … },
    "projekte":  { … },
    …
  },
  "errors": { … }
}
```

**Konvention:** Strings, die in mehreren Modulen vorkommen → `common.*`. Modul-spezifische Strings → `modules.<name>.*`.

---

## Verwendung

### Server Components

```typescript
import { getTranslations, getLocale } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("modules.dashboard");
  const locale = await getLocale();
  return <h1>{t("title")}</h1>;
}
```

### Client Components

```typescript
"use client";
import { useTranslations, useLocale } from "next-intl";

export function MyButton() {
  const t = useTranslations("common.actions");
  return <button>{t("save")}</button>;
}
```

### Pluralisierung (ICU)

```jsonc
// messages/de.json
"openCases": "{count, plural, one {# offenen Vorgang} other {# offene Vorgänge}}"
```

```typescript
t("openCases", { count: 3 });  // → "3 offene Vorgänge"
```

### Rich-Text (mit JSX-Fragmenten)

```jsonc
// messages/de.json
"summary": "Du hast <highlight>{count} Fristen</highlight> diese Woche."
```

```typescript
t.rich("summary", {
  count: 5,
  highlight: (chunks) => <strong>{chunks}</strong>
});
```

### Datum / Geld / Zahlen

`src/lib/utils.ts` exportiert locale-aware Wrapper:

```typescript
import { formatDateLong, formatDateShort, fmtMoney, timeAgo } from "@/lib/utils";

formatDateLong(new Date(), locale);    // "Mittwoch, 5. Mai 2026" / "Wednesday, 5 May 2026"
fmtMoney(1234.56, locale);              // "1.235 €" / "€1,235"
timeAgo(date, locale);                  // "vor 2 Stunden" / "2 hours ago"
```

`locale` aus `getLocale()` (server) oder `useLocale()` (client) übergeben.

### Links + Navigation

**Statt:**

```typescript
import Link from "next/link";
import { usePathname } from "next/navigation";
```

**Verwende:**

```typescript
import { Link, usePathname, useRouter } from "@/i18n/navigation";
```

Die i18n-Versionen prefixen automatisch das aktuelle Locale.

---

## Was wird (nicht) übersetzt

| Kategorie | Übersetzen? | Warum |
|---|---|---|
| Sidebar / Header / Buttons / Forms | ✓ Ja | Standard-UI-Lokalisierung |
| Modul-Titel und Section-Header | ✓ Ja | Orientierung |
| Status-Badges, Tabellen-Header | ✓ Ja | Lesbarkeit |
| Hilfe-Texte, Empty-States | ✓ Ja | Verständlichkeit |
| **Gesetzestexte (BGB, HOAI, VOB)** | ✗ Nein | Amtlich nur deutsch verbindlich |
| **BGH-Urteile** | ✗ Nein | Volltext beim BMJ — bleibt deutsch |
| **Impressum, Datenschutz, AGB, RDG** | nur Page-Titel | Rechtspflichtangaben deutsch |
| **Norm-Zitate** ("§ 6 VOB/B") | ✗ Nein | Sind deutsche Rechtsverweise |
| **Aktenzeichen** ("VII ZR 201/18") | ✗ Nein | Identifier |
| **Vorlagen-Texte** (Behinderungsanzeige etc.) | ✗ Nein | Müssen auf Deutsch versendet werden |

Faustregel: **UI-Hülle übersetzen, juristischer Inhalt bleibt deutsch.**

---

## Neue Sprache hinzufügen

1. In [src/i18n/routing.ts](../src/i18n/routing.ts) `locales` erweitern:
   ```typescript
   locales: ["de", "en", "fr"]
   ```
2. `messages/fr.json` anlegen — Struktur 1:1 wie `de.json`/`en.json` kopieren und übersetzen.
3. Locale-Code zu Intl-Code-Mapping in [src/lib/utils.ts](../src/lib/utils.ts) `intlLocale()` ergänzen:
   ```typescript
   if (loc === "fr") return "fr-FR";
   ```
4. (Optional) Schema-Enum `users.preferred_locale` und `workspaces.default_locale` erweitern via neuer Migration.

Keine Code-Änderung in Komponenten nötig — `useTranslations`/`getTranslations` lädt automatisch die richtige Sprache.

---

## Neuen UI-String hinzufügen

1. In `messages/de.json` und `messages/en.json` parallel hinzufügen — gleicher Pfad in beiden Files.
2. Im Code per `t("…")` referenzieren.
3. **Pflicht:** beide Files aktuell halten — fehlende Keys in EN führen zur Default-Locale-Anzeige.

CI-Tipp (zukünftig): Script, das Schlüssel-Sets zwischen `de.json` und `en.json` diffed und Abweichungen markiert.

---

## Bekannte Lücken (Phase 2.5)

Phase 1–5 hat die Hauptpfade übersetzt. Folgendes ist noch deutsch und wird in Phase 2.5 nachgezogen:

- Tief verschachtelte Form-Komponenten (z.B. innerhalb von `src/app/[locale]/projekte/[id]/...`)
- Server-Action-Validierungs-Fehlertexte (zod-Errors u.ä.)
- Mock-Daten in `src/data/`, `src/lib/data.ts`
- Audit-Log-Beschriftungen
- Rollen-spezifische Sidebar-Label-Overrides (z.B. „Bautagebuch (LP8)" für IB) — wirken aktuell nur in DE
- Toast-Notifications (success-/error-Strings in den Server-Actions)

---

## Test

Manueller Smoke-Test pro Sprache:

```bash
npm run dev
# Dann im Browser:
# http://localhost:3000/de  → deutsche UI
# http://localhost:3000/en  → englische UI
# Locale-Switcher oben rechts klicken: URL und UI wechseln
```

TypeScript-Check:

```bash
npx tsc --noEmit
```

Production-Build:

```bash
npm run build
```

---

## Änderungs-Historie

| Phase | Inhalt | Migration |
|---|---|---|
| **1** | next-intl Setup, Sidebar + Header übersetzt | — |
| **2** | UI-Strings aller Module extrahiert (siehe Lücken oben) | — |
| **3** | `users.preferredLocale` + Login-Redirect respektiert Präferenz | `0055_user_preferred_locale.sql` |
| **4** | Locale-aware Date/Money/RelativeTime in `lib/utils.ts` | — |
| **5** | `workspaces.defaultLocale` als Fallback im Login-Flow | `0056_workspace_default_locale.sql` |
