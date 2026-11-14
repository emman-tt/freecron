//Rules card for one job — type, event, target, and the On/Off toggle.
//Presentational: the group (job name + rules) comes in, toggle hands up
import { Card } from "../../../shared/ui/Card";
import { Toggle } from "../../../shared/ui/Toggle";
import type { Notification } from "../api/notification.types";

export function RulesCard({
  name,
  rules,
  onToggle,
}: {
  name: string;
  rules: Notification[];
  onToggle: (notificationId: number) => void;
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <p className="text-[13px] font-bold">
        Rules for {name} · {rules.length} rule{rules.length > 1 ? "s" : ""}
      </p>
      {rules.map((rule) => (
        <div
          key={rule.id}
          className="flex items-center gap-3 rounded-field border border-border p-3.5"
        >
          <span className="text-[11px] font-bold">{rule.type}</span>
          <span className="text-[12px] font-semibold">on {rule.event}</span>
          <span className="text-[12px] text-muted">{rule.target}</span>
          <div className="ml-auto">
            <Toggle
              on={rule.enabled}
              label={rule.enabled ? "Turn rule off" : "Turn rule on"}
              onChange={() => onToggle(rule.id)}
            />
          </div>
        </div>
      ))}
    </Card>
  );
}
