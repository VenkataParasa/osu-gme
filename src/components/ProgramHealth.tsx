import { useState } from "react";
import { Card, Badge, Empty } from "./shared";
import {
  ModuleHeading,
  FilterSelect,
  Tabs,
  Stats,
  DataTable,
  ExportButton,
  Bars,
  type ModuleProps,
} from "./module-shared";
import {
  allowedPrograms,
  shortName,
  percent,
  canEdit,
  date,
  programName,
} from "../data/repository";
import {
  healthYears,
  healthDomains,
  institutionalHealth,
  programHealthSnapshot,
  attentionItems,
  growthRows,
  healthComparison,
  leadershipTenure,
} from "../data/program-health-selectors";
import {
  extensionState,
  saveGrowthOpportunity,
  addGrowthUpdate,
} from "../data/extension-store";
import { growthCategories, growthStatuses } from "../data/demo-fixtures";
const tone = (s: string) =>
  s === "Needs Review"
    ? "danger"
    : s === "Attention"
      ? "amber"
      : s === "Change"
        ? "blue"
        : undefined;
export default function ProgramHealth({
  userId,
  path,
  params,
  navigate,
  toast,
}: ModuleProps) {
  const section = path.split("/")[1] || "overview",
    detail = section === "program" ? path.split("/")[2] : undefined,
    report = path.startsWith("reports/");
  const year = params.get("year") || healthYears()[0] || "2025-26",
    domain = params.get("domain") || "",
    status = params.get("status") || "",
    scope = allowedPrograms(userId);
  const [chosen, setChosen] = useState<string[]>([]),
    [editing, setEditing] = useState("");
  const filter = (key: string, value: string) =>
    navigate(path, { ...Object.fromEntries(params), [key]: value });
  const snapshots = institutionalHealth(userId, year)
    .filter(
      (s) =>
        !params.get("program") ||
        s.program?.program_id === params.get("program"),
    )
    .filter((s) => !status || s.statuses.some((x) => x.status === status))
    .filter((s) => !domain || s.statuses.some((x) => x.domain === domain));
  const attention = attentionItems(userId, year);
  const growth = growthRows(userId, {
    program: params.get("program") || "",
    category: params.get("category") || "",
    status: params.get("growthStatus") || "",
  });
  const csv = snapshots.map((s) => [
    s.program?.name || "",
    ...s.statuses.map((d) => d.status),
    s.attention.length,
  ]);
  if (detail) {
    const snapshot = programHealthSnapshot(userId, detail, year);
    if (!snapshot.program)
      return (
        <Empty>Program not found or outside your demo role’s scope.</Empty>
      );
    const visible = path.split("/")[3] || "snapshot";
    const indicators =
      visible === "snapshot"
        ? snapshot.indicators
        : snapshot.indicators.filter((i) => i.domain.toLowerCase() === visible);
    const survey = extensionState.traineeSurveys.filter(
      (s) => s.programId === detail,
    );
    const leadership = extensionState.leadership.filter(
      (l) => l.programId === detail,
    );
    const current = leadership.filter((l) => !l.endDate);
    const ops = extensionState.operations.find(
      (o) => o.programId === detail && o.academicYear === year,
    );
    const opportunities = growthRows(userId, { program: detail });
    const editable = canEdit(userId, detail);
    return (
      <>
        <button
          className="back-link"
          onClick={() => navigate("health", { year })}
        >
          ← Program Health
        </button>
        <ModuleHeading
          eyebrow="Program Health Snapshot"
          title={shortName(snapshot.program.name)}
          description={`${snapshot.program.type} · ${year} · transparent, source-linked monitoring`}
        >
          <Badge
            tone={
              snapshot.attention.some((i) => i.status === "Needs Review")
                ? "danger"
                : snapshot.attention.length
                  ? "amber"
                  : "green"
            }
          >
            {snapshot.attention.length
              ? `${snapshot.attention.length} attention indicator(s)`
              : "On Track"}
          </Badge>
        </ModuleHeading>
        <Tabs
          current={visible}
          items={[
            { id: "snapshot", label: "Snapshot" },
            ...healthDomains.map((d) => ({
              id: d.toLowerCase(),
              label:
                d === "Trainees"
                  ? "Trainee Health"
                  : d === "Leadership"
                    ? "Faculty & Leadership"
                    : d,
            })),
          ]}
          onSelect={(id) =>
            navigate(
              id === "snapshot"
                ? `health/program/${detail}`
                : `health/program/${detail}/${id}`,
              { year },
            )
          }
        />
        {visible === "snapshot" && (
          <>
            <Stats
              items={snapshot.statuses.map((s) => ({
                label: s.domain === "Trainees" ? "Trainee Health" : s.domain,
                value: s.status,
              }))}
            />
            <Card
              title="Current Attention Items"
              subtitle="Factual indicators requiring leadership review"
            >
              <DataTable
                headers={["Domain", "Indicator", "Reason", "Source"]}
                empty={!snapshot.attention.length}
              >
                {snapshot.attention.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <Badge tone={tone(i.status)}>{i.domain}</Badge>
                    </td>
                    <td>{i.label}</td>
                    <td>{i.reason || i.value}</td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() =>
                          navigate(
                            i.sourcePath.split("?")[0],
                            Object.fromEntries(
                              new URLSearchParams(
                                i.sourcePath.split("?")[1] || "",
                              ),
                            ),
                          )
                        }
                      >
                        View source →
                      </button>
                    </td>
                  </tr>
                ))}
              </DataTable>
            </Card>
          </>
        )}
        {visible === "trainees" && (
          <>
            <div className="module-notice">
              Aggregate institutional survey fixture for demonstration only. It
              contains no individual health profiles, diagnoses, or clinical
              information.
            </div>
            <Card
              title="Institutional Trainee Health Survey"
              subtitle="Program-level aggregate response and dimension results"
            >
              <DataTable
                headers={[
                  "Period",
                  "Responses",
                  "Wellbeing",
                  "Program Support",
                  "Training Environment",
                  "Source",
                ]}
                empty={!survey.length}
              >
                {survey.map((s) => (
                  <tr key={s.id}>
                    <td>{s.academicYear}</td>
                    <td>
                      {s.responses} / {s.eligible} (
                      {percent(s.responses / s.eligible)})
                    </td>
                    <td>{s.wellbeing.toFixed(1)} / 5</td>
                    <td>{s.support.toFixed(1)} / 5</td>
                    <td>{s.environment.toFixed(1)} / 5</td>
                    <td>{s.source}</td>
                  </tr>
                ))}
              </DataTable>
            </Card>
          </>
        )}
        {visible === "operations" && (
          <Card
            title="Program Operations"
            subtitle="Configurable operational fixture; no workflow or SLA is implied"
          >
            <Stats
              items={[
                {
                  label: "Current Trainee Count",
                  value: ops?.traineeCount ?? "Not recorded",
                },
                {
                  label: "Document Status",
                  value: ops?.documentStatus ?? "No data",
                },
                {
                  label: "Open Follow-Up Items",
                  value: ops?.followUpOpen ?? "No data",
                },
              ]}
            />
          </Card>
        )}
        {visible === "recruitment" && (
          <Card
            title="Recruitment & Match"
            subtitle="Existing Recruitment Repository metrics"
          >
            <DataTable headers={["Indicator", "Value", "Source"]}>
              <>
                {indicators.map((i) => (
                  <tr key={i.id}>
                    <td>{i.label}</td>
                    <td>{i.value}</td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() =>
                          navigate(i.sourcePath.split("?")[0], {
                            year: year.slice(0, 4),
                          })
                        }
                      >
                        View Recruitment & Match →
                      </button>
                    </td>
                  </tr>
                ))}
              </>
            </DataTable>
          </Card>
        )}
        {visible === "leadership" && (
          <Card
            title="Faculty & Leadership"
            subtitle="Minimal Program Health fixture; no HR, credentialing, performance, or payroll data"
          >
            <DataTable
              headers={[
                "Person / Aggregate",
                "Role",
                "Start",
                "End",
                "Tenure",
                "Source",
              ]}
              empty={!leadership.length}
            >
              {leadership.map((l) => (
                <tr key={l.id}>
                  <td>{l.personDisplayName}</td>
                  <td>{l.role}</td>
                  <td>{date(l.startDate)}</td>
                  <td>{date(l.endDate)}</td>
                  <td>{leadershipTenure(l)}</td>
                  <td>{l.source}</td>
                </tr>
              ))}
            </DataTable>
            <p className="form-hint">
              Current leadership: {current.length || "Not recorded"} record(s).
              Historical records remain available after changes.
            </p>
          </Card>
        )}
        {visible === "growth" && (
          <GrowthView
            userId={userId}
            programId={detail}
            rows={opportunities}
            editable={editable}
            toast={toast}
          />
        )}{" "}
        {visible === "accreditation" && (
          <Card
            title="Accreditation & Compliance"
            subtitle="Existing program, Special Review, APE and received duty-hour records"
          >
            <DataTable headers={["Indicator", "Value", "Status", "Source"]}>
              <>
                {indicators.map((i) => (
                  <tr key={i.id}>
                    <td>{i.label}</td>
                    <td>{i.value}</td>
                    <td>
                      <Badge tone={tone(i.status)}>{i.status}</Badge>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() =>
                          navigate(
                            i.sourcePath.split("?")[0],
                            Object.fromEntries(
                              new URLSearchParams(
                                i.sourcePath.split("?")[1] || "",
                              ),
                            ),
                          )
                        }
                      >
                        View source →
                      </button>
                    </td>
                  </tr>
                ))}
              </>
            </DataTable>
          </Card>
        )}
      </>
    );
  }
  if (section === "comparison") {
    const comparison = healthComparison(userId, chosen, year);
    return (
      <>
        <ModuleHeading
          eyebrow="Program Health"
          title="Program Comparison"
          description="Compare factual indicators side-by-side. Programs are not ranked."
        >
          <button className="button" onClick={() => navigate("health")}>
            Institutional View
          </button>
        </ModuleHeading>
        <div className="module-filters">
          {scope.map((p) => (
            <label key={p.program_id}>
              <input
                type="checkbox"
                checked={chosen.includes(p.program_id)}
                onChange={(e) =>
                  setChosen((x) =>
                    e.target.checked
                      ? [...x, p.program_id].slice(0, 4)
                      : x.filter((id) => id !== p.program_id),
                  )
                }
              />
              {shortName(p.name)}
            </label>
          ))}
        </div>
        {!comparison.length ? (
          <Empty>
            Select two to four programs to compare their recorded indicators.
          </Empty>
        ) : (
          <DataTable
            headers={[
              "Program",
              "Board Pass",
              "Duty Hours",
              "Special Review",
              "Survey",
              "Recruitment",
              "Leadership",
              "Growth",
            ]}
          >
            {comparison.map((s) => (
              <tr key={s.program?.program_id}>
                <td>{shortName(s.program?.name || "")}</td>
                {[
                  "Latest board pass rate",
                  "Duty-hour compliance",
                  "Special Review",
                  "Aggregate trainee survey",
                  "Recruitment & Match",
                  "Current leadership",
                  "Open growth opportunities",
                ].map((label) => (
                  <td key={label}>
                    {s.indicators.find((i) => i.label === label)?.value ||
                      "Not recorded"}
                  </td>
                ))}
              </tr>
            ))}
          </DataTable>
        )}
      </>
    );
  }
  if (section === "growth")
    return (
      <>
        <ModuleHeading
          eyebrow="Program Health"
          title="Growth Opportunities"
          description="Lightweight, source-labelled opportunities across scoped programs."
        />
        <HealthFilters />
        <Stats
          items={[
            {
              label: "Open Opportunities",
              value: growth.filter(
                (g) => !["Completed", "Deferred"].includes(g.status),
              ).length,
            },
            {
              label: "In Progress",
              value: growth.filter((g) => g.status === "In Progress").length,
            },
            {
              label: "Completed",
              value: growth.filter((g) => g.status === "Completed").length,
            },
            {
              label: "Programs with Opportunities",
              value: new Set(growth.map((g) => g.programId)).size,
            },
          ]}
        />
        <GrowthView
          userId={userId}
          rows={growth}
          editable={false}
          toast={toast}
        />
      </>
    );
  return (
    <>
      <ModuleHeading
        eyebrow="Institutional Monitoring"
        title={report ? "Program Health Report" : "Program Health"}
        description="Institutional monitoring across accreditation, trainees, operations, recruitment, leadership and growth."
      >
        {report ? (
          <ExportButton
            name="program-health"
            headers={["Program", ...healthDomains, "Attention indicators"]}
            rows={csv}
          />
        ) : (
          <button
            className="button"
            onClick={() => navigate("health/comparison", { year })}
          >
            Compare Programs
          </button>
        )}
      </ModuleHeading>
      {!report && (
        <Tabs
          current={section}
          items={[
            { id: "overview", label: "Institutional Overview" },
            { id: "comparison", label: "Program Comparison" },
            { id: "growth", label: "Growth Opportunities" },
          ]}
          onSelect={(id) =>
            navigate(
              `health/${id === "overview" ? "" : id}`.replace(/\/$/, ""),
              { year },
            )
          }
        />
      )}
      <HealthFilters />
      <Stats
        items={[
          { label: "Programs Monitored", value: snapshots.length },
          {
            label: "Programs Requiring Attention",
            value: snapshots.filter((s) => s.attention.length).length,
          },
          {
            label: "Active Special Reviews",
            value: snapshots.filter(
              (s) =>
                s.indicators.find((i) => i.label === "Special Review")
                  ?.value === "Active",
            ).length,
          },
          { label: "Attention Items", value: attention.length },
          {
            label: "Survey Records Available",
            value: extensionState.traineeSurveys.filter(
              (s) => s.academicYear === year,
            ).length,
          },
          {
            label: "Open Growth Opportunities",
            value: growthRows(userId).filter(
              (g) => !["Completed", "Deferred"].includes(g.status),
            ).length,
          },
        ]}
      />
      <Card
        title="Program Health Matrix"
        subtitle="Each status is explainable and opens the related Program Health detail"
      >
        <DataTable
          headers={["Program", ...healthDomains, "Attention"]}
          empty={!snapshots.length}
        >
          {snapshots.map((s) => (
            <tr key={s.program?.program_id}>
              <td>
                <button
                  className="text-button"
                  onClick={() =>
                    navigate(`health/program/${s.program?.program_id}`, {
                      year,
                    })
                  }
                >
                  {shortName(s.program?.name || "")}
                </button>
                <small>{s.program?.type}</small>
              </td>
              {s.statuses.map((d) => (
                <td key={d.domain}>
                  <button
                    className="health-cell"
                    onClick={() =>
                      navigate(
                        `health/program/${s.program?.program_id}/${d.domain.toLowerCase()}`,
                        { year },
                      )
                    }
                  >
                    <Badge tone={tone(d.status)}>{d.status}</Badge>
                  </button>
                </td>
              ))}
              <td>{s.attention.length || "—"}</td>
            </tr>
          ))}
        </DataTable>
      </Card>
      <Card
        title="Needs Attention"
        subtitle="Factual items only; resident concerns and leadership changes are not presumed negative"
      >
        <DataTable
          headers={["Program", "Domain", "Indicator", "Reason"]}
          empty={!attention.length}
        >
          {attention.map((i) => (
            <tr key={i.id}>
              <td>{i.programName}</td>
              <td>{i.domain}</td>
              <td>
                <button
                  className="text-button"
                  onClick={() =>
                    navigate(
                      i.sourcePath.split("?")[0],
                      Object.fromEntries(
                        new URLSearchParams(i.sourcePath.split("?")[1] || ""),
                      ),
                    )
                  }
                >
                  {i.label}
                </button>
              </td>
              <td>{i.reason || i.value}</td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </>
  );
  function HealthFilters() {
    return (
      <div className="module-filters">
        <FilterSelect
          label="Academic Year"
          value={year}
          options={healthYears().map((y) => ({ value: y, label: y }))}
          onChange={(v) => filter("year", v)}
        />
        <FilterSelect
          label="Program"
          value={params.get("program") || ""}
          all="All Assigned Programs"
          options={scope.map((p) => ({
            value: p.program_id,
            label: shortName(p.name),
          }))}
          onChange={(v) => filter("program", v)}
        />
        <FilterSelect
          label="Health Domain"
          value={domain}
          all="All Domains"
          options={healthDomains.map((d) => ({ value: d, label: d }))}
          onChange={(v) => filter("domain", v)}
        />
        <FilterSelect
          label="Status"
          value={status}
          all="All Statuses"
          options={[
            "On Track",
            "Attention",
            "Needs Review",
            "Change",
            "No Data",
          ].map((v) => ({ value: v, label: v }))}
          onChange={(v) => filter("status", v)}
        />
      </div>
    );
  }
}
function GrowthView({
  userId,
  programId,
  rows,
  editable,
  toast,
}: {
  userId: string;
  programId?: string;
  rows: ReturnType<typeof growthRows>;
  editable: boolean;
  toast: (m: string) => void;
}) {
  const [edit, setEdit] = useState("");
  const selected = rows.find((r) => r.id === edit);
  const allowed = programId ? editable : false;
  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const r = saveGrowthOpportunity(
        {
          programId: programId!,
          title: String(f.get("title")),
          category: String(f.get("category")),
          description: String(f.get("description")),
          status: String(f.get("status")),
          identifiedDate: String(f.get("identifiedDate")),
          targetDate: String(f.get("targetDate")) || null,
          ownerLabel: String(f.get("owner")),
          source: "Internal GME · Demo",
          notes: String(f.get("notes")),
        },
        userId,
        selected?.id,
      );
      setEdit(r.id);
      toast("Growth opportunity saved. History is preserved.");
    } catch (x) {
      toast((x as Error).message);
    }
  }
  return (
    <>
      <Card
        title="Growth Opportunities"
        subtitle="Demo fixture supporting simple opportunity tracking"
      >
        <DataTable
          headers={[
            "Program",
            "Opportunity",
            "Category",
            "Status",
            "Target",
            "Owner",
            "Updates",
          ]}
          empty={!rows.length}
        >
          {rows.map((g) => (
            <tr key={g.id}>
              <td>{programId ? "—" : shortName(programName(g.programId))}</td>
              <td>{g.title}</td>
              <td>{g.category}</td>
              <td>
                <Badge>{g.status}</Badge>
              </td>
              <td>{date(g.targetDate)}</td>
              <td>{g.ownerLabel}</td>
              <td>
                <button className="text-button" onClick={() => setEdit(g.id)}>
                  View / Update
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
      {allowed && (
        <Card
          title={
            selected ? "Update Growth Opportunity" : "Add Growth Opportunity"
          }
        >
          <form
            className="module-form"
            key={selected?.id || "new"}
            onSubmit={save}
          >
            <label>
              Title
              <input name="title" required defaultValue={selected?.title} />
            </label>
            <label>
              Category
              <select
                name="category"
                defaultValue={selected?.category || growthCategories[0]}
              >
                {growthCategories.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                name="status"
                defaultValue={selected?.status || "Identified"}
              >
                {growthStatuses.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Description
              <textarea
                name="description"
                required
                defaultValue={selected?.description}
              />
            </label>
            <label>
              Identified Date
              <input
                name="identifiedDate"
                type="date"
                required
                defaultValue={selected?.identifiedDate}
              />
            </label>
            <label>
              Target Date
              <input
                name="targetDate"
                type="date"
                defaultValue={selected?.targetDate || ""}
              />
            </label>
            <label>
              Owner
              <input
                name="owner"
                required
                defaultValue={selected?.ownerLabel || "Program Director"}
              />
            </label>
            <label>
              Notes
              <textarea name="notes" defaultValue={selected?.notes} />
            </label>
            <button className="button primary">Save Opportunity</button>
          </form>
          {selected && (
            <form
              className="module-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                try {
                  addGrowthUpdate(
                    selected.id,
                    String(f.get("note")),
                    userId,
                    String(f.get("newStatus")),
                  );
                  toast("Growth update added.");
                  (e.target as HTMLFormElement).reset();
                } catch (x) {
                  toast((x as Error).message);
                }
              }}
            >
              <label>
                Add Update
                <textarea name="note" required />
              </label>
              <label>
                Change Status
                <select name="newStatus" defaultValue={selected.status}>
                  {growthStatuses.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <button className="button">Add Update</button>
            </form>
          )}
        </Card>
      )}
    </>
  );
}
