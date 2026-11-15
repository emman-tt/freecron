//Notifications page — every alert rule the user owns, grouped per job.
//The backend only exposes rules per job, so the hooks fan out over the
//jobs list; this page composes and shows
import { useJobs } from "../jobs/hooks/job.hooks";
import { useAllRules, useToggleRule } from "./hooks/notification.hooks";
import { RulesCard } from "./components/rules-card";

export function NotificationsPage() {
  const jobs = useJobs({}, 1);
  const toggle = useToggleRule();

  const groups = useAllRules(
    jobs.data?.data.map((j) => j.id) ?? [],
    (jobId) => jobs.data?.data.find((j) => j.id === jobId)?.name ?? `job ${jobId}`,
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[28px] font-bold text-[#0a0a0a]">Notifications</h1>
        <p className="text-[13px] text-muted">
          email / slack on start • failure • success  •  per-job rules
        </p>
      </div>

      {(groups.data ?? []).length === 0 && (
        <p className="text-[13px] text-muted">
          No jobs yet — rules are created per job on the job's edit page.
        </p>
      )}

      {(groups.data ?? []).map(
        (group) =>
          group.rules.length > 0 && (
            <RulesCard key={group.jobId} name={group.name} rules={group.rules} onToggle={toggle.mutate} />
          ),
      )}
    </div>
  );
}
