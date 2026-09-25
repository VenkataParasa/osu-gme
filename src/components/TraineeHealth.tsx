import { useState } from "react";
import { Card, Badge, Empty } from "./shared";
import {
  ModuleHeading,
  FilterSelect,
  Tabs,
  Stats,
  DataTable,
  TrendLine,
  Modal,
  type ModuleProps,
} from "./module-shared";
import { allowedPrograms, shortName, percent, date } from "../data/repository";
import { getAuthorizedColleges, collegeIdForProgram, collegeName } from "../data/colleges";
import {
  traineeHealthYears,
  traineeHealthSummary,
  traineeHealthScorecard,
  traineeHealthTrend,
  traineeHealthDimensions,
  previewTraineeHealthUpload,
  commitTraineeHealthUpload,
  type TraineeHealthUploadPreview,
} from "../data/trainee-health";
import { extensionState } from "../data/extension-store";

export default function TraineeHealth({ userId, path, params, navigate, toast }: ModuleProps) {
  const tab = params.get("tab") || "overview";
  const year = params.get("year") || "";
  const program = params.get("program") || "";
  const college = params.get("college") || "";
  const metric = params.get("metric") || "";
  const scope = allowedPrograms(userId);
  const colleges = getAuthorizedColleges(userId);
  const programsInScope = college ? scope.filter((p) => collegeIdForProgram(p) === college) : scope;
  const years = traineeHealthYears(userId);
  const dimensions = traineeHealthDimensions();
  const [uploadOpen, setUploadOpen] = useState(false);

  function filter(key: string, value: string) {
    navigate(path, { ...Object.fromEntries(params), [key]: value });
  }

  const summary = traineeHealthSummary(userId, { year, program, college });
  const { rows: scorecardRows } = traineeHealthScorecard(userId, { year, program, college });
  const trendMetric = metric || dimensions[0] || "";
  const trend = trendMetric ? traineeHealthTrend(userId, trendMetric, { program, college }) : [];

  return (
    <>
      <ModuleHeading
        eyebrow="Institutional Trainee Health"
        title="Trainee Health"
        description="Monitor aggregate trainee health and training-environment indicators derived from institutional survey data."
      >
        <div className="inline-gap">
          <button className="button" onClick={() => setUploadOpen(true)}>
            Upload Survey Results
          </button>
          <button className="button" onClick={() => filter("tab", "trends")}>
            View Historical Trends
          </button>
          <button
            className="button primary"
            onClick={() => navigate("analytics/report/trainee", { year, program, college })}
          >
            Generate Trainee Outcomes Report
          </button>
        </div>
      </ModuleHeading>
      <div className="module-notice">
        Source: Institutional Survey. All figures are aggregate, program-level results with no individual responses,
        diagnoses, or wellness profiles.
      </div>
      <Tabs
        current={tab}
        items={[
          { id: "overview", label: "Scorecard" },
          { id: "trends", label: "Historical Trends" },
        ]}
        onSelect={(id) => filter("tab", id === "overview" ? "" : id)}
      />
      <div className="module-filters">
        <FilterSelect
          label="Survey Period"
          value={year}
          all="All Periods"
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
          label="Metric"
          value={metric}
          all="All Configured Metrics"
          options={dimensions.map((d) => ({ value: d, label: d }))}
          onChange={(v) => filter("metric", v)}
        />
      </div>
      <Stats
        items={[
          { label: "Programs Reporting", value: summary.programsReporting },
          { label: "Programs with Complete Survey Data", value: summary.programsWithCompleteData },
          {
            label: "Average Response Rate",
            value: summary.averageResponseRate != null ? percent(summary.averageResponseRate) : "No data",
          },
          { label: "Current Survey Period", value: summary.currentPeriod },
        ]}
      />
      {tab === "overview" && (
        <Card
          title="Aggregate Trainee Health Scorecard"
          subtitle="Programs × configured institutional survey dimensions. Status badges only appear where an institutional threshold is configured."
        >
          <DataTable
            headers={["Program", "College", ...dimensions, "Source", "Survey Date"]}
            empty={!scorecardRows.length}
          >
            {scorecardRows.map((r) => (
              <tr key={`${r.programId}:${r.academicYear}`}>
                <td>
                  <button className="text-button" onClick={() => filter("program", r.programId)}>
                    {shortName(r.programName)}
                  </button>
                </td>
                <td>{collegeName(r.collegeId)}</td>
                {dimensions.map((d) => {
                  const m = r.metrics.find((x) => x.name === d);
                  return (
                    <td key={d}>
                      {m ? (
                        <>
                          {m.value}
                          {m.unit === "%" ? "%" : ` ${m.unit}`}
                          {m.status && <small><Badge>{m.status}</Badge></small>}
                        </>
                      ) : (
                        "No data"
                      )}
                    </td>
                  );
                })}
                <td>{r.source}</td>
                <td>{date(r.assessmentDate)}</td>
              </tr>
            ))}
          </DataTable>
        </Card>
      )}
      {tab === "trends" && (
        <>
          <TrendLine
            title={`Historical Trend: ${trendMetric || "No configured metric"}`}
            subtitle="Multi-year comparison across the current program / college selection"
            points={trend.map((t) => ({ year: t.year, value: t.average }))}
            series={[{ key: "value", label: trendMetric || "Value" }]}
          />
          <Card title="Trend Data">
            <DataTable headers={["Year", "Average", "Programs Reporting"]} empty={!trend.length}>
              {trend.map((t) => (
                <tr key={t.year}>
                  <td>{t.year}</td>
                  <td>{t.average != null ? t.average.toFixed(1) : "No data"}</td>
                  <td>{t.programsReporting}</td>
                </tr>
              ))}
            </DataTable>
          </Card>
        </>
      )}
      <Modal open={uploadOpen} eyebrow="Trainee Health" title="Upload Survey Results" onClose={() => setUploadOpen(false)} wide>
        <UploadSurveyFlow
          userId={userId}
          years={years}
          onDone={(run) => {
            setUploadOpen(false);
            toast(`Survey upload verified: ${run.imported} row(s) imported, ${run.attention} program(s) need attention.`);
          }}
          onError={(m) => toast(m)}
        />
      </Modal>
    </>
  );
}

function UploadSurveyFlow({
  userId,
  years,
  onDone,
  onError,
}: {
  userId: string;
  years: string[];
  onDone: (run: { imported: number; attention: number }) => void;
  onError: (m: string) => void;
}) {
  const [preview, setPreview] = useState<TraineeHealthUploadPreview | null>(null);
  const recent = extensionState.traineeSurveyUploadRuns.slice(0, 3);
  const defaultYear = years[0] || "2026-27";
  if (preview)
    return (
      <div className="module-form">
        <p className="form-hint">
          <strong>{preview.fileName}</strong> · Academic year {preview.academicYear}
        </p>
        <Stats
          items={[
            { label: "Rows Received", value: preview.rowsReceived },
            { label: "Programs Matched", value: preview.programsMatched },
            { label: "Valid Rows", value: preview.validRows },
            { label: "Requiring Attention", value: preview.needsAttention.length },
          ]}
        />
        {!!preview.needsAttention.length && (
          <Card title="Programs Requiring Attention" subtitle="No survey rows found for these programs">
            <ul className="module-timeline">
              {preview.needsAttention.map((n, i) => (
                <li key={i}><p>{n.issue}</p></li>
              ))}
            </ul>
          </Card>
        )}
        <div className="inline-gap">
          <button className="button" onClick={() => setPreview(null)}>Cancel</button>
          <button
            className="button primary"
            disabled={!preview.validRows}
            onClick={() => {
              try {
                onDone(commitTraineeHealthUpload(userId, preview));
              } catch (e) {
                onError((e as Error).message);
              }
            }}
          >
            Confirm Import ({preview.validRows})
          </button>
        </div>
      </div>
    );
  return (
    <>
      <form
        className="module-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const file = f.get("file");
          try {
            setPreview(
              previewTraineeHealthUpload(
                userId,
                file instanceof File ? file.name : "trainee-survey.csv",
                String(f.get("year")),
              ),
            );
          } catch (err) {
            onError((err as Error).message);
          }
        }}
      >
        <label>
          Academic Year
          <input name="year" required defaultValue={defaultYear} placeholder="2026-27" />
        </label>
        <label>
          Institutional Survey File
          <input name="file" type="file" required accept=".csv,.xlsx,.xls" />
        </label>
        <p className="form-hint">
          Program-level export from the institutional trainee survey. Every authorized program is checked; any
          program missing from the file is flagged, not silently skipped.
        </p>
        <button className="button primary">Preview Upload</button>
      </form>
      {!!recent.length && (
        <Card title="Recent Uploads" subtitle="Verified during this session">
          <DataTable headers={["File", "Academic Year", "Received", "Imported", "Attention"]}>
            {recent.map((r) => (
              <tr key={r.id}>
                <td>{r.fileName}</td>
                <td>{r.academicYear}</td>
                <td>{r.rowsReceived}</td>
                <td>{r.imported}</td>
                <td>{r.attention}</td>
              </tr>
            ))}
          </DataTable>
        </Card>
      )}
    </>
  );
}
