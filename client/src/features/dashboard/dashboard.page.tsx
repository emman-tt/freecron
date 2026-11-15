import { Link } from "react-router";
import { Newspaper, Plus, SquarePen } from "lucide-react";
import { useDashboard } from "./hooks/dashboard.hooks";
import { StatCard } from "./components/stat-card";
import { Card } from "../../shared/ui/Card";
import { Toggle } from "../../shared/ui/Toggle";
import { mask } from "../../shared/lib/format";
import { describeCron } from "../../shared/lib/cron";

//Status vocabulary per design: "Running well / Paused / Needs care"
const statusVocab = (isActive: boolean, hasFailures: boolean) => {
  if (!isActive) return "Paused";
  if (hasFailures) return "Needs care";
  return "Running well";
};

//"Next run in 6h 12m" — relative countdown for the job name value line
const relTime = (iso?: string) => {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return "—";
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3.6e6);
  const m = Math.round((ms % 3.6e6) / 6e4);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

//"02:00 Today" / "02:00 Yday" / "02:00 15 Nov" for run cards
const dayLabel = (iso: string) => {
  const dt = new Date(iso);
  const now = new Date();
  const yday = new Date(now);
  yday.setDate(now.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(dt, now)) return "Today";
  if (same(dt, yday)) return "Yday";
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export function DashboardPage() {
  const { rows, stats, detail: d, recent, currentId, setSelected, toggle } = useDashboard();
  const hasFailures = recent.some((r) => r.status === "failed" || r.statusCode === 0);
  const statusLabel = d ? statusVocab(d.isActive, hasFailures) : "";
  const cronDesc = describeCron(d?.cronExpression ?? "");
  const cronDisplay = cronDesc ? cronDesc.replace("Next run: ", "") : "";

  //Stat Sub lines — only what the API can prove (no fake weekly deltas)
  const totalSub =
    stats.active !== undefined && stats.paused !== undefined
      ? `${stats.active} active · ${stats.paused} paused`
      : undefined;
  const activeSub =
    stats.total !== undefined && stats.active !== undefined && stats.total > 0
      ? `${Math.round((stats.active / stats.total) * 100)}% healthy`
      : undefined;

  return (
    <div className="flex flex-col gap-4 bg-bg min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#0a0a0a]">Overview</h1>
        <Link
          to="/jobs/new"
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} /> Add a cron job
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Jobs" value={stats.total ?? "…"} sub={totalSub} />
        <StatCard label="Active" value={stats.active ?? "…"} sub={activeSub} />
        <StatCard label="Paused" value={stats.paused ?? "…"} sub="Off until resumed" />
      </div>

      {/*Design Content Row: Job List 360 : Details 760 (gap 16)*/}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360fr_760fr]">
        <Card className="flex flex-col gap-3 p-5">
          <p className="text-[18px] font-bold text-[#0a0a0a]">Jobs</p>
          <div className="flex flex-col gap-2">
            {rows.map((j) => (
              <div
                key={j.id}
                onClick={() => setSelected(j.id)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-[14px] p-3 transition-colors ${
                  j.id === currentId ? "bg-muted-bg" : "hover:bg-muted-bg/50"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    j.isActive ? "bg-[#22C55E]" : "bg-[#EAB308]"
                  }`}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[14px] font-semibold text-[#0a0a0a]">{j.name}</span>
                  <span className="text-[11px] text-muted">{j.cronExpression}</span>
                </div>
                <Toggle on={j.isActive} onChange={() => toggle.mutate(j.id)} />
              </div>
            ))}
            {rows.length === 0 && (
              <p className="text-[13px] text-muted">No jobs yet — add your first one.</p>
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

              {/*Schedule bar: cron + human words on #F5F5F4, R12*/}
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
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {recent.slice(0, 4).map((r) => (
                    <div key={r.id} className="flex flex-col gap-1 rounded-control bg-muted-bg p-3">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          r.status === "success"
                            ? "bg-[#22C55E]"
                            : r.status === "running"
                              ? "bg-[#EAB308]"
                              : "bg-[#FF2E2E]"
                        }`}
                      />
                      <span className="text-[12px] font-semibold text-[#0a0a0a]">
                        {new Date(r.startedAt).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        {dayLabel(r.startedAt)}
                      </span>
                      <span className="text-[11px] text-muted">
                        {r.statusCode === 0 ? "no response" : r.statusCode}  •{" "}
                        {r.duration === null ? "—" : `${(r.duration / 1000).toFixed(1)}s`}
                      </span>
                    </div>
                  ))}
                  {recent.length === 0 && <p className="text-[13px] text-muted">No runs yet.</p>}
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
