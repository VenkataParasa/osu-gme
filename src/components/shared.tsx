import type { ReactNode } from "react";
import { ArrowUpRight, FileText, ChevronRight } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from "recharts";
import { boardTrend, date, documents, percent } from "../data/repository";
import type { DocumentMetadata } from "../data/types";
export function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: string;
}) {
  const s = String(children);
  const color =
    tone ||
    (s === "Reviewable" ||
    s === "Heightened" ||
    s === "In Progress" ||
    s === "Watch" ||
    s === "Non-Compliant"
      ? "amber"
      : s === "Non-Reviewable"
        ? "blue"
        : s === "Closed" || s === "Compliant" || s === "Standard"
          ? "green"
          : "neutral");
  return (
    <span className={`badge ${color}`}>
      <i />
      {children}
    </span>
  );
}
export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      <div className="card-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Metric({
  label,
  value,
  description,
  icon,
  onClick,
  tone = "",
}: {
  label: string;
  value: ReactNode;
  description: string;
  icon: ReactNode;
  onClick?: () => void;
  tone?: string;
}) {
  return (
    <button className={`metric ${tone}`} onClick={onClick}>
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <div className="metric-bottom">
        <span>{description}</span>
        <ArrowUpRight size={15} />
      </div>
    </button>
  );
}
export function Empty({
  children = "No records match the selected filters.",
}: {
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <FileText size={26} />
      <p>{children}</p>
    </div>
  );
}
export function BoardChart({ id }: { id: string }) {
  const values = boardTrend(id);
  if (!values.length)
    return <Empty>No board pass data available for this program.</Empty>;
  const chart = values.map((v) => ({
    ...v,
    annual: Number((v.pass_rate * 100).toFixed(1)),
    rolling: Number((v.three_year_pass_rate * 100).toFixed(1)),
  }));
  return (
    <>
      <div className="chart-legend">
        <span>
          <i className="legend-dot orange" />
          3-year rolling rate
        </span>
        <span>
          <i className="legend-dot teal" />
          Annual pass rate
        </span>
      </div>
      <div className="line-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chart}
            margin={{ top: 15, right: 25, bottom: 5, left: 0 }}
            accessibilityLayer
          >
            <CartesianGrid
              vertical={false}
              stroke="#d0d0ce"
              strokeDasharray="4 4"
            />
            <XAxis
              dataKey="reporting_year"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#4b4b4b", fontWeight: 600 }}
              dy={10}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v) => `${v}%`}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#4b4b4b", fontWeight: 600 }}
              width={45}
            />
            <Tooltip
              formatter={(v, name) => [
                `${v}%`,
                name === "rolling" ? "3-year rolling rate" : "Annual pass rate",
              ]}
              contentStyle={{
                borderRadius: 8,
                border: "2px solid #000000",
                fontSize: 12,
                color: "#000000",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.14)",
              }}
            />
            <Line
              type="linear"
              dataKey="rolling"
              stroke="#ff964f"
              strokeWidth={4}
              dot={{ r: 5, strokeWidth: 3, fill: "white" }}
              activeDot={{ r: 7, strokeWidth: 3 }}
            />
            <Line
              type="linear"
              dataKey="annual"
              stroke="#000000"
              strokeWidth={3}
              strokeDasharray="8 5"
              dot={{ r: 4, strokeWidth: 2, fill: "white" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data">
        <summary>
          View chart data <ChevronRight size={12} />
        </summary>
        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>Annual</th>
              <th>3-year rolling</th>
              <th>Passed / eligible</th>
            </tr>
          </thead>
          <tbody>
            {values.map((v) => (
              <tr key={v.board_metric_id}>
                <td>{v.reporting_year}</td>
                <td>{percent(v.pass_rate)}</td>
                <td>{percent(v.three_year_pass_rate)}</td>
                <td>
                  {v.passed_count} / {v.eligible_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
export function Documents({
  type,
  id,
  items,
}: {
  type: string;
  id: string;
  items?: DocumentMetadata[];
}) {
  const docs = items ?? documents(type, id);
  return (
    <div className="documents">
      {docs.length ? (
        docs.map((d) => (
          <div className="document" key={d.document_id}>
            <span className="file-icon">
              <FileText size={20} />
            </span>
            <div>
              <strong>{d.file_name}</strong>
              <p>{d.description}</p>
              <small>
                {(d.file_size / 1024).toFixed(0)} KB · {date(d.uploaded_at)} ·
                Metadata only
              </small>
            </div>
          </div>
        ))
      ) : (
        <Empty>No supporting documents have been uploaded.</Empty>
      )}
    </div>
  );
}
