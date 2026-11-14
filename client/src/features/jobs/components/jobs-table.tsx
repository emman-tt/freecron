//Jobs table — the designed grid: status dot, name/website, cron, method
//chip, toggle, last→next, and the four row verbs (▶ ⏸ ✎ 🗑).
//Presentational: rows and callbacks come in, no queries inside
import { Link } from "react-router";
import { Play, Pause, Pencil, Trash2 } from "lucide-react";
import type { Job } from "../api/job.types";
import type { PaginationMeta } from "../../../shared/api/http";
import { Toggle } from "../../../shared/ui/Toggle";

export function JobsTable({
  jobs,
  meta,
  loading,
  busy,
  onToggle,
  onRunNow,
  onEdit,
  onDelete,
  onPage,
}: {
  jobs: Job[];
  meta?: PaginationMeta;
  loading: boolean;
  busy: boolean;
  onToggle: (jobId: number) => void;
  onRunNow: (jobId: number) => void;
  onEdit: (jobId: number) => void;
  onDelete: (job: Job) => void;
  onPage: (page: number) => void;
}) {
  return (
    <div className="rounded-card border border-border bg-card p-4">
      <table className="w-full text-left">
        <thead>
          <tr className="text-[11px] font-bold text-muted">
            <th className="p-3" />
            <th className="p-3">Name / Website to call</th>
            <th className="p-3">Cron</th>
            <th className="p-3">Method</th>
            <th className="p-3">Active</th>
            <th className="p-3">Last → Next</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-t border-border align-middle hover:bg-muted-bg/60">
              <td className="p-3">
                <span
                  className={`block h-2 w-2 rounded-full ${
                    job.isActive ? "bg-success" : "bg-border"
                  }`}
                />
              </td>
              <td className="p-3">
                <Link to={`/jobs/${job.id}`} className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold">{job.name}</span>
                  <span className="truncate text-[11px] text-muted">
                    {job.httpCommand.replace(/^https?:\/\//, "")}
                  </span>
                </Link>
              </td>
              <td className="p-3 font-mono text-[11px] font-bold">{job.cronExpression}</td>
              <td className="p-3">
                <span className="rounded-lg bg-muted-bg px-2.5 py-1 text-[11px] font-bold">
                  {job.httpMethod}
                </span>
              </td>
              <td className="p-3">
                <Toggle
                  on={job.isActive}
                  label={job.isActive ? "Pause job" : "Resume job"}
                  onChange={() => onToggle(job.id)}
                />
              </td>
              <td className="p-3 text-[11px] text-muted">
                {job.lastRunAt ? "ran" : "not yet"} →{" "}
                {new Date(job.nextRunAt).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="p-3">
                <div className="flex gap-1.5">
                  <ActionButton title="Run now" disabled={busy} onClick={() => onRunNow(job.id)}>
                    <Play size={12} />
                  </ActionButton>
                  <ActionButton
                    title={job.isActive ? "Pause" : "Resume"}
                    disabled={busy}
                    onClick={() => onToggle(job.id)}
                  >
                    {job.isActive ? <Pause size={12} /> : <Play size={12} />}
                  </ActionButton>
                  <ActionButton title="Edit" onClick={() => onEdit(job.id)}>
                    <Pencil size={12} />
                  </ActionButton>
                  <ActionButton title="Delete" onClick={() => onDelete(job)}>
                    <Trash2 size={12} />
                  </ActionButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {loading && <p className="p-3 text-[13px] text-muted">Loading jobs…</p>}
      {!loading && jobs.length === 0 && (
        <p className="p-3 text-[13px] text-muted">No jobs match — try clearing the filters.</p>
      )}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border p-3.5 text-[12px]">
          <span className="text-muted">
            Showing {(meta.page - 1) * meta.limit + 1}-
            {(meta.page - 1) * meta.limit + jobs.length} of {meta.total}
          </span>
          <div className="flex gap-2 font-bold">
            <button disabled={!meta.hasPrev} onClick={() => onPage(meta.page - 1)}>‹</button>
            <span>page {meta.page}/{meta.totalPages}</span>
            <button disabled={!meta.hasNext} onClick={() => onPage(meta.page + 1)}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-border px-2 py-1.5 text-[11px] hover:bg-muted-bg disabled:opacity-40"
    >
      {children}
    </button>
  );
}
