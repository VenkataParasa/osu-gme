import test from "node:test";
import assert from "node:assert/strict";
import { data, latestDuty } from "../src/data/repository";
import {
  applicantRows,
  recruitmentSummary,
  cohortSummary,
  recruitmentTrend,
  deadlineState,
  apeRows,
} from "../src/data/extension-selectors";
import {
  MockNRMPProvider,
  MockNewInnovationsProvider,
} from "../src/data/integration-providers";
import {
  extensionState,
  saveAction,
  saveReviewStatus,
  addFollowUp,
  uploadAPE,
  uploadReviewDocument,
} from "../src/data/extension-store";
import type { ReviewAction } from "../src/data/types";

test("recruitment distinguishes program applications, unknown results and participating students", () => {
  assert.equal(recruitmentSummary("USR-004", { year: "2027" }).total, 6);
  assert.equal(recruitmentSummary("USR-004", { year: "2027" }).matched, 1);
  assert.equal(
    recruitmentSummary("USR-004", { year: "2027", program: "PRG-002" }).matched,
    null,
  );
  assert.equal(
    recruitmentSummary("USR-004", { year: "2027", degree: "DO" }).programs[0]
      .fillRate,
    null,
  );
  assert.deepEqual(cohortSummary(2027), {
    participating: 4,
    matched: 1,
    rate: 0.25,
  });
  assert.equal(cohortSummary(2030).rate, null);
  assert.equal(
    applicantRows("USR-006", { year: "2026" }).every(
      (a) => a.programId === "PRG-001",
    ),
    true,
  );
  assert.deepEqual(
    recruitmentTrend("USR-004", { from: "2025", to: "2026" }).map(
      (r) => r.year,
    ),
    [2025, 2026],
  );
  assert.equal(recruitmentSummary("USR-004", { year: "2026" }).total, 182);
});
test("deadline logic uses completion and calendar boundaries, not stale source labels", () => {
  const base = {
    status: "Open",
    completed_date: null,
    due_date: "2026-09-23",
  } as ReviewAction;
  const now = new Date(2026, 8, 24, 22);
  assert.equal(deadlineState(base, now), "Overdue");
  assert.equal(
    deadlineState({ ...base, due_date: "2026-09-24" }, now),
    "Due Soon",
  );
  assert.equal(
    deadlineState({ ...base, due_date: "2026-10-01" }, now),
    "Due Soon",
  );
  assert.equal(
    deadlineState({ ...base, due_date: "2026-10-02", status: "Overdue" }, now),
    "Upcoming",
  );
  assert.equal(
    deadlineState({ ...base, status: "Complete" }, now),
    "Completed",
  );
});
test("review changes retain history and enforce scope; APE uploads update shared records", () => {
  assert.throws(
    () => saveReviewStatus("SRV-001", "Closed", "Not authorized", "USR-006"),
    /cannot edit/,
  );
  assert.throws(
    () => saveReviewStatus("SRV-001", "Closed", "Read only", "USR-001"),
    /cannot edit/,
  );
  const before = extensionState.activities.length;
  saveReviewStatus("SRV-001", "Closed", "Review completed", "USR-004");
  saveReviewStatus("SRV-001", "In Progress", "Reopened with note", "USR-004");
  assert.equal(data.SPECIAL_REVIEW[0].closed_date, null);
  assert.equal(extensionState.activities.length, before + 2);
  assert.equal(extensionState.activities.at(-1)?.previousStatus, "Closed");
  saveAction(
    "SRV-001",
    {
      title: "Unit test follow-up",
      due_date: "2026-10-20",
      assigned_to: "USR-004",
      status: "Open",
    },
    "USR-004",
  );
  const action = data.ACTION_ITEM.at(-1)!;
  saveAction(
    "SRV-001",
    { ...action, status: "Complete" },
    "USR-004",
    action.action_item_id,
  );
  assert.ok(action.completed_date);
  addFollowUp(
    "SRV-001",
    "2026-09-24",
    "Meeting scheduled for next week",
    "USR-004",
  );
  assert.equal(
    data.FOLLOWUP_ACTIVITY.at(-1)?.description,
    "Meeting scheduled for next week",
  );
  const file = new File(["demo content"], "evaluation.pdf", {
    type: "application/pdf",
  });
  assert.throws(
    () => uploadAPE("PRG-007", "2025-26", file, "supporting", "", "USR-004"),
    /first/,
  );
  assert.throws(
    () =>
      uploadAPE(
        "PRG-007",
        "2025-26",
        new File(["x"], "bad.exe"),
        "primary",
        "",
        "USR-004",
      ),
    /Choose/,
  );
  uploadAPE(
    "PRG-007",
    "2025-26",
    file,
    "primary",
    "Submitted in demo",
    "USR-004",
  );
  uploadAPE("PRG-007", "2025-26", file, "supporting", "", "USR-004");
  const row = apeRows("USR-004", "2025-26", "PRG-007")[0];
  assert.equal(row.submitted, true);
  assert.equal(row.record?.status, "Submitted");
  assert.equal(row.docs.filter((d) => d.source === "MANUAL_UPLOAD").length, 2);
  uploadReviewDocument("SRV-001", file, "Action plan", "USR-004");
  assert.equal(data.DOCUMENT.at(-1)?.entity_id, "SRV-001");
});
test("deterministic sync updates downstream metrics, validates bad rows, is idempotent and preserves failed-run history", async () => {
  const provider = new MockNRMPProvider();
  await assert.rejects(() => provider.sync("USR-006"), /Institutional/);
  const result = await provider.sync("USR-004");
  assert.deepEqual(
    [
      result.recordsReceived,
      result.recordsCreated,
      result.recordsUpdated,
      result.recordsSkipped,
    ],
    [8, 3, 3, 2],
  );
  assert.equal(result.warnings.length, 2);
  assert.equal(result.status, "Completed with warnings");
  assert.equal(recruitmentSummary("USR-004", { year: "2027" }).total, 7);
  assert.equal(recruitmentSummary("USR-004", { year: "2027" }).matched, 4);
  assert.equal(cohortSummary(2027).rate, 0.5);
  assert.equal(
    data.MATCH_OUTCOME.some((m) => m.match_id === "DEMO-BAD"),
    false,
  );
  const snapshot = JSON.stringify([data.APPLICANT, data.MATCH_OUTCOME]);
  const repeat = await provider.sync("USR-004");
  assert.equal(repeat.recordsCreated + repeat.recordsUpdated, 0);
  assert.equal(repeat.recordsSkipped, 8);
  const failure = await provider.sync("USR-004", "failure");
  assert.equal(failure.status, "Failed");
  assert.equal(provider.getSyncHistory().length, 3);
  assert.equal(JSON.stringify([data.APPLICANT, data.MATCH_OUTCOME]), snapshot);
  assert.equal(provider.getStatus().lastSuccessful?.id, repeat.id);
  const ni = new MockNewInnovationsProvider();
  const resultNI = await ni.sync("USR-004");
  assert.equal(resultNI.recordsUpdated, 1);
  assert.equal(latestDuty("PRG-004")?.compliance_rate, 0.974);
  assert.ok(
    extensionState.lineage.some((l) => l.sourceSystem === "NEW_INNOVATIONS"),
  );
});
