import { useState } from "react";
import { Card, Badge, Empty } from "./shared";
import {
  ModuleHeading,
  DataTable,
  Stats,
  type ModuleProps,
} from "./module-shared";
import { integrationProviders } from "../data/integration-providers";
import { extensionState } from "../data/extension-store";
import { userRole, date, programName } from "../data/repository";
export default function Integrations({ userId, navigate, toast }: ModuleProps) {
  const [selected, setSelected] = useState("");
  const [scenario, setScenario] = useState<"normal" | "failure">("normal");
  const institutional = ["ROL-01", "ROL-02"].includes(
    userRole(userId)?.role_id || "",
  );
  if (!institutional)
    return (
      <Empty>
        Integration operations and institutional sync history are available to
        institutional demo roles.
      </Empty>
    );
  const run = extensionState.syncRuns.find((r) => r.id === selected);
  return (
    <>
      <ModuleHeading
        eyebrow="Administration"
        title="Integration Center"
        description="Demonstration connectors using local fixtures. No external services are contacted."
      />
      <div className="module-notice">
        NRMP is a simulated integration. New Innovations represents a planned
        integration; its production transport mechanism is not yet defined.
      </div>
      <div className="module-filters">
        <label className="module-filter">
          <span>Simulation Scenario</span>
          <select
            value={scenario}
            onChange={(e) =>
              setScenario(e.target.value as "normal" | "failure")
            }
          >
            <option value="normal">Apply Payload (With Validation)</option>
            <option value="failure">Demonstrate Source Failure</option>
          </select>
        </label>
      </div>
      <div className="module-grid two">
        {integrationProviders.map((provider) => {
          const status = provider.getStatus();
          return (
            <Card
              key={provider.name}
              title={provider.name}
              subtitle={
                provider.name === "NRMP"
                  ? "Recruitment & Match Data · Demonstration Connector"
                  : "Received Program Compliance Results · Mock Connector"
              }
            >
              <div className="integration-content">
                <Badge tone="blue">Simulated Integration</Badge>
                <dl>
                  <div>
                    <dt>Last Successful Sync</dt>
                    <dd>
                      {status.lastSuccessful
                        ? new Date(
                            status.lastSuccessful.completedAt,
                          ).toLocaleString()
                        : "Not run in this session"}
                    </dd>
                  </div>
                  <div>
                    <dt>Last Attempt</dt>
                    <dd>
                      {status.lastAttempt
                        ? new Date(
                            status.lastAttempt.startedAt,
                          ).toLocaleString()
                        : "Not attempted"}
                    </dd>
                  </div>
                  <div>
                    <dt>Last Result</dt>
                    <dd>{status.lastAttempt?.status || "Ready to simulate"}</dd>
                  </div>
                  <div>
                    <dt>Records Received</dt>
                    <dd>
                      {status.lastAttempt?.recordsReceived ?? "Not recorded"}
                    </dd>
                  </div>
                </dl>
                <button
                  className="button primary"
                  disabled={!!extensionState.busyProvider}
                  onClick={async () => {
                    try {
                      const result = await provider.sync(userId, scenario);
                      setSelected(result.id);
                      toast(`${provider.name}: ${result.status}`);
                    } catch (e) {
                      toast((e as Error).message);
                    }
                  }}
                >
                  Simulate{" "}
                  {provider.name === "NRMP" ? "NRMP" : "New Innovations"} Sync
                </button>
                {status.busy && (
                  <div className="sync-progress" role="status">
                    <progress aria-label="Simulated sync in progress" />
                    <p>{extensionState.progress}</p>
                  </div>
                )}
                <p className="form-hint">
                  {provider.name === "NRMP"
                    ? "Applies a deterministic 2027 future-cycle demo payload. Repeating the sync skips unchanged records."
                    : "Imports a prepared General Surgery compliance result. No duty-hour logs or calculations are created."}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
      <Card
        title="Manual / File Imports"
        subtitle="Document metadata can be uploaded directly to a review or evaluation"
      >
        <div className="module-links">
          <button className="button" onClick={() => navigate("reviews")}>
            Review Documents
          </button>
          <button className="button" onClick={() => navigate("ape")}>
            APE Uploads
          </button>
        </div>
      </Card>
      <Card
        title="Sync History"
        subtitle="Runs retained for this browser session"
      >
        <DataTable
          headers={[
            "Provider",
            "Started",
            "Completed",
            "Status",
            "Created",
            "Updated",
            "Skipped",
            "Details",
          ]}
          empty={!extensionState.syncRuns.length}
        >
          {extensionState.syncRuns.map((r) => (
            <tr key={r.id}>
              <td>{r.provider}</td>
              <td>{new Date(r.startedAt).toLocaleString()}</td>
              <td>{new Date(r.completedAt).toLocaleTimeString()}</td>
              <td>
                <Badge>{r.status}</Badge>
              </td>
              <td>{r.recordsCreated}</td>
              <td>{r.recordsUpdated}</td>
              <td>{r.recordsSkipped}</td>
              <td>
                <button
                  className="text-button"
                  onClick={() => setSelected(r.id)}
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
      {run && (
        <Card
          title={`${run.provider} Sync Details`}
          subtitle={`${run.status} · Reporting year ${run.academicYear} · ${((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000).toFixed(1)} seconds`}
        >
          <Stats
            items={[
              { label: "Received", value: run.recordsReceived },
              { label: "Created", value: run.recordsCreated },
              { label: "Updated", value: run.recordsUpdated },
              { label: "Skipped", value: run.recordsSkipped },
            ]}
          />
          <div className="review-content">
            <p>
              Programs affected:{" "}
              {run.programIds.length
                ? run.programIds
                    .map((id) =>
                      id === "Institutional"
                        ? "Institutional cohort"
                        : programName(id),
                    )
                    .join(", ")
                : "None"}
            </p>
            {run.warnings.map((w, i) => (
              <p key={i}>Warning: {w}</p>
            ))}
            {run.errors.map((e, i) => (
              <p role="alert" key={i}>
                {e}
              </p>
            ))}
          </div>
          <DataTable
            headers={[
              "Entity",
              "Source Record",
              "Source System",
              "Imported",
              "Sync Run",
            ]}
            empty={!extensionState.lineage.some((l) => l.syncRunId === run.id)}
          >
            {extensionState.lineage
              .filter((l) => l.syncRunId === run.id)
              .map((l) => (
                <tr key={`${l.entity}-${l.recordId}`}>
                  <td>{l.entity}</td>
                  <td>{l.sourceRecordId}</td>
                  <td>{l.sourceSystem}</td>
                  <td>{date(l.importedAt)}</td>
                  <td>{l.syncRunId.slice(0, 8)}</td>
                </tr>
              ))}
          </DataTable>
        </Card>
      )}
    </>
  );
}
