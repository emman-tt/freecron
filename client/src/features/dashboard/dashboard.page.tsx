import { useState } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  ChevronDown,
  Newspaper,
  Plus,
  RefreshCw,
  Search,
  SquarePen,
} from "lucide-react";
import { useDashboard } from "./hooks/dashboard.hooks";
import { StatCard } from "./components/stat-card";
import { RunCards } from "../executions/components/run-cards";
import { Card } from "../../shared/ui/Card";
import { Toggle } from "../../shared/ui/Toggle";
import { mask } from "../../shared/lib/format";
import { describeCron } from "../../shared/lib/cron";

//Running well / Paused / Needs care
const statusVocab = (isActive: boolean) => {
  if (!isActive) return "Paused";
  return "Running well";
};

//"Next run in 6h 12m"
const relTime = (iso?: string) => {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return "—";
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3.6e6);
  const m = Math.round((ms % 3.6e6) / 6e4);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export function DashboardPage() {
  const { rows, stats, detail: d, recent, currentId, setSelected, toggle } = useDashboard();
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  //Refresh = pure UI verb: revalidate the dashboard's queries
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    void queryClient.invalidateQueries({ queryKey: ["executions"] });
  };

  //client-side over the loaded rows
  const visible = rows.filter(
    (j) =>
      (statusFilter === "all" ||
        (statusFilter === "active" ? j.isActive : !j.isActive)) &&
      j.name.toLowerCase().includes(search.toLowerCase()),
  );
  const statusLabel = d ? statusVocab(d.isActive) : "";
  const cronDesc = describeCron(d?.cronExpression ?? "");
  const cronDisplay = cronDesc ? cronDesc.replace("Next run: ", "") : "";

  const totalSub =
    stats && stats.createdThisWeek > 0
      ? `+${stats.createdThisWeek} this week`
      : stats
        ? `${stats.activeJobs} active · ${stats.pausedJobs} paused`
        : undefined;
  const activeSub =
    stats && stats.totalJobs > 0
      ? `${Math.round((stats.activeJobs / stats.totalJobs) * 100)}% healthy`
      : undefined;

  return (
    <div className="flex flex-col gap-4 bg-bg min-h-screen">
      {/*TopBar*/}
      <div className="flex items-center gap-3">
        <h1 className="text-[28px] font-bold text-[#0a0a0a]">Overview</h1>
        <div className="flex-1" />
        <Bell size={20} className="text-[#0a0a0a]" />
        <span className="h-8 w-8 rounded-full bg-border" />
        <span className="text-[14px] text-[#0a0a0a]">Profile&ensp;▾</span>
      </div>

      {/*Toolbar*/}
      <div className="flex items-center gap-3">
        <Link
          to="/jobs/new"
          className="flex items-center gap-2 rounded-xl bg-primary px-4.5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} /> Add a cron job
        </Link>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 rounded-xl px-2 py-2.5 text-[14px] text-[#0a0a0a] transition-colors hover:bg-muted-bg"
        >
          <RefreshCw size={16} /> Refresh
        </button>
        <div className="flex-1" />
        <div className="relative flex w-[170px] items-center rounded-control border border-border bg-card px-3.5 py-2.5">
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="w-full cursor-pointer appearance-none bg-transparent text-[13px] text-[#0a0a0a] outline-none"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 text-[#0a0a0a]" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total Jobs"
          value={stats?.totalJobs ?? "…"}
          sub={totalSub}
          tip="Every cron job you own — active and paused together."
        />
        <StatCard
          label="Active"
          value={stats?.activeJobs ?? "…"}
          sub={activeSub}
          tip="Jobs currently switched on. They fire on their cron schedule. The sub shows what share of your total is healthy."
        />
        <StatCard
          label="Paused"
          value={stats?.pausedJobs ?? "…"}
          sub="Off until resumed"
          tip="Switched-off jobs. They don't fire at all until you resume them."
        />
        <StatCard
          label="Failed"
          value={stats?.failedRuns ?? "…"}
          sub={stats ? (stats.failedRuns > 0 ? "All-time failures" : "None so far") : undefined}
          tip="Fires that ended failed or timed out, across all history. A run that failed once but succeeded on retry does NOT count — only exhausted retries do."
        />
        <StatCard
          label="Avg Runtime"
          value={stats === undefined ? "…" : stats.avgRuntimeMs === null ? "—" : `${(stats.avgRuntimeMs / 1000).toFixed(2)}s`}
          sub="All-time average"
          tip="Mean duration of every finished run. A run interrupted by a server restart counts the whole outage as runtime, so one outlier can pull this up."
        />
      </div>

      {/*Job list 360 : Details 760*/}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360fr_760fr]">
        <Card className="flex flex-col gap-3 p-5">
          <div className="flex items-center gap-2.5">
            <p className="text-[18px] font-bold text-[#0a0a0a]">Jobs</p>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2">
              <Search size={14} className="shrink-0 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="w-full bg-transparent text-[12px] text-[#0a0a0a] outline-none placeholder:text-muted"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {visible.map((j) => (
              <div
                key={j.id}
                onClick={() => setSelected(j.id)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-[14px] p-3 transition-colors ${j.id === currentId ? "bg-muted-bg" : "hover:bg-muted-bg/50"
                  }`}
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${j.isActive ? "bg-[#22C55E]" : "bg-[#EAB308]"
                    }`}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[14px] font-semibold text-[#0a0a0a]">{j.name}</span>
                  <span className="text-[11px] text-muted">{j.cronExpression}</span>
                </div>
                <Toggle on={j.isActive} onChange={() => toggle.mutate(j.id)} />
              </div>
            ))}
            {visible.length === 0 && (
              <p className="text-[13px] text-muted">
                {rows.length === 0 ? "No jobs yet — add your first one." : "No jobs match."}
              </p>
            )}
          </div>
        </Card>

        <Card className="flex flex-col gap-3.5 p-7">
          <p className="text-[13px] text-muted">Details</p>
          {d ? (
            <>
              <div>
                <p className="text-[15px] font-semibold text-[#0a0a0a]">Job Name</p>
                <p className="text-[13px] text-muted">
                  {d.name}  •  {statusLabel}  •  Next run in {relTime(d.nextRunAt)}
                </p>
              </div>

              {/*cron + human words*/}
              <div className="flex flex-col gap-1 rounded-control bg-muted-bg p-3">
                <span className="font-mono text-[14px] font-bold text-[#0a0a0a]">
                  {d.cronExpression}
                </span>
                {cronDisplay && <span className="text-[12px] text-muted">{cronDisplay}</span>}
              </div>

              <div>
                <p className="text-[15px] font-semibold text-[#0a0a0a]">Url</p>
                <p className="text-[13px] text-muted">{d.httpCommand}</p>
              </div>

              <div>
                <p className="text-[15px] font-semibold text-[#0a0a0a]">Request Method</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="rounded-lg bg-muted-bg px-3 py-1 text-[12px] font-bold text-[#16A34A]">
                    {d.httpMethod}
                  </span>
                  <span className="text-[12px] text-muted">
                    Timeout: {Math.round(d.timeout / 1000)}s  •  Retries: {d.maxRetries}
                  </span>
                </div>
              </div>

              {Object.keys(d.httpHeader).length > 0 && (
                <div>
                  <p className="text-[15px] font-semibold text-[#0a0a0a]">Headers</p>
                  <div className="mt-1.5 overflow-hidden rounded-field border border-border">
                    <div className="flex bg-[#FAFAF9] px-3.5 py-2.5 text-[12px] text-muted">
                      <span className="flex-1">Name</span>
                      <span className="flex-1">Value</span>
                    </div>
                    {Object.entries(d.httpHeader).map(([name, value]) => (
                      <div key={name} className="flex px-3.5 py-2.5 text-[13px]">
                        <span className="flex-1 text-[#0a0a0a]">{name}</span>
                        <span className="flex-1 text-muted">{mask(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(d.httpBody).length > 0 && (
                <div>
                  <p className="text-[15px] font-semibold text-[#0a0a0a]">Payload</p>
                  <pre className="mt-1.5 overflow-x-auto rounded-field bg-[#0a0a0a] p-3.5 font-mono text-[12px] text-white">
                    {JSON.stringify(d.httpBody, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <p className="text-[15px] font-semibold text-[#0a0a0a]">Recent Runs</p>
                <div className="mt-1.5">
                  <RunCards runs={recent} />
                </div>
              </div>

              <div className="mt-1 flex items-center gap-3">
                <Link
                  to={`/jobs/${d.id}`}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4.5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <Newspaper size={16} /> View Report
                </Link>
                <Link
                  to={`/jobs/${d.id}/edit`}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4.5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <SquarePen size={16} /> Edit Job
                </Link>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-muted">Select a job to see its details.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
