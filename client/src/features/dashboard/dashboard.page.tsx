//Dashboard — the Overview screen: stat cards, job list with toggles, and the
//details card for the selected job. Data lives in dashboard.hooks.ts
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useDashboard } from "./hooks/dashboard.hooks";
import { StatCard } from "./components/stat-card";
import { Card } from "../../shared/ui/Card";
import { Toggle } from "../../shared/ui/Toggle";
import { btnClass } from "../../shared/ui/Button";
import { mask } from "../../shared/lib/format";
import { describeCron } from "../../shared/lib/cron";

export function DashboardPage() {
  const { rows, stats, detail: d, recent, currentId, setSelected, toggle } = useDashboard();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold">Overview</h1>
        <Link to="/jobs/new" className={btnClass("primary")}>
          <Plus size={16} /> Add a cron job
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Jobs" value={stats.total ?? "…"} />
        <StatCard label="Active" value={stats.active ?? "…"} />
        <StatCard label="Paused" value={stats.paused ?? "…"} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="text-[18px] font-bold">Jobs</p>
          <div className="mt-3 flex flex-col gap-2">
            {rows.map((j) => (
              <div
                key={j.id}
                onClick={() => setSelected(j.id)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-[14px] p-3 ${j.id === currentId ? "bg-muted-bg" : "hover:bg-muted-bg"
                  }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${j.isActive ? "bg-success" : "bg-border"}`}
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-semibold">{j.name}</span>
                  <span className="text-[11px] text-muted">{j.cronExpression}</span>
                </div>
                <div onClick={(e) => e.stopPropagation()} className="ml-auto">
                  <Toggle on={j.isActive} onChange={() => toggle.mutate(j.id)} />
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="text-[13px] text-muted">No jobs yet — add your first one.</p>
            )}
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-7">
          <p className="text-[13px] text-muted">Details</p>
          {d && (
            <>
              <div>
                <p className="text-[15px] font-semibold">{d.name}</p>
                <p className="text-[13px] text-muted">
                  {d.isActive ? "Active" : "Paused"} ·{" "}
                  {new Date(d.nextRunAt).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex flex-col gap-1 rounded-field bg-muted-bg p-3">
                <span className="font-mono text-[14px] font-bold">{d.cronExpression}</span>
                <span className="text-[12px] text-muted">
                  {describeCron(d.cronExpression)?.replace("Next run: ", "")}
                </span>
              </div>
              <div>
                <p className="text-[15px] font-semibold">Url</p>
                <p className="text-[13px] text-muted">{d.httpCommand}</p>
              </div>
              {d.id !== undefined && Object.keys(d?.httpHeader).length > 0 && (
                <div>
                  <p className="text-[15px] font-semibold">Headers</p>
                  {Object.entries(d.httpHeader).map(([name, value]) => (
                    <p key={name} className="text-[13px]">
                      {name} · <span className="text-muted">{mask(value)}</span>
                    </p>
                  ))}
                </div>
              )}
              <div>
                <p className="text-[15px] font-semibold">Recent Runs</p>
                {recent.slice(0, 3).map((r) => (
                  <p key={r.id} className="text-[13px]">
                    {new Date(r.startedAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    ·{" "}
                    <span className="text-muted">
                      {r.statusCode === 0 ? "no response" : (r.statusCode ?? "running…")} ·{" "}
                      {r.duration === null ? "—" : `${(r.duration / 1000).toFixed(1)}s`}
                    </span>
                  </p>
                ))}
              </div>
              <Link to={`/jobs/${d.id}`} className={btnClass("primary", "self-start")}>
                View report
              </Link>
            </>
          )}
          {currentId === undefined && (
            <p className="text-[13px] text-muted">Select a job to see its details.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
