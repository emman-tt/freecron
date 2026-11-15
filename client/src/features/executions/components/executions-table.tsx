//Executions table — the Logs tab (design "RU Logs"): title line with the
//endpoint + showing range, 14px status dots, START TIME / TIME / SIZE
//columns, "View ▾" opening the Output box (statusCode line + stored response),
//and ‹‹ ‹ 1 2 3 … › ›› pagination. Local state only: page + which row is open
import { Fragment, useState } from "react";
import { useExecutions } from "../hooks/execution.hooks";
import type { Execution } from "../api/execution.types";

//dot: green success, gray running (in flight), red failed/timeout
const dotClass: Record<Execution["status"], string> = {
  success: "bg-success",
  running: "bg-muted",
  failed: "bg-danger",
  timeout: "bg-danger",
};

//"Sat, 28 Nov 2026 15:38:30" — the design's verbose start time
function fullDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

//‹‹ ‹ 1 2 3 … last › ›› — numbered pages with an ellipsis window
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

export function ExecutionsTable({ jobId }: { jobId: number }) {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);

  const runs = useExecutions(jobId, page);
  const rows = runs.data?.data ?? [];
  const meta = runs.data?.meta;
  const shown =
    meta && rows.length > 0
      ? `${(meta.page - 1) * meta.limit + 1}-${(meta.page - 1) * meta.limit + rows.length} of ${meta.total}`
      : "0 of 0";

  return (
    <div className="flex flex-col gap-2 rounded-[16px] bg-card p-4">
      <p className="text-[13px] font-bold text-[#0a0a0a]">
        Logs  •  GET /api/executions?jobId={jobId}  •  Showing {shown}
      </p>
      {/*table-fixed + col widths: the verbose timestamps must never stretch
      the page — they wrap inside their column instead*/}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col className="w-10" />
            <col className="w-[55%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead>
            <tr className="text-[11px] font-bold text-muted">
              <th className="p-3" />
              <th className="p-3">START TIME</th>
              <th className="p-3">TIME</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Fragment key={row.id}>
                <tr className="transition-colors hover:bg-muted-bg/60">
                  <td className="p-3">
                    <span className={`block h-3.5 w-3.5 rounded-full ${dotClass[row.status]}`} />
                  </td>
                  <td className="break-words p-3 pr-6 text-[12px] text-muted">
                    {fullDate(row.startedAt)}
                  </td>
                  <td className="whitespace-nowrap p-3 text-[12px] text-muted">
                    {row.duration === null ? "—" : `${(row.duration / 1000).toFixed(2)} sec`}
                  </td>
                  <td className="whitespace-nowrap p-3 text-right">
                    <button
                      onClick={() => setOpenId(openId === row.id ? null : row.id)}
                      className="rounded-lg bg-muted-bg px-3.5 py-1.5 text-[12px] text-[#0a0a0a] hover:bg-border"
                    >
                      {openId === row.id ? "Hide" : "View"} ▾
                    </button>
                  </td>
                </tr>
                {openId === row.id && <OutputRow execution={row} />}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {runs.isLoading && <p className="p-3 text-[13px] text-muted">Loading runs…</p>}
      {!runs.isLoading && rows.length === 0 && (
        <p className="p-3 text-[13px] text-muted">No runs yet — use Run now to make one.</p>
      )}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center gap-2.5 px-1.5 pb-1 pt-2 text-[12px]">
          <span className="text-muted">Page {meta.page} of {meta.totalPages}</span>
          <div className="flex-1" />
          <div className="flex items-center gap-2 font-bold text-[#0a0a0a]">
            <button disabled={!meta.hasPrev} onClick={() => setPage(1)}>
              ‹‹
            </button>
            <button disabled={!meta.hasPrev} onClick={() => setPage(meta.page - 1)}>
              ‹
            </button>
            {pageList(meta.page, meta.totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="text-muted">…</span>
              ) : (
                <button
                  key={i}
                  onClick={() => setPage(p)}
                  className={p === meta.page ? "" : "text-muted"}
                >
                  {p}
                </button>
              ),
            )}
            <button disabled={!meta.hasNext} onClick={() => setPage(meta.page + 1)}>
              ›
            </button>
            <button disabled={!meta.hasNext} onClick={() => setPage(meta.totalPages)}>
              ››
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

//Output box — headline "Output • statusCode: 200 • success", the taxonomy
//error string on failures, then the stored response headers + body
function OutputRow({ execution }: { execution: Execution }) {
  const headline = `Output  •  statusCode: ${execution.statusCode ?? "—"}  •  ${execution.status}`;
  const headers = execution.response?.headers as Record<string, string> | undefined;
  const headerLine = headers
    ? Object.entries(headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join("  •  ")
    : null;
  return (
    <tr>
      <td colSpan={5} className="p-3">
        <div className="flex flex-col gap-2 rounded-xl bg-muted-bg p-4">
          <p className="text-[12px] font-bold text-[#0a0a0a]">{headline}</p>
          {execution.error && <p className="text-[11px] text-danger">{execution.error}</p>}
          {headerLine && <p className="text-[11px] text-muted">{headerLine}</p>}
          {execution.response?.body !== undefined && execution.response?.body !== null && (
            <pre className="overflow-x-auto text-[11px] text-[#0a0a0a]">
              {typeof execution.response.body === "string"
                ? execution.response.body
                : JSON.stringify(execution.response.body, null, 2)}
            </pre>
          )}
        </div>
      </td>
    </tr>
  );
}
