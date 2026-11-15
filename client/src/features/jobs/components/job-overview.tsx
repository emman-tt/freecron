//Job overview — the Details card (schedule bar, headers, payload, recent
//runs) plus the action row. Presentational
import { Link } from "react-router";
import { describeCron } from "../../../shared/lib/cron";
import { formatIn, mask } from "../../../shared/lib/format";
import { Card } from "../../../shared/ui/Card";
import { Button } from "../../../shared/ui/Button";
import type { Execution } from "../../executions/api/execution.types";
import type { Job } from "../api/job.types";

export function JobOverview({
  job,
  recent,
  onRun,
  onDelete,
}: {
  job: Job;
  recent: Execution[];
  onRun: () => void;
  onDelete: () => void;
}) {
  const human = describeCron(job.cronExpression);
  const nextIn = formatIn(new Date(job.nextRunAt).getTime() - Date.now());

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="flex flex-col gap-4 p-7">
        <div>
          <p className="text-[15px] font-semibold">Job Name</p>
          <p className="text-[13px] text-muted">
            {job.name} · {job.isActive ? "Active" : "Paused"} · Next run in {nextIn}
          </p>
        </div>

        {/*Schedule bar — machine truth next to human words (design)*/}
        <div className="flex flex-col gap-1 rounded-field bg-muted-bg p-3">
          <span className="font-mono text-[14px] font-bold">{job.cronExpression}</span>
          {human && (
            <span className="text-[12px] text-muted">{human.replace("Next run: ", "")}</span>
          )}
        </div>

        <div>
          <p className="text-[15px] font-semibold">Url</p>
          <p className="text-[13px] text-muted">{job.httpCommand}</p>
        </div>

        <div>
          <p className="text-[15px] font-semibold">Request Method</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-lg bg-muted-bg px-3 py-1 text-[12px] font-bold text-success">
              {job.httpMethod}
            </span>
            <span className="text-[12px] text-muted">
              Timeout: {Math.round(job.timeout / 1000)}s · Retries: {job.maxRetries}×
              {job.retryDelay}ms
            </span>
          </div>
        </div>

        {Object.keys(job.httpHeader).length > 0 && (
          <div>
            <p className="text-[15px] font-semibold">Headers</p>
            <table className="mt-1 w-full overflow-hidden rounded-[10px] border border-border text-left">
              <thead>
                <tr className="bg-[#fafaf9] text-[12px] text-muted">
                  <th className="px-3.5 py-2.5 font-normal">Name</th>
                  <th className="px-3.5 py-2.5 font-normal">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(job.httpHeader).map(([name, value]) => (
                  <tr key={name} className="border-t border-border">
                    <td className="px-3.5 py-2.5 text-[13px]">{name}</td>
                    {/*Secrets never render in full: mask to first/last 4 chars*/}
                    <td className="px-3.5 py-2.5 text-[13px] text-muted">{mask(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {Object.keys(job.httpBody).length > 0 && (
          <div>
            <p className="text-[15px] font-semibold">Payload</p>
            <pre className="mt-1 overflow-x-auto rounded-[10px] bg-primary p-3.5 text-[12px] text-white">
              {JSON.stringify(job.httpBody, null, 2)}
            </pre>
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3 p-5">
          <p className="text-[15px] font-semibold">Recent Runs</p>
          {recent.length === 0 && <p className="text-[13px] text-muted">No runs yet.</p>}
          {recent.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-field bg-muted-bg p-3">
              <span
                className={`h-2 w-2 rounded-full ${
                  r.status === "success"
                    ? "bg-success"
                    : r.status === "running"
                      ? "bg-warning"
                      : "bg-danger"
                }`}
              />
              <span className="text-[12px] font-semibold">
                {new Date(r.startedAt).toLocaleString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <span className="text-[11px] text-muted">
                {r.statusCode === 0 ? "no response" : (r.statusCode ?? "running…")} ·{" "}
                {r.duration === null ? "—" : `${(r.duration / 1000).toFixed(1)}s`}
              </span>
            </div>
          ))}
        </Card>

        <div className="flex gap-3">
          <Button onClick={onRun}>▶ Run now</Button>
          <Link
            to={`/jobs/${job.id}/edit`}
            className="rounded-control border border-border bg-card px-5 py-3 text-[14px] font-semibold hover:bg-muted-bg"
          >
            Edit Job
          </Link>
          <button
            onClick={onDelete}
            className="rounded-control bg-danger-soft px-5 py-3 text-[14px] font-semibold text-danger hover:opacity-80"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
