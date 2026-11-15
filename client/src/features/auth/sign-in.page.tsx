//Sign in / sign up — split layout per the Brand & Auth board: dark brand
//panel + form card. Errors surface the backend's own words via ApiError
import { useState } from "react";
import { useNavigate } from "react-router";
import { Check } from "lucide-react";
import { useAuthSubmit } from "./hooks/auth.hooks";
import { Button } from "../../shared/ui/Button";
import { Field, Input } from "../../shared/ui/Input";

const bullets = [
  "No servers to manage — just a URL and a schedule",
  "Every run logged: timing, status, response",
  "Email and Slack alerts on failure",
];

export function SignInPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const { submit, busy, error } = useAuthSubmit(mode, () => navigate("/", { replace: true }));

  return (
    <div className="flex min-h-screen bg-bg">
      {/*brand panel*/}
      <div className="hidden w-[45%] flex-col justify-between bg-[#0a0a0a] p-16 lg:flex">
        <div className="flex items-center gap-3.5">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card">
            <img src="/logo-mark.svg" alt="" className="h-8 w-8" />
          </span>
          <span className="text-[24px] font-bold text-white">FreeCron</span>
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-[34px] font-bold leading-tight text-white">
            Cron jobs that just run.
          </h1>
          <p className="max-w-[420px] text-[15px] text-[#a3a3a3]">
            Schedule HTTP calls on a cron, watch every run, and get alerted before it matters.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {bullets.map((b) => (
            <div key={b} className="flex items-center gap-2.5">
              <Check size={16} className="shrink-0 text-[#22C55E]" />
              <span className="text-[14px] text-[#e7e5e4]">{b}</span>
            </div>
          ))}
        </div>
      </div>

      {/*form panel*/}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex w-full max-w-[440px] flex-col gap-5 rounded-[20px] bg-card p-10">
          <div className="flex items-center gap-2 lg:hidden">
            <img src="/logo-mark.svg" alt="" className="h-7 w-7" />
            <span className="text-[20px] font-bold">FreeCron</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[24px] font-bold">
              {mode === "sign-in" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-[13px] text-muted">
              {mode === "sign-in"
                ? "Sign in to your FreeCron account"
                : "Start scheduling in under a minute"}
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(new FormData(e.currentTarget));
            }}
            className="flex flex-col gap-4"
          >
            {mode === "sign-up" && (
              <Field label="Name">
                {(id) => <Input id={id} name="name" required placeholder="Ada" />}
              </Field>
            )}
            <Field label="Email">
              {(id) => (
                <Input
                  id={id}
                  name="email"
                  type="email"
                  required
                  placeholder="ada@example.com"
                />
              )}
            </Field>
            <Field
              label="Password"
              help={mode === "sign-up" ? "At least 8 characters." : undefined}
            >
              {(id) => <Input id={id} name="password" type="password" required minLength={8} />}
            </Field>
            {error && <p className="text-[11px] text-danger">{error}</p>}
            <Button disabled={busy}>
              {busy ? "One moment…" : mode === "sign-in" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <button
            className="self-center text-[13px] text-muted hover:text-[#0a0a0a]"
            onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          >
            {mode === "sign-in"
              ? "New to FreeCron? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
