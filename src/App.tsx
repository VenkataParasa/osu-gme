import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  ChartNoAxesCombined,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  ShieldCheck,
  Activity,
  CircleHelp,
  Search,
  Download,
  Plus,
  X,
  Menu,
  FileText,
  Clock3,
  CircleCheck,
  TriangleAlert,
  SlidersHorizontal,
  GraduationCap,
  CalendarDays,
  ChevronDown,
  Check,
  LockKeyhole,
  ArrowUp,
  ArrowDown,
  Upload,
} from "lucide-react";
import {
  data,
  allowedPrograms,
  userRole,
  shortName,
  percent,
  date,
  academicYear,
  years,
  boardTrend,
  latestBoard,
  latestDuty,
  dutyHistory,
  monitoring,
  activeReview,
  reviewStatus,
  reviews,
  needsAttention,
  residentName,
  programName,
  authorName,
  concernUpdateNote,
  classifications,
  statuses,
  isOpen,
  filterConcerns,
  summary,
  updateConcern,
  canEdit,
  csvFor,
} from "./data/repository";
import type {
  Concern,
  ConcernUpdate,
  DocumentMetadata,
  Program,
} from "./data/types";
import {
  Badge,
  Card,
  Metric,
  Empty,
  BoardChart,
  Documents,
} from "./components/shared";
import Recruitment from "./components/Recruitment";
import Accreditation from "./components/Accreditation";
import Integrations from "./components/Integrations";
import ProgramHealth from "./components/ProgramHealth";
import ReportingAnalytics from "./components/ReportingAnalytics";
import { ReportTabs } from "./components/module-shared";
import { useDataRevision, notifyDataChanged } from "./data/extension-store";

const pages = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "health", label: "Program Health", icon: Activity },
  { id: "analytics", label: "Reporting & Analytics", icon: FileText },
  { id: "programs", label: "Dashboard", icon: ChartNoAxesCombined },
  { id: "concerns", label: "Resident Concerns", icon: Users },
  { id: "recruitment", label: "Recruitment & Match", icon: GraduationCap },
  { id: "reviews", label: "Accreditation & Reviews", icon: ShieldCheck },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "integrations", label: "Integrations", icon: SlidersHorizontal },
];
type ProgramSortKey =
  "program" | "boardRate" | "compliance" | "monitoring" | "review";

function readRoute() {
  const [path, query = ""] = window.location.hash.slice(1).split("?");
  return { path: path || "overview", params: new URLSearchParams(query) };
}
export default function App() {
  useDataRevision();
  const [route, setRoute] = useState(readRoute);
  const [userId, setUserId] = useState("USR-004");
  const [concerns, setConcerns] = useState<Concern[]>(() =>
    structuredClone(data.CONCERN_RECORD),
  );
  const [updates, setUpdates] = useState<ConcernUpdate[]>(() =>
    structuredClone(data.CONCERN_UPDATE),
  );
  const documentRecords = data.DOCUMENT;
  function setDocumentRecords(
    update: (previous: DocumentMetadata[]) => DocumentMetadata[],
  ) {
    data.DOCUMENT = update(data.DOCUMENT);
    notifyDataChanged();
  }
  const [mobile, setMobile] = useState(false);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<"new" | "help" | null>(null);
  const [trendId, setTrendId] = useState("PRG-001");
  const [programSort, setProgramSort] = useState<{
    key: ProgramSortKey;
    direction: "asc" | "desc";
  }>({ key: "program", direction: "asc" });
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const listener = () => {
      setRoute(readRoute());
      setMobile(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  const scope = allowedPrograms(userId);
  const params = route.params;
  const filters = {
    program: params.get("program") || "",
    year: params.get("year") || "",
    classification: params.get("classification") || "",
    status: params.get("status") || "",
    search: params.get("search") || "",
  };
  const scopedConcerns = filterConcerns(concerns, {}, scope);
  const filtered = filterConcerns(concerns, filters, scope);
  const visiblePrograms = scope.filter(
    (p) => !filters.program || p.program_id === filters.program,
  );
  const overviewConcerns = filterConcerns(
    concerns,
    { program: filters.program, year: filters.year },
    scope,
  );
  const [page, detailId] = route.path.split("/");
  const currentPage = pages.find(
    (p) => p.id === (page === "ape" ? "reviews" : page),
  );
  const currentUser = data.USER.find((u) => u.user_id === userId)!;
  const role = userRole(userId)!;
  const count = summary(overviewConcerns);
  const attention = visiblePrograms.filter((p) =>
    needsAttention(p, filters.year),
  );
  function navigate(
    path: string,
    query: Record<string, string | undefined> = {},
  ) {
    const p = new URLSearchParams(
      Object.entries(query).filter(
        (entry): entry is [string, string] => !!entry[1],
      ),
    );
    window.location.hash = `${path}${p.size ? "?" + p.toString() : ""}`;
  }
  function filter(key: string, value: string) {
    const p = new URLSearchParams(params);
    value ? p.set(key, value) : p.delete(key);
    navigate(route.path, Object.fromEntries(p));
  }
  function exportCSV() {
    const blob = new Blob(["\uFEFF" + csvFor(filtered)], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gme-concern-report.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    setToast(`${filtered.length} concern records exported.`);
  }
  function switchUser(id: string) {
    setUserId(id);
    navigate("overview");
    setTrendId(allowedPrograms(id)[0]?.program_id || "");
  }
  function programOptions() {
    return scope.map((p) => (
      <option key={p.program_id} value={p.program_id}>
        {shortName(p.name)}
      </option>
    ));
  }
  const Select = ({
    label,
    value,
    onChange,
    children,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    children: ReactNode;
  }) => (
    <label className="select-field">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
      <ChevronDown size={14} />
    </label>
  );
  function commonFilters(includeConcerns = false) {
    return (
      <div className="filters">
        <span className="filter-icon">
          <SlidersHorizontal size={17} />
        </span>
        <Select
          label="Program"
          value={filters.program}
          onChange={(v) => filter("program", v)}
        >
          <option value="">All programs</option>
          {programOptions()}
        </Select>
        <Select
          label="Academic year"
          value={filters.year}
          onChange={(v) => filter("year", v)}
        >
          <option value="">All academic years</option>
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </Select>
        {includeConcerns && (
          <>
            <Select
              label="Classification"
              value={filters.classification}
              onChange={(v) => filter("classification", v)}
            >
              <option value="">All classifications</option>
              {classifications.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <Select
              label="Status"
              value={filters.status}
              onChange={(v) => filter("status", v)}
            >
              <option value="">All statuses</option>
              <option value="Open">All open</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </>
        )}
        {page === "programs" && (
          <>
            <Select
              label="Monitoring"
              value={params.get("monitoring") || ""}
              onChange={(v) => filter("monitoring", v)}
            >
              <option value="">All monitoring</option>
              <option>Standard</option>
              <option>Heightened</option>
            </Select>
            <Select
              label="Special Review"
              value={params.get("review") || ""}
              onChange={(v) => filter("review", v)}
            >
              <option value="">All reviews</option>
              <option>In Progress</option>
              <option>Closed</option>
              <option>None recorded</option>
            </Select>
          </>
        )}
        <button
          className="text-button clear-filter"
          onClick={() => navigate(route.path)}
        >
          Clear filters
        </button>
      </div>
    );
  }
  function concernTable(rows: Concern[], compact = false) {
    return rows.length ? (
      <div className="table-scroll">
        <table className="concern-table">
          <thead>
            <tr>
              <th>Resident / program</th>
              <th>Concern</th>
              <th>Classification</th>
              <th>Status</th>
              {!compact && <th>Identified</th>}
              <th>Last updated</th>
              <th>
                <span className="sr-only">Open record</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.concern_id}>
                <td>
                  <button
                    className="resident-link"
                    onClick={() => navigate(`concerns/${c.concern_id}`)}
                  >
                    <span className="avatar small">
                      {residentName(c.resident_id)
                        .split(" ")
                        .slice(0, 2)
                        .map((s) => s[0])
                        .join("")}
                    </span>
                    <span>
                      <strong>{residentName(c.resident_id)}</strong>
                      <small>{shortName(programName(c.program_id))}</small>
                    </span>
                  </button>
                </td>
                <td className="summary-cell">
                  <button
                    className="plain-link"
                    onClick={() => navigate(`concerns/${c.concern_id}`)}
                  >
                    {c.summary}
                  </button>
                  <small>{c.concern_id}</small>
                </td>
                <td>
                  <Badge>{c.classification}</Badge>
                </td>
                <td>
                  <span className="status-text">
                    <i
                      className={
                        c.status === "Closed" ? "green-dot" : "blue-dot"
                      }
                    />
                    {c.status}
                  </span>
                </td>
                {!compact && (
                  <td className="nowrap">{date(c.identified_date)}</td>
                )}
                <td className="nowrap">{date(c.updated_at)}</td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={`Open concern ${c.concern_id}`}
                    onClick={() => navigate(`concerns/${c.concern_id}`)}
                  >
                    <ChevronRight size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty>No resident concerns match the selected filters.</Empty>
    );
  }
  function programTable(rows: Program[], sortable = false) {
    function sortValue(program: Program, key: ProgramSortKey) {
      if (key === "program") return shortName(program.name);
      if (key === "boardRate")
        return latestBoard(program.program_id)?.three_year_pass_rate ?? null;
      if (key === "compliance")
        return (
          latestDuty(program.program_id, filters.year)?.compliance_rate ?? null
        );
      if (key === "monitoring") return monitoring(program);
      return reviewStatus(program.program_id);
    }
    const displayRows = sortable
      ? [...rows].sort((a, b) => {
          const aValue = sortValue(a, programSort.key);
          const bValue = sortValue(b, programSort.key);
          if (aValue == null && bValue == null)
            return a.name.localeCompare(b.name);
          if (aValue == null) return 1;
          if (bValue == null) return -1;
          const comparison =
            typeof aValue === "number" && typeof bValue === "number"
              ? aValue - bValue
              : String(aValue).localeCompare(String(bValue));
          return comparison === 0
            ? a.name.localeCompare(b.name)
            : programSort.direction === "asc"
              ? comparison
              : -comparison;
        })
      : rows;
    function sortHeader(label: string, key: ProgramSortKey) {
      const active = programSort.key === key;
      return (
        <th
          aria-sort={
            sortable && active
              ? programSort.direction === "asc"
                ? "ascending"
                : "descending"
              : undefined
          }
        >
          {sortable ? (
            <button
              className={`sort-button ${active ? "active" : ""}`}
              onClick={() =>
                setProgramSort((current) => ({
                  key,
                  direction:
                    current.key === key && current.direction === "asc"
                      ? "desc"
                      : "asc",
                }))
              }
              aria-label={`${label}, sort ${active && programSort.direction === "asc" ? "descending" : "ascending"}`}
            >
              <span>{label}</span>
              {active ? (
                programSort.direction === "asc" ? (
                  <ArrowUp size={13} aria-hidden="true" />
                ) : (
                  <ArrowDown size={13} aria-hidden="true" />
                )
              ) : (
                <span className="sort-idle" aria-hidden="true">
                  ↕
                </span>
              )}
            </button>
          ) : (
            label
          )}
        </th>
      );
    }
    return rows.length ? (
      <div className="table-scroll">
        <table className="program-performance-table">
          <thead>
            <tr>
              {sortHeader("Program", "program")}
              {sortHeader("3-year board pass rate", "boardRate")}
              {sortHeader("Duty-hour compliance", "compliance")}
              {sortHeader("Monitoring", "monitoring")}
              {sortHeader("Special Review", "review")}
              <th>
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((p) => {
              const b = latestBoard(p.program_id),
                d = latestDuty(p.program_id, filters.year);
              return (
                <tr key={p.program_id}>
                  <td>
                    <button
                      className="program-link"
                      onClick={() => navigate(`programs/${p.program_id}`)}
                    >
                      <span className="program-icon">
                        <Building2 size={18} />
                      </span>
                      <span>
                        <strong>{shortName(p.name)}</strong>
                        <small>
                          {p.type} · {p.program_id}
                        </small>
                      </span>
                    </button>
                  </td>
                  <td>
                    <strong className="number">
                      {percent(b?.three_year_pass_rate)}
                    </strong>
                    <small>
                      {b
                        ? `Reporting year ${b.reporting_year}`
                        : "No board report supplied"}
                    </small>
                  </td>
                  <td>
                    <span className="inline-gap">
                      <strong className="number">
                        {percent(d?.compliance_rate)}
                      </strong>
                      {d && <Badge>{d.compliance_status}</Badge>}
                    </span>
                    <small>
                      {d?.academic_period || "No data for this period"}
                    </small>
                  </td>
                  <td>
                    <Badge>{monitoring(p)}</Badge>
                  </td>
                  <td>
                    <Badge>{reviewStatus(p.program_id)}</Badge>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`View ${p.name}`}
                      onClick={() => navigate(`programs/${p.program_id}`)}
                    >
                      <ChevronRight size={17} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty />
    );
  }
  function distribution(rows: Concern[], clickable = true) {
    const s = summary(rows);
    return (
      <div className="distribution">
        <div
          className="donut"
          style={{
            background: s.total
              ? `conic-gradient(#ff964f 0 ${(s.reviewable / s.total) * 100}%, #000000 0 100%)`
              : "#dddddd",
          }}
        >
          <div>
            <strong>{s.total}</strong>
            <span>Total concerns</span>
          </div>
        </div>
        <div className="distribution-labels">
          {[
            ["Reviewable", s.reviewable, "orange"],
            ["Non-Reviewable", s.nonReviewable, "teal"],
          ].map(([label, n, color]) => (
            <button
              key={label}
              onClick={() =>
                clickable
                  ? navigate("concerns", {
                      program: filters.program,
                      year: filters.year,
                      classification: String(label),
                    })
                  : filter(
                      "classification",
                      filters.classification === label ? "" : String(label),
                    )
              }
            >
              <span>
                <i className={`legend-dot ${color}`} />
                {label}
              </span>
              <strong>
                {n}
                <ChevronRight size={13} />
              </strong>
            </button>
          ))}
        </div>
        <div className="snapshot-footer">
          <span>
            <i className="green-dot" />
            {s.open} open
          </span>
          <span>{s.closed} closed</span>
          {s.escalated > 0 && <span>{s.escalated} escalated</span>}
        </div>
      </div>
    );
  }
  function overview() {
    const trendProgram =
      visiblePrograms.find((p) => p.program_id === trendId) ||
      visiblePrograms[0];
    const activity = updates
      .filter((u) =>
        overviewConcerns.some((c) => c.concern_id === u.concern_id),
      )
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 4);
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">RESIDENT & PROGRAM DATA MANAGEMENT</div>
            <h1>Institutional Overview</h1>
            <p>
              A clear view of your programs. Better support for your residents.
            </p>
          </div>
          <button className="button" onClick={() => navigate("reports")}>
            <FileText size={16} />
            View reports
            <ArrowUpRight size={15} />
          </button>
        </div>
        {commonFilters()}
        <div className="metrics four">
          <Metric
            label="Total Programs"
            value={visiblePrograms.length}
            description={`${visiblePrograms.filter((p) => p.type === "Residency").length} residencies · ${visiblePrograms.filter((p) => p.type === "Fellowship").length} fellowships`}
            icon={<Building2 size={18} />}
            onClick={() =>
              navigate("programs", {
                program: filters.program,
                year: filters.year,
              })
            }
          />
          <Metric
            label="Heightened Monitoring"
            value={visiblePrograms
              .filter((p) => monitoring(p) === "Heightened")
              .length.toString()
              .padStart(2, "0")}
            description="Programs with additional oversight"
            icon={<Activity size={18} />}
            tone="warm"
            onClick={() =>
              navigate("programs", {
                program: filters.program,
                monitoring: "Heightened",
              })
            }
          />
          <Metric
            label="Active Special Reviews"
            value={visiblePrograms
              .filter((p) => activeReview(p.program_id))
              .length.toString()
              .padStart(2, "0")}
            description="Current program reviews"
            icon={<ShieldCheck size={18} />}
            onClick={() =>
              navigate("programs", {
                program: filters.program,
                review: "In Progress",
              })
            }
          />
          <Metric
            label="Open Resident Concerns"
            value={count.open.toString().padStart(2, "0")}
            description={`${overviewConcerns.filter((c) => isOpen(c) && c.classification === "Reviewable").length} reviewable · ${overviewConcerns.filter((c) => isOpen(c) && c.classification === "Non-Reviewable").length} non-reviewable`}
            icon={<Users size={18} />}
            onClick={() =>
              navigate("concerns", {
                program: filters.program,
                year: filters.year,
                status: "Open",
              })
            }
          />
        </div>
        {attention.length > 0 && (
          <div className="attention-banner">
            <span className="attention-symbol">
              <TriangleAlert size={20} />
            </span>
            <div>
              <strong>
                {attention.length}{" "}
                {attention.length === 1
                  ? "program requires"
                  : "programs require"}{" "}
                attention
              </strong>
              <p>
                {attention.map((p) => shortName(p.name)).join(", ")} ·
                Monitoring, review, or reported compliance status
              </p>
            </div>
            <button
              onClick={() => navigate(`programs/${attention[0].program_id}`)}
            >
              Review program
              <ArrowRight size={16} />
            </button>
          </div>
        )}
        <div className="overview-charts">
          <Card
            title="Board Pass Performance"
            subtitle="Program-level trends across the latest three reporting years"
            action={
              trendProgram && (
                <select
                  className="compact-select"
                  aria-label="Board trend program"
                  value={trendProgram.program_id}
                  onChange={(e) => setTrendId(e.target.value)}
                >
                  {visiblePrograms.map((p) => (
                    <option key={p.program_id} value={p.program_id}>
                      {shortName(p.name)}
                    </option>
                  ))}
                </select>
              )
            }
          >
            {trendProgram ? (
              <>
                <div className="chart-stat">
                  <strong>
                    {percent(
                      latestBoard(trendProgram.program_id)
                        ?.three_year_pass_rate,
                    )}
                  </strong>
                  <span>Latest 3-year rolling pass rate</span>
                  <span className="subtle-pill">
                    {boardTrend(trendProgram.program_id).at(-1)
                      ?.reporting_year || "No report"}
                  </span>
                </div>
                <BoardChart id={trendProgram.program_id} />
              </>
            ) : (
              <Empty />
            )}
          </Card>
          <Card
            title="Concern Snapshot"
            subtitle="All recorded concerns in the selected scope"
            action={<Users size={18} className="muted" />}
          >
            {distribution(overviewConcerns)}
          </Card>
        </div>
        <Card
          title="Program Performance at a Glance"
          subtitle="Latest board reports and received duty-hour compliance"
          action={
            <button
              className="text-button"
              onClick={() =>
                navigate("programs", {
                  program: filters.program,
                  year: filters.year,
                })
              }
            >
              View all programs
              <ArrowRight size={14} />
            </button>
          }
        >
          {programTable(
            [...visiblePrograms]
              .sort(
                (a, b) =>
                  Number(needsAttention(b, filters.year)) -
                  Number(needsAttention(a, filters.year)),
              )
              .slice(0, 4),
          )}
          <div className="card-foot">
            <span>
              <span className="green-dot" />
              Duty-hour source: New Innovations
            </span>
            <span>
              Imported compliance results · no local hour calculations
            </span>
          </div>
        </Card>
        <div className="bottom-grid">
          <Card
            title="Recent Concern Activity"
            subtitle="Latest updates recorded in the supplied dataset"
            action={
              <button
                className="text-button"
                onClick={() => navigate("concerns")}
              >
                All concerns
                <ArrowRight size={14} />
              </button>
            }
          >
            <div className="activity-list">
              {activity.length ? (
                activity.map((u) => (
                  <button
                    key={u.update_id}
                    onClick={() => navigate(`concerns/${u.concern_id}`)}
                  >
                    <span className="activity-icon">
                      <Clock3 size={16} />
                    </span>
                    <div>
                      <strong>
                        {u.update_type}{" "}
                        <span>
                          ·{" "}
                          {residentName(
                            concerns.find((c) => c.concern_id === u.concern_id)!
                              .resident_id,
                          )}
                        </span>
                      </strong>
                      <p>{concernUpdateNote(u)}</p>
                    </div>
                    <small>{date(u.updated_at)}</small>
                  </button>
                ))
              ) : (
                <Empty />
              )}
            </div>
          </Card>
          <section className="report-callout">
            <span className="report-icon">
              <ChartNoAxesCombined size={24} />
            </span>
            <div className="eyebrow">INSTITUTIONAL REPORTING</div>
            <h2>See the Whole Picture.</h2>
            <p>
              Explore resident concerns across programs, classifications, and
              academic years.
            </p>
            <button className="button" onClick={() => navigate("reports")}>
              Explore concern reports
              <ArrowUpRight size={16} />
            </button>
            <div className="callout-lines" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </section>
        </div>
      </>
    );
  }
  function programsPage() {
    const rows = visiblePrograms.filter(
      (p) =>
        (!params.get("monitoring") ||
          monitoring(p) === params.get("monitoring")) &&
        (!params.get("review") ||
          reviewStatus(p.program_id) === params.get("review")),
    );
    return (
      <>
        <div className="page-heading">
          <div className="heading-text">
            <div className="eyebrow">PROGRAM OVERSIGHT</div>
            <h1>Program Performance Dashboard</h1>
            <p>
              Board outcomes, imported compliance, and program monitoring in one
              place.
            </p>
          </div>
          <span className="subtle-pill">
            <Building2 size={15} />
            {scope.length} programs
          </span>
        </div>
        {commonFilters()}
        <div className="info-line">
          <CircleHelp size={15} />
          Academic year filters duty-hour results. Board rates use the latest
          board reporting year; monitoring and reviews show current records.
        </div>
        <Card
          title="Programs"
          subtitle={`${rows.length} programs in the selected scope`}
        >
          {programTable(rows, true)}
          <div className="card-foot">
            <span>Board rates are supplied program-level rolling values.</span>
            <span>Duty hours · New Innovations</span>
          </div>
        </Card>
      </>
    );
  }
  function programDetail() {
    const p = scope.find((p) => p.program_id === detailId);
    if (!p)
      return (
        <Empty>Program not found or outside your demo role’s scope.</Empty>
      );
    const b = latestBoard(p.program_id),
      d = latestDuty(p.program_id),
      related = scopedConcerns.filter((c) => c.program_id === p.program_id);
    return (
      <>
        <button className="back-link" onClick={() => navigate("programs")}>
          ← All programs
        </button>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              {p.program_id} · {p.type}
            </div>
            <h1>{p.name}</h1>
            <p>
              {p.accreditation_status} · Since {date(p.accreditation_since)}
            </p>
          </div>
          <Badge>{monitoring(p)}</Badge>
        </div>
        <div className="module-links">
          <button
            className="button"
            onClick={() => navigate(`health/program/${p.program_id}`)}
          >
            Program Health
          </button>
          <button
            className="button"
            onClick={() => navigate(`recruitment/program/${p.program_id}`)}
          >
            Recruitment & Match
          </button>
          <button
            className="button"
            onClick={() => navigate("reviews", { program: p.program_id })}
          >
            Special Reviews
          </button>
          <button
            className="button"
            onClick={() => navigate(`ape/${p.program_id}`)}
          >
            Annual Program Evaluations
          </button>
        </div>
        <div className="detail-grid">
          <Card
            title="Board Pass Performance"
            subtitle={
              b
                ? `${b.board_type} · ${b.source}`
                : "Program-level board reports"
            }
          >
            <div className="chart-stat">
              <strong>{percent(b?.three_year_pass_rate)}</strong>
              <span>Latest 3-year rolling rate</span>
            </div>
            <BoardChart id={p.program_id} />
            {b?.source_document_id && (
              <p className="source-note">
                Source document: {b.source_document_id} · Imported{" "}
                {date(b.imported_at)}
              </p>
            )}
          </Card>
          <Card
            title="Duty-Hour Compliance"
            subtitle="Imported results · New Innovations"
          >
            <div className="compliance-stat">
              <strong>{percent(d?.compliance_rate)}</strong>
              {d && <Badge>{d.compliance_status}</Badge>}
            </div>
            <p className="source-note">
              {d?.academic_period || "No reporting period available"}
              {d && ` · Received ${date(d.imported_at)}`}
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Reporting period</th>
                    <th>Compliance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dutyHistory(p.program_id).map((v) => (
                    <tr key={v.compliance_id}>
                      <td>{v.academic_period}</td>
                      <td>{percent(v.compliance_rate)}</td>
                      <td>
                        <Badge>{v.compliance_status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-foot">
              Received compliance information; individual duty-hour logs are
              managed in New Innovations.
            </div>
          </Card>
        </div>
        <Card
          title="Monitoring & Special Review"
          subtitle={`Accreditation status updated ${date(p.updated_at)}`}
        >
          <div className="review-content">
            <Badge>{monitoring(p)}</Badge>
            <p>{p.accreditation_status}</p>
            {reviews(p.program_id).length ? (
              reviews(p.program_id).map((r) => (
                <div className="review-record" key={r.review_id}>
                  <div className="row-between">
                    <button
                      className="text-button"
                      onClick={() => navigate(`reviews/${r.review_id}`)}
                    >
                      {r.review_id} · Manage Special Review →
                    </button>
                    <Badge>{r.status}</Badge>
                  </div>
                  <small>
                    Initiated {date(r.initiated_date)}
                    {r.closed_date && ` · Closed ${date(r.closed_date)}`}
                  </small>
                  <p>{r.trigger_reason}</p>
                  <p>{r.summary}</p>
                  <Documents
                    type="SPECIAL_REVIEW"
                    id={r.review_id}
                    items={documentRecords.filter(
                      (document) =>
                        document.entity_type === "SPECIAL_REVIEW" &&
                        document.entity_id === r.review_id,
                    )}
                  />
                </div>
              ))
            ) : (
              <p className="muted">No Special Review currently recorded.</p>
            )}
          </div>
        </Card>
        <Card
          title="Resident Concerns"
          subtitle={`${related.length} recorded concerns in this program`}
          action={
            <button
              className="text-button"
              onClick={() => navigate("concerns", { program: p.program_id })}
            >
              View filtered list
              <ArrowRight size={14} />
            </button>
          }
        >
          {concernTable(related, true)}
        </Card>
      </>
    );
  }
  function concernMetrics(rows: Concern[]) {
    const s = summary(rows);
    return (
      <div className="metrics five">
        {[
          {
            label: "Total concerns",
            value: s.total,
            desc: "All recorded concerns",
            icon: <Users size={17} />,
            query: {},
          },
          {
            label: "Reviewable",
            value: s.reviewable,
            desc: "Current classification",
            icon: <ShieldCheck size={17} />,
            query: { classification: "Reviewable" },
          },
          {
            label: "Non-reviewable",
            value: s.nonReviewable,
            desc: "Current classification",
            icon: <FileText size={17} />,
            query: { classification: "Non-Reviewable" },
          },
          {
            label: "Open concerns",
            value: s.open,
            desc: "Monitoring or under review",
            icon: <Clock3 size={17} />,
            query: { status: "Open" },
          },
          {
            label: "Closed",
            value: s.closed,
            desc: `${s.escalated} separately escalated`,
            icon: <CircleCheck size={17} />,
            query: { status: "Closed" },
          },
        ].map((m) => (
          <Metric
            key={m.label}
            label={m.label}
            value={m.value}
            description={m.desc}
            icon={m.icon}
            onClick={() =>
              navigate(page, {
                program: filters.program,
                year: filters.year,
                ...m.query,
              })
            }
          />
        ))}
      </div>
    );
  }
  function concernsPage() {
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">RESIDENT SUPPORT</div>
            <h1>Resident Concerns</h1>
            <p>
              Maintain a complete picture, from the first concern to the latest
              update.
            </p>
          </div>
          {scope.some((p) => canEdit(userId, p.program_id)) && (
            <button className="button primary" onClick={() => setModal("new")}>
              <Plus size={17} />
              New concern
            </button>
          )}
        </div>
        {concernMetrics(overviewConcerns)}
        {commonFilters(true)}
        <Card
          title="Concern Records"
          subtitle={`${filtered.length} results · Confidential resident information`}
          action={
            <label className="search-box">
              <Search size={16} />
              <input
                aria-label="Search concerns"
                placeholder="Search resident or concern…"
                value={filters.search}
                onChange={(e) => filter("search", e.target.value)}
              />
            </label>
          }
        >
          {concernTable(filtered)}
          <div className="card-foot">
            <span>
              Showing {filtered.length} of {scopedConcerns.length} records in
              your role’s scope
            </span>
            <span>
              <LockKeyhole size={12} />
              Access follows the selected demo role
            </span>
          </div>
        </Card>
      </>
    );
  }
  function concernDetail() {
    const c = scopedConcerns.find((c) => c.concern_id === detailId);
    if (!c)
      return (
        <Empty>Concern not found or outside your demo role’s scope.</Empty>
      );
    const history = updates
      .filter((u) => u.concern_id === c.concern_id)
      .sort((a, b) => a.updated_at.localeCompare(b.updated_at));
    const related = scopedConcerns.filter(
      (r) => r.resident_id === c.resident_id && r.concern_id !== c.concern_id,
    );
    return (
      <>
        <button className="back-link" onClick={() => navigate("concerns")}>
          ← All concern records
        </button>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              {c.concern_id} · {academicYear(c.identified_date)}
            </div>
            <h1>{residentName(c.resident_id)}</h1>
            <button
              className="text-button"
              onClick={() => navigate(`programs/${c.program_id}`)}
            >
              {programName(c.program_id)}
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="inline-gap">
            <Badge>{c.classification}</Badge>
            <Badge>{c.status}</Badge>
          </div>
        </div>
        <div className="concern-detail-grid">
          <div>
            <Card title="Concern Record" subtitle={c.summary}>
              <div className="record-facts">
                <div>
                  <span>Date identified</span>
                  <strong>{date(c.identified_date)}</strong>
                </div>
                <div>
                  <span>Last updated</span>
                  <strong>{date(c.updated_at)}</strong>
                </div>
                <div>
                  <span>Created by</span>
                  <strong>{authorName(c.created_by)}</strong>
                </div>
                <div>
                  <span>Closed date</span>
                  <strong>
                    {c.closed_date ? date(c.closed_date) : "Not closed"}
                  </strong>
                </div>
              </div>
              {related.length > 0 && (
                <div className="related-records">
                  <strong>Other records for this resident</strong>
                  {related.map((r) => (
                    <button
                      className="text-button"
                      key={r.concern_id}
                      onClick={() => navigate(`concerns/${r.concern_id}`)}
                    >
                      {r.concern_id} · {r.classification} · {r.status}
                      <ArrowRight size={14} />
                    </button>
                  ))}
                </div>
              )}
            </Card>
            <Card
              title="Record History"
              subtitle="Original entries and classification changes remain visible"
            >
              <ol className="timeline">
                {history.map((u) => (
                  <li key={u.update_id}>
                    <span
                      className={`timeline-point ${u.update_type === "Classification Change" ? "orange-point" : ""}`}
                    >
                      <Clock3 size={13} />
                    </span>
                    <div className="row-between">
                      <strong>{u.update_type}</strong>
                      <small>{date(u.updated_at)}</small>
                    </div>
                    {u.previous_classification && (
                      <div className="history-change">
                        <Badge>{u.previous_classification}</Badge>
                        <ArrowRight size={14} />
                        <Badge>{u.new_classification}</Badge>
                      </div>
                    )}
                    <p>{concernUpdateNote(u)}</p>
                    <small>
                      {authorName(u.updated_by)} ·{" "}
                      {new Date(u.updated_at).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </li>
                ))}
              </ol>
              {!history.length && <Empty>No updates have been recorded.</Empty>}
            </Card>
            <Card
              title="Supporting Documentation"
              subtitle="Document metadata from the source dataset; file contents are not included"
            >
              <Documents
                type="CONCERN_RECORD"
                id={c.concern_id}
                items={documentRecords.filter(
                  (document) =>
                    document.entity_type === "CONCERN_RECORD" &&
                    document.entity_id === c.concern_id,
                )}
              />
            </Card>
          </div>
          <div>
            <Card
              title="Update Concern"
              subtitle="Keep the record current and preserve its history"
            >
              {canEdit(userId, c.program_id) ? (
                <form
                  className="update-form"
                  key={`${c.concern_id}-${c.updated_at}`}
                  onSubmit={(e) => saveUpdate(e, c)}
                >
                  <label>
                    Classification
                    <select
                      aria-label="Classification"
                      name="classification"
                      defaultValue={c.classification}
                    >
                      {classifications.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Status
                    <select
                      aria-label="Status"
                      name="status"
                      defaultValue={c.status}
                    >
                      {statuses.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Update Note <span className="required">*</span>
                    <textarea
                      aria-label="Update note"
                      name="note"
                      required
                      maxLength={4000}
                      rows={6}
                      placeholder="Describe the update and the reason for any changes…"
                    />
                  </label>
                  <label className="file-upload">
                    <span>
                      Supporting Document <small>Optional</small>
                    </span>
                    <span className="file-input-row">
                      <Upload size={18} aria-hidden="true" />
                      <input
                        aria-label="Supporting document"
                        name="document"
                        type="file"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
                      />
                    </span>
                    <small>
                      PDF, DOC, DOCX, PNG or JPG · 10 MB maximum · Metadata is
                      retained for this demo session
                    </small>
                  </label>
                  <p className="form-hint">
                    <ShieldCheck size={15} />
                    Changes are added to history with your name and the current
                    date.
                  </p>
                  <button className="button primary" type="submit">
                    <Check size={16} />
                    Save update
                  </button>
                  <p className="form-hint">
                    Demo edits last until the page is refreshed.
                  </p>
                </form>
              ) : (
                <div className="read-only">
                  <LockKeyhole size={23} />
                  <p>
                    This demo role has read-only access. Choose a GME
                    Administrator or an assigned program role to maintain
                    records.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </>
    );
  }
  function saveUpdate(event: FormEvent<HTMLFormElement>, c: Concern) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const uploadedFile = form.get("document");
      const file = uploadedFile instanceof File ? uploadedFile : null;
      const allowedFileTypes = new Set([
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/png",
        "image/jpeg",
      ]);
      if (file && file.size > 10 * 1024 * 1024)
        throw new Error("Supporting documents must be 10 MB or smaller.");
      if (file && file.size > 0 && !allowedFileTypes.has(file.type))
        throw new Error("Upload a PDF, DOC, DOCX, PNG or JPG file.");
      const now = new Date().toISOString();
      const result = updateConcern(
        c,
        {
          classification: String(form.get("classification")),
          status: String(form.get("status")),
          note: String(form.get("note")),
        },
        userId,
        now,
      );
      const documentUpdates: ConcernUpdate[] = [];
      if (file && file.size > 0) {
        const documentId = `DOC-DEMO-${crypto.randomUUID().slice(0, 8)}`;
        setDocumentRecords((previous) => [
          ...previous,
          {
            document_id: documentId,
            entity_type: "CONCERN_RECORD",
            entity_id: c.concern_id,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_path: `demo://${documentId}/${encodeURIComponent(file.name)}`,
            uploaded_by: userId,
            uploaded_at: now,
            source: "Demo Client Upload",
            description: "Supporting document added with concern update",
          },
        ]);
        documentUpdates.push({
          update_id: crypto.randomUUID(),
          concern_id: c.concern_id,
          updated_by: userId,
          updated_at: now,
          update_type: "Document Added",
          note: `Supporting document added: ${file.name}`,
          previous_classification: null,
          new_classification: null,
        });
      }
      setConcerns((prev) =>
        prev.map((r) => (r.concern_id === c.concern_id ? result.record : r)),
      );
      setUpdates((prev) => [...prev, ...result.updates, ...documentUpdates]);
      setToast(
        file && file.size > 0
          ? "Concern and supporting document updated. History was preserved."
          : "Concern updated. Previous values are preserved in history.",
      );
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  function reportsPage() {
    const s = summary(filtered),
      grouped = scope
        .map((p) => ({
          p,
          total: filtered.filter((c) => c.program_id === p.program_id).length,
          reviewable: filtered.filter(
            (c) =>
              c.program_id === p.program_id &&
              c.classification === "Reviewable",
          ).length,
        }))
        .filter((g) => g.total)
        .sort((a, b) => b.total - a.total),
      max = Math.max(...grouped.map((g) => g.total), 1);
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">INSTITUTIONAL REPORTING</div>
            <h1>Resident Concern Report</h1>
            <p>
              Explore patterns across programs and prepare a clear institutional
              picture.
            </p>
          </div>
          <div className="inline-gap">
            <button className="button" onClick={() => window.print()}>
              <FileText size={16} />
              Print / PDF
            </button>
            <button className="button primary" onClick={exportCSV}>
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
        {commonFilters(true)}
        <div className="report-scope">
          <ShieldCheck size={17} />
          <span>
            {role.role_id === "ROL-01" || role.role_id === "ROL-02"
              ? "Institutional"
              : "Assigned-program"}{" "}
            view · {filters.year || "All academic years"} · {filtered.length}{" "}
            concern records
          </span>
          <span>Based on date identified · Current record classifications</span>
        </div>
        <div className="report-charts">
          <Card
            title="Concerns by Classification"
            subtitle="Select a classification to filter this report"
          >
            {distribution(filtered, false)}
          </Card>
          <Card
            title="Concerns by Program"
            subtitle="Select a program to explore its records"
          >
            <div className="chart-legend">
              <span>
                <i className="legend-dot orange" />
                Reviewable
              </span>
              <span>
                <i className="legend-dot teal" />
                Non-reviewable
              </span>
            </div>
            <div className="bar-chart">
              {grouped.length ? (
                grouped.map((g) => (
                  <button
                    key={g.p.program_id}
                    onClick={() =>
                      filter(
                        "program",
                        filters.program === g.p.program_id
                          ? ""
                          : g.p.program_id,
                      )
                    }
                    aria-label={`${shortName(g.p.name)}: ${g.total} concerns`}
                  >
                    <span>{shortName(g.p.name)}</span>
                    <div className="bar-track">
                      <div style={{ width: `${(g.total / max) * 100}%` }}>
                        <i
                          style={{
                            width: `${(g.reviewable / g.total) * 100}%`,
                          }}
                        />
                        <i
                          style={{
                            width: `${((g.total - g.reviewable) / g.total) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <strong>{g.total}</strong>
                  </button>
                ))
              ) : (
                <Empty />
              )}
            </div>
          </Card>
          <Card title="Record Status" subtitle="Status as currently recorded">
            <div className="status-report">
              {[
                ["Open", s.open],
                ["Closed", s.closed],
                ["Escalated", s.escalated],
              ].map(([label, n]) => (
                <button
                  key={label}
                  onClick={() =>
                    filter(
                      "status",
                      filters.status === label ? "" : String(label),
                    )
                  }
                >
                  <span>
                    <span
                      className={`status-marker ${label === "Closed" ? "green" : "amber"}`}
                    />
                    {label}
                  </span>
                  <strong>{n}</strong>
                </button>
              ))}
              <p>
                Escalated records are shown separately from open and closed
                records.
              </p>
            </div>
          </Card>
        </div>
        <Card
          title="Detailed Concern Report"
          subtitle={`${filtered.length} records · Export includes the selected filters`}
          action={
            <button className="text-button" onClick={exportCSV}>
              <Download size={15} />
              Download CSV
            </button>
          }
        >
          {concernTable(filtered)}
        </Card>
      </>
    );
  }
  function createConcern(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const resident = data.RESIDENT.find(
      (r) => r.resident_id === form.get("resident"),
    );
    if (!resident || !canEdit(userId, resident.program_id)) return;
    const now = new Date().toISOString(),
      id = `CON-DEMO-${crypto.randomUUID().slice(0, 8)}`,
      classification = String(form.get("classification"));
    const record: Concern = {
      concern_id: id,
      resident_id: resident.resident_id,
      program_id: resident.program_id,
      created_by: userId,
      identified_date: String(form.get("identified")),
      classification,
      status: "Open – Monitoring",
      summary: String(form.get("summary")).trim(),
      closed_date: null,
      created_at: now,
      updated_at: now,
    };
    if (!record.summary) return;
    setConcerns((prev) => [...prev, record]);
    setUpdates((prev) => [
      ...prev,
      {
        update_id: crypto.randomUUID(),
        concern_id: id,
        updated_by: userId,
        updated_at: now,
        update_type: "Created",
        note: record.summary,
        previous_classification: null,
        new_classification: classification,
      },
    ]);
    setModal(null);
    navigate(`concerns/${id}`);
    setToast("New concern record created.");
  }
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      {mobile && (
        <button
          className="nav-overlay"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "is-open" : ""}`}>
        <div className="brand">
          <img
            className="brand-logo"
            src="/assets/osu-logo.png"
            alt="Oklahoma State University"
          />
          <div>
            GME<span>Central</span>
            <small>OSU CENTER FOR HEALTH SCIENCES</small>
          </div>
        </div>
        <div className="workspace">
          <span className="institution-icon">
            <GraduationCap size={22} />
          </span>
          <div>
            <strong>Graduate Medical Education</strong>
            <small>OSU–CHS · Tulsa, Oklahoma</small>
          </div>
        </div>
        <nav>
          {pages.map((p) => (
            <a
              href={`#${p.id}`}
              key={p.id}
              className={currentPage?.id === p.id ? "active" : ""}
              aria-current={currentPage?.id === p.id ? "page" : undefined}
            >
              <p.icon size={19} />
              <span>{p.label}</span>
              {p.id === "concerns" && (
                <span className="nav-count">
                  {scopedConcerns.filter(isOpen).length}
                </span>
              )}
              {currentPage?.id === p.id && <span className="nav-active-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {/* <div className="demo-note">
            <span className="demo-dot" />
            DEMONSTRATION WORKSPACE
            <p>
              Resident & Program
              <br />
              Recruitment & Reviews
            </p>
            <small>Fictional data · Modules 01–03</small>
          </div> */}
          <button className="help-button" onClick={() => setModal("help")}>
            <CircleHelp size={18} />
            Help & demo guide
            <ArrowUpRight size={15} />
          </button>
          <div className="sidebar-footer">
            <img
              className="footer-logo"
              src="/assets/osu-logo.png"
              alt="Oklahoma State University"
            />
            <span>
              Center for
              <br />
              Health Sciences
            </span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu size={22} />
          </button>
          <div className="breadcrumb">
            Workspace
            <ChevronRight size={13} />
            <span>{currentPage?.label || "Overview"}</span>
            {detailId && (
              <>
                <ChevronRight size={13} />
                <span>Details</span>
              </>
            )}
          </div>
          <div className="header-right">
            <span className="header-divider" />
            <span className="avatar">
              {currentUser.name
                .replace("Dr. ", "")
                .split(" ")
                .slice(0, 2)
                .map((s) => s[0])
                .join("")}
            </span>
            <label className="role-switch">
              <small>VIEWING AS · DEMO ROLE</small>
              <select
                aria-label="Demo user role"
                value={userId}
                onChange={(e) => switchUser(e.target.value)}
              >
                {data.USER.filter((u) =>
                  ["ROL-01", "ROL-02", "ROL-03", "ROL-04"].includes(
                    userRole(u.user_id)?.role_id || "",
                  ),
                ).map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {userRole(u.user_id)?.role_name} · {u.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {page === "reports" && (
            <ReportTabs current={detailId || "concerns"} navigate={navigate} />
          )}
          {page === "overview" ? (
            overview()
          ) : page === "programs" ? (
            detailId ? (
              programDetail()
            ) : (
              programsPage()
            )
          ) : page === "concerns" ? (
            detailId ? (
              concernDetail()
            ) : (
              concernsPage()
            )
          ) : page === "reports" ? (
            detailId === "recruitment" ? (
              <Recruitment
                userId={userId}
                path={route.path}
                params={params}
                navigate={navigate}
                toast={setToast}
              />
            ) : detailId === "reviews" || detailId === "ape" ? (
              <Accreditation
                key={route.path}
                userId={userId}
                path={route.path}
                params={params}
                navigate={navigate}
                toast={setToast}
              />
            ) : detailId === "health" ? (
              <ProgramHealth
                userId={userId}
                path={route.path}
                params={params}
                navigate={navigate}
                toast={setToast}
              />
            ) : (
              reportsPage()
            )
          ) : page === "recruitment" ? (
            <Recruitment
              userId={userId}
              path={route.path}
              params={params}
              navigate={navigate}
              toast={setToast}
            />
          ) : page === "health" ? (
            <ProgramHealth
              userId={userId}
              path={route.path}
              params={params}
              navigate={navigate}
              toast={setToast}
            />
          ) : page === "analytics" ? (
            <ReportingAnalytics
              userId={userId}
              path={route.path}
              params={params}
              navigate={navigate}
              toast={setToast}
            />
          ) : page === "reviews" || page === "ape" ? (
            <Accreditation
              key={route.path}
              userId={userId}
              path={route.path}
              params={params}
              navigate={navigate}
              toast={setToast}
            />
          ) : page === "integrations" ? (
            <Integrations
              userId={userId}
              path={route.path}
              params={params}
              navigate={navigate}
              toast={setToast}
            />
          ) : (
            <Empty>
              Page not found. Use the workspace navigation to continue.
            </Empty>
          )}
          <footer className="main-footer">
            <span>
              GME Central <i /> OSU Center for Health Sciences
            </span>
            <span>
              <ShieldCheck size={13} />
              Fictional demonstration data · Generated {date("2026-09-23")}
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CircleCheck size={18} />
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setModal(null);
        }}
      >
        <div className="modal-head">
          <div>
            <div className="eyebrow">GME CENTRAL</div>
            <h2>
              {modal === "new" ? "Create a concern" : "Your demo, at a glance"}
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={() => setModal(null)}
          >
            <X size={21} />
          </button>
        </div>
        {modal === "new" ? (
          <form className="update-form" onSubmit={createConcern}>
            <label>
              Resident
              <select
                aria-label="Resident"
                name="resident"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Select a resident
                </option>
                {data.RESIDENT.filter(
                  (r) =>
                    r.status !== "Graduated" && canEdit(userId, r.program_id),
                ).map((r) => (
                  <option key={r.resident_id} value={r.resident_id}>
                    {r.full_name} · {shortName(programName(r.program_id))}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                Classification
                <select aria-label="Classification" name="classification">
                  {classifications.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Date identified
                <input
                  type="date"
                  name="identified"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </label>
            </div>
            <label>
              Concern summary
              <textarea
                aria-label="Concern summary"
                required
                name="summary"
                maxLength={4000}
                rows={4}
                placeholder="Describe the concern…"
              />
            </label>
            <p className="form-hint">
              A new record starts as Open – Monitoring. You can update its
              status at any time. Demo records reset on refresh.
            </p>
            <button type="submit" className="button primary">
              <Plus size={16} />
              Create concern
            </button>
          </form>
        ) : (
          <div className="help-content">
            <p>
              This demonstration covers Resident & Program Data Management using
              the supplied fictional dataset.
            </p>
            <ol>
              <li>
                Explore program performance and open General Surgery to view its
                monitoring and Special Review.
              </li>
              <li>
                Filter resident concerns by classification, then open a record
                to see its full history.
              </li>
              <li>
                Use a GME Administrator or assigned program role to add a note
                or change classification.
              </li>
              <li>
                Open Reports to see changes reflected immediately and export a
                filtered CSV.
              </li>
            </ol>
            <p>
              Role switching demonstrates program scope; it is not production
              authentication. Edits reset on refresh. Documents contain metadata
              only. PDF uses your browser’s print dialog.
            </p>
            <p>
              Academic-year concern filters use the date identified. The
              original dataset includes future-dated updates; all supplied
              timestamps are displayed as provided.
            </p>
          </div>
        )}
      </dialog>
    </div>
  );
}
