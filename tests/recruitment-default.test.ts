import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { data } from "../src/data/repository";

Object.assign(data, JSON.parse(readFileSync(
  new URL("../public/data/gme-demo-v2.json", import.meta.url), "utf8",
)));
const { defaultRecruitmentYear, recruitmentSummary } = await import(
  "../src/data/extension-selectors"
);

test("recruitment opens on a completed cycle with ranks and outcomes", () => {
  const year = defaultRecruitmentYear("USR-004");
  assert.equal(year, 2026);
  const summary = recruitmentSummary("USR-004", { year: String(year) });
  assert.equal(summary.total, 853);
  assert.equal(summary.ranked, 752);
  assert.equal(summary.matched, 179);
  assert.ok(summary.programs.every((p) => p.ranked > 0 && p.matched !== null));
});

test("explicit open-cycle selection retains pending data", () => {
  const summary = recruitmentSummary("USR-004", { year: "2027" });
  assert.equal(summary.total, 540);
  assert.equal(summary.ranked, 0);
  assert.equal(summary.matched, null);
});

test("default year respects program scope and falls back when no completed cycle exists", () => {
  const cycles = data.RECRUITMENT_CYCLE;
  try {
    data.RECRUITMENT_CYCLE = cycles.filter(
      (c) => c.program_id !== "PRG-001" || c.application_year !== 2026,
    );
    assert.equal(defaultRecruitmentYear("USR-004"), 2026);
    assert.equal(defaultRecruitmentYear("USR-006"), 2025);
    assert.equal(defaultRecruitmentYear("USR-004", "PRG-001"), 2025);
    data.RECRUITMENT_CYCLE = cycles.filter((c) => c.application_year === 2027);
    assert.equal(defaultRecruitmentYear("USR-006"), 2027);
  } finally {
    data.RECRUITMENT_CYCLE = cycles;
  }
});
