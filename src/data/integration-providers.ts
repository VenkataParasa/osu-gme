import { data } from "./repository";
import {
  extensionState,
  assertSync,
  notifyDataChanged,
} from "./extension-store";
import {
  nrmpPayload,
  cohortSyncFixture,
  niComplianceFixture,
} from "./demo-fixtures";
import type { Applicant, MatchOutcome, SyncRun } from "./types";
export interface RecruitmentDataProvider {
  getApplicants(): Applicant[];
  getMatchOutcomes(): MatchOutcome[];
}
export class JsonRecruitmentProvider implements RecruitmentDataProvider {
  getApplicants() {
    return data.APPLICANT;
  }
  getMatchOutcomes() {
    return data.MATCH_OUTCOME;
  }
}
export interface IntegrationProvider {
  name: string;
  getStatus(): {
    mode: "Simulated";
    lastSuccessful: SyncRun | undefined;
    lastAttempt: SyncRun | undefined;
    busy: boolean;
  };
  getSyncHistory(): SyncRun[];
  sync(userId: string, scenario?: "normal" | "failure"): Promise<SyncRun>;
}
abstract class MockProvider implements IntegrationProvider {
  abstract name: string;
  abstract academicYear: string;
  abstract steps: string[];
  getSyncHistory() {
    return extensionState.syncRuns.filter((r) => r.provider === this.name);
  }
  getStatus() {
    const history = this.getSyncHistory();
    return {
      mode: "Simulated" as const,
      lastSuccessful: history.find((r) => r.status !== "Failed"),
      lastAttempt: history[0],
      busy: extensionState.busyProvider === this.name,
    };
  }
  abstract apply(run: SyncRun): void;
  async sync(userId: string, scenario: "normal" | "failure" = "normal") {
    assertSync(userId);
    if (extensionState.busyProvider)
      throw new Error("A simulated sync is already running.");
    const run: SyncRun = {
      id: crypto.randomUUID(),
      provider: this.name,
      academicYear: this.academicYear,
      startedAt: new Date().toISOString(),
      completedAt: "",
      status: "Completed",
      programIds: [],
      recordsReceived: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      warnings: [],
      errors: [],
    };
    extensionState.busyProvider = this.name;
    try {
      for (const step of this.steps) {
        extensionState.progress = step;
        notifyDataChanged();
        await new Promise((resolve) => setTimeout(resolve, 180));
      }
      if (scenario === "failure")
        throw new Error(
          "Demo failure fixture: source payload is unavailable. No records were changed.",
        );
      this.apply(run);
      run.status = run.warnings.length
        ? "Completed with warnings"
        : "Completed";
    } catch (error) {
      run.status = "Failed";
      run.errors.push((error as Error).message);
    } finally {
      run.completedAt = new Date().toISOString();
      extensionState.syncRuns.unshift(run);
      extensionState.busyProvider = "";
      extensionState.progress = "";
      notifyDataChanged();
    }
    return run;
  }
  lineage(run: SyncRun, entity: string, id: string, programId: string) {
    if (!run.programIds.includes(programId)) run.programIds.push(programId);
    extensionState.lineage.push({
      entity,
      recordId: id,
      programId,
      sourceSystem:
        this.name === "NRMP" ? "NRMP_SIMULATION" : "NEW_INNOVATIONS",
      sourceRecordId: id,
      importedAt: run.startedAt,
      syncRunId: run.id,
    });
  }
}
export class MockNRMPProvider extends MockProvider {
  name = "NRMP";
  academicYear = "2027";
  steps = [
    "Connecting to simulated NRMP source…",
    "Receiving recruitment data…",
    "Validating records and matching programs…",
    "Processing rankings and Match outcomes…",
    "Updating institutional analytics…",
  ];
  apply(run: SyncRun) {
    const seen = new Set<string>();
    for (const incoming of nrmpPayload.applicants) {
      run.recordsReceived++;
      const cycle = data.RECRUITMENT_CYCLE.find(
        (c) => c.cycle_id === incoming.cycle_id,
      );
      if (!cycle) {
        run.recordsSkipped++;
        run.warnings.push(
          `${incoming.applicant_id}: missing cycle/year association.`,
        );
        continue;
      }
      const existing = data.APPLICANT.find(
        (a) => a.applicant_id === incoming.applicant_id,
      );
      if (existing && JSON.stringify(existing) === JSON.stringify(incoming)) {
        run.recordsSkipped++;
        continue;
      }
      if (existing) {
        Object.assign(existing, incoming);
        run.recordsUpdated++;
      } else {
        data.APPLICANT.push(structuredClone(incoming));
        run.recordsCreated++;
      }
      this.lineage(run, "APPLICANT", incoming.applicant_id, cycle.program_id);
    }
    for (const incoming of nrmpPayload.outcomes) {
      run.recordsReceived++;
      if (seen.has(incoming.match_id)) {
        run.recordsSkipped++;
        run.warnings.push(`${incoming.match_id}: duplicate source record.`);
        continue;
      }
      seen.add(incoming.match_id);
      const applicant = data.APPLICANT.find(
          (a) => a.applicant_id === incoming.applicant_id,
        ),
        cycle = data.RECRUITMENT_CYCLE.find(
          (c) => c.cycle_id === applicant?.cycle_id,
        );
      if (
        !data.PROGRAM.some((p) => p.program_id === incoming.program_id) ||
        cycle?.program_id !== incoming.program_id
      ) {
        run.recordsSkipped++;
        run.warnings.push(
          `${incoming.match_id}: unknown or mismatched program association.`,
        );
        continue;
      }
      const existing = data.MATCH_OUTCOME.find(
        (m) => m.match_id === incoming.match_id,
      );
      if (existing && JSON.stringify(existing) === JSON.stringify(incoming)) {
        run.recordsSkipped++;
        continue;
      }
      if (existing) {
        Object.assign(existing, incoming);
        run.recordsUpdated++;
      } else {
        data.MATCH_OUTCOME.push(structuredClone(incoming));
        run.recordsCreated++;
      }
      this.lineage(
        run,
        "MATCH_OUTCOME",
        incoming.match_id,
        incoming.program_id,
      );
    }
    for (const incoming of cohortSyncFixture) {
      run.recordsReceived++;
      const existing = extensionState.cohort.find(
        (c) => c.studentId === incoming.studentId && c.year === incoming.year,
      );
      if (existing?.outcome === incoming.outcome) {
        run.recordsSkipped++;
        continue;
      }
      if (existing) {
        Object.assign(existing, incoming);
        run.recordsUpdated++;
      } else {
        extensionState.cohort.push({ ...incoming });
        run.recordsCreated++;
      }
      this.lineage(run, "DEMO_OSU_COHORT", incoming.studentId, "Institutional");
    }
  }
}
export interface NewInnovationsProvider extends IntegrationProvider {}
export class MockNewInnovationsProvider
  extends MockProvider
  implements NewInnovationsProvider
{
  name = "New Innovations";
  academicYear = "2026-27";
  steps = [
    "Connecting to simulated New Innovations source…",
    "Receiving configured compliance results…",
    "Validating program associations…",
    "Updating received compliance information…",
  ];
  apply(run: SyncRun) {
    run.recordsReceived = 1;
    const existing = data.DUTY_HOUR_COMPLIANCE.find(
      (d) => d.compliance_id === niComplianceFixture.compliance_id,
    );
    if (
      existing &&
      JSON.stringify(existing) === JSON.stringify(niComplianceFixture)
    ) {
      run.recordsSkipped = 1;
      return;
    }
    if (existing) {
      Object.assign(existing, niComplianceFixture);
      run.recordsUpdated = 1;
    } else {
      data.DUTY_HOUR_COMPLIANCE.push({ ...niComplianceFixture });
      run.recordsCreated = 1;
    }
    this.lineage(
      run,
      "DUTY_HOUR_COMPLIANCE",
      niComplianceFixture.compliance_id,
      niComplianceFixture.program_id,
    );
  }
}
export const integrationProviders: IntegrationProvider[] = [
  new MockNRMPProvider(),
  new MockNewInnovationsProvider(),
];
