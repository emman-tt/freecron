//Filter bar — search + Status/Method chips (the design's chip row).
//Presentational: it renders state and hands changes up
import type { JobFilters } from "../api/job.types";

const methods = ["All", "GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export function FilterBar({
  filters,
  onChange,
}: {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
}) {
  return (
    <div className="flex gap-2.5">
      <input
        placeholder="Search name…"
        value={filters.name ?? ""}
        onChange={(e) => onChange({ ...filters, name: e.target.value || undefined })}
        className="w-[260px] rounded-control border border-border bg-card px-3.5 py-2.5 text-[13px] outline-none placeholder:text-muted"
      />
      <ChipSelect
        label="Status"
        value={filters.isActive === undefined ? "All" : filters.isActive ? "Active" : "Paused"}
        options={["All", "Active", "Paused"]}
        onChange={(v) =>
          onChange({ ...filters, isActive: v === "All" ? undefined : v === "Active" })
        }
      />
      <ChipSelect
        label="Method"
        value={filters.httpMethod ?? "All"}
        options={[...methods]}
        onChange={(v) =>
          onChange({
            ...filters,
            httpMethod: v === "All" ? undefined : (v as JobFilters["httpMethod"]),
          })
        }
      />
    </div>
  );
}

function ChipSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-control border border-border bg-card px-3.5 py-2.5 text-[12px] outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {label}: {o}
        </option>
      ))}
    </select>
  );
}
