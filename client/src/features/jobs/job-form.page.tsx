//Job form — one page for create (POST /api/jobs) and edit (PUT /api/jobs/:jobId).
//Labels follow the design's hybrid style: human words + field name in parens.
//Client-side validation mirrors the backend's Zod messages so the user never
//hits a server round-trip to learn "Invalid cron format for scheduling"
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Clock } from "lucide-react";
import { useJob, useSaveJob } from "./hooks/job.hooks";
import type { KV } from "./components/kv-rows";
import { KVRows } from "./components/kv-rows";
import { NotificationsSection } from "./components/notifications-section";
import { describeCron, isValidCron } from "../../shared/lib/cron";
import { Button } from "../../shared/ui/Button";
import { Field, Input } from "../../shared/ui/Input";
import type { HttpMethod } from "./api/job.types";

const httpMethods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function JobFormPage() {
  const { jobId } = useParams();
  const editing = jobId !== undefined;
  const navigate = useNavigate();

  const existing = useJob(Number(jobId ?? 0), editing);
  const save = useSaveJob(editing ? Number(jobId) : undefined);

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

  function submit(e: React.FormEvent) {
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

    save.mutate(
      {
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
      },
      {
        onSuccess: (job) => navigate(`/jobs/${job.id}`),
        onError: (err) =>
          setErrors({ form: err instanceof Error ? err.message : "Save failed" }),
      },
    );
  }

  const preview = isValidCron(form.cronExpression) ? describeCron(form.cronExpression) : null;

  if (editing && existing.isLoading) {
    return <p className="text-[13px] text-muted">Loading job…</p>;
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        to={editing ? `/jobs/${jobId}` : "/jobs"}
        className="text-[14px] text-muted hover:text-[#0a0a0a]"
      >
        ← Back
      </Link>
      <h1 className="mt-3 text-[28px] font-bold">{editing ? "Edit Job" : "Add Cron Job"}</h1>

      <form
        onSubmit={submit}
        className="mt-4 flex flex-col gap-4 rounded-card border border-border bg-card p-7"
      >
        <p className="text-[13px] text-muted">Details</p>

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
        {preview && (
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

        <Field label="Request Method (httpMethod)">
          {() => (
            <select
              value={form.httpMethod}
              onChange={(e) => setForm({ ...form, httpMethod: e.target.value as HttpMethod })}
              className="rounded-field border border-border bg-card px-3.5 py-3 text-[13px] font-semibold outline-none"
            >
              {httpMethods.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          )}
        </Field>

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

        {errors.form && <p className="text-[11px] text-danger">{errors.form}</p>}

        <div className="mt-2 flex items-center gap-3">
          <Button disabled={save.isPending}>
            {save.isPending ? "Saving…" : editing ? "Save changes" : "Save Job"}
          </Button>
          <Link
            to={editing ? `/jobs/${jobId}` : "/jobs"}
            className="self-center rounded-control border border-border bg-card px-5 py-3 text-[13px] font-semibold hover:bg-muted-bg"
          >
            Cancel
          </Link>
        </div>
      </form>

      {editing && <NotificationsSection jobId={Number(jobId!)} />}
    </div>
  );
}
