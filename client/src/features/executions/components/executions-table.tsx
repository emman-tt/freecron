//Logs tab — every execution for one job. Status chips + search filter the
//loaded page (the API has no status/search query), the latency bar compares
//a run to the slowest on the page, and a row expands into request/response
//with Copy as cURL and Re-run.
//
//Counts on the chips describe this page, not all history — the header says
//"showing x–y of z" so the scope stays honest.
import { useState } from "react";
import { Copy, RotateCw } from "lucide-react";
import type { Execution } from "../api/execution.types";
import type { Job } from "../../jobs/api/job.types";
import type { PaginationMeta } from "../../../shared/api/http";
import { useRunNow } from "../../jobs/hooks/job.hooks";
import { headerEntries, headerValue } from "../../../shared/lib/headers";

const STATUS_TEXT: Record<number, string> = {
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

type Filter = "all" | "success" | "failed";

function isFailed(run: Execution): boolean {
  return run.status === "failed" || run.status === "timeout";
}

//"Sun 15 Nov, 20:00:00" — the logs design's verbose start time
function startTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${day}, ${time}`;
}

function statusLabel(run: Execution): string {
  if (run.statusCode) return String(run.statusCode);
  return run.status;
}

function statusClass(run: Execution): string {
  if (run.status === "success") return "text-success-strong";
  if (run.status === "running") return "text-warning";
  return "text-danger";
}

function pageList(page: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const wanted = new Set(
    [1, 2, 3, page - 1, page, page + 1, total].filter((p) => p >= 1 && p <= total),
  );
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

function requestPath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function contentLength(body: Record<string, unknown> | null | undefined): number {
  return body ? Object.keys(body).length : 0;
}

export function ExecutionsTable({
  job,
  runs,
  meta,
  loading,
  page,
  onPage,
}: {
  job: Job;
  runs: Execution[];
  meta?: PaginationMeta;
  loading: boolean;
  page: number;
  onPage: (page: number) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  //“first” = auto-open the newest row until the user explicitly hides/views;
  //the choice is tied to the page so paging falls back to the new first row
  const [choice, setChoice] = useState<{ page: number; id: number | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const runNow = useRunNow();

  const visible = runs.filter((run) => {
    if (filter === "success" && run.status !== "success") return false;
    if (filter === "failed" && !isFailed(run)) return false;
    if (!search) return true;
    const haystack = [
      run.status,
      run.statusCode ?? "",
      run.error ?? "",
      JSON.stringify(run.response ?? {}),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const open = choice?.page === page ? choice.id : (visible[0]?.id ?? null);
  const maxDuration = Math.max(...visible.map((run) => run.duration ?? 0), 1);
  const successCount = runs.filter((run) => run.status === "success").length;
  const failedCount = runs.filter(isFailed).length;

  const filters: Array<{ key: Filter; label: string; count: number }> = [
    { key: "all", label: "All", count: runs.length },
    { key: "success", label: "Success", count: successCount },
    { key: "failed", label: "Failed", count: failedCount },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/*Filter bar*/}
      <div
        className="flex flex-wrap items-center gap-2"
        title="Counts and filters cover the runs loaded on this page."
      >
        {filters.map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={`h-10 rounded-[8px] border px-3.5 text-[12.5px] font-medium transition-colors ${
              filter === item.key
                ? "border-primary bg-primary text-white"
                : "border-border bg-card text-ink hover:bg-muted-bg"
            }`}
          >
            {item.label} {item.count}
          </button>
        ))}

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search status or response"
          className="h-10 min-w-[220px] flex-1 rounded-[8px] border border-border bg-card px-3.5 text-[13px] text-ink outline-none placeholder:text-muted"
        />

        <span
          title="Range filters aren't wired to the API yet — this page shows the latest runs."
          className="flex h-10 cursor-default items-center rounded-[8px] border border-border bg-card px-3.5 text-[12.5px] text-muted"
        >
          All runs
        </span>
      </div>

      {/*Table card*/}
      <div className="overflow-hidden rounded-[16px] border border-border/80 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="text-[10.5px] font-semibold tracking-[0.06em] text-muted uppercase">
                <th className="w-[32%] px-5 py-4 font-semibold lg:w-[27%]">Start time</th>
                <th className="w-[14%] px-3 py-4 font-semibold lg:w-[10%]">Status</th>
                <th className="w-[15%] px-3 py-4 font-semibold lg:w-[12%]">Duration</th>
                <th className="hidden px-3 py-4 lg:table-cell lg:w-[30%]" />
                <th className="w-[100px] px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-border/80">
                    <td className="px-5 py-5">
                      <span className="block h-3.5 w-40 animate-pulse rounded bg-border/70" />
                    </td>
                    <td className="px-3 py-5">
                      <span className="block h-3.5 w-10 animate-pulse rounded bg-border/60" />
                    </td>
                    <td className="px-3 py-5">
                      <span className="block h-3.5 w-12 animate-pulse rounded bg-border/60" />
                    </td>
                    <td className="px-3 py-5" colSpan={2}>
                      <span className="block h-1.5 w-full max-w-[200px] animate-pulse rounded-full bg-border/60" />
                    </td>
                  </tr>
                ))}

              {!loading &&
                visible.map((run) => {
                  const expanded = run.id === open;
                  return (
                    <RowGroup
                      key={run.id}
                      run={run}
                      job={job}
                      expanded={expanded}
                      maxDuration={maxDuration}
                      copied={copied}
                      rerunning={runNow.isPending}
                      onToggle={() => setChoice({ page, id: expanded ? null : run.id })}
                      onCopy={() => {
                        void navigator.clipboard.writeText(curlFor(job)).then(() => {
                          setCopied(true);
                          window.setTimeout(() => setCopied(false), 1500);
                        });
                      }}
                      onRerun={() => runNow.mutate(job.id)}
                    />
                  );
                })}

              {!loading && visible.length === 0 && (
                <tr className="border-t border-border/80">
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <p className="text-[13px] font-medium text-ink">
                      {runs.length === 0 ? "No runs yet" : "No runs match this filter"}
                    </p>
                    <p className="mt-1 text-[12px] text-muted">
                      {runs.length === 0
                        ? "Run this job once and its history starts here."
                        : "Try “All”, a different status, or a shorter search."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center gap-2.5 border-t border-border/80 px-5 py-3 text-[12px]">
            <span className="text-muted">
              Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex-1" />
            <div className="flex items-center gap-2 font-semibold text-ink">
              <button disabled={!meta.hasPrev} onClick={() => onPage(1)} className="disabled:opacity-30">
                ‹‹
              </button>
              <button
                disabled={!meta.hasPrev}
                onClick={() => onPage(meta.page - 1)}
                className="disabled:opacity-30"
              >
                ‹
              </button>
              {pageList(meta.page, meta.totalPages).map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="text-muted">
                    …
                  </span>
                ) : (
                  <button
                    key={i}
                    onClick={() => onPage(p)}
                    className={p === meta.page ? "" : "text-muted hover:text-ink"}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                disabled={!meta.hasNext}
                onClick={() => onPage(meta.page + 1)}
                className="disabled:opacity-30"
              >
                ›
              </button>
              <button
                disabled={!meta.hasNext}
                onClick={() => onPage(meta.totalPages)}
                className="disabled:opacity-30"
              >
                ››
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function curlFor(job: Job): string {
  const headers = headerEntries(job.httpHeader).map(
    ([name, value]) => `-H '${name}: ${value}'`,
  );
  const body = contentLength(job.httpBody)
    ? [`-d '${JSON.stringify(job.httpBody)}'`]
    : [];
  return [`curl -X ${job.httpMethod}`, `'${job.httpCommand}'`, ...headers, ...body].join(" ");
}

function RowGroup({
  run,
  job,
  expanded,
  maxDuration,
  copied,
  rerunning,
  onToggle,
  onCopy,
  onRerun,
}: {
  run: Execution;
  job: Job;
  expanded: boolean;
  maxDuration: number;
  copied: boolean;
  rerunning: boolean;
  onToggle: () => void;
  onCopy: () => void;
  onRerun: () => void;
}) {
  const body = run.response?.body;
  const contentType = headerValue(job.httpHeader, "content-type");

  return (
    <>
      <tr
        className={`border-t border-border/80 transition-colors ${
          expanded ? "bg-card" : "hover:bg-muted-bg/40"
        }`}
      >
        <td className="px-5 py-4 text-[13px] text-ink">
          <span className="flex items-center gap-2.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                run.status === "success"
                  ? "bg-live"
                  : run.status === "running"
                    ? "bg-warning"
                    : "bg-danger"
              }`}
            />
            {startTime(run.startedAt)}
          </span>
        </td>
        <td className={`px-3 py-4 text-[13px] font-semibold ${statusClass(run)}`}>
          {statusLabel(run)}
        </td>
        <td className="px-3 py-4 text-[13px] text-ink">
          {run.duration === null ? "—" : `${(run.duration / 1000).toFixed(2)} s`}
        </td>
        <td className="hidden px-3 py-4 lg:table-cell">
          <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-border/70">
            <div
              className="h-full rounded-full bg-muted"
              style={{
                width: `${Math.max(((run.duration ?? 0) / maxDuration) * 100, 2)}%`,
              }}
            />
          </div>
        </td>
        <td className="px-5 py-4 text-right">
          <button
            onClick={onToggle}
            className="rounded-[8px] border border-border bg-card px-3.5 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-muted-bg"
          >
            {expanded ? "Hide" : "View"}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-card">
          <td colSpan={5} className="border-b border-border/80 px-5 pb-5">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-[10.5px] font-bold tracking-[0.06em] text-muted uppercase">
                  Request
                </p>
                <div className="mt-2 rounded-[8px] bg-muted-bg p-4">
                  <p className="font-mono text-[12px] text-ink">
                    <span className="font-bold">{job.httpMethod}</span>{" "}
                    {requestPath(job.httpCommand)}
                  </p>
                  {contentType && (
                    <p className="mt-1 text-[11.5px] text-muted">
                      Content-type: {contentType}
                    </p>
                  )}
                  {contentLength(job.httpBody) > 0 && (
                    <pre className="mt-2 overflow-x-auto font-mono text-[11px] whitespace-pre-wrap text-ink">
                      {JSON.stringify(job.httpBody)}
                    </pre>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10.5px] font-bold tracking-[0.06em] text-muted uppercase">
                  Response
                  {run.statusCode
                    ? ` · ${run.statusCode} ${STATUS_TEXT[run.statusCode] ?? ""}`.trimEnd()
                    : ""}
                </p>
                <div className="mt-2 rounded-[8px] bg-muted-bg p-4">
                  {run.error ? (
                    <p className="font-mono text-[11px] text-danger">{run.error}</p>
                  ) : body === undefined || body === null ? (
                    <p className="text-[12px] text-muted">No body returned.</p>
                  ) : (
                    <pre className="max-h-64 overflow-auto font-mono text-[11.5px] leading-relaxed text-ink">
                      {typeof body === "string" ? body : JSON.stringify(body, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={onCopy}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-border bg-card px-3 py-2 text-[12px] font-medium text-ink transition-colors hover:bg-muted-bg"
              >
                <Copy size={12} />
                {copied ? "Copied" : "Copy as cURL"}
              </button>
              <button
                onClick={onRerun}
                disabled={rerunning}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-border bg-card px-3 py-2 text-[12px] font-medium text-ink transition-colors hover:bg-muted-bg disabled:opacity-50"
              >
                <RotateCw size={12} className={rerunning ? "animate-spin" : ""} />
                {rerunning ? "Starting…" : "Re-run"}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
