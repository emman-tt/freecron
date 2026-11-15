//Job form — one page, two designed layouts:
//  Add  (ENORC): stacked fields + save
//  Edit (P2m1Ji): back + Active pill, lifecycle bar, Run now,
//               Danger zone (Clone/Delete)
//Timeout/retries are infra rules — owned by the backend defaults, never edited here.
//Labels follow the design's hybrid style: human words + field name in parens.
//Client-side validation mirrors the backend's Zod messages so the user never
//hits a server round-trip to learn "Invalid cron format for scheduling"
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Clock } from "lucide-react";
import { useJob, useSaveJob, useRunNow, useToggleJob, useDeleteJob } from "./hooks/job.hooks";
import type { CreateJobDTO } from "./api/job.types";
import type { KV } from "./components/kv-rows";
import { KVRows } from "./components/kv-rows";
import { NotificationsSection } from "./components/notifications-section";
import { DeleteConfirm } from "./components/delete-confirm";
import { describeCron, isValidCron } from "../../shared/lib/cron";
import { Button } from "../../shared/ui/Button";
import { Field, Input } from "../../shared/ui/Input";
import type { HttpMethod } from "./api/job.types";

const httpMethods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

//"02:00 Today" / "02:00 Yday" / "02:00 15 Nov" — lifecycle bar wording
const hm = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const dayLabel = (iso: string) => {
  const dt = new Date(iso);
  const now = new Date();
  const yday = new Date(now);
  yday.setDate(now.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(dt, now)) return "Today";
  if (same(dt, yday)) return "Yday";
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export function JobFormPage() {
  const { jobId } = useParams();
  const editing = jobId !== undefined;
  const navigate = useNavigate();

  const existing = useJob(Number(jobId ?? 0));
  const save = useSaveJob(editing ? Number(jobId) : undefined);
  const clone = useSaveJob(undefined);
  const runNow = useRunNow();
  const toggleActive = useToggleJob();
  const remove = useDeleteJob();

  //Local form state; prefill from the fetched job in edit mode
  const [form, setForm] = useState({
    name: "",
    description: "",
    cronExpression: "",
    httpCommand: "",
    httpMethod: "GET" as HttpMethod,
  });
  const [headers, setHeaders] = useState<KV[]>([]);
  const [payload, setPayload] = useState<KV[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const j = existing.data;
    if (!j) return;
    setForm({
      name: j.name,
      description: j.description ?? "",
      cronExpression: j.cronExpression,
      httpCommand: j.httpCommand,
      httpMethod: j.httpMethod,
    });
    setHeaders(
      Object.entries(j.httpHeader ?? {}).map(([key, value]) => ({ key, value: String(value) })),
    );
    setPayload(
      Object.entries(j.httpBody ?? {}).map(([key, value]) => ({
        key,
        //Strings edit as-is; everything else shows its JSON form
        value: typeof value === "string" ? value : JSON.stringify(value),
      })),
    );
  }, [existing.data]);

  const buildPayload = (): CreateJobDTO => ({
    name: form.name,
    description: form.description || null,
    cronExpression: form.cronExpression,
    httpCommand: form.httpCommand,
    httpMethod: form.httpMethod,
    httpHeader: Object.fromEntries(
      headers.filter((h) => h.key).map((h) => [h.key, h.value]),
    ),
    httpBody: Object.fromEntries(
      payload.filter((p) => p.key).map((p) => [p.key, p.value]),
    ),
  });

  function submit(e: React.SubmitEvent) {
    e.preventDefault();
    //Validate with the backend's words before spending a request
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Required — min 1 char";
    if (!isValidCron(form.cronExpression))
      next.cronExpression = "Invalid cron format for scheduling";
    try {
      new URL(form.httpCommand);
    } catch {
      next.httpCommand = "That doesn't look like a link. Try https://…";
    }
    if (form.httpMethod === "GET" && payload.some((p) => p.key)) {
      next.httpBody = "Request with GET method cannot have body";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    save.mutate(buildPayload(), {
      onSuccess: (job) => navigate(`/jobs/${job.id}`),
      onError: (err) =>
        setErrors({ form: err instanceof Error ? err.message : "Save failed" }),
    });
  }

  //"Clone job" — create a duplicate from the current form values
  function onClone() {
    clone.mutate(
      { ...buildPayload(), name: `${form.name || "Job"} (copy)` },
      {
        onSuccess: (job) => navigate(`/jobs/${job.id}`),
        onError: (err) =>
          setErrors({ form: err instanceof Error ? err.message : "Clone failed" }),
      },
    );
  }

  const preview = isValidCron(form.cronExpression) ? describeCron(form.cronExpression) : null;

  if (editing && existing.isLoading) {
    return <p className="text-[13px] text-muted">Loading job…</p>;
  }

  //Shared field stack (both modes): name, description, cron, url, KV editors
  const fields = (
    <>
      <Field label="Job Name *" error={errors.name}>
        {(id) => (
          <Input
            id={id}
            value={form.name}
            invalid={!!errors.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Nightly Backup"
          />
        )}
      </Field>

      <Field label="Description" help="What does this job do? (max 300 chars)">
        {(id) => (
          <Input
            id={id}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Prod DB → s3://backups/prod, keep 14"
          />
        )}
      </Field>

      <Field label="Cron Expression *" error={errors.cronExpression}>
        {(id) => (
          <Input
            id={id}
            value={form.cronExpression}
            invalid={!!errors.cronExpression}
            onChange={(e) => setForm({ ...form, cronExpression: e.target.value })}
            placeholder="0 2 * * *  —  Every day at 02:00 AM"
          />
        )}
      </Field>

      {/*Live preview — the design's green clock box, only when cron is valid*/}
      {preview && !editing && (
        <div className="flex items-center gap-3 rounded-field bg-muted-bg p-3">
          <Clock size={16} className="text-success" />
          <span className="text-[12px]">{preview} · Valid cron</span>
        </div>
      )}

      <Field label="URL (httpCommand) *" error={errors.httpCommand}>
        {(id) => (
          <Input
            id={id}
            value={form.httpCommand}
            invalid={!!errors.httpCommand}
            onChange={(e) => setForm({ ...form, httpCommand: e.target.value })}
            placeholder="https://api.example.com/run"
          />
        )}
      </Field>
    </>
  );

  const kvEditors = (
    <>
      <Field label="Headers (httpHeader)" help="Sent with every run. Values are stored as-is.">
        {() => (
          <KVRows
            rows={headers}
            onChange={setHeaders}
            keyPlaceholder="Authorization"
            valuePlaceholder="Bearer ••••••"
          />
        )}
      </Field>

      <Field
        label="Payload (httpBody)"
        error={errors.httpBody}
        help={form.httpMethod === "GET" ? "GET requests carry no body." : undefined}
      >
        {() => (
          <KVRows
            rows={payload}
            onChange={setPayload}
            keyPlaceholder="target"
            valuePlaceholder="s3://backups/prod"
          />
        )}
      </Field>
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      {editing ? (
        <>
          {/*Edit top: back + Active pill (click = toggle pause/resume)*/}
          <div className="flex items-center gap-3">
            <div onClick={() => navigate(-1)} className="text-[13px] text-muted hover:text-[#0a0a0a]">
              ←  <span className="text-[#0a0a0a]">{existing.data?.name ?? "…"}</span>  •  #{jobId}
            </div>
            <div className="flex-1" />
            <button
              onClick={() => toggleActive.mutate(Number(jobId!))}
              className="flex items-center gap-2 rounded-full bg-muted-bg px-3.5 py-2 text-[12px] font-bold text-[#0a0a0a]"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  existing.data?.isActive ? "bg-success" : "bg-border"
                }`}
              />
              {existing.data?.isActive ? "Active" : "Paused"} ▾
            </button>
          </div>

          <h1 className="text-[28px] font-bold text-[#0a0a0a]">Edit Job</h1>

          {/*Lifecycle bar — Created needs a createdAt the API doesn't expose yet*/}
          <div className="flex items-center gap-2 rounded-[16px] bg-card p-4">
            <Step label="Created" sub="—" />
            <Step
              label="Scheduled"
              sub={existing.data ? `Next ${hm(existing.data.nextRunAt)}` : "—"}
            />
            <Step
              label="Last run"
              sub={
                existing.data?.lastRunAt
                  ? `${dayLabel(existing.data.lastRunAt)} ${hm(existing.data.lastRunAt)}`
                  : "No runs yet"
              }
            />
            <Step label="Next action" sub="Save to reschedule" />
          </div>
        </>
      ) : (
        <>
          <Link to="/jobs" className="text-[13px] text-muted hover:text-[#0a0a0a]">
            ←  Jobs
          </Link>
          <h1 className="text-[28px] font-bold text-[#0a0a0a]">Add Cron Job</h1>
        </>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3 rounded-card bg-card p-6">
        <p className="text-[12px] text-muted">
          Details  •  {editing ? `PUT /api/jobs/${jobId}` : "POST /api/jobs"}
        </p>

        {fields}

        {editing ? (
          <>
            <p className="mt-2 text-[13px] font-semibold text-[#0a0a0a]">Request Method</p>
            <select
              value={form.httpMethod}
              onChange={(e) => setForm({ ...form, httpMethod: e.target.value as HttpMethod })}
              className="w-50 rounded-field border border-border bg-card px-3 py-2.5 text-[12px] font-semibold text-[#0a0a0a] outline-none"
            >
              {httpMethods.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </>
        ) : (
          <>
            <Field label="Request Method (httpMethod)">
              {() => (
                <select
                  value={form.httpMethod}
                  onChange={(e) => setForm({ ...form, httpMethod: e.target.value as HttpMethod })}
                  className="w-50 rounded-field border border-border bg-card px-3.5 py-3 text-[13px] font-semibold text-[#0a0a0a] outline-none"
                >
                  {httpMethods.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              )}
            </Field>
            {kvEditors}
          </>
        )}

        {editing && <NotificationsSection jobId={Number(jobId!)} />}
        {!editing && (
          <p className="text-[12px] text-muted">
            Notifications become available once the job is saved.
          </p>
        )}

        {errors.form && <p className="text-[11px] text-danger">{errors.form}</p>}

        {/*Actions — edit gets the design's hint + Run now + Save changes row*/}
        <div className="mt-2 flex items-center gap-2.5">
          {editing && (
            <span className="flex-1 text-[11px] text-muted">
              Changing cron recalculates nextRunAt
            </span>
          )}
          <Link
            to={editing ? `/jobs/${jobId}` : "/jobs"}
            className="self-center rounded-control border border-border bg-card px-4.5 py-3 text-[13px] font-semibold text-[#0a0a0a] hover:bg-muted-bg"
          >
            Cancel
          </Link>
          {editing && (
            <button
              type="button"
              disabled={runNow.isPending}
              onClick={() => runNow.mutate(Number(jobId!))}
              className="rounded-control bg-[#0EA5E9] px-4.5 py-3 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              ▶  Run now
            </button>
          )}
          <Button disabled={save.isPending}>
            {save.isPending ? "Saving…" : editing ? "Save changes" : "Save Job"}
          </Button>
        </div>
      </form>

      {/*Danger zone — edit only: Clone + Delete (deletes executions too)*/}
      {editing && (
        <div className="flex items-center gap-2.5 rounded-xl bg-[#FEF2F2] p-3.5">
          <p className="flex-1 text-[12px] text-[#FF2E2E]">
            Danger zone  •  Clone job  •  Delete deletes executions + notifications
          </p>
          <button
            type="button"
            disabled={clone.isPending}
            onClick={onClone}
            className="text-[12px] font-bold text-[#FF2E2E] disabled:opacity-40"
          >
            Clone
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-[12px] font-bold text-[#FF2E2E]"
          >
            Delete
          </button>
        </div>
      )}

      {confirmDelete && (
        <DeleteConfirm
          name={form.name}
          busy={remove.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() =>
            remove.mutate(Number(jobId!), { onSuccess: () => navigate("/jobs") })
          }
        />
      )}
    </div>
  );
}

//One lifecycle-bar step: muted 11/600 label over a 12px sub line
function Step({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-[11px] font-semibold text-muted">{label}</span>
      <span className="truncate text-[12px] text-muted">{sub}</span>
    </div>
  );
}
