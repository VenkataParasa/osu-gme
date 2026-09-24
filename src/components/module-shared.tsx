import type { ReactNode, FormEvent } from "react";
import { Download, FileText } from "lucide-react";
import { Card, Empty, Documents } from "./shared";
import { data, authorName, date } from "../data/repository";
import { extensionState } from "../data/extension-store";
import { csvExportRows } from "../data/extension-selectors";
export type Navigate = (
  path: string,
  query?: Record<string, string | undefined>,
) => void;
export interface ModuleProps {
  userId: string;
  path: string;
  params: URLSearchParams;
  navigate: Navigate;
  toast: (message: string) => void;
}
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  all,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  all?: string;
}) {
  return (
    <label className="module-filter">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {all && <option value="">{all}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Tabs({
  items,
  current,
  onSelect,
}: {
  items: { id: string; label: string }[];
  current: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="module-tabs" role="navigation" aria-label="Section views">
      {items.map((item) => (
        <button
          key={item.id}
          aria-current={current === item.id ? "page" : undefined}
          className={current === item.id ? "selected" : ""}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
export function ModuleHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Stats({
  items,
}: {
  items: { label: string; value: ReactNode; detail?: string }[];
}) {
  return (
    <div className="module-stats">
      {items.map((item) => (
        <div className="module-stat" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.detail && <small>{item.detail}</small>}
        </div>
      ))}
    </div>
  );
}
export function DataTable({
  headers,
  children,
  empty,
}: {
  headers: string[];
  children: ReactNode;
  empty?: boolean;
}) {
  return empty ? (
    <Empty>No records match the selected filters.</Empty>
  ) : (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function ExportButton({
  name,
  headers,
  rows,
}: {
  name: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}) {
  function download() {
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csvExportRows(headers, rows)], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${name}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  return (
    <div className="inline-gap">
      <button className="button" onClick={() => window.print()}>
        <FileText size={15} />
        Print / PDF
      </button>
      <button className="button primary" onClick={download}>
        <Download size={15} />
        Export CSV
      </button>
    </div>
  );
}
export function Bars({
  title,
  subtitle,
  rows,
  onClick,
}: {
  title: string;
  subtitle: string;
  rows: { name: string; count: number }[];
  onClick?: (name: string) => void;
}) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <Card title={title} subtitle={subtitle}>
      <div className="module-bars">
        {rows.length ? (
          rows.map((row) => (
            <button
              key={row.name}
              disabled={!onClick}
              onClick={() => onClick?.(row.name)}
              title={`${row.name}: ${row.count}`}
            >
              <span>{row.name}</span>
              <div>
                <i style={{ width: `${(row.count / max) * 100}%` }} />
              </div>
              <strong>{row.count}</strong>
            </button>
          ))
        ) : (
          <Empty>No results are recorded for this selection.</Empty>
        )}
      </div>
    </Card>
  );
}
export function ActivityHistory({ type, id }: { type: string; id: string }) {
  const entries = extensionState.activities
    .filter((a) => a.entityType === type && a.entityId === id)
    .sort((a, b) => a.at.localeCompare(b.at));
  return (
    <Card
      title="Activity & Status History"
      subtitle="Changes recorded during this demo session"
    >
      <ol className="module-timeline">
        {entries.map((a) => (
          <li key={a.id}>
            <strong>{a.kind}</strong>
            <small>
              {date(a.at)} · {authorName(a.userId)}
            </small>
            {a.previousStatus && (
              <p>
                {a.previousStatus} → {a.newStatus}
              </p>
            )}
            <p>{a.note}</p>
          </li>
        ))}
      </ol>
      {!entries.length && (
        <Empty>
          No session updates yet. Original source metadata is shown above.
        </Empty>
      )}
    </Card>
  );
}
export function UploadPanel({
  type,
  id,
  editable,
  onUpload,
}: {
  type: string;
  id: string;
  editable: boolean;
  onUpload: (file: File, description: string) => void;
}) {
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      fields = new FormData(form),
      file = fields.get("file");
    if (file instanceof File) {
      onUpload(
        file,
        String(fields.get("description") || "Supporting documentation"),
      );
      form.reset();
    }
  }
  return (
    <Card
      title="Supporting Documents"
      subtitle="Local metadata uploads · PDF, DOC, DOCX, PNG or JPG · up to 10 MB"
    >
      <Documents
        type={type}
        id={id}
        items={data.DOCUMENT.filter(
          (d) => d.entity_type === type && d.entity_id === id,
        )}
      />
      {editable && (
        <form className="module-form" onSubmit={submit}>
          <label>
            Document Type
            <select name="description">
              <option>Review Documentation</option>
              <option>Action Plan</option>
              <option>Correspondence</option>
              <option>Follow-Up Documentation</option>
              <option>Other Supporting Material</option>
            </select>
          </label>
          <label>
            Supporting File
            <input
              name="file"
              type="file"
              required
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            />
          </label>
          <button className="button primary">Upload Document</button>
          <p className="form-hint">Metadata only; uploads reset on refresh.</p>
        </form>
      )}
    </Card>
  );
}
export function ReportTabs({
  current,
  navigate,
}: {
  current: string;
  navigate: Navigate;
}) {
  return (
    <Tabs
      current={current}
      items={[
        { id: "concerns", label: "Resident Concerns" },
        { id: "health", label: "Program Health" },
        { id: "recruitment", label: "Recruitment & Match" },
        { id: "reviews", label: "Special Reviews" },
        { id: "ape", label: "Annual Program Evaluations" },
      ]}
      onSelect={(id) =>
        navigate(id === "concerns" ? "reports" : `reports/${id}`)
      }
    />
  );
}
