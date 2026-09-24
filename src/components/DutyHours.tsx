import { Card, Badge } from "./shared";
import {
  ModuleHeading,
  FilterSelect,
  Stats,
  DataTable,
  ExportButton,
  type ModuleProps,
} from "./module-shared";
import {
  data,
  allowedPrograms,
  shortName,
  percent,
  dutyHistory,
} from "../data/repository";
export default function DutyHours({
  userId,
  path,
  params,
  navigate,
}: ModuleProps) {
  const year = params.get("year") || "2026-27",
    program = params.get("program") || "",
    status = params.get("status") || "",
    scope = allowedPrograms(userId);
  const filter = (key: string, value: string) =>
    navigate(path, { ...Object.fromEntries(params), [key]: value });
  const rows = scope
    .filter((p) => !program || p.program_id === program)
    .map((p) => ({
      program: p,
      record: dutyHistory(p.program_id, year).at(-1) || null,
    }))
    .filter((x) => !status || x.record?.compliance_status === status);
  const flagged = rows.filter(
    (x) => x.record && (x.record.compliance_status !== "Compliant" || (x.record.violations_count??0)>0),
  );
  return (
    <>
      <ModuleHeading
        eyebrow="Received Compliance Results"
        title="Duty-Hour Compliance"
        description="Program-level working-hour results from New Innovations replace the separate Excel dashboard. No resident schedules or local compliance calculations are created."
      >
        <ExportButton
          name="duty-hour-compliance"
          headers={[
            "Program",
            "Period",
            "Compliance",
            "Received Status",
            "Source",
            "Reference",
            "Violations","Residents with violations","Residents reporting",
          ]}
          rows={rows.map((x) => [
            x.program.name,
            x.record?.academic_period,
            x.record?.compliance_rate == null
              ? null
              : percent(x.record.compliance_rate),
            x.record?.compliance_status,
            x.record?.source_system,
            x.record?.source_reference,
            x.record?.violations_count,x.record?.residents_with_violations,x.record?.residents_reporting,
          ])}
        />
      </ModuleHeading>
      <div className="module-filters">
        <FilterSelect
          label="Academic Year"
          value={year}
          options={[
            ...new Set(
              data.DUTY_HOUR_COMPLIANCE.map((d) =>
                d.academic_period.slice(0, 7),
              ),
            ),
          ]
            .sort()
            .reverse()
            .map((v) => ({ value: v, label: v }))}
          onChange={(v) => filter("year", v)}
        />
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
          label="Received Status"
          value={status}
          all="All Received Statuses"
          options={["Compliant", "Watch", "Non-Compliant"].map((v) => ({
            value: v,
            label: v,
          }))}
          onChange={(v) => filter("status", v)}
        />
      </div>
      <div className="module-notice">
        “Watch” and “Non-Compliant” are source statuses received from New
        Innovations. Violation counts are imported program totals, displayed independently of status. A program labelled Compliant can still have reported violations. Individual shift details are not supplied.
      </div>
      <Stats
        items={[
          {
            label: "Programs with Results",
            value: rows.filter((x) => x.record).length,
          },
          { label: "Source-Flagged Exceptions", value: flagged.length },
          {label:'Reported Violations',value:rows.reduce((sum,r)=>sum+(r.record?.violations_count??0),0)},
          {
            label: "Watch",
            value: flagged.filter(
              (x) => x.record?.compliance_status === "Watch",
            ).length,
          },
          {
            label: "Non-Compliant",
            value: flagged.filter(
              (x) => x.record?.compliance_status === "Non-Compliant",
            ).length,
          },
          { label: "No Data", value: rows.filter((x) => !x.record).length },
        ]}
      />
      <Card
        title="Leadership Exception Queue"
        subtitle="Source-flagged compliance results; not individually inferred violations"
      >
        <DataTable
          headers={[
            "Program",
            "Period",
            "Compliance",
            "Received Status",
            "Source Detail",
            "Violations",
            "Action",
          ]}
          empty={!flagged.length}
        >
          {flagged.map((x) => (
            <tr key={x.program.program_id}>
              <td>{shortName(x.program.name)}</td>
              <td>{x.record?.academic_period}</td>
              <td>{percent(x.record?.compliance_rate)}</td>
              <td>
                <Badge
                  tone={
                    x.record?.compliance_status === "Non-Compliant"
                      ? "danger"
                      : "amber"
                  }
                >
                  {x.record?.compliance_status}
                </Badge>
              </td>
              <td>{x.record?.notes}</td>
              <td><Badge tone={(x.record?.violations_count??0)>0?'danger':undefined}>{x.record?.violations_count??'Not recorded'}</Badge></td>
              <td>
                <button
                  className="text-button"
                  onClick={() => navigate(`programs/${x.program.program_id}`)}
                >
                  Program history →
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
      <Card
        title="Program Compliance Register"
        subtitle="Latest received result for each selected program and period"
      >
        <DataTable
          headers={[
            "Program",
            "Compliance",
            "Status",
            "Period",
            "Violations","Residents with Violations / Reporting",
            "Imported",
            "History",
          ]}
          empty={!rows.length}
        >
          {rows.map((x) => (
            <tr key={x.program.program_id}>
              <td>{shortName(x.program.name)}</td>
              <td>{percent(x.record?.compliance_rate)}</td>
              <td>
                {x.record ? (
                  <Badge
                    tone={
                      x.record.compliance_status === "Non-Compliant"
                        ? "danger"
                        : x.record.compliance_status === "Watch"
                          ? "amber"
                          : undefined
                    }
                  >
                    {x.record.compliance_status}
                  </Badge>
                ) : (
                  "No data"
                )}
              </td>
              <td>{x.record?.academic_period || "Not recorded"}</td>
              <td>{x.record?.violations_count??'Not recorded'}</td><td>{x.record?.residents_with_violations??'Not recorded'} / {x.record?.residents_reporting??'Not recorded'}</td>
              <td>
                {x.record?.imported_at
                  ? new Date(x.record.imported_at).toLocaleDateString()
                  : "Not recorded"}
              </td>
              <td>
                <button
                  className="text-button"
                  onClick={() => navigate(`programs/${x.program.program_id}`)}
                >
                  View history →
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </>
  );
}
