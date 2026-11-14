//Auth hooks — the session gate used by App's routes, and the sign-in/up
//submit handler so the page stays nearly form-markup only
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => authApi.session(),
    retry: false,
  });
}

export function useAuthSubmit(mode: "sign-in" | "sign-up", onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(form: FormData) {
    const name = String(form.get("name") ?? "");
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setBusy(true);
    setError(null);
    try {
      if (mode === "sign-up") await authApi.signUp(name, email, password);
      else await authApi.signIn(email, password);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return { submit, busy, error };
}
