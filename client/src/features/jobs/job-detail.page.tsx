//Job detail — the designed tabbed report (hzqE1 "Report Unified"): pill tabs
//Overview (details + KPIs + response chart), Logs (execution table),
//Latest executions (run cards), Scheduled (upcoming fires from the cron).
//Tabs live in local state; "View logs" actions switch to the Logs tab
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useJob, useRunNow, useDeleteJob } from "./hooks/job.hooks";
import { useExecutions, useExecutionStats } from "../executions/hooks/execution.hooks";
import { ExecutionsTable } from "../executions/components/executions-table";
import { RunCards } from "../executions/components/run-cards";
import { JobOverview } from "./components/job-overview";
import { ReportKPIs } from "./components/report-kpis";
import { ResponseChart } from "./components/response-chart";
import { UpcomingRuns } from "./components/upcoming-runs";
import { DeleteConfirm } from "./components/delete-confirm";

const tabs = ["Overview", "Logs", "Latest executions", "Scheduled"] as const;
type Tab = (typeof tabs)[number];

export function JobDetailPage() {
  const { jobId } = useParams();
  const id = Number(jobId!);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Overview");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const job = useJob(id);
  const recent = useExecutions(id, 1);
  //the chart wants a wider window than the run cards — 30 bars of history
  const chartRuns = useExecutions(id, 1, 30);
  const stats = useExecutionStats(id);
  const runNow = useRunNow();
  const remove = useDeleteJob();

  if (job.isLoading) return <p className="text-[13px] text-muted">Loading job…</p>;
  if (job.isError || !job.data)
    return <p className="text-[13px] text-muted">This job doesn't exist or isn't yours.</p>;

  const j = job.data;
  const latest = recent.data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Link to="/jobs" className="text-[13px] text-muted hover:text-[#0a0a0a]">
        ←  Cron Job  •  <span className="text-[#0a0a0a]">{j.name}</span>
      </Link>
      <div>
        <h1 className="text-[28px] font-bold text-[#0a0a0a]">Report</h1>
        <p className="text-[13px] text-muted">
          {j.httpCommand.replace(/^https?:\/\//, "")}  •  {j.cronExpression}  •  {j.httpMethod}
        </p>
      </div>

      {/*Pill tabs — active = white card, inactive = transparent muted (design)*/}
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2.5 text-[13px] transition-colors ${
              tab === t
                ? "bg-card font-bold text-[#0a0a0a]"
                : "text-muted hover:text-[#0a0a0a]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="flex flex-col gap-4">
          <JobOverview
            job={j}
            recent={latest.slice(0, 4)}
            onRun={() => runNow.mutate(id, { onSuccess: () => setTab("Logs") })}
            onDelete={() => setConfirmDelete(true)}
          />
          <ReportKPIs stats={stats.data} jobActive={j.isActive} />
          <ResponseChart runs={chartRuns.data?.data ?? []} />
        </div>
      )}
      {tab === "Logs" && <ExecutionsTable jobId={id} />}
      {tab === "Latest executions" && (
        <div className="flex flex-col gap-2.5 rounded-[16px] bg-card p-4">
          <p className="text-[15px] font-bold text-[#0a0a0a]">Latest executions</p>
          <RunCards runs={latest} />
        </div>
      )}
      {tab === "Scheduled" && <UpcomingRuns cron={j.cronExpression} />}

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
