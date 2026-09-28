// Trainee Health reflects aggregate, program-level results from the
// institutional trainee survey (PROGRAM_HEALTH_ASSESSMENT type "Annual Trainee
// Survey" + PROGRAM_HEALTH_METRIC category "Trainee Health"). Per the RFP Q&A,
// this module never stores individual responses, diagnoses, or wellness
// profiles — only the supplied program-level aggregates.
import { data, allowedPrograms, programName, canEdit } from "./repository";
import { collegeIdForProgram, getProgramsByCollege } from "./colleges";
import { extensionState, addActivity, notifyDataChanged, today } from "./extension-store";

export const TRAINEE_SURVEY_ASSESSMENT_TYPE = "Annual Trainee Survey";
export const TRAINEE_HEALTH_CATEGORY = "Trainee Health";
export const TRAINEE_HEALTH_SOURCE_SYSTEM = "INSTITUTIONAL_SURVEY";

interface MetricThreshold {
  definitionId: string;
  green: number;
  amber: number;
  unit: string;
}
// Only metrics with a configured METRIC_DEFINITION entry get a status
// classification; every other configured survey dimension still displays its
// raw value with no invented threshold.
const METRIC_THRESHOLDS: Record<string, MetricThreshold> = {
  "Wellbeing index": { definitionId: "MET-005", green: 75, amber: 70, unit: "0–100" },
  "Overall program satisfaction": {
    definitionId: "MET-006",
    green: 3.8,
    amber: 3.5,
    unit: "1–5 scale",
  },
};

export function metricThreshold(metricName: string) {
  return METRIC_THRESHOLDS[metricName];
}
export function metricStatus(metricName: string, value: number): string | undefined {
  const t = METRIC_THRESHOLDS[metricName];
  if (!t) return undefined;
  if (value >= t.green) return "On Track";
  if (value >= t.amber) return "Attention";
  return "Needs Review";
}

function allAssessments() {
  return [...data.PROGRAM_HEALTH_ASSESSMENT, ...extensionState.addedTraineeAssessments].filter(
    (a) => a.assessment_type === TRAINEE_SURVEY_ASSESSMENT_TYPE,
  );
}
function allMetrics() {
  return [...data.PROGRAM_HEALTH_METRIC, ...extensionState.addedTraineeMetrics].filter(
    (m) => m.metric_category === TRAINEE_HEALTH_CATEGORY,
  );
}

export const traineeHealthDimensions = () =>
  [...new Set(allMetrics().map((m) => m.metric_name))].sort();

export function traineeHealthYears(userId: string): string[] {
  const scope = new Set(allowedPrograms(userId).map((p) => p.program_id));
  return [
    ...new Set(allAssessments().filter((a) => scope.has(a.program_id)).map((a) => a.academic_year)),
  ]
    .sort()
    .reverse();
}

export interface TraineeHealthFilters {
  year?: string;
  program?: string;
  college?: string;
  metric?: string;
}

export interface TraineeHealthProgramRow {
  programId: string;
  programName: string;
  collegeId: string;
  academicYear: string;
  assessmentDate: string;
  source: string;
  metrics: { name: string; value: number; unit: string; status?: string }[];
}

export function traineeHealthRows(
  userId: string,
  f: TraineeHealthFilters = {},
): TraineeHealthProgramRow[] {
  const programs = getProgramsByCollege(userId, f.college).filter(
    (p) => !f.program || p.program_id === f.program,
  );
  const scope = new Set(programs.map((p) => p.program_id));
  const metrics = allMetrics();
  return allAssessments()
    .filter(
      (a) =>
        scope.has(a.program_id) && (!f.year || a.academic_year === f.year),
    )
    .map((a) => {
      const ms = metrics.filter((m) => m.assessment_id === a.assessment_id);
      return {
        programId: a.program_id,
        programName: programName(a.program_id),
        collegeId: collegeIdForProgram(
          data.PROGRAM.find((p) => p.program_id === a.program_id) || { type: "Residency" },
        ),
        academicYear: a.academic_year,
        assessmentDate: a.assessment_date,
        source: a.source,
        metrics: ms
          .filter((m) => !f.metric || m.metric_name === f.metric)
          .map((m) => ({
            name: m.metric_name,
            value: Number(m.metric_value),
            unit: m.unit,
            status: metricStatus(m.metric_name, Number(m.metric_value)),
          })),
      };
    })
    .filter((r) => !f.metric || r.metrics.length);
}

export function traineeHealthSummary(userId: string, f: TraineeHealthFilters = {}) {
  const rows = traineeHealthRows(userId, f);
  const responseRates = rows
    .map((r) => r.metrics.find((m) => m.name === "Survey response rate")?.value)
    .filter((v): v is number => v != null);
  const complete = rows.filter((r) => r.metrics.length >= traineeHealthDimensions().length);
  return {
    programsReporting: new Set(rows.map((r) => r.programId)).size,
    programsWithCompleteData: new Set(complete.map((r) => r.programId)).size,
    averageResponseRate: responseRates.length
      ? responseRates.reduce((a, b) => a + b, 0) / responseRates.length
      : null,
    currentPeriod: traineeHealthYears(userId)[0] || "Not available",
  };
}

/** Programs x configured survey dimensions, for the aggregate scorecard. */
export function traineeHealthScorecard(userId: string, f: TraineeHealthFilters = {}) {
  const dimensions = traineeHealthDimensions();
  const rows = traineeHealthRows(userId, f);
  return { dimensions, rows };
}

export function traineeHealthTrend(
  userId: string,
  metric: string,
  f: { program?: string; college?: string } = {},
) {
  const years = traineeHealthYears(userId).sort();
  return years.map((year) => {
    const rows = traineeHealthRows(userId, { ...f, year, metric });
    const values = rows.flatMap((r) => r.metrics.filter((m) => m.name === metric).map((m) => m.value));
    return {
      year,
      average: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
      programsReporting: rows.length,
    };
  });
}

export interface TraineeHealthUploadPreview {
  fileName: string;
  academicYear: string;
  rowsReceived: number;
  programsMatched: number;
  validRows: number;
  needsAttention: { row: number; issue: string }[];
  rows: { programId: string; metricName: string; value: number; unit: string }[];
}
export interface TraineeHealthUploadRun {
  id: string;
  at: string;
  fileName: string;
  academicYear: string;
  rowsReceived: number;
  imported: number;
  attention: number;
  userId: string;
}

/**
 * Preview a survey re-upload for an academic year already covered by an
 * assessment: revalidates the existing programs/metrics against the roster of
 * authorized programs and flags any program with no assessment on file yet.
 */
export function previewTraineeHealthUpload(
  userId: string,
  fileName: string,
  academicYear: string,
): TraineeHealthUploadPreview {
  if (!/^\d{4}-\d{2}$/.test(academicYear))
    throw new Error("Choose a valid academic year (e.g. 2026-27).");
  const programs = allowedPrograms(userId);
  const existing = allAssessments().filter((a) => a.academic_year === academicYear);
  const covered = new Set(existing.map((a) => a.program_id));
  const missing = programs.filter((p) => !covered.has(p.program_id));
  const rows = existing.flatMap((a) =>
    allMetrics()
      .filter((m) => m.assessment_id === a.assessment_id)
      .map((m) => ({
        programId: a.program_id,
        metricName: m.metric_name,
        value: Number(m.metric_value),
        unit: m.unit,
      })),
  );
  return {
    fileName,
    academicYear,
    rowsReceived: programs.length,
    programsMatched: existing.length,
    validRows: rows.length,
    needsAttention: missing.map((p, i) => ({
      row: existing.length + i + 1,
      issue: `${p.name}: no survey rows found in the file for ${academicYear}.`,
    })),
    rows,
  };
}

export function commitTraineeHealthUpload(
  userId: string,
  preview: TraineeHealthUploadPreview,
): TraineeHealthUploadRun {
  const run: TraineeHealthUploadRun = {
    id: `THU-DEMO-${crypto.randomUUID()}`,
    at: new Date().toISOString(),
    fileName: preview.fileName,
    academicYear: preview.academicYear,
    rowsReceived: preview.rowsReceived,
    imported: preview.validRows,
    attention: preview.needsAttention.length,
    userId,
  };
  extensionState.traineeSurveyUploadRuns.unshift(run);
  addActivity(
    "TRAINEE_HEALTH_SURVEY",
    run.id,
    "INSTITUTION",
    userId,
    "Trainee Survey Upload Verified",
    `${preview.fileName}: ${preview.validRows} program-level row(s) verified for ${preview.academicYear}; ${preview.needsAttention.length} program(s) require attention.`,
  );
  notifyDataChanged();
  return run;
}

export function addTraineeHealthMetric(
  userId: string,
  fields: {
    programId: string;
    academicYear: string;
    metricName: string;
    value: number;
    unit: string;
  },
) {
  if (!canEdit(userId, fields.programId))
    throw new Error("Your role cannot edit this program.");
  let assessment = allAssessments().find(
    (a) => a.program_id === fields.programId && a.academic_year === fields.academicYear,
  );
  if (!assessment) {
    assessment = {
      assessment_id: `PHA-DEMO-${crypto.randomUUID()}`,
      program_id: fields.programId,
      academic_year: fields.academicYear,
      assessment_type: TRAINEE_SURVEY_ASSESSMENT_TYPE,
      source: "Institutional Survey (GME Office) · Manual entry",
      assessment_date: today(),
      summary: "Institutional trainee health & satisfaction survey results.",
      source_document_id: null,
      created_at: new Date().toISOString(),
    };
    extensionState.addedTraineeAssessments.push(assessment);
  }
  extensionState.addedTraineeMetrics.push({
    metric_id: `PHM-DEMO-${crypto.randomUUID()}`,
    assessment_id: assessment.assessment_id,
    metric_category: TRAINEE_HEALTH_CATEGORY,
    metric_name: fields.metricName,
    metric_value: fields.value,
    value_type: "Number",
    unit: fields.unit,
    notes: "",
  });
  addActivity(
    "TRAINEE_HEALTH_SURVEY",
    assessment.assessment_id,
    fields.programId,
    userId,
    "Trainee Health Metric Added",
    `${fields.metricName}: ${fields.value} ${fields.unit}`,
  );
  notifyDataChanged();
}
