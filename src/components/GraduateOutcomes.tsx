import { useState } from "react";
import type { FormEvent } from "react";
import { Card, Badge, Empty } from "./shared";
import {
  ModuleHeading,
  FilterSelect,
  Tabs,
  Stats,
  DataTable,
  ExportButton,
  Bars,
  TrendLine,
  Modal,
  ActivityHistory,
  type ModuleProps,
} from "./module-shared";
import { data, allowedPrograms, shortName, percent, date, canEdit, programName } from "../data/repository";
import { getAuthorizedColleges, collegeIdForProgram, collegeName } from "../data/colleges";
import {
  graduateOutcomeYears,
  graduateOutcomeRows,
  graduateOutcomeSummary,
  graduateOutcomeTrend,
  graduateOutcomesByProgram,
  graduateOutcomeDataQuality,
  graduateOutcomeHistory,
  graduateOutcomeStates,
  graduateOutcomeSpecialties,
  addGraduateOutcome,
  saveGraduateOutcome,
  OUTCOME_CATEGORIES,
  UNKNOWN_OUTCOME,
  previewGraduateOutcomeUpload,
  commitGraduateOutcomeUpload,
  type GraduateOutcomeRow,
  type OutcomeUploadPreview,
} from "../data/graduate-outcomes";
import { extensionState } from "../data/extension-store";

export default function GraduateOutcomes({ userId, path, params, navigate, toast }: ModuleProps) {
  const outcomeId = path.split("/")[1];
  const tab = params.get("tab") || "overview";
  const year = params.get("year") || "";
  const program = params.get("program") || "";
  const college = params.get("college") || "";
  const category = params.get("category") || "";
  const specialty = params.get("specialty") || "";
  const state = params.get("state") || "";
  const known = (params.get("known") || "") as "" | "known" | "unknown";
  const f = { year, program, college, category, specialty, state, known };
  const scope = allowedPrograms(userId);
  const colleges = getAuthorizedColleges(userId);
  const programsInScope = college ? scope.filter((p) => collegeIdForProgram(p) === college) : scope;
  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  function filter(key: string, value: string) {
    navigate(path, { ...Object.fromEntries(params), [key]: value });
  }
  function attempt(action: () => void) {
    try {
      action();
      toast("Record updated. History is preserved.");
      return true;
    } catch (e) {
      toast((e as Error).message);
      return false;
    }
  }

  if (outcomeId) {
    return (
      <GraduateOutcomeDetail
        userId={userId}
        outcomeId={outcomeId}
        navigate={navigate}
        toast={toast}
      />
    );
  }

  const rows = graduateOutcomeRows(userId, f);
  const summary = graduateOutcomeSummary(rows);
  const trend = graduateOutcomeTrend(userId, { program, college });
  const byProgram = graduateOutcomesByProgram(userId, f);
  const quality = graduateOutcomeDataQuality(rows);
  const years = graduateOutcomeYears(userId);
  const categoryCounts = OUTCOME_CATEGORIES().map((c) => ({
    name: c,
    count: rows.filter((r) => r.outcome.outcome_type === c).length,
  }));
  const locationCounts = [...new Set(rows.map((r) => r.outcome.practice_state).filter(Boolean))]
    .map((st) => ({ name: st as string, count: rows.filter((r) => r.outcome.practice_state === st).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const csvRows = rows.map((r) => [
    r.resident?.full_name || r.outcome.resident_id,
    r.programName,
    collegeName(r.collegeId),
    r.outcome.graduation_year,
    r.outcome.outcome_type,
    r.outcome.specialty_practiced,
    r.outcome.fellowship_or_training_program,
    [r.outcome.practice_city, r.outcome.practice_state].filter(Boolean).join(", "),
    r.outcome.data_source,
    r.outcome.last_verified_date,
  ]);
  const headers = [
    "Graduate",
    "Program",
    "College",
    "Graduation Year",
    "Current Outcome",
    "Specialty",
    "Practice / Fellowship",
    "Location",
    "Data Source",
    "Last Updated",
  ];

  return (
    <>
      <ModuleHeading
        eyebrow="Graduate Outcomes Repository"
        title="Graduate Outcomes Tracking"
        description="Track post-graduation practice, fellowship, specialty and location outcomes across residency and fellowship programs."
      >
        <div className="inline-gap">
          <button className="button" onClick={() => setAddOpen(true)}>
            Add Graduate Outcome
          </button>
          <button className="button" onClick={() => setUploadOpen(true)}>
            Upload Outcomes
          </button>
          <button
            className="button primary"
            onClick={() =>
              navigate("analytics/report/graduates", { year, program, college })
            }
          >
            Generate Report
          </button>
        </div>
      </ModuleHeading>
      <Tabs
        current={tab}
        items={[
          { id: "overview", label: "Overview" },
          { id: "outcomes", label: "Outcomes" },
          { id: "trends", label: "Trends" },
          { id: "quality", label: "Data Quality" },
        ]}
        onSelect={(id) => filter("tab", id === "overview" ? "" : id)}
      />
      <div className="module-filters">
        <FilterSelect
          label="Graduation Year"
          value={year}
          all="All Years"
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
          onChange={(v) => filter("year", v)}
        />
        <FilterSelect
          label="College"
          value={college}
          all="All Colleges"
          options={colleges.map((c) => ({ value: c.id, label: c.shortName }))}
          onChange={(v) => {
            navigate(path, { ...Object.fromEntries(params), college: v, program: "" });
          }}
        />
        <FilterSelect
          label="Program"
          value={program}
          all="All Assigned Programs"
          options={programsInScope.map((p) => ({ value: p.program_id, label: shortName(p.name) }))}
          onChange={(v) => filter("program", v)}
        />
        <FilterSelect
          label="Outcome Category"
          value={category}
          all="All Categories"
          options={OUTCOME_CATEGORIES().map((c) => ({ value: c, label: c }))}
          onChange={(v) => filter("category", v)}
        />
        <FilterSelect
          label="Specialty"
          value={specialty}
          all="All Specialties"
          options={graduateOutcomeSpecialties(userId).map((s) => ({ value: s, label: s }))}
          onChange={(v) => filter("specialty", v)}
        />
        <FilterSelect
          label="State / Location"
          value={state}
          all="All States"
          options={graduateOutcomeStates(userId).map((s) => ({ value: s, label: s }))}
          onChange={(v) => filter("state", v)}
        />
        <FilterSelect
          label="Known / Unknown"
          value={known}
          all="Known & Unknown"
          options={[
            { value: "known", label: "Known Outcome" },
            { value: "unknown", label: "Unknown Outcome" },
          ]}
          onChange={(v) => filter("known", v)}
        />
        <button className="text-button" onClick={() => navigate("graduate-outcomes", { tab })}>
          Reset Filters
        </button>
      </div>
      <Stats
        items={[
          { label: "Total Graduates", value: summary.total },
          {
            label: "Known Outcomes",
            value: percent(summary.total ? summary.known.numerator / summary.total : null),
            detail: `${summary.known.numerator} of ${summary.total} graduates`,
          },
          {
            label: "Unknown Outcomes",
            value: percent(summary.total ? summary.unknown.numerator / summary.total : null),
            detail: `${summary.unknown.numerator} of ${summary.total} graduates`,
          },
          {
            label: "Practicing in Oklahoma",
            value: percent(summary.oklahoma.rate),
            detail: `${summary.oklahoma.numerator} of ${summary.oklahoma.denominator} graduates with known practice location`,
          },
          {
            label: "Further Training / Fellowship",
            value: percent(summary.furtherTraining.rate),
            detail: `${summary.furtherTraining.numerator} of ${summary.furtherTraining.denominator} known outcomes`,
          },
          ...(summary.rural
            ? [
                {
                  label: "Rural / HPSA Placement",
                  value: percent(summary.rural.rate),
                  detail: `${summary.rural.numerator} of ${summary.rural.denominator} practicing graduates (demo designation)`,
                },
              ]
            : []),
        ]}
      />
      {tab === "overview" && (
        <>
          <TrendLine
            title="Graduate Outcomes by Year"
            subtitle="Known vs. unknown outcomes by graduation year, current filters applied"
            points={trend.map((t) => ({ year: String(t.year), known: t.known, unknown: t.unknown }))}
            series={[
              { key: "known", label: "Known outcomes" },
              { key: "unknown", label: "Unknown outcomes" },
            ]}
          />
          <div className="module-grid two">
            <Bars
              title="Practice vs. Fellowship / Further Training"
              subtitle="Outcome category distribution for the current selection"
              rows={categoryCounts.filter((c) => c.count)}
            />
            <Bars
              title="Outcome by Program"
              subtitle="Total tracked graduates per program"
              rows={byProgram.slice(0, 10).map((p) => ({ name: shortName(p.programName), count: p.total }))}
            />
          </div>
          <Bars
            title="Practice Location"
            subtitle="Top states by tracked graduate count"
            rows={locationCounts}
          />
        </>
      )}
      {tab === "outcomes" && (
        <Card
          title="Graduate Outcomes Register"
          subtitle="Click a graduate to review outcome history, verification and source."
        >
          <DataTable
            headers={headers}
            empty={!rows.length}
            resetKey={`${year}:${program}:${college}:${category}:${specialty}:${state}:${known}`}
            rows={rows}
            sortValue={(r, col) => {
              switch (col) {
                case 0: return r.resident?.full_name || "";
                case 1: return r.programName;
                case 3: return r.outcome.graduation_year;
                case 9: return r.outcome.last_verified_date || "";
                default: return null;
              }
            }}
            renderRow={(r) => (
              <tr key={r.outcome.outcome_id}>
                <td>
                  <button className="text-button" onClick={() => navigate(`graduate-outcomes/${r.outcome.outcome_id}`)}>
                    {r.resident?.full_name || r.outcome.resident_id}
                  </button>
                </td>
                <td>{shortName(r.programName)}</td>
                <td>{collegeName(r.collegeId)}</td>
                <td>{r.outcome.graduation_year}</td>
                <td>
                  <Badge tone={r.outcome.outcome_type === UNKNOWN_OUTCOME ? "amber" : "green"}>
                    {r.outcome.outcome_type === UNKNOWN_OUTCOME ? "Unknown" : "Known"}
                  </Badge>{" "}
                  {r.outcome.outcome_type}
                </td>
                <td>{r.outcome.specialty_practiced || "Not recorded"}</td>
                <td>{r.outcome.fellowship_or_training_program || "—"}</td>
                <td>{[r.outcome.practice_city, r.outcome.practice_state].filter(Boolean).join(", ") || "Not recorded"}</td>
                <td>{r.outcome.data_source}</td>
                <td>{date(r.outcome.last_verified_date)}</td>
              </tr>
            )}
          />
        </Card>
      )}
      {tab === "trends" && (
        <>
          <TrendLine
            title="Oklahoma Placement & Further Training"
            subtitle="Count of graduates by year, current filters applied"
            points={trend.map((t) => ({ year: String(t.year), oklahoma: t.oklahoma, furtherTraining: t.furtherTraining }))}
            series={[
              { key: "oklahoma", label: "Practicing in Oklahoma" },
              { key: "outOfState", label: "Practicing out of state" },
              { key: "furtherTraining", label: "Fellowship / further training" },
            ]}
          />
          <Card title="Trend Data" subtitle="Same records shown in the chart above">
            <DataTable
              headers={["Year", "Total", "Known", "Unknown", "Oklahoma", "Out of State", "Further Training"]}
              empty={!trend.length}
            >
              {trend.map((t) => (
                <tr key={t.year}>
                  <td>{t.year}</td>
                  <td>{t.total}</td>
                  <td>{t.known}</td>
                  <td>{t.unknown}</td>
                  <td>{t.oklahoma}</td>
                  <td>{t.outOfState}</td>
                  <td>{t.furtherTraining}</td>
                </tr>
              ))}
            </DataTable>
          </Card>
        </>
      )}
      {tab === "quality" && (
        <Card
          title="Graduate Outcome Data Quality"
          subtitle="Operational indicators of what still needs review or verification"
        >
          <Stats
            items={[
              { label: "Known Outcomes", value: quality.known },
              { label: "Unknown Outcomes", value: quality.unknown },
              { label: "Missing Practice Location", value: quality.missingLocation, detail: "Practice-type outcomes with no state recorded" },
              { label: "Missing Specialty", value: quality.missingSpecialty },
              { label: "Records Needing Verification", value: quality.needingVerification, detail: "Not verified within the last 5 years" },
            ]}
          />
        </Card>
      )}
      <Modal open={addOpen} eyebrow="Graduate Outcomes" title="Add Graduate Outcome" onClose={() => setAddOpen(false)}>
        <AddOutcomeForm
          userId={userId}
          onSaved={() => {
            setAddOpen(false);
            toast("Graduate outcome added.");
          }}
          onError={(m) => toast(m)}
        />
      </Modal>
      <Modal open={uploadOpen} eyebrow="Graduate Outcomes" title="Upload Outcomes" onClose={() => setUploadOpen(false)} wide>
        <UploadOutcomesFlow
          userId={userId}
          years={years}
          scope={scope}
          onDone={(run) => {
            setUploadOpen(false);
            toast(`Upload verified: ${run.imported} record(s) updated, ${run.attention} needing attention, ${run.duplicates} duplicate(s) skipped.`);
          }}
          onError={(m) => toast(m)}
        />
      </Modal>
    </>
  );
}

function AddOutcomeForm({
  userId,
  onSaved,
  onError,
}: {
  userId: string;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const addable = data.RESIDENT.filter(
    (r) => canEdit(userId, r.program_id) && !data.GRADUATE_OUTCOME.some((g) => g.resident_id === r.resident_id),
  );
  const [residentId, setResidentId] = useState(addable[0]?.resident_id || "");
  const resident = addable.find((r) => r.resident_id === residentId);
  if (!addable.length)
    return (
      <Empty>
        Every resident in your assigned programs already has a recorded graduate outcome. Open a graduate from the
        register to edit or verify their outcome instead.
      </Empty>
    );
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!resident) return;
    const f = new FormData(e.currentTarget);
    try {
      addGraduateOutcome(userId, {
        residentId: resident.resident_id,
        programId: resident.program_id,
        graduationYear: Number(resident.graduation_date.slice(0, 4)),
        outcomeType: String(f.get("outcomeType")),
        practiceCity: String(f.get("city") || ""),
        practiceState: String(f.get("state") || ""),
        specialtyPracticed: String(f.get("specialty") || ""),
        fellowshipProgram: String(f.get("fellowship") || ""),
        dataSource: String(f.get("source")),
        notes: String(f.get("notes") || ""),
      });
      onSaved();
    } catch (e) {
      onError((e as Error).message);
    }
  }
  return (
    <form className="module-form" onSubmit={submit}>
      <label>
        Resident / Graduate
        <select value={residentId} onChange={(e) => setResidentId(e.target.value)} required>
          {addable.map((r) => (
            <option key={r.resident_id} value={r.resident_id}>
              {r.full_name} · {shortName(programName(r.program_id))}
            </option>
          ))}
        </select>
      </label>
      <label>
        Program
        <input value={resident ? shortName(programName(resident.program_id)) : ""} disabled />
      </label>
      <label>
        Graduation Year
        <input value={resident ? resident.graduation_date.slice(0, 4) : ""} disabled />
      </label>
      <label>
        Outcome Category
        <select name="outcomeType" required defaultValue="">
          <option value="" disabled>Select a category</option>
          {OUTCOME_CATEGORIES().map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        Practice City
        <input name="city" maxLength={80} />
      </label>
      <label>
        Practice State
        <input name="state" maxLength={2} placeholder="OK" />
      </label>
      <label>
        Specialty
        <input name="specialty" maxLength={120} />
      </label>
      <label>
        Fellowship / Training Program
        <input name="fellowship" maxLength={160} />
      </label>
      <label>
        Data Source
        <select name="source" defaultValue="Graduate Exit Survey">
          <option>Graduate Exit Survey</option>
          <option>Alumni Follow-up Survey (5-year)</option>
          <option>Historical Migration – Alumni Tracker</option>
          <option>Manual Entry (GME Office)</option>
        </select>
      </label>
      <label>
        Notes
        <textarea name="notes" maxLength={2000} />
      </label>
      <button className="button primary">Add Graduate Outcome</button>
    </form>
  );
}

function UploadOutcomesFlow({
  userId,
  years,
  scope,
  onDone,
  onError,
}: {
  userId: string;
  years: number[];
  scope: (typeof data)["PROGRAM"];
  onDone: (run: { imported: number; attention: number; duplicates: number }) => void;
  onError: (m: string) => void;
}) {
  const [preview, setPreview] = useState<OutcomeUploadPreview | null>(null);
  const recent = extensionState.outcomeUploadRuns.slice(0, 3);
  if (preview)
    return (
      <div className="module-form">
        <p className="form-hint">
          <strong>{preview.fileName}</strong> · Academic year {preview.academicYear}
        </p>
        <Stats
          items={[
            { label: "Rows Received", value: preview.rowsReceived },
            { label: "Matched Graduates", value: preview.matchedGraduates },
            { label: "Valid Records", value: preview.validRecords },
            { label: "Requiring Attention", value: preview.needsAttention.length },
            { label: "Duplicates", value: preview.duplicates },
          ]}
        />
        {!!preview.needsAttention.length && (
          <Card title="Records Requiring Attention" subtitle="Not imported">
            <ul className="module-timeline">
              {preview.needsAttention.map((n, i) => (
                <li key={i}>
                  <strong>Row {n.row}</strong>
                  <p>{n.issue}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {preview.duplicates > 0 && (
          <p className="form-hint">
            {preview.duplicates} record(s) were already verified from a prior upload this session and will be
            skipped again.
          </p>
        )}
        <div className="inline-gap">
          <button className="button" onClick={() => setPreview(null)}>
            Cancel
          </button>
          <button
            className="button primary"
            disabled={!preview.validRecords}
            onClick={() => {
              try {
                const run = commitGraduateOutcomeUpload(userId, preview);
                onDone(run);
              } catch (e) {
                onError((e as Error).message);
              }
            }}
          >
            Confirm Import ({preview.validRecords})
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
            const p = previewGraduateOutcomeUpload(userId, file instanceof File ? file.name : "outcomes.csv", {
              year: String(f.get("year")),
              program: String(f.get("program") || ""),
            });
            setPreview(p);
          } catch (err) {
            onError((err as Error).message);
          }
        }}
      >
        <label>
          Academic / Graduation Year
          <select name="year" required defaultValue={years[0] || ""}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label>
          Program
          <select name="program" defaultValue="">
            <option value="">All assigned programs</option>
            {scope.map((p) => (
              <option key={p.program_id} value={p.program_id}>{shortName(p.name)}</option>
            ))}
          </select>
        </label>
        <label>
          Outcomes File
          <input name="file" type="file" required accept=".csv,.xlsx,.xls" />
        </label>
        <p className="form-hint">
          CSV or spreadsheet export from your graduate exit survey. Rows are matched to existing residents by name
          and program; unmatched rows are flagged, not imported.
        </p>
        <button className="button primary">Preview Upload</button>
      </form>
      {!!recent.length && (
        <Card title="Recent Uploads" subtitle="Verified during this session">
          <DataTable headers={["File", "Academic Year", "Received", "Imported", "Attention", "Duplicates"]}>
            {recent.map((r) => (
              <tr key={r.id}>
                <td>{r.fileName}</td>
                <td>{r.academicYear}</td>
                <td>{r.rowsReceived}</td>
                <td>{r.imported}</td>
                <td>{r.attention}</td>
                <td>{r.duplicates}</td>
              </tr>
            ))}
          </DataTable>
        </Card>
      )}
    </>
  );
}

function GraduateOutcomeDetail({
  userId,
  outcomeId,
  navigate,
  toast,
}: {
  userId: string;
  outcomeId: string;
  navigate: ModuleProps["navigate"];
  toast: (m: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const scope = new Set(allowedPrograms(userId).map((p) => p.program_id));
  const outcome = data.GRADUATE_OUTCOME.find((g) => g.outcome_id === outcomeId && scope.has(g.program_id));
  if (!outcome) return <Empty>Graduate outcome not found or outside your demo role's scope.</Empty>;
  const resident = data.RESIDENT.find((r) => r.resident_id === outcome.resident_id);
  const program = data.PROGRAM.find((p) => p.program_id === outcome.program_id);
  const editable = canEdit(userId, outcome.program_id);
  const history = graduateOutcomeHistory(outcomeId);

  function attempt(action: () => void) {
    try {
      action();
      toast("Outcome updated. History is preserved.");
      setEditing(false);
      return true;
    } catch (e) {
      toast((e as Error).message);
      return false;
    }
  }

  return (
    <>
      <button className="back-link" onClick={() => navigate("graduate-outcomes")}>
        ← Graduate Outcomes Tracking
      </button>
      <ModuleHeading
        eyebrow="Graduate Outcome Detail"
        title={resident?.full_name || outcome.resident_id}
        description={`${program ? shortName(program.name) : outcome.program_id} · Graduated ${outcome.graduation_year} · College: ${program ? collegeName(collegeIdForProgram(program)) : "Not applicable"}`}
      >
        {editable && (
          <button
            className="button"
            onClick={() =>
              attempt(() =>
                saveGraduateOutcome(userId, outcomeId, {
                  outcome_type: outcome.outcome_type,
                  practice_city: outcome.practice_city,
                  practice_state: outcome.practice_state,
                  specialty_practiced: outcome.specialty_practiced,
                  is_rural: outcome.is_rural,
                  is_hpsa: outcome.is_hpsa,
                }, "Verified as current."),
              )
            }
          >
            Mark Verified Today
          </button>
        )}
      </ModuleHeading>
      <div className="module-grid two">
        <Card title="Current Outcome" subtitle={`Source: ${outcome.data_source}`}>
          <div className="review-content">
            <Badge tone={outcome.outcome_type === UNKNOWN_OUTCOME ? "amber" : "green"}>{outcome.outcome_type}</Badge>
            <div className="integration-content">
              <dl>
                <div><dt>Graduate</dt><dd>{resident?.full_name || outcome.resident_id}</dd></div>
                <div><dt>Program</dt><dd>{program ? program.name : outcome.program_id}</dd></div>
                <div><dt>College</dt><dd>{program ? collegeName(collegeIdForProgram(program)) : "Not applicable"}</dd></div>
                <div><dt>Graduation Date</dt><dd>{date(resident?.graduation_date)}</dd></div>
                <div><dt>Specialty</dt><dd>{outcome.specialty_practiced || "Not recorded"}</dd></div>
                <div><dt>Practice Setting</dt><dd>{outcome.outcome_type.startsWith("Practice") ? outcome.outcome_type : "Not applicable"}</dd></div>
                <div><dt>City</dt><dd>{outcome.practice_city || "Not recorded"}</dd></div>
                <div><dt>State</dt><dd>{outcome.practice_state || "Not recorded"}</dd></div>
                <div><dt>Fellowship Specialty / Program</dt><dd>{outcome.fellowship_or_training_program || "Not applicable"}</dd></div>
                <div><dt>Rural (demo designation)</dt><dd>{outcome.is_rural == null ? "Unknown" : outcome.is_rural ? "Yes" : "No"}</dd></div>
                <div><dt>HPSA (demo designation)</dt><dd>{outcome.is_hpsa == null ? "Unknown" : outcome.is_hpsa ? "Yes" : "No"}</dd></div>
                <div><dt>Source</dt><dd>{outcome.data_source}</dd></div>
                <div><dt>Verified Date</dt><dd>{date(outcome.last_verified_date)}</dd></div>
              </dl>
            </div>
          </div>
        </Card>
        {editable && (
          <Card title={editing ? "Edit Outcome" : "Update Outcome"}>
            {!editing ? (
              <button className="button primary" onClick={() => setEditing(true)}>
                Edit Current Outcome
              </button>
            ) : (
              <form
                className="module-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  attempt(() =>
                    saveGraduateOutcome(
                      userId,
                      outcomeId,
                      {
                        outcome_type: String(f.get("outcomeType")),
                        practice_city: String(f.get("city") || "") || null,
                        practice_state: String(f.get("state") || "") || null,
                        specialty_practiced: String(f.get("specialty") || "") || null,
                        is_rural: outcome.is_rural,
                        is_hpsa: outcome.is_hpsa,
                      },
                      String(f.get("note")),
                    ),
                  );
                }}
              >
                <label>
                  Outcome Category
                  <select name="outcomeType" defaultValue={outcome.outcome_type}>
                    {OUTCOME_CATEGORIES().map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Practice City
                  <input name="city" defaultValue={outcome.practice_city || ""} />
                </label>
                <label>
                  Practice State
                  <input name="state" defaultValue={outcome.practice_state || ""} maxLength={2} />
                </label>
                <label>
                  Specialty
                  <input name="specialty" defaultValue={outcome.specialty_practiced || ""} />
                </label>
                <label>
                  Note (required)
                  <textarea name="note" required maxLength={2000} placeholder="Explain the update…" />
                </label>
                <div className="inline-gap">
                  <button type="button" className="text-button" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                  <button className="button primary">Save Outcome Update</button>
                </div>
              </form>
            )}
          </Card>
        )}
      </div>
      <Card title="Outcome History" subtitle="Every recorded outcome is preserved; edits never overwrite prior history">
        <ol className="module-timeline">
          {history.map((h, i) => (
            <li key={i}>
              <strong>{date(h.at)}</strong>
              <small>{h.label}</small>
              <p>{h.detail}</p>
            </li>
          ))}
        </ol>
        {!history.length && <Empty>No history recorded yet.</Empty>}
      </Card>
      <ActivityHistory type="GRADUATE_OUTCOME" id={outcomeId} />
    </>
  );
}
