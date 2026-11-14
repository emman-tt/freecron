//Executions table — the Logs tab. Rows carry a status bar + start/duration;
//"View" expands the Output box (statusCode line + stored response JSON or
//the taxonomy error string). Local state only: page + which row is open
import { Fragment, useState } from "react";
import { useExecutions } from "../hooks/execution.hooks";
import type { Execution } from "../api/execution.types";

const bar: Record<Execution["status"], string> = {
  success: "bg-success",
  failed: "bg-danger",
  timeout: "bg-danger",
  running: "bg-warning",
};

export function ExecutionsTable({ jobId }: { jobId: number }) {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);

  const runs = useExecutions(jobId, page);
  const rows = runs.data?.data ?? [];
  const meta = runs.data?.meta;

  return (
    <div className="rounded-card border border-border bg-card p-5">
      <table className="w-full text-left">
        <thead>
          <tr className="text-[11px] font-semibold text-muted">
            <th className="p-3" />
            <th className="p-3">START TIME</th>
            <th className="p-3">TIME</th>
            <th className="p-3">STATUS</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Fragment key={row.id}>
              <tr className="border-t border-border">
                <td className="p-3">
                  <span className={`block h-2 w-2 rounded-full ${bar[row.status]}`} />
                </td>
                <td className="p-3 text-[12px] text-muted">
                  {new Date(row.startedAt).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </td>
                <td className="p-3 text-[12px]">
                  {row.duration === null ? "—" : `${(row.duration / 1000).toFixed(2)} sec`}
                </td>
                <td className="p-3 text-[12px]">
                  {/*statusCode 0 = the D-12 sentinel: the request never answered*/}
                  {row.statusCode === 0 ? (
                    <span title={row.error ?? undefined}>no response</span>
                  ) : (
                    (row.statusCode ?? "running…")
                  )}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => setOpenId(openId === row.id ? null : row.id)}
                    className="rounded-lg bg-muted-bg px-3.5 py-1.5 text-[12px] hover:bg-border"
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
      {runs.isLoading && <p className="p-3 text-[13px] text-muted">Loading runs…</p>}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border p-3.5 text-[12px]">
          <span className="text-muted">
            Showing page {meta.page} of {meta.totalPages} · {meta.total} runs
          </span>
          <div className="flex gap-2 font-bold">
            <button disabled={!meta.hasPrev} onClick={() => setPage(page - 1)}>‹</button>
            <button disabled={!meta.hasNext} onClick={() => setPage(page + 1)}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}

//Output box — headline "Output · statusCode: 200 · success", then the stored
//response JSON; failures show the taxonomy error string instead
function OutputRow({ execution }: { execution: Execution }) {
  const headline = `Output · statusCode: ${execution.statusCode ?? "—"} · ${execution.status}`;
  return (
    <tr>
      <td colSpan={5} className="p-3">
        <div className="rounded-field bg-muted-bg p-4">
          <p className="text-[13px] font-semibold">{headline}</p>
          {execution.error && <p className="mt-1 text-[11px] text-danger">{execution.error}</p>}
          {execution.response && (
            <pre className="mt-2 overflow-x-auto text-[11px] text-[#0a0a0a]">
              {JSON.stringify(execution.response, null, 2)}
            </pre>
          )}
        </div>
      </td>
    </tr>
  );
}
