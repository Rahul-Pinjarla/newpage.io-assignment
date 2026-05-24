# SENTINEL — Client Onboarding Risk Assessment

Prototype SPA for Halcyon Capital Partners' SENTINEL programme.
Built with React 19 + TypeScript + Vite. Zero backend — data loads from a bundled CSV with new assessments persisted to localStorage.

Optimised for **iPad landscape (1024 × 768)**.

---

## Quick start

Requires [Node.js ≥ 18](https://nodejs.org) or [Bun](https://bun.sh).

```bash
# Install dependencies
bun install          # or: npm install

# Start development server
bun dev              # or: npm run dev
```

Open **http://localhost:5173** in a browser.

---

## Build & serve the production bundle

```bash
# Build
bun run build        # or: npm run build

# Preview the built output (recommended)
bun run preview      # or: npm run preview
```

Opens at **http://localhost:4173** by default.

> **Note:** The app fetches `client_onboarding.csv` over HTTP, so opening `dist/index.html`
> directly as a `file://` URL will not work. Always use a local server (`bun run preview`,
> `npx serve dist`, or `python3 -m http.server --directory dist 4173`).

---

## Project structure

```
src/
├── rules/
│   ├── sentinelRules.ts    # Typed config object — HIGH/MEDIUM/LOW criteria, no hardcoded values in engine
│   ├── riskEngine.ts       # Pure function: evaluate(record) → { tier, reasons[] }
│   └── findingEngine.ts    # Pure function: computeFindings(record) → FindingType[]
├── data/
│   ├── csvLoader.ts        # PapaParse CSV → ClientRecord[]
│   ├── storage.ts          # localStorage read/write for new assessments
│   └── DataProvider.tsx    # React context: merges CSV + localStorage, runs enrichment on mount
├── components/
│   ├── Dashboard/          # KPI cards, branch bar chart, risk donut, filterable records table
│   ├── NewAssessment/      # 3-step intake wizard with live risk preview and 90s timer
│   ├── AuditView/          # Full audit table with findings breakdown chart
│   └── shared/             # RiskBadge, StatusPill, FindingBadge, InfoTooltip
└── types/
    └── onboarding.ts       # ClientRecord, RiskTier, KycStatus, FindingType
```

---

## What it does

| View | Purpose |
|---|---|
| **Dashboard** | 5 KPI cards, risk-by-branch bar chart, risk distribution donut, searchable + filterable records table with mismatch alerts |
| **New Assessment** | 3-step intake wizard: client details → screening flags → review & submit. Live risk computed before save. 90-second target timer. |
| **Audit View** | Records table with all 5 finding types surfaced as badges. Findings-by-type bar chart. Filter by branch, finding type, RM. |

---

## Risk engine

Rules are defined in `sentinelRules.ts` (no hardcoded values in the evaluation logic):

| Tier | Triggers |
|---|---|
| **HIGH** | PEP status · Sanctions match · Adverse media · Russia / Belarus / Venezuela |
| **MEDIUM** | Entity client type · Brazil / Turkey / South Africa / Mexico / UAE / China · Annual income > £500k **and** source is Inheritance / Gift / Other |
| **LOW** | None of the above |

Jurisdiction matching is case-insensitive. The country field uses a datalist for autocomplete.

---

## Finding types

| Finding | Condition |
|---|---|
| `classification_mismatch` | Computed risk tier ≠ stored risk classification |
| `missing_id_verification` | No ID verification date recorded |
| `missing_rm` | No relationship manager assigned |
| `documentation_incomplete` | Documentation not marked complete |
| `kyc_status_conflict` | HIGH-risk client with KYC status APPROVED |

---

## Architecture discussion

For production considerations — offline-first sync, configurable rules engine, FCA record-keeping compliance, and multi-branch scale — see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Screenshots:
<img width="1021" height="771" alt="Screenshot 2026-05-25 at 04 21 49" src="https://github.com/user-attachments/assets/50758a9a-5ee5-4e81-a195-20b9d2763c91" />

<img width="1025" height="770" alt="Screenshot 2026-05-25 at 04 23 34" src="https://github.com/user-attachments/assets/a382f601-ece4-4ed4-86f0-bcacdaeca5b8" />

<img width="1024" height="771" alt="Screenshot 2026-05-25 at 04 24 26" src="https://github.com/user-attachments/assets/6adcea34-9a9b-4ec9-bb9c-c3451f1473c7" />

<img width="1021" height="768" alt="Screenshot 2026-05-25 at 04 26 02" src="https://github.com/user-attachments/assets/fea74561-a92c-417d-9589-1cfb6a96e494" />

<img width="1029" height="773" alt="Screenshot 2026-05-25 at 04 26 09" src="https://github.com/user-attachments/assets/dd6d5ca2-a1f2-47f3-895a-cac14851f808" />






