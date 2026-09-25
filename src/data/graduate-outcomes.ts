import { data, allowedPrograms, canEdit, programName } from "./repository";
import { collegeIdForProgram, getProgramsByCollege } from "./colleges";
import { extensionState, addActivity, notifyDataChanged, today } from "./extension-store";
import { graduateUpdates, saveGraduateOutcome as saveGraduateOutcomeEdit } from "./v2-reporting";
import type { Resident } from "./types";

export type GraduateOutcomeRecord = (typeof data)["GRADUATE_OUTCOME"][number];
export const saveGraduateOutcome = saveGraduateOutcomeEdit;
export { graduateUpdates };

export const UNKNOWN_OUTCOME = "Unknown / Not Reported";

export const OUTCOME_CATEGORIES = () =>
  [...new Set(data.GRADUATE_OUTCOME.map((g) => g.outcome_type))].sort();

export interface GraduateOutcomeFilters {
  year?: string;
  program?: string;
  college?: string;
  category?: string;
  specialty?: string;
  state?: string;
  known?: "known" | "unknown" | "";
  search?: string;
}

export interface GraduateOutcomeRow {
  outcome: GraduateOutcomeRecord;
  resident?: Resident;
  programName: string;
  collegeId: string;
}

export function graduateOutcomeYears(userId: string): number[] {
  const scope = new Set(allowedPrograms(userId).map((p) => p.program_id));
  return [
    ...new Set(
      data.GRADUATE_OUTCOME.filter((g) => scope.has(g.program_id)).map(
        (g) => g.graduation_year,
      ),
    ),
  ].sort((a, b) => b - a);
}

export function graduateOutcomeStates(userId: string): string[] {
  const scope = new Set(allowedPrograms(userId).map((p) => p.program_id));
  return [
    ...new Set(
      data.GRADUATE_OUTCOME.filter(
        (g) => scope.has(g.program_id) && g.practice_state,
      ).map((g) => g.practice_state as string),
    ),
  ].sort();
}

export function graduateOutcomeSpecialties(userId: string): string[] {
  const scope = new Set(allowedPrograms(userId).map((p) => p.program_id));
  return [
    ...new Set(
      data.GRADUATE_OUTCOME.filter(
        (g) => scope.has(g.program_id) && g.specialty_practiced,
      ).map((g) => g.specialty_practiced as string),
    ),
  ].sort();
}

export function graduateOutcomeRows(
  userId: string,
  f: GraduateOutcomeFilters = {},
): GraduateOutcomeRow[] {
  const programs = getProgramsByCollege(userId, f.college).filter(
    (p) => !f.program || p.program_id === f.program,
  );
  const scope = new Set(programs.map((p) => p.program_id));
  const residents = new Map(data.RESIDENT.map((r) => [r.resident_id, r]));
  return data.GRADUATE_OUTCOME.filter((g) => {
    if (!scope.has(g.program_id)) return false;
    if (f.year && String(g.graduation_year) !== f.year) return false;
    if (f.category && g.outcome_type !== f.category) return false;
    if (f.specialty && g.specialty_practiced !== f.specialty) return false;
    if (f.state && g.practice_state !== f.state) return false;
    if (f.known === "known" && g.outcome_type === UNKNOWN_OUTCOME) return false;
    if (f.known === "unknown" && g.outcome_type !== UNKNOWN_OUTCOME)
      return false;
    if (f.search) {
      const resident = residents.get(g.resident_id);
      const haystack = `${resident?.full_name || ""} ${g.practice_city || ""} ${g.specialty_practiced || ""}`.toLowerCase();
      if (!haystack.includes(f.search.toLowerCase())) return false;
    }
    return true;
  }).map((outcome) => ({
    outcome,
    resident: residents.get(outcome.resident_id),
    programName: programName(outcome.program_id),
    collegeId: collegeIdForProgram(
      data.PROGRAM.find((p) => p.program_id === outcome.program_id) || {
        type: "Residency",
      },
    ),
  }));
}

function rate(numerator: number, denominator: number) {
  return denominator ? numerator / denominator : null;
}

export function graduateOutcomeSummary(rows: GraduateOutcomeRow[]) {
  const total = rows.length;
  const known = rows.filter((r) => r.outcome.outcome_type !== UNKNOWN_OUTCOME);
  const unknown = total - known.length;
  const practice = known.filter((r) =>
    r.outcome.outcome_type.startsWith("Practice"),
  );
  const practiceWithLocation = practice.filter((r) => !!r.outcome.practice_state);
  const oklahoma = practiceWithLocation.filter(
    (r) => r.outcome.practice_state === "OK",
  );
  const furtherTraining = known.filter(
    (r) =>
      r.outcome.outcome_type === "Fellowship Training" ||
      r.outcome.outcome_type === "Advanced Residency Training",
  );
  const ruralEligible = practice.filter(
    (r) => typeof r.outcome.is_rural === "boolean",
  );
  const rural = ruralEligible.filter((r) => r.outcome.is_rural === true);
  const hpsaEligible = practice.filter(
    (r) => typeof r.outcome.is_hpsa === "boolean",
  );
  const hpsa = hpsaEligible.filter((r) => r.outcome.is_hpsa === true);
  return {
    total,
    known: { numerator: known.length, denominator: total },
    unknown: { numerator: unknown, denominator: total },
    oklahoma: {
      numerator: oklahoma.length,
      denominator: practiceWithLocation.length,
      rate: rate(oklahoma.length, practiceWithLocation.length),
    },
    furtherTraining: {
      numerator: furtherTraining.length,
      denominator: known.length,
      rate: rate(furtherTraining.length, known.length),
    },
    rural: ruralEligible.length
      ? {
          numerator: rural.length,
          denominator: ruralEligible.length,
          rate: rate(rural.length, ruralEligible.length),
        }
      : null,
    hpsa: hpsaEligible.length
      ? {
          numerator: hpsa.length,
          denominator: hpsaEligible.length,
          rate: rate(hpsa.length, hpsaEligible.length),
        }
      : null,
  };
}

export function graduateOutcomeTrend(userId: string, f: GraduateOutcomeFilters = {}) {
  const years = graduateOutcomeYears(userId).sort((a, b) => a - b);
  return years.map((year) => {
    const rows = graduateOutcomeRows(userId, { ...f, year: String(year) });
    const known = rows.filter((r) => r.outcome.outcome_type !== UNKNOWN_OUTCOME);
    return {
      year,
      total: rows.length,
      known: known.length,
      unknown: rows.length - known.length,
      oklahoma: rows.filter((r) => r.outcome.outcome_type === "Practice – Oklahoma").length,
      outOfState: rows.filter((r) => r.outcome.outcome_type === "Practice – Out of State").length,
      furtherTraining: known.filter(
        (r) =>
          r.outcome.outcome_type === "Fellowship Training" ||
          r.outcome.outcome_type === "Advanced Residency Training",
      ).length,
    };
  });
}

export function graduateOutcomesByProgram(userId: string, f: GraduateOutcomeFilters = {}) {
  const rows = graduateOutcomeRows(userId, f);
  const byProgram = new Map<string, GraduateOutcomeRow[]>();
  rows.forEach((r) => {
    const list = byProgram.get(r.outcome.program_id) || [];
    list.push(r);
    byProgram.set(r.outcome.program_id, list);
  });
  return [...byProgram.entries()]
    .map(([programId, list]) => ({
      programId,
      programName: programName(programId),
      total: list.length,
      known: list.filter((r) => r.outcome.outcome_type !== UNKNOWN_OUTCOME).length,
      oklahoma: list.filter((r) => r.outcome.outcome_type === "Practice – Oklahoma").length,
    }))
    .sort((a, b) => b.total - a.total);
}

export function graduateOutcomeDataQuality(rows: GraduateOutcomeRow[]) {
  const unknown = rows.filter((r) => r.outcome.outcome_type === UNKNOWN_OUTCOME);
  const practiceRows = rows.filter((r) => r.outcome.outcome_type.startsWith("Practice"));
  const missingLocation = practiceRows.filter((r) => !r.outcome.practice_state);
  const missingSpecialty = rows.filter(
    (r) => r.outcome.outcome_type !== UNKNOWN_OUTCOME && !r.outcome.specialty_practiced,
  );
  const staleVerification = rows.filter((r) => {
    if (!r.outcome.last_verified_date) return true;
    const years = (Date.now() - new Date(r.outcome.last_verified_date).getTime()) / (365 * 86400000);
    return years > 5;
  });
  return {
    known: rows.length - unknown.length,
    unknown: unknown.length,
    missingLocation: missingLocation.length,
    missingSpecialty: missingSpecialty.length,
    needingVerification: staleVerification.length,
  };
}

/** Outcome edit/verification history for one graduate, oldest first, plus the original recorded entry. */
export function graduateOutcomeHistory(outcomeId: string) {
  const record = data.GRADUATE_OUTCOME.find((g) => g.outcome_id === outcomeId);
  const edits = graduateUpdates
    .filter((u) => u.after.outcome_id === outcomeId)
    .sort((a, b) => a.at.localeCompare(b.at));
  const entries = [
    {
      at: record?.recorded_date || "",
      label: "Outcome recorded",
      detail: record ? `${record.outcome_type} · ${record.data_source}` : "",
      userId: record?.recorded_by,
    },
    ...edits.map((e) => ({
      at: e.at,
      label: "Outcome updated",
      detail: `${e.before.outcome_type} → ${e.after.outcome_type}. ${e.note}`,
      userId: e.userId,
    })),
  ];
  return entries.sort((a, b) => a.at.localeCompare(b.at));
}

export function addGraduateOutcome(
  userId: string,
  fields: {
    residentId: string;
    programId: string;
    graduationYear: number;
    outcomeType: string;
    practiceCity?: string;
    practiceState?: string;
    specialtyPracticed?: string;
    fellowshipProgram?: string;
    dataSource: string;
    notes?: string;
  },
) {
  if (!canEdit(userId, fields.programId))
    throw new Error("Your demo role cannot edit this program.");
  const resident = data.RESIDENT.find((r) => r.resident_id === fields.residentId);
  if (!resident) throw new Error("Choose a valid resident.");
  if (resident.program_id !== fields.programId)
    throw new Error("Selected resident does not belong to this program.");
  if (data.GRADUATE_OUTCOME.some((g) => g.resident_id === fields.residentId))
    throw new Error(
      "A graduate outcome record already exists for this resident. Edit the existing record instead.",
    );
  if (!fields.graduationYear || !fields.outcomeType)
    throw new Error("Choose a graduation year and outcome category.");
  const record: GraduateOutcomeRecord = {
    outcome_id: `GRO-DEMO-${crypto.randomUUID()}`,
    resident_id: fields.residentId,
    program_id: fields.programId,
    graduation_year: fields.graduationYear,
    outcome_type: fields.outcomeType,
    practice_city: fields.practiceCity || null,
    practice_state: fields.practiceState || null,
    practice_county: null,
    is_rural: null,
    is_hpsa: null,
    is_in_state: fields.practiceState ? fields.practiceState === "OK" : null,
    is_primary_care: null,
    is_tribal_or_ihs_site: false,
    specialty_practiced: fields.specialtyPracticed || null,
    fellowship_or_training_program: fields.fellowshipProgram || null,
    data_source: fields.dataSource,
    recorded_date: today(),
    last_verified_date: today(),
    recorded_by: userId,
  } as GraduateOutcomeRecord;
  data.GRADUATE_OUTCOME.push(record);
  addActivity(
    "GRADUATE_OUTCOME",
    record.outcome_id,
    fields.programId,
    userId,
    "Graduate Outcome Added",
    `${resident.full_name} · ${fields.outcomeType}${fields.notes ? ` · ${fields.notes}` : ""}`,
  );
  notifyDataChanged();
  return record;
}

// --- Upload / bulk import (mock) ---------------------------------------
export interface OutcomeUploadPreview {
  fileName: string;
  academicYear: string;
  program: string;
  rowsReceived: number;
  matchedGraduates: number;
  validRecords: number;
  needsAttention: { row: number; issue: string }[];
  duplicates: number;
  candidateIds: string[];
}
export interface OutcomeUploadRun {
  id: string;
  at: string;
  fileName: string;
  academicYear: string;
  rowsReceived: number;
  matched: number;
  valid: number;
  attention: number;
  duplicates: number;
  imported: number;
  userId: string;
}

export function previewGraduateOutcomeUpload(
  userId: string,
  fileName: string,
  f: { year: string; program?: string },
): OutcomeUploadPreview {
  if (!f.year) throw new Error("Choose the graduation year this file covers.");
  const programs = allowedPrograms(userId).filter(
    (p) => !f.program || p.program_id === f.program,
  );
  const scope = new Set(programs.map((p) => p.program_id));
  const candidates = data.GRADUATE_OUTCOME.filter(
    (g) => scope.has(g.program_id) && String(g.graduation_year) === f.year,
  );
  const alreadyVerified = candidates.filter((g) =>
    extensionState.verifiedOutcomeUploads.has(g.outcome_id),
  );
  const pending = candidates.filter(
    (g) => !extensionState.verifiedOutcomeUploads.has(g.outcome_id),
  );
  return {
    fileName,
    academicYear: f.year,
    program: f.program || "",
    rowsReceived: pending.length + alreadyVerified.length + 1,
    matchedGraduates: pending.length + alreadyVerified.length,
    validRecords: pending.length,
    needsAttention: [
      {
        row: pending.length + alreadyVerified.length + 1,
        issue:
          'Resident "J. Smithe" not found in the selected program roster — possible name mismatch. Not imported.',
      },
    ],
    duplicates: alreadyVerified.length,
    candidateIds: pending.map((g) => g.outcome_id),
  };
}

export function commitGraduateOutcomeUpload(
  userId: string,
  preview: OutcomeUploadPreview,
): OutcomeUploadRun {
  let imported = 0;
  for (const id of preview.candidateIds) {
    const record = data.GRADUATE_OUTCOME.find((g) => g.outcome_id === id);
    if (!record || !canEdit(userId, record.program_id)) continue;
    record.last_verified_date = today();
    record.recorded_by = userId;
    extensionState.verifiedOutcomeUploads.add(id);
    imported++;
  }
  const run: OutcomeUploadRun = {
    id: `GOU-DEMO-${crypto.randomUUID()}`,
    at: new Date().toISOString(),
    fileName: preview.fileName,
    academicYear: preview.academicYear,
    rowsReceived: preview.rowsReceived,
    matched: preview.matchedGraduates,
    valid: preview.validRecords,
    attention: preview.needsAttention.length,
    duplicates: preview.duplicates,
    imported,
    userId,
  };
  extensionState.outcomeUploadRuns.unshift(run);
  addActivity(
    "GRADUATE_OUTCOME",
    run.id,
    preview.program || "INSTITUTION",
    userId,
    "Graduate Outcomes Upload Verified",
    `${preview.fileName}: ${imported} record(s) re-verified for ${preview.academicYear}; ${preview.needsAttention.length} row(s) required attention; ${preview.duplicates} duplicate(s) skipped.`,
  );
  notifyDataChanged();
  return run;
}
