# Demo ING-Software

Operatives Risikobetriebssystem für Bauprojekte mit eingebetteter juristischer
Intelligenz für Bauunternehmen, Ingenieurbüros, Projektsteuerung und Bauleitung
im DACH-Raum. Bautagebuch, Fristen, Mängel, Anzeigen und Honorar-Workflows in
einer Plattform, durchgehend mit BGB-/HOAI-/VOB-Bezug.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **React 19**
- **Tailwind CSS v4** mit Dark Mode
- **Postgres** + **Drizzle ORM** (postgres-js Driver)
- **Vercel Blob** für File-Uploads (lokal alternativ Disk-Storage)
- **Auth.js** (NextAuth v5)
- **next-intl** für i18n (Deutsch + Englisch)

## Auf Vercel deployen

### 1. Repo importieren

In Vercel auf **„Add New… → Project"** klicken, GitHub-Repo
**`Demo ING-Software`** auswählen, Framework wird automatisch als „Next.js"
erkannt.

### 2. Postgres-Datenbank verbinden

Im Vercel-Dashboard **Storage → Marketplace → Neon** (oder Vercel Postgres)
auswählen und mit dem Projekt verbinden. Der Connection-String wird
automatisch als `DATABASE_URL` (oder `POSTGRES_URL`) gesetzt.

### 3. Vercel Blob verbinden

**Storage → Create Database → Blob** auswählen, mit dem Projekt verbinden.
`BLOB_READ_WRITE_TOKEN` wird automatisch gesetzt.

### 4. Environment-Vars

Im Project Settings → Environment Variables eintragen:

| Variable | Pflicht | Beschreibung |
|---|---|---|
| `DATABASE_URL` | ✓ (auto) | Postgres-Connection-String |
| `AUTH_SECRET` | ✓ | 32-Byte-Random-String (`openssl rand -base64 32`) |
| `BLOB_READ_WRITE_TOKEN` | ✓ (auto) | Vercel Blob — wird vom Vercel-UI gesetzt |
| `KI_ASSISTANT_PROVIDER` | – | `mock` (Default) oder `claude` |
| `LEGAL_ASSISTANT_PROVIDER` | – | `mock` (Default) oder `claude` |
| `ANTHROPIC_API_KEY` | – | nur wenn Provider = `claude` |

### 5. DB-Schema initialisieren

Nach dem ersten erfolgreichen Deploy einmalig **lokal** gegen die Vercel-DB:

```bash
DATABASE_URL="<Connection-String aus Vercel>" npx drizzle-kit push
DATABASE_URL="<Connection-String aus Vercel>" npm run db:seed
```

Alternativ: in Vercel → Settings → Functions die `db:push`- und `db:seed`-
Befehle als One-Off-Job laufen lassen.

### 6. Deploy

Vercel startet automatisch beim ersten Push. Nach dem Schema-Push und Seed
ist die App unter `https://<projekt>.vercel.app` erreichbar.

## Lokal entwickeln

```bash
git clone https://github.com/<account>/Demo-ING-Software.git
cd Demo-ING-Software
npm install
cp .env.example .env.local   # DATABASE_URL eintragen
npm run db:push              # Schema applyen
npm run db:seed              # Demo-Workspaces einsetzen
npm run dev
```

Lokale Postgres-Optionen:

- **Vercel/Neon-DB** auch lokal verwenden — gleiche `DATABASE_URL`
- **Docker**: `docker run --name lexbau-pg -e POSTGRES_PASSWORD=local -p 5432:5432 -d postgres:16`

## Demo-Login

Nach `db:seed` sind drei Demo-Accounts verfügbar (Login per E-Mail-Lookup,
kein Passwort):

| E-Mail | Workspace | Rolle |
|---|---|---|
| `t.mueller@muellerbau.de` | Müller Bau GmbH | Bauunternehmer |
| `a.schneider@schneider-immobilien.de` | Schneider Immobilien GmbH | Bauherr |
| `i.hoffmann@hoffmann-partner.de` | Hoffmann + Partner | Ingenieurbüro |

Sämtliche Demo-Daten (Adressen, IBANs, Steuer-IDs, E-Mails) sind fiktiv.

## Architektur

```
Demo-ING-Software/
├── src/
│   ├── app/[locale]/      # App Router Pages (de + en)
│   ├── api/               # API Routes (Uploads, Auth, Cron)
│   ├── components/        # UI-Bausteine (Sidebar, Header, KI-Drawer …)
│   ├── db/
│   │   ├── schema/        # Drizzle Schema (~35 Domain-Files)
│   │   ├── queries/       # Lese-Helper
│   │   ├── seed/          # Demo-Daten (Müller, Schneider, Hoffmann)
│   │   └── index.ts       # Postgres-Client (lazy-init)
│   ├── lib/
│   │   ├── ki-assistent/  # Floating-KI-Drawer + Snapshot + Feature-Index
│   │   ├── recht-assistent/ # Juristische Q&A (Mock + Claude-Stub)
│   │   ├── hoai/          # Honorartafeln + Calculator
│   │   ├── workspace/     # Disziplinen + Sub-Profile
│   │   └── storage/       # Pluggable Storage (LocalDisk + Vercel Blob)
│   └── i18n/              # next-intl-Routing
├── messages/              # Übersetzungen (de.json, en.json)
└── drizzle.config.ts
```

## Module (Auswahl)

- **Tagesgeschäft**: Vorgänge, Fristen, Anzeigen (§ 6 + § 4 III VOB/B), Bautagebuch
- **Projekte** mit HOAI-Stammdaten + Compliance-Indikatoren
- **Personal**: Stunden je Mitarbeiter und Leistungsphase, Zuordnung zu Projekten
- **Finanzen**: Eingangs-/Ausgangsrechnungen mit XRechnung/ZUGFeRD, DATEV-Export
- **Werkzeuge**: Recht-Assistent, Vertrags-Scan, Rüge-Analyse, Anordnungs-Check, HOAI-Rechner
- **Wissen**: BGB §§ 631–650v, HOAI 2021, VOB-Paraphrasen, BGH-Urteile
- **KI-Floating-Assistent**: Schnellauskunft über alle Workspace-Daten + Modul-Wegweiser

## DB-Befehle

| Befehl | Zweck |
|---|---|
| `npm run db:push` | Schema → DB applyen (Erst-Setup + Folge-Änderungen) |
| `npm run db:generate` | SQL-Migration aus Schema generieren (für versionierte Migration) |
| `npm run db:migrate` | Versionierte Migration applyen |
| `npm run db:seed` | Demo-Workspaces einsetzen |
| `npm run db:studio` | Drizzle Studio (Web-UI für DB) auf <https://local.drizzle.studio> |
| `npm run db:fetch-laws` | BGB + HOAI von gesetze-im-internet.de laden |
| `npm run db:fetch-cases` | BGH-Bauurteile vom BMJ-ECLI-Index laden |

## RDG-Hinweis

Das Produkt liefert Information, keine Rechtsberatung im Sinne des
Rechtsdienstleistungsgesetzes. Bei wirtschaftlich relevanten Streitwerten ist
Rücksprache mit einem Rechtsanwalt empfohlen.
