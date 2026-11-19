//CSV export for the logs page. Exports exactly what the table has loaded —
//the API has no bulk/export endpoint, so we never imply "all history".
import type { Execution } from "../api/execution.types";

const COLUMNS = [
  "id",
  "startedAt",
  "status",
  "statusCode",
  "durationMs",
  "error",
  "response",
];

function cell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function downloadExecutionsCsv(jobName: string, rows: Execution[], page: number) {
  const lines = [
    COLUMNS.join(","),
    ...rows.map((run) =>
      [
        run.id,
        run.startedAt,
        run.status,
        run.statusCode ?? "",
        run.duration ?? "",
        run.error ?? "",
        JSON.stringify(run.response ?? null),
      ]
        .map(cell)
        .join(","),
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${jobName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-runs-page-${page}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
