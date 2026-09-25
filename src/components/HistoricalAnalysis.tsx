import { Card } from "./shared";
import { ModuleHeading, FilterSelect, Stats, DataTable, TrendLine, ExportButton, type ModuleProps } from "./module-shared";
import { allowedPrograms, shortName } from "../data/repository";
import { getAuthorizedColleges, collegeIdForProgram } from "../data/colleges";
import { HISTORICAL_CATEGORIES, historicalSeries, historicalReportMetadata } from "../data/historical-analysis";

export default function HistoricalAnalysis({ userId, path, params, navigate }: ModuleProps) {
  const college = params.get("college") || "";
  const program = params.get("program") || "";
  const fromYear = params.get("fromYear") || "";
  const toYear = params.get("toYear") || "";
  const categoryId = params.get("category") || HISTORICAL_CATEGORIES[0].id;
  const scope = allowedPrograms(userId);
  const colleges = getAuthorizedColleges(userId);
  const programsInScope = college ? scope.filter((p) => collegeIdForProgram(p) === college) : scope;
  const category = HISTORICAL_CATEGORIES.find((c) => c.id === categoryId) || HISTORICAL_CATEGORIES[0];

  function filter(key: string, value: string) {
    navigate(path, { ...Object.fromEntries(params), [key]: value });
  }

  const f = { college, program, fromYear, toYear };
  const points = historicalSeries(userId, categoryId, f);
  const metadata = historicalReportMetadata(userId, f);

  return (
    <>
      <ModuleHeading
        eyebrow="Institutional Intelligence"
        title="Historical Analysis"
        description="Multi-year, source-linked trends across accreditation, recruitment, outcomes, health, workforce and growth — scoped Institution → College → Program."
      >
        <ExportButton
          name={`historical-${categoryId}`}
          headers={["Year", "Value", "Detail"]}
          rows={points.map((p) => [p.year, p.value, p.detail])}
        />
      </ModuleHeading>
      <div className="module-filters">
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
          options={programsInScope.map((p) => ({ value: p.program_id, label: shortName(p.name) }))}
          onChange={(v) => filter("program", v)}
        />
        <FilterSelect
          label="From Year"
          value={fromYear}
          all="Earliest Available"
          options={points.map((p) => ({ value: p.year, label: p.year }))}
          onChange={(v) => filter("fromYear", v)}
        />
        <FilterSelect
          label="To Year"
          value={toYear}
          all="Latest Available"
          options={points.map((p) => ({ value: p.year, label: p.year }))}
          onChange={(v) => filter("toYear", v)}
        />
        <FilterSelect
          label="Reporting Category"
          value={categoryId}
          options={HISTORICAL_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
          onChange={(v) => filter("category", v)}
        />
      </div>
      <Card title="Report Scope & Metadata" subtitle="Preserved on export">
        <Stats
          items={[
            { label: "Scope", value: metadata.scope },
            { label: "College", value: metadata.collegeName || "Not applicable" },
            { label: "Program", value: metadata.programName || "Not applicable" },
            { label: "Reporting Period", value: metadata.reportingPeriod },
            { label: "Generated At", value: metadata.generatedAt },
            { label: "Data As Of", value: metadata.dataAsOf },
          ]}
        />
      </Card>
      <TrendLine
        title={category.label}
        subtitle={`${category.description} Unit: ${category.unit}.`}
        points={points.map((p) => ({ year: p.year, value: p.value }))}
        series={[{ key: "value", label: category.label }]}
      />
      <Card title="Trend Data">
        <DataTable headers={["Year", "Value", "Detail"]} empty={!points.length}>
          {points.map((p) => (
            <tr key={p.year}>
              <td>{p.year}</td>
              <td>{p.value ?? "No data"}</td>
              <td>{p.detail || "—"}</td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </>
  );
}
