import { useSyncExternalStore } from "react";
import { data, canEdit, userRole } from "./repository";
import type {
  ActivityEntry,
  CohortParticipant,
  Lineage,
  SyncRun,
  ReviewAction,
  DocumentMetadata,
  GrowthOpportunity,
  GrowthUpdate,
} from "./types";
import {
  recruitmentFixture,
  initialMatches,
  cohortFixture,
  demoPolicy,
  traineeSurveyFixture,
  operationsFixture,
  leadershipFixture,
  growthFixture,
  growthUpdateFixture,
  growthStatuses,
} from "./demo-fixtures";

data.APPLICANT.push(...structuredClone(recruitmentFixture));
data.MATCH_OUTCOME.push(...structuredClone(initialMatches));
export const extensionState = {
  activities: [] as ActivityEntry[],
  cohort: structuredClone(cohortFixture) as CohortParticipant[],
  syncRuns: [] as SyncRun[],
  lineage: [] as Lineage[],
  busyProvider: "",
  progress: "",
  traineeSurveys: structuredClone(traineeSurveyFixture),
  operations: structuredClone(operationsFixture),
  leadership: structuredClone(leadershipFixture),
  growth: structuredClone(growthFixture) as GrowthOpportunity[],
  growthUpdates: structuredClone(growthUpdateFixture) as GrowthUpdate[],
};
let revision = 0;
const listeners = new Set<() => void>();
export function notifyDataChanged() {
  revision++;
  listeners.forEach((listener) => listener());
}
export function useDataRevision() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => revision,
  );
}
export const today = () => new Date().toLocaleDateString("en-CA");
export function assertEdit(userId: string, programId: string) {
  if (!canEdit(userId, programId))
    throw new Error("Your demo role cannot edit this program.");
}
export function assertSync(userId: string) {
  if (!["ROL-01", "ROL-02"].includes(userRole(userId)?.role_id || ""))
    throw new Error("Institutional demo roles can run simulated integrations.");
}
export function addActivity(
  entityType: string,
  entityId: string,
  programId: string,
  userId: string,
  kind: string,
  note: string,
  previousStatus?: string,
  newStatus?: string,
) {
  extensionState.activities.push({
    id: crypto.randomUUID(),
    entityType,
    entityId,
    programId,
    userId,
    kind,
    note,
    previousStatus,
    newStatus,
    at: new Date().toISOString(),
  });
}
export function saveGrowthOpportunity(
  fields: Omit<GrowthOpportunity, "id" | "createdAt" | "updatedAt">,
  userId: string,
  id?: string,
) {
  assertEdit(userId, fields.programId);
  if (
    !fields.title.trim() ||
    !growthStatuses.includes(fields.status) ||
    !fields.category ||
    !fields.identifiedDate
  )
    throw new Error("Enter a title, category, status and identified date.");
  const existing = id
    ? extensionState.growth.find((g) => g.id === id)
    : undefined;
  if (id && !existing) throw new Error("Growth opportunity not found.");
  const record: GrowthOpportunity = {
    ...fields,
    title: fields.title.trim(),
    id: id || `GO-DEMO-${crypto.randomUUID()}`,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (existing) Object.assign(existing, record);
  else extensionState.growth.push(record);
  addActivity(
    "GROWTH_OPPORTUNITY",
    record.id,
    record.programId,
    userId,
    existing ? "Growth Opportunity Updated" : "Growth Opportunity Created",
    record.title,
    existing?.status,
    record.status,
  );
  notifyDataChanged();
  return record;
}
export function addGrowthUpdate(
  opportunityId: string,
  note: string,
  userId: string,
  status?: string,
) {
  const growth = extensionState.growth.find((g) => g.id === opportunityId);
  if (!growth) throw new Error("Growth opportunity not found.");
  assertEdit(userId, growth.programId);
  if (!note.trim()) throw new Error("Enter an update note.");
  const previousStatus = growth.status;
  if (status && growthStatuses.includes(status)) growth.status = status;
  growth.updatedAt = new Date().toISOString();
  extensionState.growthUpdates.push({
    id: `GU-DEMO-${crypto.randomUUID()}`,
    opportunityId,
    at: growth.updatedAt,
    note: note.trim(),
    userId,
    previousStatus,
    newStatus: status || undefined,
  });
  addActivity(
    "GROWTH_OPPORTUNITY",
    opportunityId,
    growth.programId,
    userId,
    "Growth Update",
    note.trim(),
    previousStatus,
    status || previousStatus,
  );
  notifyDataChanged();
}
export function saveReviewStatus(
  id: string,
  status: string,
  note: string,
  userId: string,
) {
  const review = data.SPECIAL_REVIEW.find((r) => r.review_id === id);
  if (!review) throw new Error("Review not found.");
  assertEdit(userId, review.program_id);
  if (!["In Progress", "Closed"].includes(status) || !note.trim())
    throw new Error("Choose a status and enter an update note.");
  addActivity(
    "SPECIAL_REVIEW",
    id,
    review.program_id,
    userId,
    "Status Update",
    note.trim(),
    review.status,
    status,
  );
  review.status = status;
  review.closed_date =
    status === "Closed" ? review.closed_date || today() : null;
  notifyDataChanged();
}
export function saveAction(
  reviewId: string,
  fields: Pick<
    ReviewAction,
    "title" | "assigned_to" | "due_date" | "status" | "description" | "notes"
  >,
  userId: string,
  id?: string,
) {
  const review = data.SPECIAL_REVIEW.find((r) => r.review_id === reviewId);
  if (!review) throw new Error("Review not found.");
  assertEdit(userId, review.program_id);
  if (
    !fields.title.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fields.due_date) ||
    !data.USER.some((u) => u.user_id === fields.assigned_to) ||
    !["Open", "In Progress", "Overdue", "Complete"].includes(fields.status)
  )
    throw new Error("Enter a title, valid owner, deadline and status.");
  const existing = id
    ? data.ACTION_ITEM.find(
        (a) => a.action_item_id === id && a.review_id === reviewId,
      )
    : undefined;
  if (id && !existing) throw new Error("Action item not found.");
  const record = {
    action_item_id: id || `ACT-DEMO-${crypto.randomUUID()}`,
    review_id: reviewId,
    ...fields,
    title: fields.title.trim(),
    created_at: existing ? existing.created_at : new Date().toISOString(),
    completed_date:
      fields.status === "Complete" ? existing?.completed_date || today() : null,
  };
  addActivity(
    "SPECIAL_REVIEW",
    reviewId,
    review.program_id,
    userId,
    existing ? "Action Updated" : "Action Created",
    existing
      ? `${existing.title} (${existing.due_date}, ${existing.status}) → ${record.title} (${record.due_date}, ${record.status}); owner ${record.assigned_to}. Description: ${existing.description || "Not recorded"} → ${record.description || "Not recorded"}. Notes: ${existing.notes || "Not recorded"} → ${record.notes || "Not recorded"}`
      : `${record.title} · due ${record.due_date}${record.description ? ` · ${record.description}` : ""}${record.notes ? ` · ${record.notes}` : ""}`,
  );
  if (existing) Object.assign(existing, record);
  else data.ACTION_ITEM.push(record);
  notifyDataChanged();
}
export function addFollowUp(
  reviewId: string,
  activityDate: string,
  description: string,
  userId: string,
  activityType = "",
) {
  const review = data.SPECIAL_REVIEW.find((r) => r.review_id === reviewId);
  if (!review) throw new Error("Review not found.");
  assertEdit(userId, review.program_id);
  if (!activityDate || !description.trim())
    throw new Error("Enter an activity date and description.");
  data.FOLLOWUP_ACTIVITY.push({
    activity_id: `FUA-DEMO-${crypto.randomUUID()}`,
    activity_type: activityType.trim() || undefined,
    review_id: reviewId,
    activity_date: activityDate,
    description: description.trim(),
    created_by: userId,
  });
  addActivity(
    "SPECIAL_REVIEW",
    reviewId,
    review.program_id,
    userId,
    "Follow-Up Added",
    `${activityDate}: ${description.trim()}`,
  );
  notifyDataChanged();
}
export function documentFromFile(
  file: File,
  type: string,
  id: string,
  userId: string,
  description: string,
): DocumentMetadata {
  const extensions = /\.(pdf|doc|docx|png|jpe?g)$/i;
  if (
    !file.name ||
    !file.size ||
    file.size > demoPolicy.maxUploadBytes ||
    !extensions.test(file.name)
  )
    throw new Error(
      "Choose a nonempty PDF, DOC, DOCX, PNG or JPG up to 10 MB.",
    );
  return {
    document_id: `DOC-DEMO-${crypto.randomUUID()}`,
    entity_type: type,
    entity_id: id,
    file_name: file.name,
    file_type: file.type || "application/octet-stream",
    file_size: file.size,
    file_path: "demo://metadata-only",
    uploaded_by: userId,
    uploaded_at: new Date().toISOString(),
    source: "MANUAL_UPLOAD",
    description,
  };
}
export function uploadReviewDocument(
  id: string,
  file: File,
  description: string,
  userId: string,
) {
  const review = data.SPECIAL_REVIEW.find((r) => r.review_id === id);
  if (!review) throw new Error("Review not found.");
  assertEdit(userId, review.program_id);
  const doc = documentFromFile(file, "SPECIAL_REVIEW", id, userId, description);
  data.DOCUMENT.push(doc);
  addActivity(
    "SPECIAL_REVIEW",
    id,
    review.program_id,
    userId,
    "Document Added",
    file.name,
  );
  notifyDataChanged();
}
export function uploadAPE(
  programId: string,
  year: string,
  file: File,
  kind: "primary" | "supporting",
  notes: string,
  userId: string,
) {
  assertEdit(userId, programId);
  if (!/^\d{4}-\d{2}$/.test(year))
    throw new Error("Choose a valid academic year.");
  let record = data.APE.find(
    (a) => a.program_id === programId && a.academic_year === year,
  );
  if (kind === "supporting" && !record?.submitted_date)
    throw new Error("Upload the Annual Program Evaluation first.");
  const id = record?.ape_id || `APE-DEMO-${crypto.randomUUID()}`;
  const doc = documentFromFile(
    file,
    "APE",
    id,
    userId,
    kind === "primary"
      ? `Annual Program Evaluation ${year}`
      : "Supporting documentation",
  );
  if (!record) {
    record = {
      ape_id: id,
      program_id: programId,
      academic_year: year,
      submitted_date: null,
      uploaded_by: null,
      status: "Not Submitted",
      notes: "",
    };
    data.APE.push(record);
  }
  if (kind === "primary") {
    record.submitted_date = today();
    record.uploaded_by = userId;
    record.status = "Submitted";
  }
  if (notes.trim()) record.notes = notes.trim();
  data.DOCUMENT.push(doc);
  addActivity(
    "APE",
    id,
    programId,
    userId,
    kind === "primary" ? "APE Uploaded" : "Supporting Document Added",
    `${file.name}${notes.trim() ? ` · ${notes.trim()}` : ""}`,
  );
  notifyDataChanged();
}
