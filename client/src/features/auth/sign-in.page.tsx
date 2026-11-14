//Sign in / sign up — one screen, two modes. Errors surface the backend's own
//words ("Invalid email or password") via the hook's ApiError unwrap
import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuthSubmit } from "./hooks/auth.hooks";
import { Button } from "../../shared/ui/Button";
import { Field, Input } from "../../shared/ui/Input";

export function SignInPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const { submit, busy, error } = useAuthSubmit(mode, () => navigate("/", { replace: true }));

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div className="flex items-center gap-2">
        <span className="h-7 w-7 rounded-full bg-primary" />
        <span className="text-[20px] font-bold">FreeCron</span>
      </div>
      <h1 className="text-[28px] font-bold">
        {mode === "sign-in" ? "Welcome back" : "Create your account"}
      </h1>
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
        className="self-start text-[13px] text-muted hover:text-[#0a0a0a]"
        onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
      >
        {mode === "sign-in" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
    </div>
  );
}
