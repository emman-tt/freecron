//Jobs list — owns page/filter state and composes hooks + components
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Plus } from "lucide-react";
import { useJobs, useToggleJob, useRunNow, useDeleteJob } from "./hooks/job.hooks";
import type { Job, JobFilters } from "./api/job.types";
import { FilterBar } from "./components/filter-bar";
import { JobsTable } from "./components/jobs-table";
import { DeleteConfirm } from "./components/delete-confirm";
import { btnClass } from "../../shared/ui/Button";

export function JobsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<JobFilters>({});
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<Job | null>(null);

  const jobs = useJobs(filters, page);
  const toggle = useToggleJob();
  const runNow = useRunNow();
  const remove = useDeleteJob();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[28px] font-bold">Jobs</h1>
          <p className="text-[13px] text-muted">{jobs.data?.meta.total ?? "…"} total</p>
        </div>
        <Link to="/jobs/new" className={btnClass("primary")}>
          <Plus size={16} /> Add job
        </Link>
      </div>

      <FilterBar
        filters={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
      />

      <JobsTable
        jobs={jobs.data?.data ?? []}
        meta={jobs.data?.meta}
        loading={jobs.isLoading}
        busy={toggle.isPending || runNow.isPending}
        onToggle={toggle.mutate}
        onRunNow={runNow.mutate}
        onEdit={(id) => navigate(`/jobs/${id}/edit`)}
        onDelete={setToDelete}
        onPage={setPage}
      />

      {toDelete && (
        <DeleteConfirm
          name={toDelete.name}
          busy={remove.isPending}
          onCancel={() => setToDelete(null)}
          onConfirm={() => remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
        />
      )}
    </div>
  );
}
