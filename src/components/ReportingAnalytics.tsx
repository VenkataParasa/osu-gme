import { useState } from "react";
import { Card, Empty, Badge } from "./shared";
import {
  ModuleHeading,
  Tabs,
  FilterSelect,
  Stats,
  DataTable,
  ExportButton,
  type ModuleProps,
} from "./module-shared";
import {
  data,
  allowedPrograms,
  shortName,
  percent,
  latestBoard,
  latestDuty,
  programName,
} from "../data/repository";
import {
  recruitmentSummary,
  reviewRows,
  apeRows,
} from "../data/extension-selectors";
import {
  institutionalHealth,
  attentionItems,
  growthRows,
  healthYears,
} from "../data/program-health-selectors";
import SpotonixAnalytics from "./SpotonixAnalytics";

const definitions = [
  [
    "annual",
    "Annual Institutional Report",
    "Cross-module institutional summary",
  ],
  [
    "board",
    "Board Pass Rate Analysis",
    "Program-level historical board results",
  ],
  [
    "graduates",
    "Graduate Outcomes Report",
    "Graduate outcome coverage and trends",
  ],
  [
    "scholarly",
    "Scholarly Activity Report",
    "New Innovations-style scholarly activity",
  ],
  [
    "accreditation",
    "Accreditation Metrics Report",
    "Reviews, APEs and received compliance",
  ],
  [
    "health",
    "Residency Program Health Report",
    "Explainable health domains and attention indicators",
  ],
  [
    "trainee",
    "Trainee Outcomes Report",
    "Aggregate trainee and board outcomes",
  ],
  ["faculty", "Faculty & Workforce Report", "Leadership tenure and changes"],
  ["growth", "Growth Opportunities Report", "Strategic opportunity register"],
  [
    "risk",
    "Institutional Risk Report",
    "Configured factual attention indicators",
  ],
] as const;

export default function ReportingAnalytics({
  userId,
  path,
  params,
  navigate,
  toast,
}: ModuleProps) {
  const view = path.split("/")[1] || "overview",
    year = params.get("year") || healthYears()[0] || "2025-26",
    program = params.get("program") || "",
    scope = allowedPrograms(userId);
  const [runs, setRuns] = useState<
    { name: string; at: string; scope: string }[]
  >([]);
  const filter = (key: string, value: string) =>
    navigate(path, { ...Object.fromEntries(params), [key]: value });
  const health = institutionalHealth(userId, year).filter(
    (s) => !program || s.program?.program_id === program,
  );
  const row = health.map((s) => [
    s.program?.name || "",
    ...s.statuses.map((x) => x.status),
    s.attention.length,
  ]);
  const run = (name: string) => {
    setRuns((x) => [
      {
        name,
        at: new Date().toISOString(),
        scope: program ? programName(program) : "Authorized programs",
      },
      ...x,
    ]);
    toast(`${name} generated from current authorized data.`);
  };
  const filters = (
    <div className="module-filters">
      <FilterSelect
        label="Academic Year"
        value={year}
        options={healthYears().map((y) => ({ value: y, label: y }))}
        onChange={(v) => filter("year", v)}
      />
      <FilterSelect
        label="Program"
        value={program}
        all="All Assigned Programs"
        options={scope.map((p) => ({
          value: p.program_id,
          label: shortName(p.name),
        }))}
        onChange={(v) => filter("program", v)}
      />
    </div>
  );
  
  if (view === "spotonix") {
    return <SpotonixAnalytics />;
  }

  if (view === "catalogue")
    return (
      <>
        <ModuleHeading
          eyebrow="Reporting & Analytics"
          title="Report Catalogue"
          description="Ten standard, security-trimmed institutional report templates."
        />
        {filters}
        <DataTable headers={["Report", "Description", "Exports", "Action"]}>
          {definitions.map(([id, name, description]) => (
            <tr key={id}>
              <td>{name}</td>
              <td>{description}</td>
              <td>CSV · TXT · Print / PDF</td>
              <td>
                <button
                  className="text-button"
                  onClick={() => {
                    run(name);
                    navigate(`analytics/report/${id}`, { year, program });
                  }}
                >
                  Run Report →
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </>
    );
  if (view === "report") {
    const id = path.split("/")[2] || "annual",
      def = definitions.find((d) => d[0] === id) || definitions[0];
    return (
      <>
        <ModuleHeading
          eyebrow="Generated Report"
          title={def[1]}
          description={`OSU-CHS Graduate Medical Education · ${year} · security-trimmed to ${program ? shortName(programName(program)) : "authorized programs"}`}
        >
          <ExportButton
            name={id + "-report"}
            headers={[
              "Program",
              "Accreditation",
              "Trainees",
              "Operations",
              "Recruitment",
              "Leadership",
              "Growth",
              "Attention",
            ]}
            rows={row}
          />
        </ModuleHeading>
        {filters}
        <Stats
          items={[
            { label: "Programs in Scope", value: health.length },
            {
              label: "Active Special Reviews",
              value: reviewRows(userId, { program }).filter(
                (r) => r.review.status !== "Closed",
              ).length,
            },
            {
              label: "Attention Indicators",
              value: attentionItems(userId, year).filter(
                (x) => !program || x.programId === program,
              ).length,
            },
            {
              label: "Open Growth Opportunities",
              value: growthRows(userId, { program }).filter(
                (g) => !["Completed", "Deferred"].includes(g.status),
              ).length,
            },
          ]}
        />
        <Card
          title="Report Results"
          subtitle="Source-linked, explainable indicators; no composite health score"
        >
          <DataTable
            headers={[
              "Program",
              "Accreditation",
              "Trainees",
              "Operations",
              "Recruitment",
              "Leadership",
              "Growth",
              "Attention",
            ]}
            empty={!row.length}
          >
            {row.map((r) => (
              <tr key={String(r[0])}>
                {r.map((v, i) => (
                  <td key={i}>
                    {i > 0 && i < 7 ? <Badge>{String(v)}</Badge> : v}
                  </td>
                ))}
              </tr>
            ))}
          </DataTable>
        </Card>
        <Card
          title="Traceability"
          subtitle="Data As Of: current mock-session state"
        >
          <p className="form-hint">
            Board data comes from Specialty Board Reports; duty-hour and
            scholarly import context from simulated New Innovations; recruitment
            from the Recruitment Repository; reviews, APEs and growth from
            Internal GME. Drill into a program from the table through Program
            Health.
          </p>
        </Card>
      </>
    );
  }
  return (
    <>
      <ModuleHeading
        eyebrow="Institutional Intelligence"
        title="Reporting & Analytics"
        description="Governed reports over authorized GME data, with source traceability and no duplicate source of truth."
      />
      <Tabs
        current={view}
        items={[
          { id: "overview", label: "Overview" },
          { id: "catalogue", label: "Report Catalogue" },
          { id: "spotonix", label: "AI Analytics" },
        ]}
        onSelect={(v) =>
          navigate(
            `analytics/${v === "overview" ? "" : v}`.replace(/\/$/, ""),
            { year, program },
          )
        }
      />
      {filters}
      <Stats
        items={[
          { label: "Programs", value: scope.length },
          {
            label: "Residents / Trainees",
            value: data.RESIDENT.filter((r) =>
              scope.some((p) => p.program_id === r.program_id),
            ).length,
          },
          {
            label: "Active Reviews",
            value: reviewRows(userId, {}).filter(
              (r) => r.review.status !== "Closed",
            ).length,
          },
          {
            label: "Recruitment Cycles",
            value: data.RECRUITMENT_CYCLE.filter((c) =>
              scope.some((p) => p.program_id === c.program_id),
            ).length,
          },
          {
            label: "Known APE Records",
            value: apeRows(userId, year).filter((r) => r.submitted).length,
          },
          { label: "Scheduled Reports", value: "No schedules configured" },
        ]}
      />
      <Card
        title="Standard Reports"
        subtitle="Run a governed template or review its filters and sources"
      >
        <DataTable headers={["Report", "Action"]}>
          {definitions.map(([id, name]) => (
            <tr key={id}>
              <td>{name}</td>
              <td>
                <button
                  className="text-button"
                  onClick={() =>
                    navigate(`analytics/report/${id}`, { year, program })
                  }
                >
                  Open →
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
      <Card
        title="Recent Reports"
        subtitle="Runs retained for this browser session"
      >
        <DataTable
          headers={["Report", "Generated", "Scope"]}
          empty={!runs.length}
        >
          {runs.map((r, i) => (
            <tr key={i}>
              <td>{r.name}</td>
              <td>{new Date(r.at).toLocaleString()}</td>
              <td>{r.scope}</td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </>
  );
}
