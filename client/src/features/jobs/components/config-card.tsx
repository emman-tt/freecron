//Config card on the report — the job's schedule and request settings at a
//glance, label left / value right. Secrets stay masked; payload is real JSON.
import type { Job } from "../api/job.types";
import { cronSummary } from "../../../shared/lib/cron";
import { mask } from "../../../shared/lib/format";
import { headerEntries, headerValue } from "../../../shared/lib/headers";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/80 py-3 last:border-0">
      <span className="shrink-0 text-[13px] text-muted">{label}</span>
      <span className="min-w-0 text-right text-[13px] font-medium text-ink">{children}</span>
    </div>
  );
}

export function ConfigCard({ job }: { job: Job }) {
  const contentType = headerValue(job.httpHeader, "content-type");
  const headers = headerEntries(job.httpHeader);
  const headerCount = headers.length;
  const payloadKeys = Object.keys(job.httpBody).length;

  return (
    <section className="flex flex-col gap-4 rounded-[16px] border border-border/80 bg-card p-5 sm:p-6">
      <p className="text-[11px] font-bold tracking-[0.08em] text-muted uppercase">Config</p>

      <div>
        <Row label="Schedule">
          <span title={job.cronExpression}>{cronSummary(job.cronExpression)}</span>
        </Row>
        <Row label="Method">
          <span className="font-bold text-success-strong">{job.httpMethod}</span>
        </Row>
        <Row label="URL">
          <span
            className="block max-w-[230px] truncate font-mono text-[12px]"
            title={job.httpCommand}
          >
            {job.httpCommand.replace(/^https?:\/\//, "")}
          </span>
        </Row>
        <Row label="Timeout">{Math.round(job.timeout / 1000)}s</Row>
        <Row label="Retries">
          {job.maxRetries} × {job.retryDelay}ms
        </Row>
        {contentType && (
          <Row label="Content-type">
            <span className="block max-w-[230px] truncate font-mono text-[11.5px]" title={contentType}>
              {contentType}
            </span>
          </Row>
        )}
        {headerCount > 0 && (
          <Row label="Headers">
            <span title={headers.map(([k, v]) => `${k}: ${mask(v)}`).join("\n")}>
              {headerCount} configured
            </span>
          </Row>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-bold tracking-[0.08em] text-muted uppercase">Payload</p>
        {payloadKeys > 0 ? (
          <pre className="max-h-56 overflow-auto rounded-[10px] bg-muted-bg p-4 font-mono text-[11.5px] leading-relaxed text-ink">
            {JSON.stringify(job.httpBody, null, 2)}
          </pre>
        ) : (
          <p className="text-[12px] text-muted">No payload — this job sends an empty body.</p>
        )}
      </div>
    </section>
  );
}
