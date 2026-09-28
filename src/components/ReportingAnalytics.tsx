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
  programName,
} from "../data/repository";
import {
  reviewRows,
  apeRows,
} from "../data/extension-selectors";
import {
  institutionalHealth,
  attentionItems,
  growthRows,
  healthYears,
} from "../data/program-health-selectors";
import { getAuthorizedColleges, collegeIdForProgram } from "../data/colleges";
import { reportTables, reportYears, type ReportFilters } from "../data/v2-reporting";
import { historicalReportMetadata } from "../data/historical-analysis";
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
    college = params.get("college") || "",
    scope = allowedPrograms(userId),
    colleges = getAuthorizedColleges(userId),
    programsInScope = college ? scope.filter((p) => collegeIdForProgram(p) === college) : scope;
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
        scope: program ? programName(program) : college ? colleges.find((c) => c.id === college)?.name || "College" : "Authorized programs",
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
        label="College"
        value={college}
        all="All Colleges (Institution)"
        options={colleges.map((c) => ({ value: c.id, label: c.shortName }))}
        onChange={(v) => navigate(path, { ...Object.fromEntries(params), college: v, program: "" })}
      />
      <FilterSelect
        label="Program"
        value={program}
        all="All Programs in Scope"
        options={programsInScope.map((p) => ({
          value: p.program_id,
          label: shortName(p.name),
        }))}
        onChange={(v) => filter("program", v)}
      />
    </div>
  );
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
                    navigate(`analytics/report/${id}`, { year, program, college });
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
    const f: ReportFilters = { year, program, college };
    const tables = reportTables(userId, id, f);
    const metadata = historicalReportMetadata(userId, {
      college,
      program,
      fromYear: year,
      toYear: year,
    });
    return (
      <>
        <ModuleHeading
          eyebrow="Generated Report"
          title={def[1]}
          description={`OSU-CHS Graduate Medical Education · ${year} · security-trimmed to ${program ? shortName(programName(program)) : college ? colleges.find((c) => c.id === college)?.shortName : "authorized programs"}`}
        >
          {!!tables[0] && (
            <ExportButton name={`${id}-report`} headers={tables[0].headers} rows={tables[0].rows} />
          )}
        </ModuleHeading>
        {filters}
        <Card title="Report Scope & Metadata" subtitle="Preserved on export">
          <Stats
            items={[
              { label: "Scope", value: metadata.scope },
              { label: "College", value: metadata.collegeName || "Not applicable" },
              { label: "Program", value: metadata.programName || "Not applicable" },
              { label: "Reporting Period", value: year },
              { label: "Generated At", value: metadata.generatedAt },
              { label: "Data As Of", value: metadata.dataAsOf },
            ]}
          />
        </Card>
        {tables.map((table, ti) => (
          <Card key={ti} title={table.title} subtitle={table.description} action={<ExportButton name={`${id}-${ti}`} headers={table.headers} rows={table.rows} />}>
            <DataTable headers={table.headers} empty={!table.rows.length}>
              {table.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((v, ci) =>
                    ci === 0 && table.links?.[ri] ? (
                      <td key={ci}>
                        <button
                          className="text-button"
                          onClick={() => {
                            const [p, q] = table.links![ri].split("?");
                            navigate(p, Object.fromEntries(new URLSearchParams(q || "")));
                          }}
                        >
                          {String(v ?? "Not available")}
                        </button>
                      </td>
                    ) : (
                      <td key={ci}>{v ?? "Not available"}</td>
                    ),
                  )}
                </tr>
              ))}
            </DataTable>
          </Card>
        ))}
        {!tables.length && <Empty>No records match the selected filters.</Empty>}
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
                    navigate(`analytics/report/${id}`, { year, program, college })
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
        subtitle="Runs retained for this session"
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
