//Alert-rules section of the job form — the rules for ONE job with their
//On/Off state, plus the add-rule draft row. Logic lives in the
//Notifications feature's hooks; this is composition only
import { useState } from "react";
import {
  useJobRules,
  useCreateRule,
  useToggleRule,
} from "../../notifications/hooks/notification.hooks";
import type { CreateNotificationDTO } from "../../notifications/api/notification.types";
import { Input } from "../../../shared/ui/Input";
import { Button } from "../../../shared/ui/Button";

export function NotificationsSection({ jobId }: { jobId: number }) {
  const rules = useJobRules(jobId);
  const create = useCreateRule(jobId);
  const toggle = useToggleRule();
  const [draft, setDraft] = useState<CreateNotificationDTO>({
    type: "email",
    event: "failure",
    target: "",
  });

  return (
    <section className="mt-2 flex flex-col gap-2.5">
      <p className="text-[13px] font-semibold text-[#0a0a0a]">
        Notifications  •  email / slack on start • failure • success
      </p>
      {(rules.data ?? []).map((n) => (
        <div key={n.id} className="flex items-center gap-2.5 rounded-field bg-muted-bg p-3">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${n.enabled ? "bg-success" : "bg-border"}`}
          />
          <span className="min-w-0 flex-1 truncate text-[12px] text-[#0a0a0a]">
            {n.type} • {n.event}  →  <span className="text-muted">{n.target}</span>
          </span>
          <button
            onClick={() => toggle.mutate(n.id)}
            className={`text-[11px] font-bold ${n.enabled ? "text-success" : "text-muted"}`}
          >
            {n.enabled ? "On" : "Off"}
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <select
          value={draft.type}
          onChange={(e) =>
            setDraft({ ...draft, type: e.target.value as CreateNotificationDTO["type"] })
          }
          className="rounded-field border border-border bg-card px-3 py-2.5 text-[12px] outline-none"
        >
          <option value="email">email</option>
          <option value="slack">slack</option>
        </select>
        <select
          value={draft.event}
          onChange={(e) =>
            setDraft({ ...draft, event: e.target.value as CreateNotificationDTO["event"] })
          }
          className="rounded-field border border-border bg-card px-3 py-2.5 text-[12px] outline-none"
        >
          <option value="start">on start</option>
          <option value="failure">on failure</option>
          <option value="success">on success</option>
        </select>
        <Input
          className="flex-1"
          value={draft.target}
          placeholder={draft.type === "email" ? "ops@example.com" : "https://hooks.slack.com/…"}
          onChange={(e) => setDraft({ ...draft, target: e.target.value })}
        />
        <Button
          variant="secondary"
          disabled={!draft.target || create.isPending}
          onClick={() => create.mutate(draft)}
        >
          + Add rule
        </Button>
      </div>
      {create.isError && (
        <p className="text-[11px] text-danger">
          {create.error instanceof Error ? create.error.message : "Could not add rule"}
        </p>
      )}
    </section>
  );
}
