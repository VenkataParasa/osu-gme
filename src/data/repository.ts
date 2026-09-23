import seed from "./sample-data.json";
import type { Dataset, Concern, ConcernUpdate, Program } from "./types";
export const data: Dataset = seed;
export const classifications = ["Reviewable", "Non-Reviewable"];
export const statuses = [...new Set(data.CONCERN_RECORD.map((c) => c.status))];
export const shortName = (name: string) =>
  name.replace(/ Residency| Fellowship/g, "");
export const percent = (v?: number | null) =>
  v == null ? "Not available" : `${(v * 100).toFixed(1).replace(/\.0$/, "")}%`;
export const date = (v?: string | null) =>
  v
    ? new Date(v.length === 10 ? `${v}T12:00:00` : v).toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric", year: "numeric" },
      )
    : "Not recorded";
export function academicYear(value: string) {
  const y = Number(value.slice(0, 4)) - (Number(value.slice(5, 7)) < 7 ? 1 : 0);
  return `${y}-${String(y + 1).slice(2)}`;
}
export const years = [
  ...new Set([
    ...data.DUTY_HOUR_COMPLIANCE.map((d) => d.academic_period.slice(0, 7)),
    ...data.CONCERN_RECORD.map((c) => academicYear(c.identified_date)),
  ]),
]
  .sort()
  .reverse();
export function boardTrend(id: string) {
  return data.BOARD_PASS_METRIC.filter((b) => b.program_id === id)
    .sort((a, b) => a.reporting_year - b.reporting_year)
    .slice(-3);
}
export function dutyHistory(id: string, year = "") {
  return data.DUTY_HOUR_COMPLIANCE.filter(
    (d) => d.program_id === id && (!year || d.academic_period.startsWith(year)),
  ).sort((a, b) => a.academic_period.localeCompare(b.academic_period));
}
export const latestDuty = (id: string, year = "") =>
  dutyHistory(id, year).at(-1);
export const latestBoard = (id: string) => boardTrend(id).at(-1);
export const monitoring = (p: Program) =>
  p.accreditation_status.includes("Heightened") ? "Heightened" : "Standard";
export const reviews = (id: string) =>
  data.SPECIAL_REVIEW.filter((r) => r.program_id === id);
export const activeReview = (id: string) =>
  reviews(id).some((r) => r.status !== "Closed");
export const reviewStatus = (id: string) =>
  reviews(id).find((r) => r.status !== "Closed")?.status ||
  reviews(id).at(-1)?.status ||
  "None recorded";
export const needsAttention = (p: Program, year = "") =>
  monitoring(p) === "Heightened" ||
  activeReview(p.program_id) ||
  !!(
    latestDuty(p.program_id, year) &&
    latestDuty(p.program_id, year)?.compliance_status !== "Compliant"
  );
export const residentName = (id: string) =>
  data.RESIDENT.find((r) => r.resident_id === id)?.full_name || id;
export const programName = (id: string) =>
  data.PROGRAM.find((p) => p.program_id === id)?.name || id;
export const authorName = (id: string) =>
  data.USER.find((u) => u.user_id === id)?.name || id;
export const documents = (type: string, id: string) =>
  data.DOCUMENT.filter((d) => d.entity_type === type && d.entity_id === id);
export const isOpen = (c: Concern) => c.status.startsWith("Open");
export const userRole = (id: string) =>
  data.ROLE.find(
    (r) => r.role_id === data.USER_ROLE.find((u) => u.user_id === id)?.role_id,
  );
export function allowedPrograms(userId: string) {
  const role = userRole(userId)?.role_id;
  return data.PROGRAM.filter(
    (p) =>
      ["ROL-01", "ROL-02"].includes(role || "") ||
      data.USER_PROGRAM_ACCESS.some(
        (a) => a.user_id === userId && a.program_id === p.program_id,
      ),
  );
}
export function canEdit(userId: string, programId: string) {
  return (
    userRole(userId)?.role_id === "ROL-02" ||
    (["ROL-03", "ROL-04"].includes(userRole(userId)?.role_id || "") &&
      data.USER_PROGRAM_ACCESS.some(
        (a) =>
          a.user_id === userId &&
          a.program_id === programId &&
          a.access_level === "Edit",
      ))
  );
}
export interface Filters {
  program?: string;
  year?: string;
  classification?: string;
  status?: string;
  search?: string;
}
export function filterConcerns(
  concerns: Concern[],
  filters: Filters,
  scope: Program[],
) {
  return concerns
    .filter(
      (c) =>
        scope.some((p) => p.program_id === c.program_id) &&
        (!filters.program || c.program_id === filters.program) &&
        (!filters.year || academicYear(c.identified_date) === filters.year) &&
        (!filters.classification ||
          c.classification === filters.classification) &&
        (!filters.status ||
          (filters.status === "Open"
            ? isOpen(c)
            : c.status === filters.status)) &&
        (!filters.search ||
          `${residentName(c.resident_id)} ${c.summary} ${c.concern_id}`
            .toLowerCase()
            .includes(filters.search.toLowerCase())),
    )
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}
export function summary(concerns: Concern[]) {
  return {
    total: concerns.length,
    reviewable: concerns.filter((c) => c.classification === "Reviewable")
      .length,
    nonReviewable: concerns.filter((c) => c.classification === "Non-Reviewable")
      .length,
    open: concerns.filter(isOpen).length,
    closed: concerns.filter((c) => c.status === "Closed").length,
    escalated: concerns.filter((c) => c.status === "Escalated").length,
  };
}
export function updateConcern(
  record: Concern,
  changes: { classification: string; status: string; note: string },
  userId: string,
  now = new Date().toISOString(),
): { record: Concern; updates: ConcernUpdate[] } {
  if (!canEdit(userId, record.program_id))
    throw new Error("Your demo role cannot edit this program.");
  if (
    !classifications.includes(changes.classification) ||
    !statuses.includes(changes.status) ||
    !changes.note.trim()
  )
    throw new Error("Choose valid values and enter an update note.");
  const base = {
    concern_id: record.concern_id,
    updated_by: userId,
    updated_at: now,
    previous_classification: null,
    new_classification: null,
  };
  const updates: ConcernUpdate[] = [];
  if (record.classification !== changes.classification)
    updates.push({
      ...base,
      update_id: crypto.randomUUID(),
      update_type: "Classification Change",
      previous_classification: record.classification,
      new_classification: changes.classification,
      note: changes.note.trim(),
    });
  if (record.status !== changes.status)
    updates.push({
      ...base,
      update_id: crypto.randomUUID(),
      update_type: "Status Change",
      note: `${record.status} → ${changes.status}. ${changes.note.trim()}`,
    });
  if (!updates.length)
    updates.push({
      ...base,
      update_id: crypto.randomUUID(),
      update_type: "Note",
      note: changes.note.trim(),
    });
  return {
    record: {
      ...record,
      classification: changes.classification,
      status: changes.status,
      closed_date:
        changes.status === "Closed"
          ? record.closed_date || now.slice(0, 10)
          : null,
      updated_at: now,
    },
    updates,
  };
}
export function csvFor(concerns: Concern[]) {
  const rows = [
    [
      "Concern ID",
      "Resident",
      "Program",
      "Summary",
      "Classification",
      "Status",
      "Academic year",
      "Identified",
      "Updated",
    ],
    ...concerns.map((c) => [
      c.concern_id,
      residentName(c.resident_id),
      programName(c.program_id),
      c.summary,
      c.classification,
      c.status,
      academicYear(c.identified_date),
      c.identified_date,
      c.updated_at,
    ]),
  ];
  return rows
    .map((row) =>
      row
        .map(
          (v) =>
            `"${(/^[=+@\-\t\r]/.test(v) ? "'" : "") + v.replaceAll('"', '""')}"`,
        )
        .join(","),
    )
    .join("\r\n");
}
