//Rules table for one job — channel, trigger, destination, status, on/off,
//and a remove action. Presentational: the page owns the hooks.
import { Trash2 } from "lucide-react";
import type { Notification } from "../api/notification.types";
import { Toggle } from "../../../shared/ui/Toggle";

const triggerLabel: Record<Notification["event"], string> = {
  start: "On start",
  failure: "On failure",
  success: "On success",
};

export function RulesTable({
  jobName,
  rules,
  loading,
  busy,
  onToggle,
  onDelete,
}: {
  jobName: string;
  rules: Notification[];
  loading: boolean;
  busy: boolean;
  onToggle: (notificationId: number) => void;
  onDelete: (notificationId: number) => void;
}) {
  const active = rules.filter((rule) => rule.enabled).length;

  return (
    <section className="rounded-[16px] border border-border/80 bg-card p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[18px] font-bold tracking-[-0.01em] text-ink">
          Rules for {jobName}
          <span className="font-medium text-muted">
            {" "}
            · {rules.length} {rules.length === 1 ? "rule" : "rules"}
          </span>
        </h2>
        <span className="text-[13px] text-muted">{active} active</span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left">
          <thead>
            <tr className="text-[12px] font-medium text-muted">
              <th className="w-[160px] pb-2.5 font-medium">Channel</th>
              <th className="w-[190px] pb-2.5 font-medium">Trigger</th>
              <th className="pb-2.5 font-medium">Destination</th>
              <th className="w-[90px] pb-2.5 font-medium">Status</th>
              <th className="w-[80px] pb-2.5 font-medium">On</th>
              <th className="w-[120px] pb-2.5" />
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 2 }).map((_, i) => (
                <tr key={i} className="border-t border-border/80">
                  <td className="py-4">
                    <span className="block h-3.5 w-16 animate-pulse rounded bg-border/70" />
                  </td>
                  <td className="py-4">
                    <span className="block h-3.5 w-20 animate-pulse rounded bg-border/60" />
                  </td>
                  <td className="py-4">
                    <span className="block h-3.5 w-48 animate-pulse rounded bg-border/60" />
                  </td>
                  <td className="py-4">
                    <span className="block h-5 w-9 animate-pulse rounded bg-border/60" />
                  </td>
                  <td className="py-4" />
                  <td className="py-4" />
                </tr>
              ))}

            {!loading &&
              rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-t border-border/80 transition-colors hover:bg-muted-bg/40"
                >
                  <td className="py-4 text-[14px] font-semibold text-ink capitalize">
                    {rule.type}
                  </td>
                  <td className="py-4 text-[13.5px] text-ink">
                    {triggerLabel[rule.event]}
                  </td>
                  <td className="max-w-0 truncate py-4 pr-4 text-[13.5px] text-ink">
                    <span title={rule.target}>{rule.target}</span>
                  </td>
                  <td className="py-4">
                    <span
                      className={`inline-flex rounded-[7px] px-2.5 py-1 text-[11.5px] font-semibold ${
                        rule.enabled
                          ? "bg-success-soft text-success-strong"
                          : "bg-muted-bg text-muted"
                      }`}
                    >
                      {rule.enabled ? "On" : "Off"}
                    </span>
                  </td>
                  <td className="py-4">
                    <Toggle
                      on={rule.enabled}
                      label={rule.enabled ? "Turn rule off" : "Turn rule on"}
                      onChange={() => onToggle(rule.id)}
                    />
                  </td>
                  <td className="py-4 text-right">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onDelete(rule.id)}
                      title="Remove this rule"
                      className="inline-flex items-center gap-1.5 rounded-[8px] border border-border bg-card px-3 py-2 text-[12px] font-semibold text-muted transition-colors hover:border-danger-border hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  </td>
                </tr>
              ))}

            {!loading && rules.length === 0 && (
              <tr className="border-t border-border/80">
                <td colSpan={6} className="py-8 text-center text-[13px] text-muted">
                  No rules yet — add your first one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
