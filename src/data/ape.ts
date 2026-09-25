import { data, allowedPrograms, programName } from "./repository";
import { collegeIdForProgram, getProgramsByCollege } from "./colleges";
import { extensionState } from "./extension-store";

export function apeCompletionYears(userId: string) {
  const scope = new Set(allowedPrograms(userId).map((p) => p.program_id));
  return [
    ...new Set(data.APE.filter((a) => scope.has(a.program_id)).map((a) => a.academic_year)),
  ]
    .sort()
    .reverse();
}

export interface APERecordRow {
  program: (typeof data)["PROGRAM"][number];
  collegeId: string;
  record?: (typeof data)["APE"][number];
  cycle?: (typeof data)["APE_CYCLE"][number];
  events: (typeof data)["APE_REVIEW_EVENT"][number][];
  primaryDocs: number;
  supportingDocs: number;
  lastUpdated: string | null;
}

export function apeRecordRows(
  userId: string,
  year: string,
  f: { program?: string; college?: string } = {},
): APERecordRow[] {
  const programs = getProgramsByCollege(userId, f.college).filter(
    (p) => !f.program || p.program_id === f.program,
  );
  const cycle = data.APE_CYCLE.find((c) => c.academic_year === year);
  return programs.map((program) => {
    const record = data.APE.find(
      (a) => a.program_id === program.program_id && a.academic_year === year,
    );
    const docs = record
      ? data.DOCUMENT.filter((d) => d.entity_type === "APE" && d.entity_id === record.ape_id)
      : [];
    const events = record
      ? data.APE_REVIEW_EVENT.filter((e) => e.ape_id === record.ape_id).sort((a, b) =>
          a.event_at.localeCompare(b.event_at),
        )
      : [];
    const activity = extensionState.activities.filter(
      (a) => a.entityType === "APE" && a.entityId === record?.ape_id,
    );
    return {
      program,
      collegeId: collegeIdForProgram(program),
      record,
      cycle,
      events,
      primaryDocs: docs.filter((d) => d.description.startsWith("Annual Program Evaluation")).length,
      supportingDocs: docs.filter((d) => !d.description.startsWith("Annual Program Evaluation")).length,
      lastUpdated: activity.at(-1)?.at || record?.reviewed_date || record?.submitted_date || null,
    };
  });
}

export function apeCompletionSummary(rows: APERecordRow[]) {
  const submitted = rows.filter((r) => r.record?.submitted_date);
  return {
    programs: rows.length,
    submitted: submitted.length,
    missing: rows.length - submitted.length,
    accepted: rows.filter((r) => r.record?.status === "Accepted").length,
    supportingDocuments: rows.reduce((n, r) => n + r.supportingDocs, 0),
  };
}
