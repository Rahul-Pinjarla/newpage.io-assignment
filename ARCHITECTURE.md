# SENTINEL — Architecture Notes

This document covers the architectural considerations raised in the brief:
offline-first operation, configurable rules, FCA record-keeping, and multi-branch scale.
The prototype is a static front-end; these notes describe how a production system would be designed.

---

## Offline-first with eventual sync

**The problem:** Branch connectivity is unreliable. An RM at a branch desk cannot
wait for a round-trip to a central server before completing an onboarding assessment.

**The approach: local-first, sync-on-connection.**

Each branch client runs a local data store (IndexedDB in a browser context, or a
native SQLite database in a desktop/tablet app). Every assessment written locally
gets a UUID, a branch identifier, and a `synced: false` flag. A background sync
worker detects connectivity and pushes unsynced records to the central API in
insertion order, marking them `synced: true` on acknowledgement.

```
Branch device                Central API
  ┌──────────┐                ┌──────────────┐
  │ IndexedDB│──(offline)──►  │  (queued)    │
  │  local   │                │              │
  │  store   │──(online) ──►  │  PostgreSQL  │
  └──────────┘   PATCH /sync  └──────────────┘
```

**Conflict resolution:** Central records are append-only (no update to an assessment
once submitted). If the same `client_id` arrives from two branches (a rarer case
for new clients), the conflict surfaces as a compliance finding rather than a silent
overwrite — a human decides which record is authoritative.

**In the prototype:** `localStorage` plays the role of the local store. New
assessments survive page reload and would survive offline use if this were a PWA.

---

## Configurable rules engine

**The problem:** The FCA updates sanctions lists, PEP definitions, and risk thresholds
through regulatory guidance. A code deployment to update a jurisdiction list is
operationally unacceptable — it requires a release cycle, regression testing, and
change approval at a regulated firm.

**The approach: rules as data, not code.**

The prototype already demonstrates the pattern: `src/rules/sentinelRules.ts` is a
typed configuration object. The risk engine (`riskEngine.ts`) imports constants from
it — zero hardcoded values in the evaluation logic.

In production, these constants would live in a database table and be served by a
`/api/rules` endpoint with versioning:

```
GET /api/rules/current
{
  "version": "2025-Q2",
  "effective_from": "2025-04-01",
  "high_risk_jurisdictions": ["Russia", "Belarus", "Venezuela", "Myanmar"],
  "medium_risk_jurisdictions": [...],
  "income_threshold": 500000,
  ...
}
```

The client fetches the current rules on startup and caches them locally. When rules
change, compliance pushes a new version; clients pick it up on next launch without
a code deployment. The evaluation log stores `rules_version` alongside each
assessment so the auditor can reconstruct which ruleset was in effect at the time.

**Who can change rules:** A compliance admin UI with role-based access. Rule changes
are themselves audit events — who changed what, when, and with what justification.

---

## FCA record-keeping compliance

The FCA's SYSC sourcebook requires that records are **attributable**, **contemporaneous**,
and **accurate**. A missing field or a risk classification that contradicts the recorded
data is a regulatory finding, not just a data quality issue.

**Data model requirements:**

```sql
CREATE TABLE onboarding_assessments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     TEXT NOT NULL,
  branch_id     TEXT NOT NULL REFERENCES branches(id),
  submitted_by  UUID NOT NULL REFERENCES users(id),   -- attributable
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),   -- contemporaneous
  rules_version TEXT NOT NULL,                        -- which ruleset applied
  payload       JSONB NOT NULL,                       -- all fields at submission time
  computed_risk TEXT NOT NULL CHECK (computed_risk IN ('HIGH','MEDIUM','LOW')),
  stored_risk   TEXT NOT NULL CHECK (stored_risk IN ('HIGH','MEDIUM','LOW')),
  findings      TEXT[] NOT NULL DEFAULT '{}',         -- computed at write time
  signature     TEXT,                                 -- HMAC for tamper detection
  synced        BOOLEAN NOT NULL DEFAULT FALSE
);
```

Key properties:
- Records are **immutable** after submission. Corrections create a new record with a
  `supersedes` foreign key to the original — the audit trail is never rewritten.
- The `payload` column stores the complete snapshot of all fields at submission time,
  not references to mutable tables. An auditor in 2028 can see exactly what data was
  recorded in 2024.
- `findings` are computed at write time and stored — they reflect the rules in effect
  at submission, not today's rules. This is the correct compliance posture.
- `signature` allows tamper detection: an HMAC of the payload fields lets the auditor
  verify no one silently edited a record after the fact.

**Access controls:**
- RMs can create records for their branch; cannot modify or delete.
- Compliance officers can view all records; can add annotations but not modify payload.
- Auditors get read-only access to the full audit view including findings.
- Admin role needed to change rules configuration (itself audited).

---

## Multi-branch scale

**Today: 4 branches. Next year: 15.**

The prototype's data model already handles this — `branch` is a first-class field on
every record. The architectural changes are operational, not structural:

**What stays the same:**
- The rules engine is branch-agnostic by design; all branches run the same regulatory
  criteria (they operate under the same FCA licence).
- The data model scales horizontally; adding a branch is an INSERT, not a migration.
- The audit view already filters by branch; adding 11 more branches is a UI filter
  addition.

**What changes:**
- **Sync throughput:** 15 branches submitting concurrently. The sync API needs
  idempotent PATCH endpoints (same assessment submitted twice = no duplicate).
  A message queue (SQS/Pub/Sub) ahead of the database absorbs burst traffic from
  multiple branches coming online simultaneously.
- **Branch-level RMs and access:** Each branch has its own RM roster. This means
  a join table (`branch_users`) rather than a flat string field. RMs should only
  see their branch's records in the default view; compliance sees all.
- **Analytics latency:** The KPI dashboard currently computes from all records
  in memory. At 15 branches × N clients per week, a materialized view or a
  pre-aggregated summary table (refreshed nightly) becomes necessary to keep the
  dashboard fast.
- **Offline store capacity:** 15 branches × tablet devices per branch = more
  devices that need the rules config pushed to them when regulations change.
  A service worker / push notification channel ensures compliance doesn't need
  to chase each branch manually.

---

## Technology choices for production

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React + TypeScript | Matches prototype; type safety for compliance-critical fields |
| Local store | IndexedDB (via Dexie) | Structured, queryable, survives offline; replaces localStorage |
| Sync | REST + idempotent PATCH | Simple, auditable; upgrade to event sourcing when audit demands it |
| Backend | Node/TypeScript or Go | TypeScript shares types with frontend; Go for throughput at scale |
| Database | PostgreSQL | JSONB for payload snapshots; strong audit trail via triggers |
| Rules API | PostgreSQL + CDN cache | Rules change rarely; cached aggressively, versioned |
| Auth | OAuth2 + JWT with branch claims | FCA requires named users on every record |
| Infra | Cloud-agnostic containers | Azure (FCA data residency in UK) |
