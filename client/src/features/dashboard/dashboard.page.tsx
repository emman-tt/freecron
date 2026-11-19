//Dashboard (Overview) — fleet KPIs, a health sentence, the job list, and the
//selected job's report panel. Composed from small components; this file owns
//filter state, refresh, run/delete actions, and the duplicate hand-off.
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { useDashboard } from "./hooks/dashboard.hooks";
import { useDeleteJob, useRunNow } from "../jobs/hooks/job.hooks";
import { StatCard } from "./components/stat-card";
import { HealthBanner } from "./components/health-banner";
import { JobsPanel, type StatusFilter } from "./components/jobs-panel";
import { DetailPanel } from "./components/detail-panel";
import { DeleteConfirm } from "../jobs/components/delete-confirm";
import { durationLabel } from "../../shared/lib/format";
import { useNow } from "../../shared/lib/use-now";

export function DashboardPage() {
  const {
    rows,
    stats,
    statsUpdatedAt,
    loading,
    error,
    refetch,
    currentStats,
    detail,
    detailLoading,
    recent,
    currentId,
    setSelected,
    toggle,
  } = useDashboard();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const now = useNow();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const runNow = useRunNow();
  const remove = useDeleteJob();

  //Refresh = pure UI verb: revalidate every query the dashboard reads
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    void queryClient.invalidateQueries({ queryKey: ["executions"] });
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  //client-side over the loaded page of jobs
  const visible = rows.filter(
    (job) =>
      (statusFilter === "all" ||
        (statusFilter === "active" ? job.isActive : !job.isActive)) &&
      job.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const activeShare =
    stats && stats.totalJobs > 0
      ? Math.round((stats.activeJobs / stats.totalJobs) * 100)
      : null;

  const updated =
    statsUpdatedAt > 0
      ? new Date(statsUpdatedAt).toLocaleTimeString("en-GB", { hour12: false })
      : null;

  return (
    <div className="flex flex-col gap-5">
      {/*Top bar*/}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[30px] leading-none font-bold tracking-[-0.025em] text-ink">
          Overview
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          {updated && (
            <span className="mr-1 text-[11.5px] text-muted">Updated {updated}</span>
          )}
          <span
            title="Aggregates cover all history. Range filtering isn't wired yet."
            className="flex h-10 cursor-default items-center rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-medium text-ink"
          >
            All time
          </span>
          <button
            onClick={refresh}
            className="flex h-10 items-center gap-1.5 rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-medium text-ink transition-colors hover:bg-muted-bg"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link
            to="/jobs/new"
            className="flex h-10 items-center gap-1.5 rounded-[10px] bg-primary px-4 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={15} />
            Add a cron job
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-danger-border bg-danger-soft px-4 py-3 text-[13px] text-danger">
          <p className="flex-1">
            Couldn't load your jobs — {error.message || "the API didn't answer"}.
          </p>
          <button
            onClick={() => void refetch()}
            className="rounded-[8px] border border-danger-border bg-card px-3 py-1.5 text-[12px] font-semibold text-danger"
          >
            Try again
          </button>
        </div>
      )}

      <HealthBanner stats={stats} job={detail} jobStats={currentStats} />

      {/*KPI strip*/}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Total jobs"
          value={stats?.totalJobs ?? "—"}
          sub={
            stats
              ? `${stats.activeJobs} active, ${stats.pausedJobs} paused`
              : undefined
          }
          loading={!stats && loading}
          tip="Every cron job you own — active and paused together."
        />
        <StatCard
          label="Active"
          value={stats?.activeJobs ?? "—"}
          sub={activeShare !== null ? `${activeShare}% of all jobs` : undefined}
          tone="success"
          loading={!stats && loading}
          tip="Jobs currently switched on. They fire on their cron schedule."
        />
        <StatCard
          label="Paused"
          value={stats?.pausedJobs ?? "—"}
          sub={
            stats
              ? stats.pausedJobs > 0
                ? "off until resumed"
                : "nothing paused"
              : undefined
          }
          loading={!stats && loading}
          tip="Switched-off jobs. They don't fire at all until you resume them."
        />
        <StatCard
          label="Failed, all time"
          value={stats?.failedRuns ?? "—"}
          sub={
            stats
              ? stats.failedRuns > 0
                ? "after exhausted retries"
                : "no exhausted retries"
              : undefined
          }
          tone={stats && stats.failedRuns > 0 ? "danger" : "plain"}
          loading={!stats && loading}
          tip="Fires that ended failed or timed out after every retry was used. A run that failed once but succeeded on retry does NOT count."
        />
        <StatCard
          label="Avg runtime"
          value={
            stats === undefined
              ? "—"
              : stats.avgRuntimeMs === null
                ? "—"
                : durationLabel(stats.avgRuntimeMs)
          }
          sub="all-time average"
          loading={!stats && loading}
          tip="Mean duration of every finished run. A run interrupted by a server restart counts the whole outage, so one outlier can pull this up."
        />
      </div>

      {/*Job list + selected report*/}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(290px,350px)_minmax(0,1fr)]">
        <JobsPanel
          rows={visible}
          currentId={currentId}
          search={search}
          onSearch={setSearch}
          status={statusFilter}
          onStatus={setStatusFilter}
          onSelect={setSelected}
          onToggle={(jobId) => toggle.mutate(jobId)}
          loading={loading}
          now={now}
        />

        {!loading && rows.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-[16px] border border-dashed border-border bg-card p-8 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-muted-bg text-muted">
              <Plus size={20} />
            </span>
            <p className="text-[15px] font-semibold text-ink">No cron jobs yet</p>
            <p className="max-w-xs text-[12.5px] text-muted">
              Add a job and FreeCron records every fire — status, latency, response, and
              alert rules in one place.
            </p>
            <Link
              to="/jobs/new"
              className="mt-1 flex items-center gap-1.5 rounded-[10px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={15} /> Add a cron job
            </Link>
          </div>
        ) : (
          <DetailPanel
            job={detail}
            stats={currentStats}
            runs={recent}
            loading={detailLoading && currentId !== undefined}
            running={runNow.isPending}
            onRun={() => currentId && runNow.mutate(currentId)}
            onEdit={() => currentId && navigate(`/jobs/${currentId}/edit`)}
            onDuplicate={() => currentId && navigate(`/jobs/new?from=${currentId}`)}
            onDelete={() => setConfirmDelete(true)}
            now={now}
          />
        )}
      </div>

      {confirmDelete && detail && (
        <DeleteConfirm
          name={detail.name}
          busy={remove.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() =>
            remove.mutate(detail.id, {
              onSuccess: () => {
                setConfirmDelete(false);
                setSelected(null);
              },
            })
          }
        />
      )}
    </div>
  );
}
