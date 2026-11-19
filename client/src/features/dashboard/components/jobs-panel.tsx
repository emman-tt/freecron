//Dashboard jobs panel — search + status popover + one row per job. Row click
//selects for the details panel; the toggle pauses/resumes without selecting.
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import type { Job } from "../../jobs/api/job.types";
import { Toggle } from "../../../shared/ui/Toggle";
import { formatIn } from "../../../shared/lib/format";

type StatusFilter = "all" | "active" | "paused";

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All jobs" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
];

function nextLine(iso: string, now: number): string {
  const at = new Date(iso);
  const ms = at.getTime() - now;
  if (Number.isNaN(ms)) return "—";
  const clock = at.toLocaleString("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (ms <= 0) return `due now · ${clock}`;
  return `next in ${formatIn(ms)} · ${clock}`;
}

export function JobsPanel({
  rows,
  currentId,
  search,
  onSearch,
  status,
  onStatus,
  onSelect,
  onToggle,
  loading,
  now,
}: {
  rows: Job[];
  currentId?: number;
  search: string;
  onSearch: (value: string) => void;
  status: StatusFilter;
  onStatus: (value: StatusFilter) => void;
  onSelect: (jobId: number) => void;
  onToggle: (jobId: number) => void;
  loading: boolean;
  now: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  //close the popover on any outside click — no full-screen overlay needed
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <div className="flex flex-col gap-4 rounded-[16px] border border-border/80 bg-card p-4">
      <div className="flex items-center gap-2">
        <div className="relative flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-border bg-card px-3">
          <Search size={14} className="shrink-0 text-muted" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search jobs"
            className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
          />
        </div>

        <div ref={menuRef} className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex h-10 items-center gap-1.5 rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-muted-bg"
          >
            {status === "all" ? "Status" : status === "active" ? "Active" : "Paused"}
            <ChevronDown
              size={14}
              className={`text-muted transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute top-full right-0 z-30 mt-1.5 w-40 rounded-[10px] border border-border bg-card p-1 shadow-lg"
            >
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  role="menuitemradio"
                  aria-checked={status === option.value}
                  onClick={() => {
                    onStatus(option.value);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-[7px] px-2.5 py-2 text-left text-[12.5px] text-ink transition-colors hover:bg-muted-bg"
                >
                  {option.label}
                  {status === option.value && <Check size={13} className="text-success-strong" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-[12px] p-3">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-border" />
              <div className="flex flex-1 flex-col gap-2">
                <span className="h-3.5 w-28 animate-pulse rounded bg-border/80" />
                <span className="h-3 w-20 animate-pulse rounded bg-border/60" />
              </div>
            </div>
          ))}

        {!loading &&
          rows.map((job) => {
            const active = job.id === currentId;
            return (
              <div
                key={job.id}
                onClick={() => onSelect(job.id)}
                className={`flex cursor-pointer items-center gap-3 rounded-[12px] border p-3 transition-colors ${
                  active
                    ? "border-border bg-muted-bg"
                    : "border-transparent hover:bg-muted-bg/60"
                }`}
              >
                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 self-start rounded-full ${
                    job.isActive ? "bg-live" : "bg-warning"
                  }`}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[14px] font-semibold text-ink">
                    {job.name}
                  </span>
                  <span className="truncate font-mono text-[11px] text-muted">
                    {job.cronExpression}
                  </span>
                  <span className="truncate text-[11.5px] text-muted">
                    {job.isActive ? nextLine(job.nextRunAt, now) : "paused"}
                  </span>
                </div>
                <span
                  onClick={(event) => event.stopPropagation()}
                  className="shrink-0"
                >
                  <Toggle on={job.isActive} onChange={() => onToggle(job.id)} />
                </span>
              </div>
            );
          })}

        {!loading && rows.length === 0 && (
          <div className="flex flex-col gap-1 px-2 py-6 text-center">
            <p className="text-[13px] font-medium text-ink">No jobs match</p>
            <p className="text-[12px] text-muted">
              {search || status !== "all"
                ? "Try a different search or status."
                : "Add your first cron job to get started."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export type { StatusFilter };
