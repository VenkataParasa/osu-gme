// Interfaces reflect the supplied JSON contract. Original seed data is preserved unchanged.
export interface Program {
  program_id: string;
  name: string;
  type: string;
  accreditation_status: string;
  accreditation_since: string;
  slot_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface Resident {
  resident_id: string;
  ni_resident_id: string;
  program_id: string;
  full_name: string;
  degree_type: string;
  pgy_level: number;
  start_date: string;
  graduation_date: string;
  status: string;
  source_system: string;
  last_synced_at: string;
}
export interface Concern {
  concern_id: string;
  resident_id: string;
  program_id: string;
  created_by: string;
  identified_date: string;
  classification: string;
  status: string;
  summary: string;
  closed_date: null | string;
  created_at: string;
  updated_at: string;
}
export interface ConcernUpdate {
  update_id: string;
  concern_id: string;
  updated_by: string;
  updated_at: string;
  update_type: string;
  note: string;
  previous_classification: null | string;
  new_classification: null | string;
}
export interface BoardMetric {
  board_metric_id: string;
  program_id: string;
  reporting_year: number;
  board_type: string;
  eligible_count: number;
  passed_count: number;
  pass_rate: number;
  three_year_pass_rate: number;
  source_document_id: null | string;
  source: string;
  imported_at: string;
  notes: string;
}
export interface DutyCompliance {
  compliance_id: string;
  program_id: string;
  academic_period: string;
  compliance_status: string;
  compliance_rate: number;
  source_system: string;
  source_reference: string;
  imported_at: string;
  notes: string;
}
export interface SpecialReview {
  review_id: string;
  program_id: string;
  initiated_date: string;
  trigger_reason: string;
  status: string;
  summary: string;
  created_by: string;
  closed_date: null | string;
}
export interface DocumentMetadata {
  document_id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  uploaded_by: string;
  uploaded_at: string;
  source: string;
  description: string;
}
export interface User {
  user_id: string;
  name: string;
  email: string;
  auth_type: string;
  is_active: boolean;
  account_expires_at: null | string;
  created_at: string;
  updated_at: string;
}
export interface Role {
  role_id: string;
  role_name: string;
  description: string;
}
export interface UserRole {
  user_id: string;
  role_id: string;
  assigned_at: string;
}
export interface ProgramAccess {
  user_id: string;
  program_id: string;
  access_level: string;
  assigned_at: string;
}
export interface Dataset {
  PROGRAM: Program[];
  RESIDENT: Resident[];
  CONCERN_RECORD: Concern[];
  CONCERN_UPDATE: ConcernUpdate[];
  BOARD_PASS_METRIC: BoardMetric[];
  DUTY_HOUR_COMPLIANCE: DutyCompliance[];
  SPECIAL_REVIEW: SpecialReview[];
  DOCUMENT: DocumentMetadata[];
  USER: User[];
  ROLE: Role[];
  USER_ROLE: UserRole[];
  USER_PROGRAM_ACCESS: ProgramAccess[];
  RECRUITMENT_CYCLE: RecruitmentCycle[];
  APPLICANT: Applicant[];
  MATCH_OUTCOME: MatchOutcome[];
  ACTION_ITEM: ReviewAction[];
  FOLLOWUP_ACTIVITY: FollowUp[];
  APE: AnnualEvaluation[];
}

export interface RecruitmentCycle {
  cycle_id: string;
  program_id: string;
  application_year: number;
  start_date: string;
  end_date: string;
  status: string;
}
export interface Applicant {
  applicant_id: string;
  cycle_id: string;
  eras_applicant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  medical_school: string;
  degree_type: string;
  status: string;
  created_at: string;
  hometown_city: string;
  hometown_state: string;
  rank_position: number | null;
  is_osu_student: boolean;
}
export interface MatchOutcome {
  match_id: string;
  applicant_id: string;
  program_id: string;
  match_result: string;
  match_date: string;
  position_type: string;
  notes: string;
}
export interface ReviewAction {
  action_item_id: string;
  review_id: string;
  assigned_to: string;
  title: string;
  due_date: string;
  status: string;
  completed_date: string | null;
  // Optional session-entry fields; absent source values remain absent.
  description?: string;
  notes?: string;
  created_at?: string;
}
export interface FollowUp {
  activity_id: string;
  review_id: string;
  activity_date: string;
  description: string;
  created_by: string;
  activity_type?: string;
}
export interface AnnualEvaluation {
  ape_id: string;
  program_id: string;
  academic_year: string;
  submitted_date: string | null;
  uploaded_by: string | null;
  status: string;
  notes: string;
}
export interface TraineeSurvey {
  id: string;
  programId: string;
  academicYear: string;
  eligible: number;
  responses: number;
  wellbeing: number;
  support: number;
  environment: number;
  surveyedAt: string;
  source: string;
}
export interface OperationalMetric {
  id: string;
  programId: string;
  academicYear: string;
  traineeCount: number;
  documentStatus: string;
  followUpOpen: number;
  updatedAt: string;
  source: string;
}
export interface FacultyLeadership {
  id: string;
  programId: string;
  personDisplayName: string;
  role: string;
  category: "Program Leadership" | "Core Faculty";
  startDate: string;
  endDate: string | null;
  source: string;
  notes: string;
}
export interface GrowthOpportunity {
  id: string;
  programId: string;
  title: string;
  category: string;
  description: string;
  status: string;
  identifiedDate: string;
  targetDate: string | null;
  ownerLabel: string;
  source: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
export interface GrowthUpdate {
  id: string;
  opportunityId: string;
  at: string;
  note: string;
  userId: string;
  previousStatus?: string;
  newStatus?: string;
}
// Demo-only additions are isolated from the original source contract.
export interface ActivityEntry {
  id: string;
  entityType: string;
  entityId: string;
  programId: string;
  at: string;
  userId: string;
  kind: string;
  note: string;
  previousStatus?: string;
  newStatus?: string;
}
export interface CohortParticipant {
  studentId: string;
  year: number;
  outcome: "Matched" | "Unmatched" | "Pending";
}
export interface Lineage {
  entity: string;
  recordId: string;
  programId: string;
  sourceSystem: string;
  sourceRecordId: string;
  importedAt: string;
  syncRunId: string;
}
export interface SyncRun {
  id: string;
  provider: string;
  startedAt: string;
  completedAt: string;
  status: "Completed" | "Completed with warnings" | "Failed";
  academicYear: string;
  programIds: string[];
  recordsReceived: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  warnings: string[];
  errors: string[];
}
