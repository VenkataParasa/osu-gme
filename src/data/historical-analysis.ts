// Cross-module multi-year trends for the Historical Analysis screen. Every
// series is built from the same selectors the individual modules already use
// (no parallel calculation), scoped Authorized Programs -> College -> Program,
// so College filtering can never surface a program outside the user's role.
import { data, programName } from "./repository";
import { getProgramsByCollege, getAuthorizedColleges } from "./colleges";
import { recruitmentTrend, type RecruitmentFilters } from "./extension-selectors";
import { graduateOutcomeTrend } from "./graduate-outcomes";
import { traineeHealthTrend, traineeHealthDimensions } from "./trainee-health";
import { leadershipChangeTrend } from "./faculty-workforce";
import { growthOpportunityTrend } from "./growth-opportunities";
import { institutionalHealth } from "./program-health-selectors";
import { collegeIdForProgram } from "./colleges";

export interface HistoricalFilters {
  college?: string;
  program?: string;
  fromYear?: string;
  toYear?: string;
}
export type HistoricalPoint = { year: string; value: number | null; detail?: string };
export interface HistoricalCategory {
  id: string;
  label: string;
  unit: string;
  description: string;
}
export const HISTORICAL_CATEGORIES: HistoricalCategory[] = [
  { id: "board", label: "Board Pass Trends", unit: "%", description: "Weighted 3-year rolling board pass rate across scoped programs." },
  { id: "recruitment", label: "Recruitment & Match Trends", unit: "count", description: "Matched applicants per match year." },
  { id: "graduates", label: "Graduate Outcomes", unit: "%", description: "Share of known outcomes practising in Oklahoma." },
  { id: "scholarly", label: "Scholarly Activity", unit: "count", description: "Recorded scholarly activities per academic year." },
  { id: "health", label: "Program Health Attention", unit: "count", description: "Attention indicators recorded institution-wide per year." },
  { id: "trainee", label: "Trainee Health (Wellbeing Index)", unit: "0–100", description: "Average institutional survey wellbeing index." },
  { id: "faculty", label: "Faculty & Leadership Changes", unit: "count", description: "Programs recording a leadership change per academic year." },
  { id: "growth", label: "Growth Opportunities Identified", unit: "count", description: "Growth opportunities identified per calendar year." },
];

function withinYearRange(year: string, f: HistoricalFilters) {
  return (!f.fromYear || year >= f.fromYear) && (!f.toYear || year <= f.toYear);
}

function boardTrendSeries(userId: string, f: HistoricalFilters): HistoricalPoint[] {
  const scope = new Set(getProgramsByCollege(userId, f.college)
    .filter((p) => !f.program || p.program_id === f.program)
    .map((p) => p.program_id));
  const byYear = new Map<number, { passed: number; eligible: number }>();
  data.BOARD_PASS_METRIC.filter((b) => scope.has(b.program_id)).forEach((b) => {
    const bucket = byYear.get(b.reporting_year) || { passed: 0, eligible: 0 };
    bucket.passed += b.passed_count;
    bucket.eligible += b.eligible_count;
    byYear.set(b.reporting_year, bucket);
  });
  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, v]) => ({
      year: String(year),
      value: v.eligible ? Math.round((v.passed / v.eligible) * 1000) / 10 : null,
      detail: `${v.passed} / ${v.eligible} passed`,
    }))
    .filter((p) => withinYearRange(p.year, f));
}

function scholarlySeries(userId: string, f: HistoricalFilters): HistoricalPoint[] {
  const scope = new Set(getProgramsByCollege(userId, f.college)
    .filter((p) => !f.program || p.program_id === f.program)
    .map((p) => p.program_id));
  const rows = data.SCHOLARLY_ACTIVITY.filter((s) => scope.has(s.program_id));
  const years = [...new Set(rows.map((s) => s.academic_year))].sort();
  return years
    .map((year) => ({ year, value: rows.filter((s) => s.academic_year === year).length }))
    .filter((p) => withinYearRange(p.year, f));
}

function healthAttentionSeries(userId: string, f: HistoricalFilters): HistoricalPoint[] {
  // Institutional health is only computed for the current supplied year set;
  // duty-hour academic periods give the available multi-year axis.
  const years = [...new Set(data.DUTY_HOUR_COMPLIANCE.map((d) => d.academic_period.slice(0, 7)))].sort();
  return years
    .map((year) => {
      const snapshots = institutionalHealth(userId, year).filter(
        (s) =>
          (!f.college || (s.program && collegeIdForProgram(s.program) === f.college)) &&
          (!f.program || s.program?.program_id === f.program),
      );
      return { year, value: snapshots.reduce((n, s) => n + s.attention.length, 0) };
    })
    .filter((p) => withinYearRange(p.year, f));
}

export function historicalSeries(
  userId: string,
  categoryId: string,
  f: HistoricalFilters = {},
): HistoricalPoint[] {
  const recruitmentFilters: RecruitmentFilters = { program: f.program, college: f.college };
  switch (categoryId) {
    case "board":
      return boardTrendSeries(userId, f);
    case "recruitment":
      return recruitmentTrend(userId, recruitmentFilters)
        .map((r) => ({ year: String(r.year), value: r.matched, detail: `${r.ranked} ranked` }))
        .filter((p) => withinYearRange(p.year, f));
    case "graduates":
      return graduateOutcomeTrend(userId, { program: f.program, college: f.college })
        .map((r) => ({
          year: String(r.year),
          value: r.known ? Math.round((r.oklahoma / r.known) * 1000) / 10 : null,
          detail: `${r.oklahoma} of ${r.known} known outcomes`,
        }))
        .filter((p) => withinYearRange(p.year, f));
    case "scholarly":
      return scholarlySeries(userId, f);
    case "health":
      return healthAttentionSeries(userId, f);
    case "trainee": {
      const dims = traineeHealthDimensions();
      if (!dims.includes("Wellbeing index")) return [];
      return traineeHealthTrend(userId, "Wellbeing index", { program: f.program, college: f.college })
        .map((r) => ({
          year: r.year,
          value: r.average != null ? Math.round(r.average * 10) / 10 : null,
          detail: `${r.programsReporting} program(s) reporting`,
        }))
        .filter((p) => withinYearRange(p.year, f));
    }
    case "faculty":
      return leadershipChangeTrend(userId, { program: f.program, college: f.college })
        .map((r) => ({ year: r.year, value: r.changes, detail: `${r.programsReporting} program(s) reporting` }))
        .filter((p) => withinYearRange(p.year, f));
    case "growth":
      return growthOpportunityTrend(userId, { program: f.program, college: f.college })
        .map((r) => ({ year: r.year, value: r.identified }))
        .filter((p) => withinYearRange(p.year, f));
    default:
      return [];
  }
}

export interface HistoricalReportMetadata {
  scope: "Institution" | "College" | "Program";
  collegeName?: string;
  programName?: string;
  reportingPeriod: string;
  generatedAt: string;
  dataAsOf: string;
}
export function historicalReportMetadata(
  userId: string,
  f: HistoricalFilters,
): HistoricalReportMetadata {
  const scope: HistoricalReportMetadata["scope"] = f.program
    ? "Program"
    : f.college
      ? "College"
      : "Institution";
  const college = f.college ? getAuthorizedColleges(userId).find((c) => c.id === f.college) : undefined;
  return {
    scope,
    collegeName: college?.name,
    programName: f.program ? programName(f.program) : undefined,
    reportingPeriod: `${f.fromYear || "Earliest available"} – ${f.toYear || "Latest available"}`,
    generatedAt: new Date().toLocaleString("en-US"),
    dataAsOf: "Current session state",
  };
}
