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
}
