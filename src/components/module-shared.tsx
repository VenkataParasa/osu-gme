import { Children, Fragment, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, FormEvent, ReactElement } from "react";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
} from "recharts";
import { PagedRows } from "./Pagination";
import { Download, FileText, X } from "lucide-react";
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
export function Modal({
  open,
  eyebrow,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className={wide ? "modal-wide" : ""}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="modal-head">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h2>{title}</h2>
        </div>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={21} />
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
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
export function DataTable<T = never>({
  headers,
  children,
  empty,
  pageSize = 25,
  rows: records,
  renderRow,
  sortValue,
  resetKey = "",
}: {
  headers: string[];
  children?: ReactNode;
  empty?: boolean;
  pageSize?: number;
  rows?: T[];
  renderRow?: (row: T) => ReactNode;
  sortValue?: (row: T, column: number) => string | number | null | undefined;
  resetKey?: string;
}) {
  const [sort, setSort] = useState<{
    column: number;
    direction: "asc" | "desc";
  } | null>(null);
  function rowsOf(node: ReactNode): ReactElement[] {
    return Children.toArray(node).flatMap((child) => {
      if (!isValidElement<{ children?: ReactNode }>(child)) return [];
      return child.type === Fragment ? rowsOf(child.props.children) : [child];
    });
  }
  function textOf(node: ReactNode): string {
    if (node == null || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number")
      return String(node);
    if (Array.isArray(node)) return node.map(textOf).join(" ");
    return isValidElement<{ children?: ReactNode }>(node)
      ? textOf(node.props.children)
      : "";
  }
  const rows = useMemo(() => rowsOf(children), [children]);
  const sortedRows = useMemo(() => {
    const values: (T | ReactElement)[] = records ?? rows;
    if (!sort) return values;
    const valueOf = (row: T | ReactElement) => {
      if (records && sortValue) return sortValue(row as T, sort.column);
      const element = row as ReactElement<{ children?: ReactNode }>;
      return textOf(Children.toArray(element.props.children)[sort.column]).trim();
    };
    const numeric = (value: string | number | null | undefined) => {
      if (typeof value === "number") return value;
      const text = String(value ?? "").replace(/,/g, "");
      return /^-?\d+(\.\d+)?%?$/.test(text) ? Number(text.replace(/%$/, "")) : NaN;
    };
    return [...values].sort((a, b) => {
      const left = valueOf(a), right = valueOf(b);
      const x = numeric(left), y = numeric(right);
      const comparison = Number.isFinite(x) && Number.isFinite(y)
        ? x - y : String(left ?? "").localeCompare(String(right ?? ""), undefined, { numeric: true });
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [rows, records, sort, sortValue]);
  const toggleSort = (column: number) =>
    {
      setSort((current) =>
        current?.column === column
          ? { column, direction: current.direction === "asc" ? "desc" : "asc" }
          : { column, direction: "asc" },
      );
    };
  return empty || !sortedRows.length ? (
    <Empty>No records match the selected filters.</Empty>
  ) : (
    <PagedRows rows={sortedRows} initialPageSize={pageSize} resetKey={`${resetKey}:${sort?.column}:${sort?.direction}:${sortedRows.length}`}>
      {shown => <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {headers.map((h, column) => (
                <th
                  key={h}
                  aria-sort={
                    sort?.column === column
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    className="table-sort"
                    onClick={() => toggleSort(column)}
                  >
                    {h}
                    <span aria-hidden="true">
                      {sort?.column === column
                        ? sort.direction === "asc"
                          ? " ↑"
                          : " ↓"
                        : " ↕"}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{records && renderRow ? shown.map(row => renderRow(row as T)) : shown as ReactNode[]}</tbody>
        </table>
      </div>}
    </PagedRows>
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
const trendColors = ["#ff964f", "#000000", "#2f6b4f", "#4b6bb0"];
export function TrendLine({
  title,
  subtitle,
  points,
  series,
  valueSuffix = "",
}: {
  title: string;
  subtitle: string;
  points: Record<string, string | number | null>[];
  series: { key: string; label: string }[];
  valueSuffix?: string;
}) {
  const hasData = points.some((p) => series.some((s) => p[s.key] != null));
  return (
    <Card title={title} subtitle={subtitle}>
      {!hasData ? (
        <Empty>No multi-year data is available for this selection.</Empty>
      ) : (
        <>
          <div className="chart-legend">
            {series.map((s, i) => (
              <span key={s.key}>
                <i className="legend-dot" style={{ background: trendColors[i % trendColors.length] }} />
                {s.label}
              </span>
            ))}
          </div>
          <div className="line-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 15, right: 25, bottom: 5, left: 0 }} accessibilityLayer>
                <CartesianGrid vertical={false} stroke="#d0d0ce" strokeDasharray="4 4" />
                <XAxis
                  dataKey="year"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#4b4b4b", fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#4b4b4b", fontWeight: 600 }}
                  width={45}
                  tickFormatter={(v) => `${v}${valueSuffix}`}
                />
                <Tooltip
                  formatter={(v, name) => [`${v}${valueSuffix}`, series.find((s) => s.key === name)?.label || name]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "2px solid #000000",
                    fontSize: 12,
                    color: "#000000",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.14)",
                  }}
                />
                {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
                {series.map((s, i) => (
                  <Line
                    key={s.key}
                    type="linear"
                    dataKey={s.key}
                    name={s.label}
                    stroke={trendColors[i % trendColors.length]}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: "white" }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
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
