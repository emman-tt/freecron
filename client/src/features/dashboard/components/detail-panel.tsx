//Dashboard detail panel — the selected job, close to the "leveled up"
//design: status + actions, underline tabs (Overview / Runs / Config /
//Alerts), a 48-run strip, request vs last response, payload, recent runs,
//and live alert rules. Everything renders real data or an honest empty state.
import { useState } from "react";
import { Link } from "react-router";
import {
  Copy,
  ExternalLink,
  Play,
  SquarePen,
  Trash2,
} from "lucide-react";
import type { Job } from "../../jobs/api/job.types";
import type {
  Execution,
  ExecutionStats,
} from "../../executions/api/execution.types";
import { RunsStrip } from "../../executions/components/runs-strip";
import { RecentRunsTable } from "../../executions/components/recent-runs-table";
import { ExecutionsTable } from "../../executions/components/executions-table";
import { useExecutions } from "../../executions/hooks/execution.hooks";
import { useJobRules, useToggleRule } from "../../notifications/hooks/notification.hooks";
import { Toggle } from "../../../shared/ui/Toggle";
import { durationLabel, formatIn, hm, mask } from "../../../shared/lib/format";
import { headerEntries } from "../../../shared/lib/headers";

const tabs = ["Overview", "Runs", "Config", "Alerts"] as const;
type Tab = (typeof tabs)[number];

const httpStatusText: Record<number, string> = {
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No content",
  400: "Bad request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not found",
  409: "Conflict",
  429: "Too many requests",
  500: "Server error",
  502: "Bad gateway",
  503: "Unavailable",
  504: "Gateway timeout",
};

const sectionLabel =
  "text-[11px] font-bold tracking-[0.08em] text-muted uppercase";

function nextClock(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "—";
  return at.toLocaleString("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function jobHealth(job: Job, stats?: ExecutionStats) {
  if (!job.isActive) {
    return {
      label: "Paused",
      pill: "bg-warning-soft text-warning",
      dot: "bg-warning",
    };
  }
  if (stats?.lastStatus === "failed" || stats?.lastStatus === "timeout") {
    return {
      label: "Needs care",
      pill: "bg-danger-soft text-danger",
      dot: "bg-danger",
    };
  }
  return {
    label: "Running well",
    pill: "bg-success-soft text-success-strong",
    dot: "bg-live",
  };
}

export function DetailPanel({
  job,
  stats,
  runs,
  loading,
  running,
  onRun,
  onEdit,
  onDuplicate,
  onDelete,
  now,
}: {
  job?: Job;
  stats?: ExecutionStats;
  runs: Execution[];
  loading: boolean;
  running: boolean;
  onRun: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  now: number;
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const rules = useJobRules(job?.id ?? 0);
  const toggleRule = useToggleRule();

  if (loading) {
    return (
      <div className="flex flex-col gap-5 rounded-[16px] border border-border/80 bg-card p-6">
        <span className="h-7 w-40 animate-pulse rounded-md bg-border/80" />
        <span className="h-4 w-64 animate-pulse rounded bg-border/60" />
        <span className="h-40 animate-pulse rounded-[10px] bg-border/40" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-border bg-card p-6 text-center">
        <p className="text-[14px] font-semibold text-ink">Select a job</p>
        <p className="max-w-xs text-[12.5px] text-muted">
          Pick a job on the left to see its schedule, last response, and recent runs.
        </p>
      </div>
    );
  }

  const health = jobHealth(job, stats);
  const nextIn = job.isActive
    ? Math.max(0, new Date(job.nextRunAt).getTime() - now)
    : null;
  const latest = runs[0];
  const headers = headerEntries(job.httpHeader ?? {});
  const payloadKeys = Object.keys(job.httpBody ?? {});
  const successPct =
    stats?.uptimePct !== null && stats?.uptimePct !== undefined
      ? `${Math.round(stats.uptimePct)}%`
      : null;

  return (
    <div className="flex min-w-0 flex-col gap-5 rounded-[16px] border border-border/80 bg-card p-5 sm:p-6">
      {/*Header — name + health on the left, actions on the right, sub-line below*/}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="truncate text-[24px] leading-tight font-bold tracking-[-0.02em] text-ink">
              {job.name}
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-[7px] px-2 py-0.5 text-[12px] font-semibold ${health.pill}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${health.dot}`} />
              {health.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onRun}
              disabled={running}
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-primary px-3.5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Play size={14} className="fill-current" />
              {running ? "Starting…" : "Run now"}
            </button>
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-border bg-card px-3.5 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-muted-bg"
            >
              <SquarePen size={14} />
              Edit
            </button>
            <button
              onClick={onDuplicate}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-border bg-card px-3.5 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-muted-bg"
            >
              <Copy size={14} />
              Duplicate
            </button>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-danger-border bg-card px-3.5 py-2.5 text-[13px] font-semibold text-danger transition-colors hover:bg-danger-soft"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        <p className="text-[12.5px] text-muted">
          {nextIn !== null ? (
            <>
              Next run in {formatIn(nextIn)} · {nextClock(job.nextRunAt)}
            </>
          ) : (
            <>Paused · would fire {nextClock(job.nextRunAt)}</>
          )}
          <span className="mx-1.5 text-border">|</span>
          <span className="font-mono">{job.cronExpression}</span>
          {stats && stats.totalRuns > 0 && (
            <>
              <span className="mx-1.5 text-border">|</span>
              {successPct} success over {stats.totalRuns.toLocaleString()} runs
            </>
          )}        </p>
      </div>

      {/*Tabs*/}
      <div className="flex gap-6 overflow-x-auto border-b border-border">
        {tabs.map((item) => {
          const active = tab === item;
          return (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`-mb-px whitespace-nowrap border-b-2 pb-2.5 text-[13px] font-semibold transition-colors ${
                active
                  ? "border-ink text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {item}
              {item === "Alerts" && (rules.data?.length ?? 0) > 0 && (
                <span className="ml-1.5 rounded-full bg-muted-bg px-1.5 py-0.5 text-[10.5px] font-bold text-muted">
                  {rules.data?.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "Overview" && (
        <div className="flex flex-col gap-6">
          {/*Run strip*/}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={sectionLabel}>Last 48 runs</p>
              <p className="flex items-center gap-3 text-[11px] text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-[2px] bg-live" /> success
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-[2px] bg-danger" /> failed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-[2px] bg-warning" /> in flight
                </span>
              </p>
            </div>
            <RunsStrip runs={runs} now={now} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/*Request + payload*/}
            <div className="flex min-w-0 flex-col gap-2.5">
              <p className={sectionLabel}>Request</p>
              <div className="rounded-[10px] bg-muted-bg p-4">
                <span className="inline-flex rounded-[5px] bg-success-soft px-2 py-1 text-[10.5px] font-bold tracking-[0.06em] text-success-strong uppercase">
                  {job.httpMethod}
                </span>
                <p className="mt-2.5 font-mono text-[12.5px] break-all text-ink">
                  {job.httpCommand}
                </p>
                <p className="mt-2 text-[11.5px] text-muted">
                  Timeout {Math.round(job.timeout / 1000)}s · Retries {job.maxRetries} ·
                  Retry delay {Math.round(job.retryDelay / 1000)}s
                </p>
              </div>

              <p className={`${sectionLabel} mt-2`}>Payload</p>
              <div className="rounded-[10px] bg-muted-bg p-4">
                {payloadKeys.length > 0 ? (
                  <pre className="max-h-44 overflow-auto font-mono text-[11.5px] leading-relaxed text-ink">
                    {JSON.stringify(job.httpBody, null, 2)}
                  </pre>
                ) : (
                  <p className="text-[12px] text-muted">No payload — this job sends an empty body.</p>
                )}
              </div>
            </div>

            {/*Last response + headers*/}
            <div className="flex min-w-0 flex-col gap-2.5">
              <p className={sectionLabel}>Last response</p>
              <div className="rounded-[10px] border border-border p-4">
                {latest ? (
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className={`text-[14px] font-bold ${
                        latest.status === "success"
                          ? "text-success-strong"
                          : latest.status === "running"
                            ? "text-warning"
                            : "text-danger"
                      }`}
                    >
                      {latest.statusCode
                        ? `${latest.statusCode} ${httpStatusText[latest.statusCode] ?? ""}`.trim()
                        : latest.status}
                    </span>
                    <span className="shrink-0 text-[11.5px] text-muted">
                      {hm(latest.startedAt)} · {durationLabel(latest.duration)}
                    </span>
                  </div>
                ) : (
                  <p className="text-[12px] text-muted">No response recorded yet.</p>
                )}
              </div>

              <p className={`${sectionLabel} mt-2`}>Headers</p>
              {headers.length > 0 ? (
                <div className="overflow-hidden rounded-[10px] border border-border">
                  <div className="flex bg-muted-bg px-3.5 py-2 text-[11px] font-semibold text-muted">
                    <span className="flex-1">Name</span>
                    <span className="flex-1">Value</span>
                  </div>
                  {headers.map(([name, value]) => (
                    <div
                      key={name}
                      className="flex gap-2 border-t border-border/70 px-3.5 py-2 text-[12px]"
                    >
                      <span className="flex-1 truncate text-ink">{name}</span>
                      <span className="flex-1 truncate font-mono text-[11.5px] text-muted">
                        {mask(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-muted">No custom headers on this request.</p>
              )}
              <p className="text-[11px] text-muted">Values hidden by default.</p>
            </div>
          </div>

          <RecentRunsTable runs={runs.slice(0, 5)} onViewAll={() => setTab("Runs")} />
        </div>
      )}

      {tab === "Runs" && <JobLogs key={job.id} job={job} />}

      {tab === "Config" && (
        <div className="flex flex-col gap-4">
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className={sectionLabel}>Schedule</dt>
              <dd className="mt-1 font-mono text-[13px] text-ink">{job.cronExpression}</dd>
              <dd className="text-[11.5px] text-muted">Next {nextClock(job.nextRunAt)}</dd>
            </div>
            <div>
              <dt className={sectionLabel}>Request</dt>
              <dd className="mt-1 text-[13px] text-ink">{job.httpMethod}</dd>
              <dd className="font-mono text-[11.5px] break-all text-muted">
                {job.httpCommand}
              </dd>
            </div>
            <div>
              <dt className={sectionLabel}>Reliability</dt>
              <dd className="mt-1 text-[13px] text-ink">
                {Math.round(job.timeout / 1000)}s timeout · {job.maxRetries} retries ·{" "}
                {Math.round(job.retryDelay / 1000)}s delay
              </dd>
            </div>
            <div>
              <dt className={sectionLabel}>Status</dt>
              <dd className="mt-1 text-[13px] text-ink">
                {job.isActive ? "Active — firing on schedule" : "Paused — not firing"}
              </dd>
            </div>
            {job.description && (
              <div className="sm:col-span-2">
                <dt className={sectionLabel}>Description</dt>
                <dd className="mt-1 text-[13px] text-ink">{job.description}</dd>
              </div>
            )}
          </dl>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-border bg-card px-3.5 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-muted-bg"
            >
              <SquarePen size={14} /> Edit configuration
            </button>
            <Link
              to={`/jobs/${job.id}`}
              className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold text-muted transition-colors hover:text-ink"
            >
              Open full report <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      )}

      {tab === "Alerts" && (
        <div className="flex flex-col gap-3">
          {(rules.data ?? []).length === 0 ? (
            <p className="text-[13px] text-muted">
              No alert rules for this job yet. Rules are added on the job page.
            </p>
          ) : (
            (rules.data ?? []).map((rule) => (
              <div
                key={rule.id}
                className="flex items-center gap-3 rounded-[10px] border border-border px-3.5 py-3"
              >
                <span
                  className={`rounded-[5px] px-2 py-0.5 text-[10.5px] font-bold tracking-[0.05em] uppercase ${
                    rule.type === "slack"
                      ? "bg-muted-bg text-ink"
                      : "bg-success-soft text-success-strong"
                  }`}
                >
                  {rule.type}
                </span>
                <span className="text-[12.5px] font-semibold text-ink">
                  on {rule.event}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-muted">
                  {rule.target}
                </span>
                <Toggle
                  on={rule.enabled}
                  label={rule.enabled ? "Turn rule off" : "Turn rule on"}
                  onChange={() => toggleRule.mutate(rule.id)}
                />
              </div>
            ))
          )}
          <div className="flex items-center gap-3 pt-1">
            <Link
              to={`/jobs/${job.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-border bg-card px-3.5 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-muted-bg"
            >
              Manage alerts <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

//Runs tab in the dashboard: the same paged logs table as the job report.
//Kept as its own component so page state resets when the selected job changes.
function JobLogs({ job }: { job: Job }) {
  const [page, setPage] = useState(1);
  const logs = useExecutions(job.id, page);

  return (
    <ExecutionsTable
      job={job}
      runs={logs.data?.data ?? []}
      meta={logs.data?.meta}
      loading={logs.isLoading}
      page={page}
      onPage={setPage}
    />
  );
}
