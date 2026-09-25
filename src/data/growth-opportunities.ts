// Growth Opportunities are outcomes derived from SWOT analysis, institutional
// surveys, and program reports (per the RFP Q&A), not an open list of ideas.
// Every opportunity carries a source type/period/finding so it stays
// evidence-based; the SWOT register below is built from the same
// PROGRAM_HEALTH_ASSESSMENT / PROGRAM_HEALTH_METRIC records that already back
// Program Health.
import { data, allowedPrograms, programName } from "./repository";
import { collegeIdForProgram, getProgramsByCollege } from "./colleges";
import { extensionState } from "./extension-store";
import type { GrowthOpportunity, SWOTFinding } from "./types";

export const growthCategories = [
  "Program Expansion",
  "Training Capacity",
  "Curriculum",
  "Clinical Experience",
  "Recruitment",
  "Faculty Development",
  "Research / Scholarly Activity",
  "Community / Rural Training",
  "Operational Improvement",
  "Other",
];
export const growthStatuses = [
  "Identified",
  "Under Review",
  "Planned",
  "In Progress",
  "Completed",
  "Deferred",
];
export const growthSourceTypes = [
  "SWOT Analysis",
  "Institutional Survey",
  "Program Report",
  "APE",
  "Special Review",
  "Recruitment Analysis",
  "Program Health",
  "Other",
];

export interface GrowthOpportunityFilters {
  year?: string;
  program?: string;
  college?: string;
  category?: string;
  status?: string;
  sourceType?: string;
}

export function growthOpportunities(
  userId: string,
  f: GrowthOpportunityFilters = {},
): GrowthOpportunity[] {
  const programs = getProgramsByCollege(userId, f.college).filter(
    (p) => !f.program || p.program_id === f.program,
  );
  const scope = new Set(programs.map((p) => p.program_id));
  return extensionState.growth.filter(
    (g) =>
      scope.has(g.programId) &&
      (!f.year || g.sourcePeriod === f.year || g.identifiedDate.startsWith(f.year)) &&
      (!f.category || g.category === f.category) &&
      (!f.status || g.status === f.status) &&
      (!f.sourceType || g.sourceType === f.sourceType),
  );
}

export function growthOpportunitiesByCollege(userId: string) {
  const colleges = new Map<string, GrowthOpportunity[]>();
  growthOpportunities(userId).forEach((g) => {
    const program = data.PROGRAM.find((p) => p.program_id === g.programId);
    const id = collegeIdForProgram(program || { type: "Residency" });
    const list = colleges.get(id) || [];
    list.push(g);
    colleges.set(id, list);
  });
  return colleges;
}

export function growthOpportunitySummary(rows: GrowthOpportunity[]) {
  const byStatus = (status: string) => rows.filter((r) => r.status === status).length;
  return {
    total: rows.length,
    identified: byStatus("Identified"),
    underReview: byStatus("Under Review"),
    planned: byStatus("Planned"),
    inProgress: byStatus("In Progress"),
    completed: byStatus("Completed"),
    programsWithOpportunities: new Set(rows.map((r) => r.programId)).size,
  };
}

export function growthOpportunityTrend(userId: string, f: GrowthOpportunityFilters = {}) {
  const rows = growthOpportunities(userId, f);
  const years = [...new Set(rows.map((r) => r.identifiedDate.slice(0, 4)))].sort();
  return years.map((year) => ({
    year,
    identified: rows.filter((r) => r.identifiedDate.startsWith(year)).length,
    completed: rows.filter((r) => r.identifiedDate.startsWith(year) && r.status === "Completed").length,
  }));
}

export function growthOpportunitiesByProgram(userId: string, f: GrowthOpportunityFilters = {}) {
  const rows = growthOpportunities(userId, f);
  const byProgram = new Map<string, number>();
  rows.forEach((r) => byProgram.set(r.programId, (byProgram.get(r.programId) || 0) + 1));
  return [...byProgram.entries()]
    .map(([programId, count]) => ({ programId, programName: programName(programId), count }))
    .sort((a, b) => b.count - a.count);
}
export function growthOpportunitiesByCategory(userId: string, f: GrowthOpportunityFilters = {}) {
  const rows = growthOpportunities(userId, f);
  return growthCategories
    .map((category) => ({ category, count: rows.filter((r) => r.category === category).length }))
    .filter((c) => c.count);
}
export function growthOpportunitiesBySource(userId: string, f: GrowthOpportunityFilters = {}) {
  const rows = growthOpportunities(userId, f);
  const bySource = new Map<string, number>();
  rows.forEach((r) => {
    const key = r.sourceType || "Other";
    bySource.set(key, (bySource.get(key) || 0) + 1);
  });
  return [...bySource.entries()].map(([sourceType, count]) => ({ sourceType, count }));
}
export function growthUpdatesFor(opportunityId: string) {
  return extensionState.growthUpdates
    .filter((u) => u.opportunityId === opportunityId)
    .sort((a, b) => a.at.localeCompare(b.at));
}

// --- SWOT findings register ---------------------------------------------
const SWOT_CATEGORIES: SWOTFinding["category"][] = [
  "Strength",
  "Weakness",
  "Opportunity",
  "Threat",
];
export function swotFindings(
  userId: string,
  f: { program?: string; college?: string; year?: string; category?: string } = {},
): SWOTFinding[] {
  const programs = getProgramsByCollege(userId, f.college).filter(
    (p) => !f.program || p.program_id === f.program,
  );
  const scope = new Set(programs.map((p) => p.program_id));
  const assessments = data.PROGRAM_HEALTH_ASSESSMENT.filter(
    (a) => a.assessment_type === "SWOT Analysis" && scope.has(a.program_id),
  );
  const seeded: SWOTFinding[] = data.PROGRAM_HEALTH_METRIC.filter((m) =>
    (SWOT_CATEGORIES as string[]).includes(m.metric_category),
  ).flatMap((m) => {
    const a = assessments.find((a) => a.assessment_id === m.assessment_id);
    if (!a) return [];
    const linked = extensionState.growth.find(
      (g) => g.sourceFinding === String(m.metric_value) && g.programId === a.program_id,
    );
    return [
      {
        id: m.metric_id,
        programId: a.program_id,
        academicYear: a.academic_year,
        category: m.metric_category as SWOTFinding["category"],
        finding: String(m.metric_value),
        source: a.source,
        assessmentDate: a.assessment_date,
        linkedOpportunityId: linked?.id,
      },
    ];
  });
  const added = extensionState.addedSWOTFindings.filter((f2) => scope.has(f2.programId));
  return [...seeded, ...added]
    .filter((x) => !f.year || x.academicYear === f.year)
    .filter((x) => !f.category || x.category === f.category)
    .sort((a, b) => b.academicYear.localeCompare(a.academicYear));
}
