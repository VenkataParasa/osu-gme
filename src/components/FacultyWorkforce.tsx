import { Card, Badge } from "./shared";
import { ModuleHeading, FilterSelect, Stats, DataTable, TrendLine, type ModuleProps } from "./module-shared";
import { allowedPrograms, shortName, date } from "../data/repository";
import { getAuthorizedColleges, collegeIdForProgram, collegeName } from "../data/colleges";
import {
  facultyWorkforceYears,
  facultyWorkforceRows,
  facultyWorkforceSummary,
  leadershipContinuity,
  leadershipChangeTrend,
} from "../data/faculty-workforce";

export default function FacultyWorkforce({ userId, path, params, navigate }: ModuleProps) {
  const year = params.get("year") || facultyWorkforceYears(userId)[0] || "";
  const program = params.get("program") || "";
  const college = params.get("college") || "";
  const fromYear = params.get("fromYear") || "";
  const toYear = params.get("toYear") || "";
  const scope = allowedPrograms(userId);
  const colleges = getAuthorizedColleges(userId);
  const programsInScope = college ? scope.filter((p) => collegeIdForProgram(p) === college) : scope;
  const years = facultyWorkforceYears(userId);

  function filter(key: string, value: string) {
    navigate(path, { ...Object.fromEntries(params), [key]: value });
  }

  const rows = facultyWorkforceRows(userId, { year, program, college });
  const summary = facultyWorkforceSummary(userId, { year, program, college });
  const continuity = leadershipContinuity(userId, { program, college, fromYear, toYear });
  const trend = leadershipChangeTrend(userId, { program, college });

  return (
    <>
      <ModuleHeading
        eyebrow="Faculty & Leadership Workforce"
        title="Faculty & Leadership Workforce"
        description="Monitor aggregate program leadership continuity, tenure, turnover and workforce indicators for GME reporting."
      >
        <button
          className="button primary"
          onClick={() => navigate("analytics/report/faculty", { year, program, college })}
        >
          Generate Faculty & Workforce Report
        </button>
      </ModuleHeading>
      <div className="module-notice">
        This view contains aggregate GME workforce indicators for program monitoring and institutional reporting. It
        is not an HR personnel system — no payroll, credentialing, performance review, or individual employee data is
        stored here.
      </div>
      <div className="module-filters">
        <FilterSelect
          label="Academic Year"
          value={year}
          all="All Years"
          options={years.map((y) => ({ value: y, label: y }))}
          onChange={(v) => filter("year", v)}
        />
        <FilterSelect
          label="College"
          value={college}
          all="All Colleges"
          options={colleges.map((c) => ({ value: c.id, label: c.shortName }))}
          onChange={(v) => navigate(path, { ...Object.fromEntries(params), college: v, program: "" })}
        />
        <FilterSelect
          label="Program"
          value={program}
          all="All Assigned Programs"
          options={programsInScope.map((p) => ({ value: p.program_id, label: shortName(p.name) }))}
          onChange={(v) => filter("program", v)}
        />
        <FilterSelect
          label="Trend From"
          value={fromYear}
          all="Earliest Available"
          options={years.map((y) => ({ value: y, label: y }))}
          onChange={(v) => filter("fromYear", v)}
        />
        <FilterSelect
          label="Trend To"
          value={toYear}
          all="Latest Available"
          options={years.map((y) => ({ value: y, label: y }))}
          onChange={(v) => filter("toYear", v)}
        />
      </div>
      <Stats
        items={[
          { label: "Programs Reporting", value: summary.programsReporting },
          { label: "Leadership Changes — Selected Period", value: summary.programsWithLeadershipChange },
          {
            label: "Average Leadership Tenure",
            value: summary.averageTenure != null ? `${summary.averageTenure.toFixed(1)} yrs` : "No data",
          },
          {
            label: "Aggregate Core Faculty",
            value: summary.totalCoreFaculty ?? "No data",
            detail: "Sum of supplied core faculty counts",
          },
        ]}
      />
      <Card
        title="Leadership Continuity"
        subtitle="Program Director tenure and leadership change events by program"
      >
        <DataTable
          headers={["Program", "College", "Leadership Indicator", "Current Tenure", "Leadership Changes (Range)", "Last Updated"]}
          empty={!continuity.length}
        >
          {continuity.map((c) => (
            <tr key={c.program.program_id}>
              <td>
                <button className="text-button" onClick={() => filter("program", c.program.program_id)}>
                  {shortName(c.program.name)}
                </button>
              </td>
              <td>{collegeName(c.collegeId)}</td>
              <td>
                {c.current ? (
                  <Badge tone={c.current.leadership_change_this_year ? "amber" : "green"}>
                    {c.current.leadership_change_this_year ? "Leadership Transition" : "Stable"}
                  </Badge>
                ) : (
                  "No data"
                )}
              </td>
              <td>{c.currentTenure != null ? `${c.currentTenure} yrs` : "Not recorded"}</td>
              <td>{c.changesInRange}</td>
              <td>{date(c.lastUpdated)}</td>
            </tr>
          ))}
        </DataTable>
      </Card>
      <div className="module-grid two">
        <TrendLine
          title="Leadership Changes by Year"
          subtitle="Programs recording a leadership transition each academic year"
          points={trend.map((t) => ({ year: t.year, changes: t.changes }))}
          series={[{ key: "changes", label: "Leadership changes" }]}
        />
        <TrendLine
          title="Average Core Faculty Turnover"
          subtitle="Average of supplied program turnover rates by year"
          points={trend.map((t) => ({
            year: t.year,
            turnover: t.averageTurnover != null ? Math.round(t.averageTurnover * 1000) / 10 : null,
          }))}
          series={[{ key: "turnover", label: "Average turnover" }]}
          valueSuffix="%"
        />
      </div>
      <Card
        title="Faculty & Leadership Workforce Records"
        subtitle="Source: supplied aggregate ADS / program reports · not an HR system"
      >
        <DataTable
          headers={["Program", "College", "Reporting Period", "Leadership Tenure", "Leadership Change", "Core Faculty", "Source", "Last Updated"]}
          empty={!rows.length}
        >
          {rows.map((r) => (
            <tr key={r.aggregate.aggregate_id}>
              <td>{shortName(r.programName)}</td>
              <td>{collegeName(r.collegeId)}</td>
              <td>{r.aggregate.academic_year}</td>
              <td>
                {r.aggregate.program_director_tenure_years} yrs <Badge tone={tone(r.tenureStatus)}>{r.tenureStatus}</Badge>
              </td>
              <td>{r.aggregate.leadership_change_this_year ? "Yes" : "No"}</td>
              <td>{r.aggregate.core_faculty_count}</td>
              <td>{r.aggregate.source}</td>
              <td>{date(r.aggregate.uploaded_at)}</td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </>
  );
}
function tone(status: string) {
  return status === "On Track" ? "green" : status === "Attention" ? "amber" : "danger";
}
