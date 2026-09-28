import { useState } from "react";
import { Card, Badge, Empty } from "./shared";
import {
  ModuleHeading,
  FilterSelect,
  Stats,
  DataTable,
  Bars,
  TrendLine,
  Modal,
  type ModuleProps,
} from "./module-shared";
import { data, allowedPrograms, shortName, date, canEdit, programName } from "../data/repository";
import { getAuthorizedColleges, collegeIdForProgram, collegeName } from "../data/colleges";
import {
  growthOpportunities,
  growthOpportunitySummary,
  growthOpportunityTrend,
  growthOpportunitiesByProgram,
  growthOpportunitiesByCategory,
  growthOpportunitiesBySource,
  growthUpdatesFor,
  swotFindings,
  growthCategories,
  growthStatuses,
  growthSourceTypes,
} from "../data/growth-opportunities";
import { saveGrowthOpportunity, addGrowthUpdate, recordSWOTFinding, linkSWOTFindingToOpportunity } from "../data/extension-store";
import type { GrowthOpportunity, SWOTFinding } from "../data/types";

export default function GrowthOpportunities({ userId, path, params, navigate, toast }: ModuleProps) {
  const opportunityId = path.split("/")[1];
  const year = params.get("year") || "";
  const program = params.get("program") || "";
  const college = params.get("college") || "";
  const category = params.get("category") || "";
  const status = params.get("status") || "";
  const sourceType = params.get("sourceType") || "";
  const scope = allowedPrograms(userId);
  const colleges = getAuthorizedColleges(userId);
  const programsInScope = college ? scope.filter((p) => collegeIdForProgram(p) === college) : scope;
  const [addOpen, setAddOpen] = useState(false);
  const [swotOpen, setSwotOpen] = useState(false);

  function filter(key: string, value: string) {
    navigate(path, { ...Object.fromEntries(params), [key]: value });
  }
  function attempt(action: () => void, message = "Saved. History is preserved.") {
    try {
      action();
      toast(message);
      return true;
    } catch (e) {
      toast((e as Error).message);
      return false;
    }
  }

  if (opportunityId) {
    return <OpportunityDetail userId={userId} id={opportunityId} navigate={navigate} toast={toast} />;
  }

  const f = { year, program, college, category, status, sourceType };
  const rows = growthOpportunities(userId, f);
  const summary = growthOpportunitySummary(rows);
  const trend = growthOpportunityTrend(userId, { program, college });
  const byProgram = growthOpportunitiesByProgram(userId, f);
  const byCategory = growthOpportunitiesByCategory(userId, f);
  const bySource = growthOpportunitiesBySource(userId, f);
  const years = [...new Set(growthOpportunities(userId, { program, college }).map((r) => r.identifiedDate.slice(0, 4)))].sort().reverse();

  return (
    <>
      <ModuleHeading
        eyebrow="Program Health"
        title="Growth Opportunities"
        description="Identify and track program improvement and growth opportunities derived from SWOT findings, surveys, reports and GME review."
      >
        <div className="inline-gap">
          {scope.some((p) => canEdit(userId, p.program_id)) && (
            <button className="button" onClick={() => setAddOpen(true)}>
              Add Growth Opportunity
            </button>
          )}
          <button className="button" onClick={() => setSwotOpen(true)}>
            Import / Record SWOT Findings
          </button>
          <button
            className="button primary"
            onClick={() => navigate("analytics/report/growth", { year, program, college })}
          >
            Generate Growth Report
          </button>
        </div>
      </ModuleHeading>
      <div className="module-filters">
        <FilterSelect
          label="Identified Year"
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
          label="Category"
          value={category}
          all="All Categories"
          options={growthCategories.map((c) => ({ value: c, label: c }))}
          onChange={(v) => filter("category", v)}
        />
        <FilterSelect
          label="Status"
          value={status}
          all="All Statuses"
          options={growthStatuses.map((s) => ({ value: s, label: s }))}
          onChange={(v) => filter("status", v)}
        />
        <FilterSelect
          label="Source Type"
          value={sourceType}
          all="All Sources"
          options={growthSourceTypes.map((s) => ({ value: s, label: s }))}
          onChange={(v) => filter("sourceType", v)}
        />
      </div>
      <Stats
        items={[
          { label: "Total Opportunities", value: summary.total },
          { label: "Identified", value: summary.identified },
          { label: "Under Review", value: summary.underReview },
          { label: "Planned", value: summary.planned },
          { label: "In Progress", value: summary.inProgress },
          { label: "Completed", value: summary.completed },
          { label: "Programs with Opportunities", value: summary.programsWithOpportunities },
        ]}
      />
      <div className="module-grid two">
        <Bars title="Opportunities by Program" subtitle="Total tracked per program" rows={byProgram.map((p) => ({ name: shortName(p.programName), count: p.count }))} />
        <Bars
          title="Opportunities by Category"
          subtitle="Configured growth categories"
          rows={byCategory.map((c) => ({ name: c.category, count: c.count }))}
        />
      </div>
      <div className="module-grid two">
        <Bars
          title="Opportunities by Status"
          subtitle="Current lifecycle status"
          rows={growthStatuses.map((s) => ({ name: s, count: rows.filter((r) => r.status === s).length })).filter((s) => s.count)}
        />
        <Bars title="Opportunities by Source" subtitle="What evidence produced this opportunity" rows={bySource.map((s) => ({ name: s.sourceType, count: s.count }))} />
      </div>
      <TrendLine
        title="Multi-Year Opportunity Trend"
        subtitle="Identified vs. completed, by calendar year"
        points={trend.map((t) => ({ year: t.year, identified: t.identified, completed: t.completed }))}
        series={[
          { key: "identified", label: "Identified" },
          { key: "completed", label: "Completed" },
        ]}
      />
      <Card title="Growth Opportunities Register" subtitle="Click an opportunity to review its evidence and update history">
        <DataTable
          headers={["Opportunity", "Program", "College", "Category", "Source", "Status", "Identified", "Target", "Owner", "Updated"]}
          empty={!rows.length}
        >
          {rows.map((g) => (
            <tr key={g.id}>
              <td>
                <button className="text-button" onClick={() => navigate(`growth/${g.id}`)}>
                  {g.title}
                </button>
              </td>
              <td>{shortName(programName(g.programId))}</td>
              <td>{collegeName(collegeIdForProgram(data.PROGRAM.find((p) => p.program_id === g.programId) || { type: "Residency" }))}</td>
              <td>{g.category}</td>
              <td>{g.sourceType || "Other"}</td>
              <td><Badge>{g.status}</Badge></td>
              <td>{date(g.identifiedDate)}</td>
              <td>{date(g.targetDate)}</td>
              <td>{g.ownerLabel}</td>
              <td>{date(g.updatedAt)}</td>
            </tr>
          ))}
        </DataTable>
      </Card>
      <Modal open={addOpen} eyebrow="Growth Opportunities" title="Add Growth Opportunity" onClose={() => setAddOpen(false)}>
        <OpportunityForm
          userId={userId}
          scope={scope.filter((p) => canEdit(userId, p.program_id))}
          onSaved={() => {
            setAddOpen(false);
            toast("Growth opportunity added.");
          }}
          onError={toast}
        />
      </Modal>
      <Modal open={swotOpen} eyebrow="Growth Opportunities" title="Record SWOT Finding" onClose={() => setSwotOpen(false)} wide>
        <SWOTFlow
          userId={userId}
          scope={scope.filter((p) => canEdit(userId, p.program_id))}
          toast={toast}
          onCreatedOpportunity={() => setSwotOpen(false)}
        />
      </Modal>
    </>
  );
}

function OpportunityForm({
  userId,
  scope,
  existing,
  prefill,
  onSaved,
  onError = (m) => alert(m),
}: {
  userId: string;
  scope: (typeof data)["PROGRAM"];
  existing?: GrowthOpportunity;
  prefill?: Partial<GrowthOpportunity>;
  onSaved: (o: GrowthOpportunity) => void;
  onError?: (m: string) => void;
}) {
  if (!scope.length) return <Empty>You do not have edit access to any program in scope.</Empty>;
  return (
    <form
      className="module-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        try {
          const record = saveGrowthOpportunity(
            {
              programId: String(f.get("programId")),
              title: String(f.get("title")),
              category: String(f.get("category")),
              description: String(f.get("description")),
              status: String(f.get("status")),
              identifiedDate: String(f.get("identifiedDate")),
              targetDate: String(f.get("targetDate")) || null,
              ownerLabel: String(f.get("owner")),
              source: String(f.get("source")) || "Internal GME",
              notes: String(f.get("notes") || ""),
              sourceType: prefill?.sourceType || String(f.get("sourceTypeField") || "Other"),
              sourcePeriod: prefill?.sourcePeriod,
              sourceFinding: prefill?.sourceFinding,
            },
            userId,
            existing?.id,
          );
          onSaved(record);
        } catch (err) {
          onError((err as Error).message);
        }
      }}
    >
      <label>
        Program
        <select name="programId" required defaultValue={existing?.programId || prefill?.programId || scope[0]?.program_id}>
          {scope.map((p) => (
            <option key={p.program_id} value={p.program_id}>{shortName(p.name)}</option>
          ))}
        </select>
      </label>
      <label>
        Title
        <input name="title" required defaultValue={existing?.title || prefill?.title} maxLength={200} />
      </label>
      <label>
        Category
        <select name="category" defaultValue={existing?.category || "Other"}>
          {growthCategories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      {!prefill?.sourceType && (
        <label>
          Source Type
          <select name="sourceTypeField" defaultValue={existing?.sourceType || "Other"}>
            {growthSourceTypes.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      )}
      <label>
        Status
        <select name="status" defaultValue={existing?.status || "Identified"}>
          {growthStatuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label>
        Description / Rationale
        <textarea name="description" required defaultValue={existing?.description || prefill?.description} />
      </label>
      <label>
        Identified Date
        <input name="identifiedDate" type="date" required defaultValue={existing?.identifiedDate || new Date().toISOString().slice(0, 10)} />
      </label>
      <label>
        Target Date
        <input name="targetDate" type="date" defaultValue={existing?.targetDate || ""} />
      </label>
      <label>
        Owner / Responsibility
        <input name="owner" required defaultValue={existing?.ownerLabel || "Program Director"} />
      </label>
      <label>
        Source Record
        <input name="source" defaultValue={existing?.source || prefill?.source} placeholder="e.g. 2025-26 Program SWOT" />
      </label>
      <label>
        Notes
        <textarea name="notes" defaultValue={existing?.notes} />
      </label>
      <button className="button primary">{existing ? "Save Opportunity" : "Create Growth Opportunity"}</button>
    </form>
  );
}

function SWOTFlow({
  userId,
  scope,
  toast,
  onCreatedOpportunity,
}: {
  userId: string;
  scope: (typeof data)["PROGRAM"];
  toast: (m: string) => void;
  onCreatedOpportunity: () => void;
}) {
  const [recorded, setRecorded] = useState<SWOTFinding | null>(null);
  if (!scope.length) return <Empty>You do not have edit access to any program in scope.</Empty>;
  if (recorded && recorded.category === "Opportunity")
    return (
      <>
        <p className="form-hint">
          Finding recorded. Since this is an Opportunity finding, you may create a linked Growth Opportunity now, or
          close this dialog to leave it as a SWOT record only.
        </p>
        <OpportunityForm
          userId={userId}
          scope={scope}
          prefill={{
            programId: recorded.programId,
            title: recorded.finding,
            description: `Opportunity identified in the ${recorded.academicYear} program SWOT review.`,
            source: recorded.source,
            sourceType: "SWOT Analysis",
            sourcePeriod: recorded.academicYear,
            sourceFinding: recorded.finding,
          }}
          onSaved={(record) => {
            linkSWOTFindingToOpportunity(recorded.id, record.id);
            toast("Growth opportunity created from SWOT finding.");
            onCreatedOpportunity();
          }}
          onError={toast}
        />
      </>
    );
  if (recorded)
    return (
      <div className="module-form">
        <p className="form-hint">
          {recorded.category} finding recorded for {shortName(programName(recorded.programId))}. Only Opportunity
          findings can be converted into a Growth Opportunity.
        </p>
        <button className="button" onClick={() => setRecorded(null)}>Record Another Finding</button>
      </div>
    );
  return (
    <form
      className="module-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        try {
          const record = recordSWOTFinding(userId, {
            programId: String(f.get("programId")),
            academicYear: String(f.get("academicYear")),
            category: String(f.get("category")) as SWOTFinding["category"],
            finding: String(f.get("finding")),
            source: String(f.get("source") || ""),
          });
          setRecorded(record);
        } catch (err) {
          toast((err as Error).message);
        }
      }}
    >
      <label>
        Program
        <select name="programId" required defaultValue={scope[0]?.program_id}>
          {scope.map((p) => (
            <option key={p.program_id} value={p.program_id}>{shortName(p.name)}</option>
          ))}
        </select>
      </label>
      <label>
        Academic Year
        <input name="academicYear" required placeholder="2026-27" />
      </label>
      <label>
        SWOT Category
        <select name="category" required defaultValue="Opportunity">
          <option>Strength</option>
          <option>Weakness</option>
          <option>Opportunity</option>
          <option>Threat</option>
        </select>
      </label>
      <label>
        Finding
        <textarea name="finding" required maxLength={500} />
      </label>
      <label>
        Source Document / Reference
        <input name="source" placeholder="e.g. Annual SWOT review" />
      </label>
      <button className="button primary">Record Finding</button>
    </form>
  );
}

function OpportunityDetail({
  userId,
  id,
  navigate,
  toast,
}: {
  userId: string;
  id: string;
  navigate: ModuleProps["navigate"];
  toast: (m: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const scope = new Set(allowedPrograms(userId).map((p) => p.program_id));
  const opportunity = growthOpportunities(userId).find((g) => g.id === id);
  const findings = swotFindings(userId).filter((f) => f.linkedOpportunityId === id);
  if (!opportunity || !scope.has(opportunity.programId))
    return <Empty>Growth opportunity not found or outside your access scope.</Empty>;
  const editable = canEdit(userId, opportunity.programId);
  const updates = growthUpdatesFor(id);

  return (
    <>
      <button className="back-link" onClick={() => navigate("growth")}>← Growth Opportunities</button>
      <ModuleHeading
        eyebrow="Growth Opportunity"
        title={opportunity.title}
        description={`${shortName(programName(opportunity.programId))} · ${collegeName(collegeIdForProgram(data.PROGRAM.find((p) => p.program_id === opportunity.programId) || { type: "Residency" }))} · ${opportunity.category}`}
      >
        <Badge>{opportunity.status}</Badge>
      </ModuleHeading>
      <div className="module-grid two">
        <Card title="Opportunity Details" subtitle={`Source: ${opportunity.sourceType || "Other"}`}>
          <div className="integration-content">
            <dl>
              <div><dt>Description</dt><dd>{opportunity.description}</dd></div>
              <div><dt>Source Record</dt><dd>{opportunity.source}</dd></div>
              {opportunity.sourcePeriod && <div><dt>Source Period</dt><dd>{opportunity.sourcePeriod}</dd></div>}
              {opportunity.sourceFinding && <div><dt>Source Finding</dt><dd>{opportunity.sourceFinding}</dd></div>}
              <div><dt>Identified Date</dt><dd>{date(opportunity.identifiedDate)}</dd></div>
              <div><dt>Target Date</dt><dd>{date(opportunity.targetDate)}</dd></div>
              <div><dt>Owner / Responsibility</dt><dd>{opportunity.ownerLabel}</dd></div>
              <div><dt>Notes</dt><dd>{opportunity.notes || "Not recorded"}</dd></div>
              <div><dt>Last Updated</dt><dd>{date(opportunity.updatedAt)}</dd></div>
            </dl>
          </div>
          {!!findings.length && (
            <p className="form-hint">Linked SWOT finding: {findings[0].finding}</p>
          )}
        </Card>
        {editable && (
          <Card title={editing ? "Edit Opportunity" : "Actions"}>
            {!editing ? (
              <div className="inline-gap">
                <button className="button" onClick={() => setEditing(true)}>Edit</button>
              </div>
            ) : (
              <OpportunityForm
                userId={userId}
                scope={[data.PROGRAM.find((p) => p.program_id === opportunity.programId)!]}
                existing={opportunity}
                onSaved={() => {
                  setEditing(false);
                  toast("Growth opportunity saved.");
                }}
                onError={toast}
              />
            )}
          </Card>
        )}
      </div>
      {editable && (
        <Card title="Add Update / Change Status">
          <form
            className="module-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                addGrowthUpdate(id, String(f.get("note")), userId, String(f.get("newStatus")));
                toast("Update added.");
                (e.target as HTMLFormElement).reset();
              } catch (err) {
                toast((err as Error).message);
              }
            }}
          >
            <label>
              Update
              <textarea name="note" required />
            </label>
            <label>
              Change Status
              <select name="newStatus" defaultValue={opportunity.status}>
                {growthStatuses.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <button className="button primary">Add Update</button>
          </form>
        </Card>
      )}
      <Card title="Progress / Update History">
        <ol className="module-timeline">
          {[...updates].reverse().map((u) => (
            <li key={u.id}>
              <strong>{date(u.at)}</strong>
              {u.previousStatus && <small>{u.previousStatus} → {u.newStatus}</small>}
              <p>{u.note}</p>
            </li>
          ))}
        </ol>
        {!updates.length && <Empty>No updates recorded yet.</Empty>}
      </Card>
    </>
  );
}
