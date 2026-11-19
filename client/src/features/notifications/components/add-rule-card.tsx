//Add-rule composer for one job. Client-side validation mirrors the backend's
//Zod (email vs Slack webhook URL) so a bad target fails before the request.
//"On start" is intentionally absent: the API accepts it, but no code path
//ever sends a start alert.
import { useState } from "react";
import { Plus } from "lucide-react";
import { useCreateRule } from "../hooks/notification.hooks";
import type { CreateNotificationDTO } from "../api/notification.types";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlRe = /^https?:\/\/\S+$/;

export function AddRuleCard({ jobId }: { jobId: number }) {
  const create = useCreateRule(jobId);
  const [type, setType] = useState<CreateNotificationDTO["type"]>("email");
  const [event, setEvent] = useState<CreateNotificationDTO["event"]>("failure");
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.SubmitEvent) => {
    e.preventDefault();
    const value = target.trim();
    if (type === "email" && !emailRe.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    if (type === "slack" && !urlRe.test(value)) {
      setError("Paste a Slack webhook URL starting with https://.");
      return;
    }
    setError(null);
    create.mutate(
      { type, event, target: value },
      {
        onSuccess: () => setTarget(""),
        onError: (err) =>
          setError(err instanceof Error ? err.message : "Could not add the rule."),
      },
    );
  };

  const control =
    "h-10 w-full rounded-[8px] border border-border bg-card px-3 text-[13px] text-ink outline-none transition-colors focus:border-ink";

  return (
    <section className="rounded-[16px] border border-border/80 bg-card p-5 sm:p-6">
      <h2 className="text-[18px] font-bold tracking-[-0.01em] text-ink">Add a rule</h2>

      <form onSubmit={submit} className="mt-4">
        <div className="grid gap-3 md:grid-cols-[140px_160px_minmax(0,1fr)_auto]">
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[12px] text-muted">Channel</span>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as CreateNotificationDTO["type"]);
                setError(null);
              }}
              className={`${control} cursor-pointer`}
            >
              <option value="email">Email</option>
              <option value="slack">Slack</option>
            </select>
          </label>

          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[12px] text-muted">Trigger</span>
            <select
              value={event}
              onChange={(e) => setEvent(e.target.value as CreateNotificationDTO["event"])}
              className={`${control} cursor-pointer`}
            >
              <option value="failure">On failure</option>
              <option value="success">On success</option>
            </select>
          </label>

          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[12px] text-muted">Destination</span>
            <input
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                setError(null);
              }}
              placeholder={
                type === "email" ? "you@example.com" : "https://hooks.slack.com/services/…"
              }
              className={`${control} ${error ? "border-danger-border" : ""}`}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            {/*spacer keeps the button aligned with the inputs, not the labels*/}
            <span className="hidden text-[12px] md:block">&nbsp;</span>
            <button
              type="submit"
              disabled={create.isPending || target.trim() === ""}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[8px] bg-primary px-5 text-[13px] font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Plus size={14} />
              {create.isPending ? "Adding…" : "Add rule"}
            </button>
          </div>
        </div>

        {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}

        <p className="mt-3 text-[12px] text-muted">
          Failure alerts fire only after every retry is used, so a job that runs every
          minute sends one alert per outage — not one per attempt.
        </p>
      </form>
    </section>
  );
}
