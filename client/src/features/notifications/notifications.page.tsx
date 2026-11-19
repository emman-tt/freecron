//Notifications — one job at a time. Job picker top-right, a health sentence
//that reasons about the failure rule, the rule table, and the add-rule
//composer. The API is per-job, so this page never fans out across jobs.
import { useState } from "react";
import { Link } from "react-router";
import { AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import { useJobs } from "../jobs/hooks/job.hooks";
import type { Job } from "../jobs/api/job.types";
import {
  useDeleteRule,
  useJobRules,
  useToggleRule,
} from "./hooks/notification.hooks";
import type { Notification } from "./api/notification.types";
import { RulesTable } from "./components/rules-table";
import { AddRuleCard } from "./components/add-rule-card";

//One honest sentence: is a failure actually going to reach this user?
function AlertStatus({ job, rules }: { job: Job; rules: Notification[] }) {
  const failureRules = rules.filter((rule) => rule.event === "failure");
  const enabledFailure = failureRules.filter((rule) => rule.enabled).length;
  const active = rules.filter((rule) => rule.enabled).length;

  if (rules.length === 0) {
    return (
      <div className="flex items-start gap-2.5 rounded-[12px] border border-warning-border bg-warning-soft px-4 py-3 text-[13px] text-[#6b4e0f]">
        <AlertTriangle size={16} className="mt-px shrink-0 text-warning" />
        <p>
          <span className="font-semibold text-warning">{job.name} has no alert rules. </span>
          Add a failure rule so an outage reaches you instead of staying in the logs.
        </p>
      </div>
    );
  }

  if (enabledFailure > 0) {
    return (
      <div className="flex items-start gap-2.5 rounded-[12px] border border-[#cdebd8] bg-success-soft px-4 py-3 text-[13px] text-success-strong">
        <CheckCircle2 size={16} className="mt-px shrink-0" />
        <p>
          <span className="font-semibold">Alerts are on: </span>
          failures on {job.name} notify{" "}
          {enabledFailure === 1 ? "one destination" : `${enabledFailure} destinations`}.
        </p>
      </div>
    );
  }

  const reason =
    active === 0
      ? rules.length === 1
        ? "Its only rule is off"
        : rules.length === 2
          ? "Both of its rules are off"
          : `All ${rules.length} of its rules are off`
      : "Other alerts are on, but there is no active failure rule";

  return (
    <div className="flex items-start gap-2.5 rounded-[12px] border border-warning-border bg-warning-soft px-4 py-3 text-[13px] text-[#6b4e0f]">
      <AlertTriangle size={16} className="mt-px shrink-0 text-warning" />
      <p>
        <span className="font-semibold text-warning">{job.name} is silent. </span>
        {reason}, so a failed run will not reach you. Turn the failure rule on first.
      </p>
    </div>
  );
}

export function NotificationsPage() {
  const jobs = useJobs({}, 1);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const rows = jobs.data?.data ?? [];
  const currentId = selectedId ?? rows[0]?.id ?? 0;
  const current = rows.find((job) => job.id === currentId);

  const rules = useJobRules(currentId);
  const toggle = useToggleRule();
  const remove = useDeleteRule();

  const list = rules.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] leading-none font-bold tracking-[-0.025em] text-ink">
            Notifications
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            Email or Slack on success or failure, set per job
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notification-job" className="text-[12px] text-muted">
            Job
          </label>
          <div className="relative">
            <select
              id="notification-job"
              value={currentId || ""}
              onChange={(e) => setSelectedId(Number(e.target.value))}
              disabled={rows.length === 0}
              className="h-9 w-[250px] cursor-pointer appearance-none rounded-[8px] border border-border bg-card pr-8 pl-3 text-[13px] text-ink outline-none disabled:cursor-default disabled:text-muted"
            >
              {rows.length === 0 && <option value="">No jobs yet</option>}
              {rows.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
            />
          </div>
        </div>
      </div>

      {!jobs.isLoading && rows.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-border bg-card p-8 text-center">
          <p className="text-[15px] font-semibold text-ink">No jobs yet</p>
          <p className="max-w-xs text-[12.5px] text-muted">
            Alert rules belong to a job, so add a cron job first.
          </p>
          <Link
            to="/jobs/new"
            className="mt-1 rounded-[10px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Add a cron job
          </Link>
        </div>
      ) : (
        <>
          {current && !rules.isLoading && <AlertStatus job={current} rules={list} />}

          <RulesTable
            jobName={current?.name ?? "…"}
            rules={list}
            loading={rules.isLoading}
            busy={toggle.isPending || remove.isPending}
            onToggle={(id) => toggle.mutate(id)}
            onDelete={(id) => remove.mutate(id)}
          />

          {remove.isError && (
            <p className="text-[12px] text-danger">
              {remove.error instanceof Error ? remove.error.message : "Could not remove the rule."}
            </p>
          )}

          {currentId > 0 && <AddRuleCard key={currentId} jobId={currentId} />}
        </>
      )}
    </div>
  );
}
