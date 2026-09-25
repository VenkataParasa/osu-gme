// Faculty & Leadership Workforce is an aggregate, program-level monitoring
// view built from FACULTY_LEADERSHIP_AGGREGATE. Per the RFP Q&A ("No
// staff/faculty information to be maintained"), this is explicitly NOT an HR
// system: there are no individual personnel records, payroll, credentialing,
// or performance data — only supplied aggregate counts and tenure figures.
import { data, allowedPrograms, programName } from "./repository";
import { collegeIdForProgram, getProgramsByCollege } from "./colleges";

export type FacultyAggregateRecord = (typeof data)["FACULTY_LEADERSHIP_AGGREGATE"][number];

const THRESHOLDS = {
  tenure: { definitionId: "MET-015", green: 3, amber: 2, direction: "higher" as const },
  turnover: { definitionId: "MET-016", green: 0.15, amber: 0.25, direction: "lower" as const },
};

function statusFor(value: number, t: { green: number; amber: number; direction: "higher" | "lower" }) {
  const meets = t.direction === "higher" ? value >= t.green : value <= t.green;
  const acceptable = t.direction === "higher" ? value >= t.amber : value <= t.amber;
  return meets ? "On Track" : acceptable ? "Attention" : "Needs Review";
}
export const tenureStatus = (years: number) => statusFor(years, THRESHOLDS.tenure);
export const turnoverStatus = (rate: number) => statusFor(rate, THRESHOLDS.turnover);

export interface FacultyWorkforceFilters {
  year?: string;
  program?: string;
  college?: string;
}

export function facultyWorkforceYears(userId: string): string[] {
  const scope = new Set(allowedPrograms(userId).map((p) => p.program_id));
  return [
    ...new Set(
      data.FACULTY_LEADERSHIP_AGGREGATE.filter((f) => scope.has(f.program_id)).map(
        (f) => f.academic_year,
      ),
    ),
  ]
    .sort()
    .reverse();
}

export function facultyWorkforceRows(userId: string, f: FacultyWorkforceFilters = {}) {
  const programs = getProgramsByCollege(userId, f.college).filter(
    (p) => !f.program || p.program_id === f.program,
  );
  const scope = new Set(programs.map((p) => p.program_id));
  return data.FACULTY_LEADERSHIP_AGGREGATE.filter(
    (a) => scope.has(a.program_id) && (!f.year || a.academic_year === f.year),
  ).map((a) => ({
    aggregate: a,
    programName: programName(a.program_id),
    collegeId: collegeIdForProgram(
      data.PROGRAM.find((p) => p.program_id === a.program_id) || { type: "Residency" },
    ),
    tenureStatus: tenureStatus(a.program_director_tenure_years),
    turnoverStatus: turnoverStatus(a.faculty_turnover_rate),
  }));
}

export function facultyWorkforceSummary(userId: string, f: FacultyWorkforceFilters = {}) {
  const rows = facultyWorkforceRows(userId, f);
  const changes = rows.filter((r) => r.aggregate.leadership_change_this_year);
  const tenures = rows.map((r) => r.aggregate.program_director_tenure_years);
  const facultyCounts = rows.map((r) => r.aggregate.core_faculty_count);
  return {
    programsReporting: rows.length,
    programsWithLeadershipChange: changes.length,
    averageTenure: tenures.length ? tenures.reduce((a, b) => a + b, 0) / tenures.length : null,
    totalCoreFaculty: facultyCounts.length
      ? facultyCounts.reduce((a, b) => a + b, 0)
      : null,
    period: facultyWorkforceYears(userId)[0] || "Not available",
  };
}

/** One row per program: current tenure + changes within the selected year range. */
export function leadershipContinuity(
  userId: string,
  f: FacultyWorkforceFilters & { fromYear?: string; toYear?: string } = {},
) {
  const programs = getProgramsByCollege(userId, f.college).filter(
    (p) => !f.program || p.program_id === f.program,
  );
  return programs.map((program) => {
    const history = data.FACULTY_LEADERSHIP_AGGREGATE.filter(
      (a) => a.program_id === program.program_id,
    ).sort((a, b) => a.academic_year.localeCompare(b.academic_year));
    const inRange = history.filter(
      (a) =>
        (!f.fromYear || a.academic_year >= f.fromYear) &&
        (!f.toYear || a.academic_year <= f.toYear),
    );
    const current = history.at(-1);
    return {
      program,
      collegeId: collegeIdForProgram(program),
      current,
      currentTenure: current?.program_director_tenure_years ?? null,
      changesInRange: inRange.filter((a) => a.leadership_change_this_year).length,
      history,
      lastUpdated: current?.uploaded_at || null,
    };
  });
}

export function leadershipChangeTrend(userId: string, f: FacultyWorkforceFilters = {}) {
  const years = facultyWorkforceYears(userId).sort();
  return years.map((year) => {
    const rows = facultyWorkforceRows(userId, { ...f, year });
    return {
      year,
      programsReporting: rows.length,
      changes: rows.filter((r) => r.aggregate.leadership_change_this_year).length,
      averageTurnover: rows.length
        ? rows.reduce((sum, r) => sum + r.aggregate.faculty_turnover_rate, 0) / rows.length
        : null,
    };
  });
}
