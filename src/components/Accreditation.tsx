import { useState } from "react";
import type { FormEvent } from "react";
import { Card, Badge, Empty, Documents } from "./shared";
import {
  ModuleHeading,
  FilterSelect,
  Tabs,
  Stats,
  DataTable,
  ExportButton,
  ActivityHistory,
  UploadPanel,
  type ModuleProps,
} from "./module-shared";
import {
  data,
  allowedPrograms,
  programName,
  shortName,
  canEdit,
  date,
  academicYear,
  authorName,
} from "../data/repository";
import {
  reviewRows,
  reviewSummary,
  deadlineState,
  apeRows,
  apeYears,
} from "../data/extension-selectors";
import {
  extensionState,
  saveReviewStatus,
  saveAction,
  addFollowUp,
  uploadReviewDocument,
  uploadAPE,
  today,
} from "../data/extension-store";
import type { ReviewAction } from "../data/types";

export default function Accreditation(props: ModuleProps) {
  const { userId, path, params, navigate, toast } = props;
  const report = path.startsWith("reports/"),
    ape = path.startsWith("ape") || path === "reports/ape",
    id = report ? undefined : path.split("/")[1];
  const [editing, setEditing] = useState<ReviewAction | null>(null);
  const scope = allowedPrograms(userId),
    year = params.get("year") || (ape ? apeYears()[0] : ""),
    program = params.get("program") || "",
    status = params.get("status") || "",
    deadline = params.get("deadline") || "";
  const rows = reviewRows(userId, { year, program, status, deadline }),
    counts = reviewSummary(rows);
  const evaluations = apeRows(userId, year, program, status),
    submitted = evaluations.filter((a) => a.submitted).length,
    docCount = evaluations.reduce((n, r) => n + r.docs.length, 0);
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
  function fields(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return new FormData(event.currentTarget);
  }
  const tabs = (
    <Tabs
      current={ape ? "ape" : "reviews"}
      items={[
        { id: "reviews", label: "Special Reviews" },
        { id: "ape", label: "Annual Program Evaluations" },
      ]}
      onSelect={(v) => navigate(v)}
    />
  );
  if (id && !ape) {
    const review = data.SPECIAL_REVIEW.find(
      (r) =>
        r.review_id === id && scope.some((p) => p.program_id === r.program_id),
    );
    if (!review)
      return <Empty>Review not found or outside your demo role’s scope.</Empty>;
    const actions = data.ACTION_ITEM.filter((a) => a.review_id === id),
      followups = data.FOLLOWUP_ACTIVITY.filter((f) => f.review_id === id).sort(
        (a, b) => a.activity_date.localeCompare(b.activity_date),
      ),
      editable = canEdit(userId, review.program_id);
    return (
      <>
        <button
          className="back-link"
          onClick={() => navigate("reviews", Object.fromEntries(params))}
        >
          ← Special Reviews
        </button>
        <ModuleHeading
          eyebrow={id}
          title={`${shortName(programName(review.program_id))} Special Review`}
          description={`Initiated ${date(review.initiated_date)} · ${review.status}`}
        >
          <button
            className="button"
            onClick={() => navigate(`programs/${review.program_id}`)}
          >
            Program Detail
          </button>
        </ModuleHeading>
        <Card
          title="Review Overview"
          subtitle="Current source record and review context"
        >
          <div className="review-content">
            <Badge>{review.status}</Badge>
            <p>{review.trigger_reason}</p>
            <p>{review.summary}</p>
            {review.closed_date && <p>Closed {date(review.closed_date)}</p>}
          </div>
        </Card>
        <div className="module-grid two">
          <Card
            title="Action Items & Deadlines"
            subtitle="Due Soon means within seven days, including today; deadlines are compared by calendar date"
          >
            <DataTable
              headers={["Action / Owner", "Deadline", "Status", "Actions"]}
              empty={!actions.length}
            >
              {actions.map((action) => (
                <tr key={action.action_item_id}>
                  <td>
                    {action.title}
                    <small>{authorName(action.assigned_to)}</small>
                    {action.description && <small>{action.description}</small>}
                    {action.notes && <small>Notes: {action.notes}</small>}
                    {action.created_at && (
                      <small>Created {date(action.created_at)}</small>
                    )}
                    {action.completed_date && (
                      <small>Completed {date(action.completed_date)}</small>
                    )}
                  </td>
                  <td>
                    {date(action.due_date)}
                    <small>
                      <Badge
                        tone={
                          deadlineState(action) === "Overdue"
                            ? "danger"
                            : undefined
                        }
                      >
                        {deadlineState(action)}
                      </Badge>
                    </small>
                  </td>
                  <td>{action.status}</td>
                  <td>
                    {editable && (
                      <div className="module-actions">
                        <button
                          className="text-button"
                          onClick={() => setEditing(action)}
                        >
                          Edit
                        </button>
                        {action.status !== "Complete" && (
                          <button
                            className="text-button"
                            onClick={() =>
                              attempt(() =>
                                saveAction(
                                  id,
                                  { ...action, status: "Complete" },
                                  userId,
                                  action.action_item_id,
                                ),
                              )
                            }
                          >
                            Mark Complete
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </DataTable>
          </Card>
          {editable && (
            <Card
              title={editing ? "Edit Action Item" : "Add Action Item"}
              subtitle="Flexible record management; no approval stages"
            >
              <form
                className="module-form"
                key={editing?.action_item_id || "new"}
                onSubmit={(e) => {
                  const f = fields(e);
                  if (
                    attempt(() =>
                      saveAction(
                        id,
                        {
                          title: String(f.get("title")),
                          description: String(f.get("description") || ""),
                          notes: String(f.get("notes") || ""),
                          assigned_to: String(f.get("owner")),
                          due_date: String(f.get("due")),
                          status: String(f.get("status")),
                        },
                        userId,
                        editing?.action_item_id,
                      ),
                    )
                  ) {
                    setEditing(null);
                    e.currentTarget.reset();
                  }
                }}
              >
                <label>
                  Action Title
                  <input
                    name="title"
                    required
                    maxLength={300}
                    defaultValue={editing?.title}
                  />
                </label>
                <label>
                  Owner
                  <select
                    aria-label="Owner"
                    name="owner"
                    defaultValue={editing?.assigned_to || userId}
                  >
                    {data.USER.filter((u) => u.is_active).map((u) => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Action Description
                  <textarea
                    name="description"
                    maxLength={2000}
                    defaultValue={editing?.description}
                  />
                </label>
                <label>
                  Action Notes
                  <textarea
                    name="notes"
                    maxLength={2000}
                    defaultValue={editing?.notes}
                  />
                </label>
                <label>
                  Deadline
                  <input
                    name="due"
                    type="date"
                    required
                    defaultValue={editing?.due_date}
                  />
                </label>
                <label>
                  Action Status
                  <select
                    aria-label="Action Status"
                    name="status"
                    defaultValue={editing?.status || "Open"}
                  >
                    {["Open", "In Progress", "Overdue", "Complete"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <button className="button primary">
                  {editing ? "Save Action" : "Add Action Item"}
                </button>
                {editing && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setEditing(null)}
                  >
                    Cancel Edit
                  </button>
                )}
              </form>
            </Card>
          )}
        </div>
        <div className="module-grid two">
          <ActivityHistory type="SPECIAL_REVIEW" id={id} />
          {editable && (
            <Card
              title="Add Status Update"
              subtitle="Existing status history remains visible"
            >
              <form
                className="module-form"
                onSubmit={(e) => {
                  const f = fields(e);
                  if (
                    attempt(() =>
                      saveReviewStatus(
                        id,
                        String(f.get("status")),
                        String(f.get("note")),
                        userId,
                      ),
                    )
                  )
                    e.currentTarget.reset();
                }}
              >
                <label>
                  Review Status
                  <select
                    aria-label="Review Status"
                    name="status"
                    defaultValue={review.status}
                  >
                    <option>In Progress</option>
                    <option>Closed</option>
                  </select>
                </label>
                <label>
                  Status Note
                  <textarea name="note" required maxLength={4000} />
                </label>
                <button className="button primary">Save Status Update</button>
              </form>
            </Card>
          )}
        </div>
        <div className="module-grid two">
          <Card
            title="Institutional Follow-Up"
            subtitle="Chronological institutional activity"
          >
            <ol className="module-timeline">
              {followups.map((f) => (
                <li key={f.activity_id}>
                  <strong>{date(f.activity_date)}</strong>
                  {f.activity_type && <small>{f.activity_type}</small>}
                  <p>{f.description}</p>
                  <small>{authorName(f.created_by)}</small>
                </li>
              ))}
            </ol>
            {!followups.length && (
              <Empty>No institutional follow-up activities recorded.</Empty>
            )}
          </Card>
          {editable && (
            <Card title="Add Follow-Up Activity">
              <form
                className="module-form"
                onSubmit={(e) => {
                  const f = fields(e);
                  if (
                    attempt(() =>
                      addFollowUp(
                        id,
                        String(f.get("date")),
                        String(f.get("description")),
                        userId,
                        String(f.get("activityType") || ""),
                      ),
                    )
                  )
                    e.currentTarget.reset();
                }}
              >
                <label>
                  Activity Date
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={today()}
                  />
                </label>
                <label>
                  Activity Description
                  <textarea name="description" required maxLength={4000} />
                </label>
                <label>
                  Activity Type
                  <input
                    name="activityType"
                    placeholder="Meeting, check-in, correspondence…"
                    maxLength={120}
                  />
                </label>
                <button className="button primary">Add Follow-Up</button>
              </form>
            </Card>
          )}
        </div>
        <UploadPanel
          type="SPECIAL_REVIEW"
          id={id}
          editable={editable}
          onUpload={(file, description) =>
            attempt(() => uploadReviewDocument(id, file, description, userId))
          }
        />
      </>
    );
  }
  if (id && ape) {
    const programRecord = scope.find((p) => p.program_id === id);
    if (!programRecord)
      return (
        <Empty>Program not found or outside your demo role’s scope.</Empty>
      );
    const row = apeRows(userId, year, id)[0],
      editable = canEdit(userId, id);
    return (
      <>
        <button className="back-link" onClick={() => navigate("ape", { year })}>
          ← Annual Program Evaluations
        </button>
        <ModuleHeading
          eyebrow="Annual Program Evaluation"
          title={shortName(programRecord.name)}
          description={`Academic year ${year} · ${row.record?.status || "Not Recorded"}`}
        >
          <button className="button" onClick={() => navigate(`programs/${id}`)}>
            Program Detail
          </button>
        </ModuleHeading>
        <div className="module-filters">
          <FilterSelect
            label="Academic Year"
            value={year}
            options={apeYears().map((y) => ({ value: y, label: y }))}
            onChange={(v) => filter("year", v)}
          />
        </div>
        <div className="module-grid two">
          <Card
            title="Evaluation Record"
            subtitle={
              row.record
                ? `Submitted ${date(row.record.submitted_date)}`
                : "No evaluation recorded for this year"
            }
          >
            <div className="review-content">
              <Badge>{row.record?.status || "Not Recorded"}</Badge>
              <p>{row.record?.notes || "No notes recorded."}</p>
              <p>
                {row.record?.uploaded_by
                  ? `Submitted by ${authorName(row.record.uploaded_by)}`
                  : "No submitting user recorded."}
              </p>
            </div>
            <Documents
              type="APE"
              id={row.record?.ape_id || ""}
              items={row.docs}
            />
          </Card>
          {editable && (
            <Card
              title="Upload Annual Program Evaluation"
              subtitle="Upload an evaluation or supporting document; metadata is retained for this session"
            >
              <form
                className="module-form"
                onSubmit={(e) => {
                  const f = fields(e),
                    file = f.get("file");
                  if (
                    file instanceof File &&
                    attempt(() =>
                      uploadAPE(
                        id,
                        year,
                        file,
                        f.get("kind") === "supporting"
                          ? "supporting"
                          : "primary",
                        String(f.get("notes") || ""),
                        userId,
                      ),
                    )
                  )
                    e.currentTarget.reset();
                }}
              >
                <label>
                  Upload Type
                  <select aria-label="Upload Type" name="kind">
                    <option value="primary">Annual Program Evaluation</option>
                    <option value="supporting">Supporting Document</option>
                  </select>
                </label>
                <label>
                  Evaluation File
                  <input
                    name="file"
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  />
                </label>
                <label>
                  Evaluation Notes
                  <textarea name="notes" maxLength={4000} />
                </label>
                <p className="form-hint">
                  PDF, DOC, DOCX, PNG or JPG · up to 10 MB. Primary uploads set
                  the record to Submitted. Existing documents are preserved.
                </p>
                <button className="button primary">
                  Upload Evaluation Document
                </button>
              </form>
            </Card>
          )}
        </div>
        {row.record && <ActivityHistory type="APE" id={row.record.ape_id} />}
      </>
    );
  }
  const headers = ape
    ? [
        "Program",
        "Academic Year",
        "APE Status",
        "Submitted",
        "Primary Documents",
        "Supporting Documents",
        "Last Session Update",
      ]
    : [
        "Program",
        "Review",
        "Status",
        "Initiated",
        "Open Actions",
        "Next Deadline",
        "Last Session Update",
      ];
  const csvRows = ape
    ? evaluations.map((r) => [
        r.program.name,
        year,
        r.record?.status || "Not Recorded",
        r.record?.submitted_date,
        r.docs.filter((d) =>
          d.description.startsWith("Annual Program Evaluation"),
        ).length,
        r.docs.filter(
          (d) => !d.description.startsWith("Annual Program Evaluation"),
        ).length,
        r.updated,
      ])
    : rows.map((r) => [
        programName(r.review.program_id),
        r.review.review_id,
        r.review.status,
        r.review.initiated_date,
        r.open.length,
        r.next,
        r.updated,
      ]);
  return (
    <>
      <ModuleHeading
        eyebrow="Accreditation & Reviews"
        title={
          ape
            ? report
              ? "Annual Program Evaluation Report"
              : "Annual Program Evaluations"
            : report
              ? "Special Review Report"
              : "Special Reviews"
        }
        description={
          ape
            ? "Program evaluations and supporting documentation, organized by academic year."
            : "Track review records, action items, deadlines, and institutional follow-up."
        }
      >
        {report ? (
          <ExportButton
            name={ape ? "annual-program-evaluations" : "special-reviews"}
            headers={headers}
            rows={csvRows}
          />
        ) : (
          <button
            className="button"
            onClick={() =>
              navigate(ape ? "reports/ape" : "reports/reviews", {
                year,
                program,
                status,
                deadline,
              })
            }
          >
            View Report
          </button>
        )}
      </ModuleHeading>
      {!report && tabs}
      <div className="module-filters">
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
        <FilterSelect
          label="Academic Year"
          value={year}
          all={ape ? undefined : "All Years"}
          options={(ape
            ? apeYears()
            : [
                ...new Set(
                  data.SPECIAL_REVIEW.map((r) =>
                    academicYear(r.initiated_date),
                  ),
                ),
              ]
          ).map((y) => ({ value: y, label: y }))}
          onChange={(v) => filter("year", v)}
        />
        <FilterSelect
          label="Record Status"
          value={status}
          all="All Statuses"
          options={(ape
            ? [
                "Submitted",
                "Missing",
                "Accepted",
                "Under Review",
                "Not Submitted",
                "Not Recorded",
              ]
            : ["In Progress", "Closed"]
          ).map((s) => ({ value: s, label: s }))}
          onChange={(v) => filter("status", v)}
        />
        {!ape && (
          <FilterSelect
            label="Deadline State"
            value={deadline}
            all="All Deadlines"
            options={["Upcoming", "Due Soon", "Overdue", "Completed"].map(
              (s) => ({ value: s, label: s }),
            )}
            onChange={(v) => filter("deadline", v)}
          />
        )}
        <button className="text-button" onClick={() => navigate(path)}>
          Clear Filters
        </button>
      </div>
      <Stats
        items={
          ape
            ? [
                { label: "Programs in Scope", value: evaluations.length },
                { label: "APE Submitted", value: submitted },
                {
                  label: "Missing / Not Submitted",
                  value: evaluations.length - submitted,
                },
                { label: "Documents", value: docCount },
              ]
            : [
                { label: "Active Reviews", value: counts.active },
                { label: "Programs Under Review", value: counts.programs },
                { label: "Open Actions", value: counts.open },
                { label: "Upcoming Deadlines", value: counts.upcoming },
                { label: "Overdue Actions", value: counts.overdue },
              ]
        }
      />
      <Card
        title={ape ? "Program Evaluation Register" : "Special Review Register"}
        subtitle={
          ape
            ? "Missing records are not labelled late; no universal deadline is assumed."
            : "Overdue is calculated from an unfinished action’s recorded deadline."
        }
      >
        <DataTable
          headers={headers}
          empty={ape ? !evaluations.length : !rows.length}
        >
          {ape
            ? evaluations.map((r) => (
                <tr key={r.program.program_id}>
                  <td>
                    <button
                      className="text-button"
                      onClick={() =>
                        navigate(`ape/${r.program.program_id}`, { year })
                      }
                    >
                      {shortName(r.program.name)}
                    </button>
                  </td>
                  <td>{year}</td>
                  <td>
                    <Badge>{r.record?.status || "Not Recorded"}</Badge>
                  </td>
                  <td>{date(r.record?.submitted_date)}</td>
                  <td>
                    {
                      r.docs.filter((d) =>
                        d.description.startsWith("Annual Program Evaluation"),
                      ).length
                    }
                  </td>
                  <td>
                    {
                      r.docs.filter(
                        (d) =>
                          !d.description.startsWith(
                            "Annual Program Evaluation",
                          ),
                      ).length
                    }
                  </td>
                  <td>{date(r.updated)}</td>
                </tr>
              ))
            : rows.map((r) => (
                <tr key={r.review.review_id}>
                  <td>
                    <button
                      className="text-button"
                      onClick={() =>
                        navigate(`programs/${r.review.program_id}`)
                      }
                    >
                      {shortName(programName(r.review.program_id))}
                    </button>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() =>
                        navigate(`reviews/${r.review.review_id}`, {
                          ...Object.fromEntries(params),
                        })
                      }
                    >
                      {r.review.review_id} →
                    </button>
                  </td>
                  <td>
                    <Badge>{r.review.status}</Badge>
                  </td>
                  <td>{date(r.review.initiated_date)}</td>
                  <td>{r.open.length}</td>
                  <td>{date(r.next)}</td>
                  <td>{date(r.updated)}</td>
                </tr>
              ))}
        </DataTable>
      </Card>
    </>
  );
}
