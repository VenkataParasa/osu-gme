import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Card, Empty, Badge } from "./shared";
import {
  FilterSelect,
  Tabs,
  ModuleHeading,
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
  programName,
  userRole,
} from "../data/repository";
import {
  applicantRows,
  recruitmentSummary,
  recruitmentYears,
  cohortSummary,
  recruitmentTrend,
  demographicGroups,
} from "../data/extension-selectors";
import { extensionState } from "../data/extension-store";

export default function Recruitment({
  userId,
  path,
  params,
  navigate,
}: ModuleProps) {
  const [rankAsc, setRankAsc] = useState(true);
  const report = path.startsWith("reports/"),
    section = report ? "report" : path.split("/")[1] || "overview",
    detail = section === "program" ? path.split("/")[2] : undefined;
  const scope = allowedPrograms(userId),
    year = params.get("year") || String(recruitmentYears()[0]);
  const filters = {
    year: section === "history" ? "" : year,
    program: detail || params.get("program") || "",
    degree: params.get("degree") || "",
    outcome: params.get("outcome") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
    search: params.get("search") || "",
  };
  const summary = recruitmentSummary(userId, filters),
    rows = summary.applicants,
    trend = recruitmentTrend(userId, { ...filters, year: "" });
  const institutional = ["ROL-01", "ROL-02"].includes(
    userRole(userId)?.role_id || "",
  );
  const cohort = cohortSummary(Number(year));
  const cohortTrend = recruitmentYears()
    .slice()
    .reverse()
    .filter(
      (y) =>
        (!filters.from || y >= Number(filters.from)) &&
        (!filters.to || y <= Number(filters.to)),
    )
    .map((y) => ({ year: y, ...cohortSummary(y) }));
  const titles: Record<string, string> = {
    overview: "Recruitment & Match",
    applicants: "Applicants & Rankings",
    outcomes: "Match Outcomes",
    history: "Historical Analytics",
    program: detail ? shortName(programName(detail)) : "Program Recruitment",
    report: "Recruitment & Match Report",
  };
  function filter(key: string, value: string) {
    const query = Object.fromEntries(params);
    query[key] = value;
    navigate(path, query);
  }
  const programHeaders = [
    "Program",
    "Applicants",
    "Ranked",
    "Matched",
    "Positions · demo",
    "Unfilled · recorded",
    "Fill Rate · recorded",
  ];
  const exportRows = summary.programs.map((r) => [
    r.program.name,
    r.applicants,
    r.ranked,
    r.matched,
    r.positions,
    r.unfilled,
    r.fillRate == null ? null : percent(r.fillRate),
  ]);
  const sorted = [...rows].sort((a, b) =>
    a.rank_position === null
      ? 1
      : b.rank_position === null
        ? -1
        : (rankAsc ? 1 : -1) * (a.rank_position - b.rank_position) ||
          a.last_name.localeCompare(b.last_name),
  );
  if (detail && !scope.some((p) => p.program_id === detail))
    return <Empty>Program not found or outside your demo role’s scope.</Empty>;
  function programTable() {
    return (
      <DataTable headers={programHeaders} empty={!summary.programs.length}>
        {summary.programs.map((r) => (
          <tr key={r.program.program_id}>
            <td>
              <button
                className="text-button"
                onClick={() =>
                  navigate(`recruitment/program/${r.program.program_id}`, {
                    year,
                  })
                }
              >
                {shortName(r.program.name)}
              </button>
              <small>{r.program.type}</small>
            </td>
            <td>{r.applicants || "No records"}</td>
            <td>{r.applicants ? r.ranked : "Not available"}</td>
            <td>{r.matched ?? "Not recorded"}</td>
            <td>{r.positions ?? "Not available"}</td>
            <td>{r.unfilled ?? "Not available"}</td>
            <td>{percent(r.fillRate)}</td>
          </tr>
        ))}
      </DataTable>
    );
  }
  return (
    <>
      <ModuleHeading
        eyebrow="Recruitment Repository"
        title={titles[section] || titles.overview}
        description={
          detail
            ? "Program recruitment, internal rankings, and recorded Match outcomes."
            : "Explore program recruitment and Match outcomes across reporting years."
        }
      >
        {report ? (
          <ExportButton
            name="recruitment-match"
            headers={programHeaders}
            rows={exportRows}
          />
        ) : (
          <button
            className="button"
            onClick={() =>
              navigate("reports/recruitment", {
                year,
                program: filters.program,
              })
            }
          >
            View Report
          </button>
        )}
      </ModuleHeading>
      {!report && (
        <Tabs
          current={detail ? "applicants" : section}
          items={[
            { id: "overview", label: "Overview" },
            { id: "applicants", label: "Applicants & Rankings" },
            { id: "outcomes", label: "Match Outcomes" },
            { id: "history", label: "Historical Analytics" },
          ]}
          onSelect={(id) =>
            navigate(`recruitment/${id}`, { year, program: filters.program })
          }
        />
      )}
      {detail && (
        <div className="module-links">
          <button
            className="text-button"
            onClick={() => navigate(`programs/${detail}`)}
          >
            Program Performance →
          </button>
          <button
            className="text-button"
            onClick={() => navigate("reviews", { program: detail })}
          >
            Special Reviews →
          </button>
          <button
            className="text-button"
            onClick={() => navigate(`ape/${detail}`)}
          >
            Annual Program Evaluations →
          </button>
        </div>
      )}
      <div className="module-filters">
        {section === "history" ? (
          <>
            <FilterSelect
              label="From Year"
              value={filters.from}
              all="Earliest"
              options={recruitmentYears()
                .slice()
                .reverse()
                .map((y) => ({ value: String(y), label: String(y) }))}
              onChange={(v) => filter("from", v)}
            />
            <FilterSelect
              label="To Year"
              value={filters.to}
              all="Latest"
              options={recruitmentYears().map((y) => ({
                value: String(y),
                label: String(y),
              }))}
              onChange={(v) => filter("to", v)}
            />
          </>
        ) : (
          <FilterSelect
            label="Match Year"
            value={year}
            options={recruitmentYears().map((y) => ({
              value: String(y),
              label: String(y),
            }))}
            onChange={(v) => filter("year", v)}
          />
        )}
        {!detail && (
          <FilterSelect
            label="Program"
            value={filters.program}
            all="All Assigned Programs"
            options={scope.map((p) => ({
              value: p.program_id,
              label: shortName(p.name),
            }))}
            onChange={(v) => filter("program", v)}
          />
        )}
        <FilterSelect
          label="Applicant Type"
          value={filters.degree}
          all="All Types"
          options={["DO", "MD", "FMG"].map((v) => ({ value: v, label: v }))}
          onChange={(v) => filter("degree", v)}
        />
        <FilterSelect
          label="Match Outcome"
          value={filters.outcome}
          all="All Outcomes"
          options={["Matched", "Not Matched to Program", "Not recorded"].map(
            (v) => ({ value: v, label: v }),
          )}
          onChange={(v) => filter("outcome", v)}
        />
        <button className="text-button" onClick={() => navigate(path)}>
          Clear Filters
        </button>
      </div>
      <div className="module-notice">
        2027 records are a small fictional future-cycle scenario. Annual
        position counts are supplemental demo fixtures; recorded fill rates may
        be partial. “Not Matched to Program” does not mean unmatched nationally.
      </div>
      <Stats
        items={[
          { label: "Programs in Scope", value: summary.programs.length },
          { label: "Applicant Records", value: summary.total || "No records" },
          {
            label: "Ranked Applicants",
            value: summary.total ? summary.ranked : "Not available",
          },
          {
            label: "Recorded Matches",
            value: summary.matched ?? "Not recorded",
          },
        ]}
      />
      {(section === "applicants" || detail) && (
        <Card
          title="Applicant Rankings"
          subtitle="Internal program staff data · ranks are scoped to each program and cycle"
          action={
            <button className="button" onClick={() => setRankAsc((v) => !v)}>
              Rank {rankAsc ? "↑" : "↓"}
            </button>
          }
        >
          <div className="module-search">
            <label>
              Search Applicants
              <input
                value={filters.search}
                onChange={(e) => filter("search", e.target.value)}
                placeholder="Name or hometown"
              />
            </label>
          </div>
          <DataTable
            headers={[
              "Rank",
              "Applicant",
              "Program / Year",
              "Type",
              "Medical School",
              "Hometown",
              "Match Outcome",
            ]}
            empty={!sorted.length}
          >
            {sorted.map((a) => (
              <tr key={a.applicant_id}>
                <td>{a.rank_position ?? "Not ranked"}</td>
                <td>
                  {a.first_name} {a.last_name}
                  <small>{a.is_osu_student ? "OSU Student" : ""}</small>
                </td>
                <td>
                  {shortName(programName(a.programId))}
                  <small>{a.year}</small>
                </td>
                <td>
                  <Badge>{a.degree_type}</Badge>
                </td>
                <td>{a.medical_school}</td>
                <td>
                  {a.hometown_city}, {a.hometown_state}
                </td>
                <td>
                  <Badge>{a.outcome}</Badge>
                  {extensionState.lineage.some(
                    (l) =>
                      l.recordId === a.applicant_id ||
                      l.recordId === a.match?.match_id,
                  ) && <small>NRMP simulation</small>}
                </td>
              </tr>
            ))}
          </DataTable>
        </Card>
      )}
      {section !== "applicants" && !detail && section !== "history" && (
        <Card
          title="Program Match Performance"
          subtitle="Click a program to explore its applicant ranking list"
        >
          {programTable()}
        </Card>
      )}
      {detail && (
        <Card
          title="Program Match Summary"
          subtitle="Reported outcomes for this program and selected year"
        >
          {programTable()}
        </Card>
      )}
      {(section === "overview" || section === "outcomes" || report) && (
        <>
          <div className="module-grid">
            <Bars
              title="Matched Applicant Composition"
              subtitle="Recorded matched applicants by DO / MD / FMG"
              rows={demographicGroups(rows, "degree_type")}
              onClick={(name) => filter("degree", name)}
            />
            <Bars
              title="Matched Applicants by State"
              subtitle="Hometown state as supplied in applicant records"
              rows={demographicGroups(rows, "hometown_state")}
            />
            <Bars
              title="Top Hometowns"
              subtitle="City and state, as recorded · up to eight locations"
              rows={demographicGroups(rows, "hometown_city").slice(0, 8)}
            />
          </div>
          {report && (
            <Card
              title="Applicant Composition Detail"
              subtitle="Matched applicants in the selected year and filters"
              action={
                <ExportButton
                  name="matched-composition"
                  headers={["Classification", "Matched"]}
                  rows={demographicGroups(rows, "degree_type").map((r) => [
                    r.name,
                    r.count,
                  ])}
                />
              }
            >
              <DataTable
                headers={["Classification", "Matched"]}
                empty={!demographicGroups(rows, "degree_type").length}
              >
                {demographicGroups(rows, "degree_type").map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>{r.count}</td>
                  </tr>
                ))}
              </DataTable>
            </Card>
          )}
          {institutional && (
            <Card
              title="OSU Student Match Performance — Demo Cohort"
              subtitle="Separate fictional participating-student cohort · institution-wide, independent of program/type/outcome filters"
            >
              <Stats
                items={[
                  {
                    label: "Participating OSU Students",
                    value: cohort.participating,
                  },
                  { label: "Matched OSU Students", value: cohort.matched },
                  {
                    label: "OSU Student Match Rate",
                    value: percent(cohort.rate),
                  },
                ]}
              />
              <div className="card-foot">
                This is a complete supplemental demo cohort, not the set of OSU
                applicants to these programs. Selected Match year: {year}.
              </div>
            </Card>
          )}
        </>
      )}
      {(section === "history" || report) && (
        <>
          <Card
            title="Historical Ranking & Match Trends"
            subtitle="Source records grouped by application year; gaps mean no outcome recorded"
            action={
              <ExportButton
                name="recruitment-history"
                headers={[
                  "Year",
                  "Ranked",
                  "Matched",
                  "DO Matched",
                  "MD Matched",
                  "FMG Matched",
                ]}
                rows={trend.map((t) => [
                  t.year,
                  t.ranked,
                  t.matched,
                  t.matched === null ? null : t.DO,
                  t.matched === null ? null : t.MD,
                  t.matched === null ? null : t.FMG,
                ])}
              />
            }
          >
            <div className="module-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="4 4" />
                  <XAxis dataKey="year" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    dataKey="ranked"
                    name="Ranked Applicants"
                    stroke="#3c6656"
                    strokeWidth={3}
                  />
                  <Line
                    dataKey="matched"
                    name="Matched Applicants"
                    stroke="#bc5d20"
                    strokeWidth={3}
                    strokeDasharray="6 4"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <DataTable
              headers={[
                "Year",
                "Ranked",
                "Matched",
                "DO Matched",
                "MD Matched",
                "FMG Matched",
              ]}
              empty={!trend.length}
            >
              {trend.map((t) => (
                <tr key={t.year}>
                  <td>{t.year}</td>
                  <td>{t.ranked}</td>
                  <td>{t.matched ?? "Not recorded"}</td>
                  <td>{t.matched === null ? "Not recorded" : t.DO}</td>
                  <td>{t.matched === null ? "Not recorded" : t.MD}</td>
                  <td>{t.matched === null ? "Not recorded" : t.FMG}</td>
                </tr>
              ))}
            </DataTable>
          </Card>
          <Card
            title="Matched Applicant Composition Trend"
            subtitle="Recorded DO / MD / FMG matches by year; uses the same filters as the ranking trend"
          >
            <div className="module-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trend.map((t) => ({
                    ...t,
                    DO: t.matched === null ? null : t.DO,
                    MD: t.matched === null ? null : t.MD,
                    FMG: t.matched === null ? null : t.FMG,
                  }))}
                >
                  <CartesianGrid strokeDasharray="4 4" />
                  <XAxis dataKey="year" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line dataKey="DO" stroke="#3c6656" strokeWidth={3} />
                  <Line
                    dataKey="MD"
                    stroke="#bc5d20"
                    strokeWidth={3}
                    strokeDasharray="6 4"
                  />
                  <Line
                    dataKey="FMG"
                    stroke="#475d85"
                    strokeWidth={3}
                    strokeDasharray="2 3"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          {institutional && (
            <Card
              title="OSU Student Match Trend — Demo Cohort"
              subtitle="Separate supplemental cohort; institution-wide population for each year"
              action={
                <ExportButton
                  name="osu-demo-cohort"
                  headers={["Year", "Participating", "Matched", "Match Rate"]}
                  rows={cohortTrend.map((c) => [
                    c.year,
                    c.participating,
                    c.matched,
                    percent(c.rate),
                  ])}
                />
              }
            >
              <div className="module-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={cohortTrend.map((c) => ({
                      ...c,
                      rate: c.rate === null ? null : c.rate * 100,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="4 4" />
                    <XAxis dataKey="year" />
                    <YAxis domain={[0, 100]} unit="%" />
                    <Tooltip />
                    <Line
                      dataKey="rate"
                      name="OSU Student Match Rate (%)"
                      stroke="#3c6656"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <DataTable
                headers={["Year", "Participating", "Matched", "Match Rate"]}
              >
                {cohortTrend.map((c) => (
                  <tr key={c.year}>
                    <td>{c.year}</td>
                    <td>{c.participating}</td>
                    <td>{c.matched}</td>
                    <td>{percent(c.rate)}</td>
                  </tr>
                ))}
              </DataTable>
            </Card>
          )}
        </>
      )}
    </>
  );
}
