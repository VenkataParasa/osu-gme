import {
  data,
  allowedPrograms,
  activeReview,
  latestBoard,
  latestDuty,
  monitoring,
  programName,
  academicYear,
  percent,
} from "./repository";
import { extensionState } from "./extension-store";
import { recruitmentSummary } from "./extension-selectors";
import { deadlineState } from "./extension-selectors";
import { traineeHealthRows, metricStatus } from "./trainee-health";
import { facultyWorkforceRows, tenureStatus } from "./faculty-workforce";

export type HealthDomain =
  | "Accreditation"
  | "Trainees"
  | "Operations"
  | "Recruitment"
  | "Leadership"
  | "Growth";
export type HealthStatus =
  "On Track" | "Attention" | "Needs Review" | "Change" | "No Data";
export interface HealthIndicator {
  id: string;
  programId: string;
  domain: HealthDomain;
  label: string;
  value: string;
  status: HealthStatus;
  source: string;
  sourcePath: string;
  updated?: string;
  reason?: string;
}
const domainList: HealthDomain[] = [
  "Accreditation",
  "Trainees",
  "Operations",
  "Recruitment",
  "Leadership",
  "Growth",
];
export const healthDomains = domainList;
export const healthYears = () =>
  [
    ...new Set([
      ...data.DUTY_HOUR_COMPLIANCE.map((d) => d.academic_period.slice(0, 7)),
      ...data.PROGRAM_HEALTH_ASSESSMENT.map((a) => a.academic_year),
    ]),
  ]
    .sort()
    .reverse();
export function programHealthIndicators(
  userId: string,
  programId: string,
  year = "2025-26",
): HealthIndicator[] {
  const program = data.PROGRAM.find((p) => p.program_id === programId);
  if (
    !program ||
    !allowedPrograms(userId).some((p) => p.program_id === programId)
  )
    return [];
  const review = data.SPECIAL_REVIEW.find(
    (r) => r.program_id === programId && r.status !== "Closed",
  );
  const actions = review
    ? data.ACTION_ITEM.filter((a) => a.review_id === review.review_id)
    : [];
  const overdue = actions.filter((a) => deadlineState(a) === "Overdue");
  const ape = data.APE.find(
    (a) => a.program_id === programId && a.academic_year === year,
  );
  const duty = latestDuty(programId, year);
  const survey = traineeHealthRows(userId, { program: programId, year })[0];
  const wellbeing = survey?.metrics.find((m) => m.name === "Wellbeing index");
  const responseRate = survey?.metrics.find((m) => m.name === "Survey response rate");
  const operation = extensionState.operations.find(
    (o) => o.programId === programId && o.academicYear === year,
  );
  const recruitment = recruitmentSummary(userId, {
    program: programId,
    year: year.slice(0, 4),
  }).programs[0];
  const faculty = facultyWorkforceRows(userId, { program: programId, year })[0];
  const changed = !!faculty?.aggregate.leadership_change_this_year;
  const growth = extensionState.growth.filter(
    (g) =>
      g.programId === programId &&
      g.status !== "Completed" &&
      g.status !== "Deferred",
  );
  return [
    {
      id: `monitoring-${programId}`,
      programId,
      domain: "Accreditation",
      label: "Accreditation monitoring",
      value:
        monitoring(program) === "Heightened"
          ? "Heightened Monitoring"
          : "Standard",
      status:
        monitoring(program) === "Heightened" ? "Needs Review" : "On Track",
      source: "Program record",
      sourcePath: `programs/${programId}`,
      reason:
        monitoring(program) === "Heightened"
          ? "Source program record indicates Heightened Monitoring."
          : undefined,
    },
    {
      id: `review-${programId}`,
      programId,
      domain: "Accreditation",
      label: "Special Review",
      value: review ? "Active" : "No active review",
      status: review ? "Attention" : "On Track",
      source: "Internal GME",
      sourcePath: review
        ? `reviews/${review.review_id}`
        : `reviews?program=${programId}`,
      reason: review
        ? `${actions.filter((a) => deadlineState(a) !== "Completed").length} open action item(s); ${overdue.length} overdue.`
        : undefined,
    },
    {
      id: `ape-${programId}`,
      programId,
      domain: "Accreditation",
      label: "Annual Program Evaluation",
      value: ape?.submitted_date ? "Recorded" : "Not recorded",
      status: ape?.submitted_date ? "On Track" : "No Data",
      source: "Program upload",
      sourcePath: `ape/${programId}?year=${year}`,
    },
    {
      id: `duty-${programId}`,
      programId,
      domain: "Accreditation",
      label: "Duty-hour compliance",
      value: duty ? percent(duty.compliance_rate) : "Not recorded",
      status: !duty
        ? "No Data"
        : duty.compliance_status === "Compliant"
          ? "On Track"
          : "Attention",
      source: duty?.source_system || "New Innovations",
      sourcePath: `programs/${programId}`,
      updated: duty?.imported_at,
      reason:
        duty?.compliance_status !== "Compliant" && duty
          ? `Source status: ${duty.compliance_status}.`
          : undefined,
    },
    {
      id: `survey-${programId}`,
      programId,
      domain: "Trainees",
      label: "Aggregate trainee survey",
      value: wellbeing
        ? `Wellbeing index ${wellbeing.value}${responseRate ? ` · ${percent(responseRate.value)} response rate` : ""}`
        : "No survey data",
      status: wellbeing ? (metricStatus("Wellbeing index", wellbeing.value) as HealthStatus | undefined) || "On Track" : "No Data",
      source: survey?.source || "Institutional Survey",
      sourcePath: `trainee-health?program=${programId}`,
      updated: survey?.assessmentDate,
    },
    {
      id: `board-${programId}`,
      programId,
      domain: "Trainees",
      label: "Latest board pass rate",
      value: latestBoard(programId)
        ? percent(latestBoard(programId)?.pass_rate)
        : "Not recorded",
      status: latestBoard(programId) ? "On Track" : "No Data",
      source: latestBoard(programId)?.source || "Specialty Board Report",
      sourcePath: `programs/${programId}`,
    },
    {
      id: `operations-${programId}`,
      programId,
      domain: "Operations",
      label: "Operational follow-up",
      value: operation
        ? `${operation.followUpOpen} open`
        : "No operational metric",
      status: !operation
        ? "No Data"
        : operation.followUpOpen
          ? "Attention"
          : "On Track",
      source: operation?.source || "Internal GME",
      sourcePath: `health/${programId}/operations`,
      updated: operation?.updatedAt,
    },
    {
      id: `capacity-${programId}`,
      programId,
      domain: "Operations",
      label: "Program complement",
      value: String(program.slot_count),
      status: "On Track",
      source: "Program record",
      sourcePath: `programs/${programId}`,
    },
    {
      id: `recruitment-${programId}`,
      programId,
      domain: "Recruitment",
      label: "Recruitment & Match",
      value: recruitment?.applicants
        ? `${recruitment.applicants} applicants · ${recruitment.matched ?? "outcomes not recorded"} matched`
        : "No applicant records",
      status: recruitment?.applicants ? "On Track" : "No Data",
      source: "Recruitment Repository",
      sourcePath: `recruitment/program/${programId}?year=${year.slice(0, 4)}`,
    },
    {
      id: `leadership-${programId}`,
      programId,
      domain: "Leadership",
      label: "Program Director tenure",
      value: faculty
        ? `${faculty.aggregate.program_director_tenure_years} yrs (${tenureStatus(faculty.aggregate.program_director_tenure_years)})`
        : "No leadership record",
      status: faculty ? (changed ? "Change" : "On Track") : "No Data",
      source: faculty?.aggregate.source || "Faculty & Leadership Aggregate",
      sourcePath: `faculty-workforce?program=${programId}`,
      updated: faculty?.aggregate.uploaded_at,
      reason: changed
        ? "A leadership change is recorded for this reporting year."
        : undefined,
    },
    {
      id: `growth-${programId}`,
      programId,
      domain: "Growth",
      label: "Open growth opportunities",
      value: `${growth.length} open`,
      status: growth.length ? "On Track" : "No Data",
      source: "Internal GME",
      sourcePath: `health/${programId}/growth`,
    },
  ];
}
export function programHealthSnapshot(
  userId: string,
  programId: string,
  year = "2025-26",
) {
  const indicators = programHealthIndicators(userId, programId, year);
  const statuses = domainList.map((domain) => {
    const x = indicators.filter((i) => i.domain === domain);
    const important =
      x.find((i) => i.status === "Needs Review") ||
      x.find((i) => i.status === "Attention") ||
      x.find((i) => i.status === "Change") ||
      x.find((i) => i.status === "On Track") ||
      x[0];
    return {
      domain,
      status: important?.status || "No Data",
      reason: important?.reason,
      indicator: important,
    };
  });
  const attention = indicators.filter((i) =>
    ["Needs Review", "Attention"].includes(i.status),
  );
  return {
    program: data.PROGRAM.find((p) => p.program_id === programId),
    year,
    indicators,
    statuses,
    attention,
    lastUpdated:
      [...(indicators.map((i) => i.updated).filter(Boolean) as string[])]
        .sort()
        .at(-1) || null,
  };
}
export function institutionalHealth(userId: string, year = "2025-26") {
  return allowedPrograms(userId).map((p) =>
    programHealthSnapshot(userId, p.program_id, year),
  );
}
export function attentionItems(userId: string, year = "2025-26") {
  return institutionalHealth(userId, year).flatMap((s) =>
    s.attention.map((i) => ({ ...i, programName: programName(i.programId) })),
  );
}
export function growthRows(
  userId: string,
  filters: { program?: string; category?: string; status?: string } = {},
) {
  const scope = new Set(allowedPrograms(userId).map((p) => p.program_id));
  return extensionState.growth.filter(
    (g) =>
      scope.has(g.programId) &&
      (!filters.program || g.programId === filters.program) &&
      (!filters.category || g.category === filters.category) &&
      (!filters.status || g.status === filters.status),
  );
}
export function healthComparison(
  userId: string,
  ids: string[],
  year = "2025-26",
) {
  return ids.slice(0, 4).map((id) => programHealthSnapshot(userId, id, year));
}
