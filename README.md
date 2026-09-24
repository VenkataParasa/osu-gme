# GME Central — Resident & Program Data Management

A React + TypeScript application implementing program performance and resident concerns (Module 1), Recruitment & Match (Module 2), and Accreditation & Reviews (Module 3). The application is the root page at **`/`**. The original landing page is preserved at **`/app/`**.

See [the extension guide](EXTENSION_GUIDE.md) for new routes, files, schema details, metric definitions, explicit demo assumptions, simulated NRMP/New Innovations behavior, verification commands and the stakeholder walkthrough. New screens are available from Recruitment & Match, Accreditation & Reviews, Reports and Integrations in the sidebar.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:5173/ . `npm run build` creates the landing page and application in `dist/`; `npm run preview` serves that build. Hosting serves the application from `/index.html` and the original landing page from `/app/index.html`. Hash routes work without server rewrites.

## Screens

- `/#overview`: derived summary cards, program attention, selected-program board trends, concern distribution, and actual concern activity.
- `/#programs`: program, academic-year, monitoring and Special Review filters.
- `/#programs/PRG-004`: board trends, compliance history, monitoring, review documents and associated concerns.
- `/#concerns`: search, program/year/classification/status filters and concern creation.
- `/#concerns/CON-0008`: concern metadata, append-only displayed history, supporting-document metadata and record updates.
- `/#reports`: institutional or assigned-program concern summaries, linked chart filters, detailed records, CSV export and browser print/PDF.

Filters live in URL hash query parameters. Concern edits are shared across all screens for the current browser session and reset on refresh.

## Source data and requirement mapping

`src/data/sample-data.json` is an unchanged copy of the supplied JSON. Recruitment, review actions, follow-ups and APE entities now power Modules 2 and 3; isolated supplements live in `src/data/demo-fixtures.ts`.

| Requirement | Source |
| --- | --- |
| Programs and monitoring | `PROGRAM.program_id`, `name`, `type`, `accreditation_status`, `accreditation_since`, `updated_at` |
| Board trends | `BOARD_PASS_METRIC.reporting_year`, `pass_rate`, `three_year_pass_rate`, `eligible_count`, `passed_count`, board/source metadata |
| Imported duty-hour results | `DUTY_HOUR_COMPLIANCE.academic_period`, `compliance_status`, `compliance_rate`, `source_system`, `imported_at` |
| Special Review visibility | `SPECIAL_REVIEW` status, initiation/closure dates, reasons and summary; related `DOCUMENT` records |
| Resident concerns | `CONCERN_RECORD` joined to `RESIDENT` and `PROGRAM` by IDs |
| Preserved classification history | `CONCERN_UPDATE.previous_classification`, `new_classification`, `update_type`, `note`, `updated_at`, `updated_by` |
| Document metadata | `DOCUMENT.entity_type`, `entity_id`, file name, size, description and upload date |
| Demo scope | `USER`, `ROLE`, `USER_ROLE`, `USER_PROGRAM_ACCESS` |
| Reporting | Derived counts from currently filtered concern records; no synthetic metrics |

`src/data/types.ts` models actual source fields. `src/data/repository.ts` isolates joins, filters, aggregations, authorization simulation, exports and updates. `src/components/shared.tsx` contains shared presentation and charts; `src/App.tsx` composes the screens; `src/styles.css` provides responsive styling.

## Source gaps and explicit demo choices

- The repository initially contained only a static landing page, so the application is a new Vite/React entry alongside it, rather than a replacement.
- The current scope adds recruitment and flexible accreditation record management as described in the extension guide. Performance metrics remain imported program-level results; no resident-level board/violation calculations or production APIs are invented.
- Gastroenterology has no board metrics. The UI shows an empty state instead of a zero rate.
- Monitoring is derived only from the explicit `Heightened Monitoring` text in the accreditation status; remaining programs are labelled Standard. No risk thresholds are invented. Attention uses this status, active reviews and the supplied non-Compliant/Watch result labels.
- Board charts show the latest three calendar reporting years, both annual and supplied rolling rates. Academic-year filters affect duty compliance; current monitoring/reviews and latest board metrics are explicitly labelled. Rates are not averaged across programs.
- There are no duty-hour denominators, so no institutional compliance percentage is calculated.
- Concern academic years are derived from date identified using July–June. There is no concern category/type field, so none is invented.
- Open counts only statuses beginning Open; Escalated is reported separately. Counts represent records, not unique residents. CON-0007 and CON-0008 refer to the same resident and are kept distinct and linked in the detail view.
- CON-0007 remains Non-Reviewable in the source record despite a classification-change entry referring to CON-0008. Both source values are preserved rather than reconciled silently.
- Some supplied concern updates occur after the dataset generation date or parent record's last-updated timestamp. Original timestamps are displayed unchanged. User edits use the actual current time.
- Document files are not provided. Metadata is displayed without fake download links.
- The default demo identity is USR-004 (GME Administrator). Leadership is read-only; program roles follow supplied Edit grants. This is UI scope simulation, not authentication or server security.
- New concerns use a clearly marked CON-DEMO identifier and the existing Open – Monitoring status. Updates require a note and preserve the original values in appended history entries. Closing sets `closed_date`; reopening clears it. Refresh restores the original JSON.
- CSV is functional (including spreadsheet formula neutralization). PDF uses browser printing. There is no Excel library or pretend Excel export; CSV can be opened in Excel.
- Google Fonts are optional; local system fonts are used when unavailable.

## Demo walkthrough

1. Open `/` and inspect the attention banner and program metrics.
2. Open General Surgery and review its three-year board trend, imported compliance and active Special Review.
3. Open Resident Concerns and filter to Reviewable.
4. Open a concern, read its history, enter a note and change its classification or status.
5. Open Reports to see updated counts; filter a chart or program and export CSV.
6. Switch to a Program Director to demonstrate assigned-program scope, then Institutional Leadership to demonstrate read-only access.

## Validation

`npm test` verifies supplied metrics, July academic-year boundaries, role scope, classification/status history, reopening, live aggregation, and CSV escaping. `npm run build` runs TypeScript validation and produces a production build.

With the dev server running, `npm run test:browser` runs the verified end-to-end journey using installed Google Chrome. It checks program drill-down, concern filtering, classification history, updated report counts, CSV download, role scope, read-only access, creation, mobile navigation, mobile search and horizontal overflow. Desktop and mobile screenshots are written to `/tmp/gme-desktop.png` and `/tmp/gme-mobile.png`.

Additional extension checks run with `npm run test:extensions` while the dev server is running. The copied JSON and landing page retain their original contents.
