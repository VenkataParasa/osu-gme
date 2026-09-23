import test from "node:test";
import assert from "node:assert/strict";
import {
  data,
  summary,
  allowedPrograms,
  filterConcerns,
  boardTrend,
  latestDuty,
  updateConcern,
  csvFor,
  academicYear,
  canEdit,
} from "../src/data/repository";
test("source metrics and concern states retain their supplied meaning", () => {
  assert.equal(data.PROGRAM.length, 10);
  assert.deepEqual(summary(data.CONCERN_RECORD), {
    total: 14,
    reviewable: 4,
    nonReviewable: 10,
    open: 8,
    closed: 5,
    escalated: 1,
  });
  assert.equal(boardTrend("PRG-004").at(-1)?.three_year_pass_rate, 0.75);
  assert.equal(boardTrend("PRG-010").length, 0);
  assert.equal(latestDuty("PRG-004")?.compliance_rate, 0.92);
  assert.equal(latestDuty("PRG-004", "2025-26")?.academic_period, "2025-26 Q4");
});
test("program scope applies to filters and edit authorization", () => {
  const scope = allowedPrograms("USR-006");
  assert.deepEqual(
    scope.map((p) => p.program_id),
    ["PRG-001"],
  );
  assert.equal(filterConcerns(data.CONCERN_RECORD, {}, scope).length, 2);
  assert.equal(
    filterConcerns(data.CONCERN_RECORD, { program: "PRG-004" }, scope).length,
    0,
  );
  assert.equal(canEdit("USR-001", "PRG-001"), false);
  assert.throws(() =>
    updateConcern(
      data.CONCERN_RECORD[7],
      { classification: "Reviewable", status: "Closed", note: "Closed" },
      "USR-006",
    ),
  );
});
test("classification and status changes append history and retain original seed", () => {
  const original = data.CONCERN_RECORD[1];
  const result = updateConcern(
    original,
    {
      classification: "Reviewable",
      status: "Closed",
      note: "Documented update",
    },
    "USR-004",
    "2026-09-23T12:00:00Z",
  );
  assert.equal(result.record.closed_date, "2026-09-23");
  assert.equal(result.record.classification, "Reviewable");
  assert.equal(original.classification, "Non-Reviewable");
  assert.equal(result.updates.length, 2);
  assert.equal(result.updates[0].previous_classification, "Non-Reviewable");
  assert.match(result.updates[1].note, /Open – Monitoring → Closed/);
  const reopened = updateConcern(
    result.record,
    {
      classification: "Reviewable",
      status: "Open – Monitoring",
      note: "Reopened for follow-up",
    },
    "USR-004",
  );
  assert.equal(reopened.record.closed_date, null);
  const changed = data.CONCERN_RECORD.map((c) =>
    c.concern_id === original.concern_id ? result.record : c,
  );
  assert.equal(summary(changed).reviewable, 5);
  assert.equal(summary(changed).closed, 6);
});
test("academic-year filtering uses July boundary and CSV quotes embedded text", () => {
  assert.equal(academicYear("2026-06-30"), "2025-26");
  assert.equal(academicYear("2026-07-01"), "2026-27");
  const csv = csvFor([
    { ...data.CONCERN_RECORD[0], summary: 'a "quoted", summary' },
  ]);
  assert.ok(csv.includes('"a ""quoted"", summary"'));
  assert.ok(csv.includes("Family Medicine Residency"));
});
