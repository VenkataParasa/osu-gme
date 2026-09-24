# GME Central: Recruitment, Accreditation and Integrations

This extension implements Modules 2 and 3 inside the existing React/TypeScript application. Module 1, the existing peach/orange theme, shared OSU branding and the static `/app/` landing page are retained. The application remains at `/`.

## Files and architecture

Added:

- `src/components/Recruitment.tsx`: recruitment overview, applicant rankings, outcomes, program drill-down, historical analytics and institutional report.
- `src/components/Accreditation.tsx`: Special Review register/detail, action/status/document/follow-up forms, APE register/detail and reports.
- `src/components/Integrations.tsx`: simulated providers, progress, run history, results, errors and lineage.
- `src/components/module-shared.tsx`: shared filters, tables, stats, tabs, CSV/print controls, upload form and activity timeline.
- `src/data/demo-fixtures.ts`: isolated supplemental capacities, fictional 2027 applications/outcomes, separate participating-student cohorts and deterministic sync payloads.
- `src/data/extension-store.ts`: shared session state, subscriptions, authorized mutations, document validation and append-only activity entries.
- `src/data/extension-selectors.ts`: role-scoped joins, recruitment metrics, trends, demographic groups, deadline states and APE/review selectors.
- `src/data/integration-providers.ts`: replaceable `RecruitmentDataProvider`, `JsonRecruitmentProvider`, `IntegrationProvider`, `MockNRMPProvider`, `NewInnovationsProvider`, `MockNewInnovationsProvider`.
- `src/modules.css`: responsive styles using the existing shell and palette.
- `tests/extensions.test.ts`, `tests/extensions-check.mjs`: domain and browser acceptance checks.
- `EXTENSION_GUIDE.md`: implementation details and demo instructions.

Modified for this extension: `src/App.tsx` (navigation/routes, program links, shared document state, reactive updates), `src/data/repository.ts` (clone the source dataset before session mutations), `src/data/types.ts` (type previously unused source tables and supplemental session records), `src/main.tsx` (stylesheet import), `package.json` (extension browser command), `README.md` (current scope and guide link).

Existing uncommitted changes in other files predate this extension. The supplied `src/data/sample-data.json` is unchanged. Programs and residents remain the original entities; all new features reference their stable IDs.

## Routes

| URL hash after `/` | Screen |
| --- | --- |
| `#recruitment` | Recruitment & Match overview |
| `#recruitment/applicants` | Applicants & Rankings |
| `#recruitment/outcomes` | Match Outcomes |
| `#recruitment/history` | Historical Analytics |
| `#recruitment/program/PRG-001` | Family Medicine recruitment detail |
| `#reviews` | Special Reviews |
| `#reviews/SRV-001` | General Surgery review management |
| `#ape` | Annual Program Evaluations |
| `#ape/PRG-007?year=2025-26` | Neurology evaluation and uploads |
| `#reports/recruitment` | Recruitment report |
| `#reports/reviews` | Special Review report |
| `#reports/ape` | APE report |
| `#integrations` | Integration Center |

Existing overview, program, concern and concern-report routes remain available. Hash query parameters retain filters without server rewrites. Program detail links connect recruitment, reviews and APEs to Module 1.

## Source schema and supplements

The implementation activates `RECRUITMENT_CYCLE`, `APPLICANT`, `MATCH_OUTCOME`, `ACTION_ITEM`, `FOLLOWUP_ACTIVITY` and `APE` from the original JSON. Ranking remains `APPLICANT.rank_position`; it is not duplicated into a second rank table. DO/MD/FMG and hometown city/state are used as recorded. Source Match statuses remain `Matched` and `Not Matched to Program`; absent results display `Not recorded`.

Separate typed fixtures supply annual intake capacities because `PROGRAM.slot_count` is the entire program complement. They also supply a small 2027 future-cycle scenario, since the source includes 2027 cycles but no applicants for that year. These values are explicitly labelled demo data in the UI.

OSU participating students use a distinct fictional cohort with a year, stable student ID and outcome. These records are never inferred from `APPLICANT.is_osu_student`, medical school or program application counts. Complete demo cohorts contain 4, 5, 6 and 4 participants for 2024–2027 respectively. Their pre-sync matched counts are 3, 4, 5 and 1. This demonstrates the calculation; it does not claim actual institutional rates.

Session-only records include activity entries, sync runs and imported-record lineage. Actions support optional description, notes and creation timestamp; follow-up supports an optional free-text activity type. These fields are populated only when entered during the demo, with no backfilled source history.

## Recruitment metrics and reports

- Applicant and ranked counts come from scoped program/cycle joins; ranked means a recorded rank position.
- Recorded matches count only `Matched` outcomes associated with the applicant's program.
- Program tables show annual demo positions, recorded matches, remaining positions and recorded fill rate. Fill rate is matched/positions, not an average of rates. Values may be partial where outcomes are missing; absent outcomes produce `Not recorded`, not zero.
- Degree/outcome/search subsets suppress fill and unfilled values because the subset cannot represent whole-program capacity.
- OSU student Match rate is matched participants / all participants in the distinct demo cohort. Missing or pending cohorts suppress the rate. Program/type/outcome filters do not alter this institution-wide population; year filters do.
- Matched demographics use supplied DO/MD/FMG, hometown state and city. No nationality, rurality or inferred location is added.
- Historical charts and exact-value tables cover ranked and matched applicants, DO/MD/FMG composition, and the separate OSU student cohort. Year-range filters apply to all history sections.
- Reports provide program summaries, composition detail, historical values and student cohort summaries. Each relevant section has functional CSV export; browser Print/PDF uses the browser print dialog. CSV escaping protects against spreadsheet formula interpretation. No Excel dependency or fake binary export was added.

## Special Reviews

The institutional register filters by program, initiation academic year, current status and deadline state. It shows active reviews, programs under review, open actions, upcoming and overdue actions, next deadline and latest session update.

Review detail supports action creation/editing/completion, owner, deadline, description, notes and completion date. Status updates require a note and preserve old/new status in a chronological activity timeline. Closing sets a closure date; reopening clears it. Institutional follow-ups retain date, description, staff identity and optional activity type. Supporting uploads reuse the shared document component and retain metadata.

Overdue means an unfinished action with a deadline before the current local calendar date. Completed items never count as overdue. Due Soon means today through seven days ahead, a documented demo display policy rather than an institutional SLA. Missing source update timestamps and historical status events are not fabricated. Review statuses remain the existing `In Progress` and `Closed` values; there are no approval gates or accreditation decisions.

## Annual Program Evaluations

The register shows every scoped program for the selected academic year, including absent records. Filters cover program/year/status; summary and CSV reflect the same selection. Primary and supporting document counts are separated using existing document descriptions.

Program detail accepts a primary evaluation and subsequent supporting uploads, plus notes. A primary upload creates or updates the program/year record to Submitted and records the submitting user/date. Supporting uploads preserve the primary record and existing files. The report updates immediately. Missing evaluations are not called late: the source supplies no universal deadline.

Upload validation accepts nonempty PDF, DOC, DOCX, PNG or JPG up to 10 MB. Only metadata is retained in memory: name, type, size, source, user, timestamp and linked entity. No file bytes are persisted or offered as fake downloads.

## Simulated integrations

Both providers run entirely locally and are visibly labelled simulated. Institutional Leadership and GME Administrator can run the demo connectors. Program roles cannot invoke sync or view institutional integration history. Leadership remains read-only for review/APE content edits.

NRMP normal scenario:

1. Displays connection, receipt, validation, processing and analytics progress over roughly one second.
2. Processes eight fixture records: two applicants, five outcome rows and one separate cohort update.
3. First run creates three records, updates three, skips two invalid rows and reports warnings for an unknown program and duplicate outcome ID.
4. The 2027 applicant count changes from 6 to 7; recorded program matches change from 1 to 4; the distinct student cohort changes from 1/4 (25%) to 2/4 (50%). Applicant rankings and demographics refresh from the same shared data.
5. Repeating the payload creates/updates nothing and skips all eight rows. Failed-source simulation changes no domain data, retains a Failed run with an error, and preserves the last successful timestamp.

New Innovations imports one prepared General Surgery duty-hour result: compliance becomes 97.4%, status Compliant. Module 1 immediately displays this imported result. No shifts, violations or local compliance formula are introduced. Repeating the payload skips the unchanged record.

The center retains attempted/completed timestamps, result status, reporting year, created/updated/skipped/received counts, duration, affected programs, warning/error details and record-level lineage linked to a run. These are session runs, not invented historical API activity. Original import metadata remains in the source data.

## Assumptions and deliberate boundaries

- All new mutations, run history and uploads last until page refresh; refresh restores source plus initial fixtures. There is no backend or localStorage persistence.
- Latest recruitment year defaults to the latest supplied cycle, 2027. That future scenario is explicitly labelled, not presented as real completed Match activity.
- Capacities and participating-student cohorts are supplemental demo assumptions, not recovered institutional facts.
- Existing mock program access applies to all new selectors and mutation guards. This is not production authentication or server authorization.
- The provider interface can be replaced by a future validated file or service adapter. A general-purpose recruitment spreadsheet importer is not implemented; the existing JSON and deterministic incoming payload demonstrate the ingestion boundary. Manual file uploads currently cover review and APE document metadata.
- Production NRMP/New Innovations protocols, credentials, OAuth, webhooks and endpoints remain undefined. No external sync requests occur.
- No ACGME/ERAS APIs, approval workflows, notification engine, production SSO, applicant/resident portal or unrelated modules were added.

## Run and verify

```sh
npm install
npm run dev
```

Open `http://localhost:5173/`. Keep the server running for browser checks. In another terminal:

```sh
npm test
npm run build
npm run test:browser
npm run test:extensions
```

Browser scripts use locally installed Google Chrome via Playwright and port 5173. Build output is `dist/`; `npm run preview` serves the production build at the URL Vite prints. Vite reports a non-blocking large-chunk warning for the bundled demo dataset/application.

Domain checks cover original Module 1 behavior, population isolation, unknown versus zero results, role scope, date boundaries, review history, upload validation, shared APE state, successful/repeated/failed syncs and Module 1 compliance refresh. Browser checks exercise actual forms, downloads, navigation, scope and mobile overflow. Screenshots are written to `/tmp/gme-recruitment-history.png`, `/tmp/gme-review-management.png`, `/tmp/gme-integrations.png` and `/tmp/gme-extensions-mobile.png`.

Verified for this implementation: all nine domain tests pass; production build passes; both the existing Module 1 browser journey and extension browser journey pass, with no captured browser runtime errors. Mobile checks cover all new principal screens at 390 px. A Chrome startup timeout on one regression attempt was resolved by retrying; the successful retry ran the full journey. SHA-256 comparison confirms `sample-data.json` is byte-for-byte identical to the supplied download. The landing page has no changes.

## Stakeholder walkthrough

1. Start at Overview as GME Administrator, open General Surgery, then use its recruitment/review/APE links.
2. Open Recruitment & Match for 2027. Explain the future-cycle demo label and the separate student population. Note six applicants and one recorded match.
3. Open Family Medicine, inspect ranks and toggle rank sorting. Open Match Outcomes and select 2026 to inspect DO/MD/FMG and hometown distributions from the source JSON.
4. Open Historical Analytics; compare 2024–2026, inspect composition and student trends, then export the report sections.
5. Open Integrations and explain that NRMP is simulated. Run NRMP, inspect counts/warnings/history and return to 2027 recruitment: seven applicants, four matches, and student rate 50%. Repeat to demonstrate idempotency or select Source Failure to demonstrate errors.
6. Open Accreditation & Reviews → SRV-001. Add/edit/complete an action, add a status note and an institutional follow-up, then upload a review PDF. Inspect preserved activity history.
7. Open Annual Program Evaluations → Neurology → 2025-26. Upload a primary evaluation and a supporting document; open the APE report to confirm Submitted and document counts.
8. Run New Innovations simulation. Return to General Surgery performance to see the received 97.4% compliance result. Inspect sync lineage.
9. Switch to Program Director to demonstrate assigned-program scope, then Leadership to demonstrate read-only management forms. Refresh to reset the demo.
