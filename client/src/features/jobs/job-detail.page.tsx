//Job detail — the designed tabbed report: Overview (details card + recent
//runs), Logs (execution table), Scheduled (upcoming fires from the cron).
//Tabs live in local state; "View logs" actions switch to the Logs tab
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useJob, useRunNow, useDeleteJob } from "./hooks/job.hooks";
import { useExecutions } from "../executions/hooks/execution.hooks";
import { ExecutionsTable } from "../executions/components/executions-table";
import { JobOverview } from "./components/job-overview";
import { UpcomingRuns } from "./components/upcoming-runs";
import { DeleteConfirm } from "./components/delete-confirm";

const tabs = ["Overview", "Logs", "Scheduled"] as const;
type Tab = (typeof tabs)[number];

export function JobDetailPage() {
  const { jobId } = useParams();
  const id = Number(jobId!);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Overview");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const job = useJob(id);
  const recent = useExecutions(id, 1);
  const runNow = useRunNow();
  const remove = useDeleteJob();

  if (job.isLoading) return <p className="text-[13px] text-muted">Loading job…</p>;
  if (job.isError || !job.data)
    return <p className="text-[13px] text-muted">This job doesn't exist or isn't yours.</p>;

  const j = job.data;

  return (
    <div className="flex flex-col gap-4">
      <Link to="/jobs" className="text-[14px] font-semibold">
        ← Cron Job
      </Link>
      <div>
        <h1 className="text-[26px] font-bold">{j.name}</h1>
        <p className="text-[13px] text-muted">
          {j.httpCommand.replace(/^https?:\/\//, "")} · {j.cronExpression}
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t-[10px] px-3.5 py-2 text-[13px] ${tab === t ? "font-bold text-[#0a0a0a]" : "text-muted hover:text-[#0a0a0a]"
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <JobOverview
          job={j}
          recent={(recent.data?.data ?? []).slice(0, 4)}
          onRun={() => runNow.mutate(id, { onSuccess: () => setTab("Logs") })}
          onDelete={() => setConfirmDelete(true)}
        />
      )}
      {tab === "Logs" && <ExecutionsTable jobId={id} />}
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
