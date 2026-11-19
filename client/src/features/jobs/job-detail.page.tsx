//Job report — one job, three views: Overview (KPIs, response chart, config),
//Logs (execution history) and Scheduled (upcoming fires). The header changes
//shape on the Logs tab, matching the report design: job name + endpoint,
//and Export CSV in place of the job actions.
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Play, SquarePen, Trash2 } from "lucide-react";
import { useJob, useRunNow, useDeleteJob } from "./hooks/job.hooks";
import { useExecutions, useExecutionStats } from "../executions/hooks/execution.hooks";
import { ExecutionsTable } from "../executions/components/executions-table";
import { downloadExecutionsCsv } from "../executions/lib/export-csv";
import { ReportKPIs } from "./components/report-kpis";
import { ResponseChart } from "./components/response-chart";
import { ConfigCard } from "./components/config-card";
import { UpcomingRuns } from "./components/upcoming-runs";
import { DeleteConfirm } from "./components/delete-confirm";
import { formatIn } from "../../shared/lib/format";
import { useNow } from "../../shared/lib/use-now";

const tabs = ["Overview", "Logs", "Scheduled"] as const;
type Tab = (typeof tabs)[number];

export function JobDetailPage() {
  const { jobId } = useParams();
  const id = Number(jobId!);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Overview");
  const [logsPage, setLogsPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const now = useNow();

  const job = useJob(id);
  //the chart wants a wider window than the run cards — 12 bars of history
  const chartRuns = useExecutions(id, 1, 12);
  const logs = useExecutions(id, logsPage);
  const stats = useExecutionStats(id);
  const runNow = useRunNow();
  const remove = useDeleteJob();

  if (job.isLoading) return <p className="text-[13px] text-muted">Loading job…</p>;
  if (job.isError || !job.data)
    return <p className="text-[13px] text-muted">This job doesn't exist or isn't yours.</p>;

  const j = job.data;
  const last = stats.data?.lastStatus;
  const status = !j.isActive
    ? { label: "Paused", className: "text-warning" }
    : last === undefined
      ? null
      : last === null
        ? { label: "Idle", className: "text-muted" }
        : last === "success"
          ? { label: "Up", className: "text-success" }
          : last === "running"
            ? { label: "Running", className: "text-warning" }
            : { label: "Down", className: "text-danger" };

  const nextIn = formatIn(new Date(j.nextRunAt).getTime() - now);
  const url = j.httpCommand.replace(/^https?:\/\//, "");
  const logsTab = tab === "Logs";
  const logsMeta = logs.data?.meta;
  const logsShown = logsMeta
    ? `${(logsMeta.page - 1) * logsMeta.limit + (logs.data?.data.length ? 1 : 0)}-${
        (logsMeta.page - 1) * logsMeta.limit + (logs.data?.data.length ?? 0)
      } of ${logsMeta.total}`
    : "0 of 0";

  return (
    <div className="flex flex-col gap-4">
      <Link to="/jobs" className="text-[12.5px] text-muted transition-colors hover:text-ink">
        Jobs <span className="mx-1.5 text-border">/</span>
        <span className="text-ink">{j.name}</span>
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[30px] leading-none font-bold tracking-[-0.025em] text-ink">
              {logsTab ? `${j.name} logs` : j.name}
            </h1>
            {!logsTab && status && (
              <span className={`text-[13px] font-semibold ${status.className}`}>
                {status.label}
              </span>
            )}
          </div>

          {logsTab ? (
            <p className="mt-2 text-[13px] text-muted">
              <span className="font-mono">GET /api/executions?jobId={id}</span>
              <span className="mx-1.5 text-border">·</span>
              showing {logsShown}
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-muted">
              {url}
              <span className="mx-1.5 text-border">·</span>
              <span className="font-mono">{j.cronExpression}</span>
              <span className="mx-1.5 text-border">·</span>
              {j.httpMethod}
              <span className="mx-1.5 text-border">·</span>
              {j.isActive ? `next run in ${nextIn}` : "paused"}
            </p>
          )}
        </div>

        {logsTab ? (
          <button
            onClick={() =>
              downloadExecutionsCsv(j.name, logs.data?.data ?? [], logsPage)
            }
            disabled={!logs.data?.data.length}
            title="Exports the runs loaded on this page"
            className="rounded-[10px] border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-muted-bg disabled:opacity-50"
          >
            Export CSV
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => runNow.mutate(id, { onSuccess: () => setTab("Logs") })}
              disabled={runNow.isPending}
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Play size={14} className="fill-current" />
              {runNow.isPending ? "Starting…" : "Run now"}
            </button>
            <Link
              to={`/jobs/${id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-muted-bg"
            >
              <SquarePen size={14} />
              Edit job
            </Link>
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-danger-border bg-card px-4 py-2.5 text-[13px] font-semibold text-danger transition-colors hover:bg-danger-soft"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        )}
      </div>

      {/*Tabs*/}
      <div className="flex gap-7 overflow-x-auto border-b border-border">
        {tabs.map((item) => {
          const active = tab === item;
          return (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`-mb-px border-b-2 pb-3 text-[13.5px] font-semibold whitespace-nowrap transition-colors ${
                active
                  ? "border-ink text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      {tab === "Overview" && (
        <div className="flex flex-col gap-4">
          <ReportKPIs stats={stats.data} jobActive={j.isActive} />
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
            <ResponseChart runs={chartRuns.data?.data ?? []} />
            <ConfigCard job={j} />
          </div>
        </div>
      )}

      {tab === "Logs" && (
        <ExecutionsTable
          job={j}
          runs={logs.data?.data ?? []}
          meta={logsMeta}
          loading={logs.isLoading}
          page={logsPage}
          onPage={setLogsPage}
        />
      )}

      {tab === "Scheduled" && <UpcomingRuns cron={j.cronExpression} now={now} />}

      {confirmDelete && (
        <DeleteConfirm
          name={j.name}
          busy={remove.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => remove.mutate(id, { onSuccess: () => navigate("/jobs") })}
        />
      )}
    </div>
  );
}
