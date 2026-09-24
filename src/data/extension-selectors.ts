import { data, allowedPrograms, academicYear } from "./repository";
import { extensionState } from "./extension-store";
import {
  JsonRecruitmentProvider,
  type RecruitmentDataProvider,
} from "./integration-providers";
import { capacityFixtures, demoPolicy } from "./demo-fixtures";
import type { Applicant, ReviewAction } from "./types";
export interface RecruitmentFilters {
  year?: string;
  program?: string;
  degree?: string;
  outcome?: string;
  from?: string;
  to?: string;
  search?: string;
}
export const recruitmentYears = () =>
  [...new Set(data.RECRUITMENT_CYCLE.map((c) => c.application_year))].sort(
    (a, b) => b - a,
  );
export function applicantRows(
  userId: string,
  f: RecruitmentFilters = {},
  provider: RecruitmentDataProvider = new JsonRecruitmentProvider(),
) {
  const scope = new Set(allowedPrograms(userId).map((p) => p.program_id));
  return provider.getApplicants().flatMap((applicant) => {
    const cycle = data.RECRUITMENT_CYCLE.find(
      (c) => c.cycle_id === applicant.cycle_id,
    );
    if (!cycle || !scope.has(cycle.program_id)) return [];
    const match = provider
      .getMatchOutcomes()
      .find(
        (m) =>
          m.applicant_id === applicant.applicant_id &&
          m.program_id === cycle.program_id,
      );
    const outcome = match?.match_result || "Not recorded";
    if (
      (f.year && String(cycle.application_year) !== f.year) ||
      (f.program && cycle.program_id !== f.program) ||
      (f.degree && applicant.degree_type !== f.degree) ||
      (f.outcome && outcome !== f.outcome) ||
      (f.from && cycle.application_year < Number(f.from)) ||
      (f.to && cycle.application_year > Number(f.to)) ||
      (f.search &&
        !`${applicant.first_name} ${applicant.last_name} ${applicant.hometown_city}`
          .toLowerCase()
          .includes(f.search.toLowerCase()))
    )
      return [];
    return [
      {
        ...applicant,
        programId: cycle.program_id,
        year: cycle.application_year,
        outcome,
        match,
      },
    ];
  });
}
export function recruitmentSummary(userId: string, f: RecruitmentFilters) {
  const applicants = applicantRows(userId, f),
    scope = allowedPrograms(userId).filter(
      (p) => !f.program || p.program_id === f.program,
    );
  const programs = scope.map((program) => {
    const rows = applicants.filter((a) => a.programId === program.program_id),
      matches = rows.filter((a) => a.outcome === "Matched");
    const capacity = capacityFixtures.find(
      (c) => c.programId === program.program_id && String(c.year) === f.year,
    )?.positions;
    const recorded = rows.some((a) => a.match);
    const comparable = !f.degree && !f.outcome && !f.search;
    return {
      program,
      applicants: rows.length,
      ranked: rows.filter((a) => a.rank_position !== null).length,
      matched: recorded ? matches.length : null,
      positions: capacity ?? null,
      fillRate:
        recorded && capacity && comparable ? matches.length / capacity : null,
      unfilled:
        recorded && capacity !== undefined && comparable
          ? Math.max(0, capacity - matches.length)
          : null,
    };
  });
  return {
    applicants,
    programs,
    total: applicants.length,
    ranked: applicants.filter((a) => a.rank_position !== null).length,
    matched: applicants.some((a) => a.match)
      ? applicants.filter((a) => a.outcome === "Matched").length
      : null,
  };
}
export function cohortSummary(year: number) {
  const cohort = extensionState.cohort.filter((c) => c.year === year),
    participating = cohort.length,
    matched = cohort.filter((c) => c.outcome === "Matched").length,
    complete = cohort.every((c) => c.outcome !== "Pending");
  return {
    participating,
    matched,
    rate: participating && complete ? matched / participating : null,
  };
}
export function recruitmentTrend(userId: string, f: RecruitmentFilters) {
  return [...recruitmentYears()]
    .reverse()
    .filter(
      (y) => (!f.from || y >= Number(f.from)) && (!f.to || y <= Number(f.to)),
    )
    .map((year) => {
      const summary = recruitmentSummary(userId, { ...f, year: String(year) }),
        matched = summary.applicants.filter((a) => a.outcome === "Matched");
      return {
        year,
        ranked: summary.ranked,
        matched: summary.matched,
        DO: matched.filter((a) => a.degree_type === "DO").length,
        MD: matched.filter((a) => a.degree_type === "MD").length,
        FMG: matched.filter((a) => a.degree_type === "FMG").length,
      };
    });
}
export function demographicGroups(
  rows: ReturnType<typeof applicantRows>,
  field: "degree_type" | "hometown_state" | "hometown_city",
) {
  const groups = new Map<string, number>();
  rows
    .filter((a) => a.outcome === "Matched")
    .forEach((a) => {
      const key =
        field === "hometown_city"
          ? `${a.hometown_city}, ${a.hometown_state}`
          : a[field];
      groups.set(
        key || "Not recorded",
        (groups.get(key || "Not recorded") || 0) + 1,
      );
    });
  return [...groups]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
export function deadlineState(action: ReviewAction, now = new Date()) {
  if (action.status === "Complete" || action.completed_date) return "Completed";
  if (!action.due_date) return "No Deadline";
  const due = new Date(`${action.due_date}T00:00:00`),
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (due < start) return "Overdue";
  const boundary = new Date(start);
  boundary.setDate(boundary.getDate() + demoPolicy.dueSoonDays);
  return due <= boundary ? "Due Soon" : "Upcoming";
}
export function reviewRows(
  userId: string,
  f: {
    program?: string;
    year?: string;
    status?: string;
    deadline?: string;
  } = {},
) {
  const scope = new Set(allowedPrograms(userId).map((p) => p.program_id));
  return data.SPECIAL_REVIEW.filter(
    (r) =>
      scope.has(r.program_id) &&
      (!f.program || r.program_id === f.program) &&
      (!f.year || academicYear(r.initiated_date) === f.year) &&
      (!f.status || r.status === f.status),
  )
    .map((review) => {
      const actions = data.ACTION_ITEM.filter(
          (a) => a.review_id === review.review_id,
        ),
        open = actions.filter((a) => deadlineState(a) !== "Completed"),
        next = [...open]
          .filter((a) => a.due_date)
          .sort((a, b) => a.due_date.localeCompare(b.due_date))[0]?.due_date;
      const activity = extensionState.activities.filter(
        (a) => a.entityId === review.review_id,
      );
      return {
        review,
        actions,
        open,
        next,
        updated: activity.at(-1)?.at || null,
      };
    })
    .filter(
      (r) =>
        !f.deadline || r.actions.some((a) => deadlineState(a) === f.deadline),
    );
}
export function reviewSummary(rows: ReturnType<typeof reviewRows>) {
  const actions = rows.flatMap((r) => r.actions);
  return {
    active: rows.filter((r) => r.review.status !== "Closed").length,
    programs: new Set(
      rows
        .filter((r) => r.review.status !== "Closed")
        .map((r) => r.review.program_id),
    ).size,
    open: actions.filter((a) => deadlineState(a) !== "Completed").length,
    upcoming: actions.filter((a) =>
      ["Upcoming", "Due Soon"].includes(deadlineState(a)),
    ).length,
    overdue: actions.filter((a) => deadlineState(a) === "Overdue").length,
  };
}
export const apeYears = () =>
  [...new Set(data.APE.map((a) => a.academic_year))].sort().reverse();
export function apeRows(
  userId: string,
  year: string,
  programId = "",
  status = "",
) {
  return allowedPrograms(userId)
    .filter((p) => !programId || p.program_id === programId)
    .map((program) => {
      const record = data.APE.find(
          (a) =>
            a.program_id === program.program_id && a.academic_year === year,
        ),
        docs = record
          ? data.DOCUMENT.filter(
              (d) => d.entity_type === "APE" && d.entity_id === record.ape_id,
            )
          : [];
      const activity = extensionState.activities.filter(
        (a) => a.entityType === "APE" && a.entityId === record?.ape_id,
      );
      return {
        program,
        record,
        docs,
        submitted: !!record?.submitted_date,
        updated: activity.at(-1)?.at || null,
      };
    })
    .filter(
      (r) =>
        !status ||
        (status === "Submitted"
          ? r.submitted
          : status === "Missing"
            ? !r.submitted
            : (r.record?.status || "Not Recorded") === status),
    );
}
export function csvExportRows(
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  return [headers, ...rows]
    .map((row) =>
      row
        .map((value) => {
          const v = String(value ?? "Not available");
          return `"${(/^[=+@\-\t\r]/.test(v) ? "'" : "") + v.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
}
