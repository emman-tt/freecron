//Auth API via better-auth's vanilla HTTP endpoints (same-origin cookies, no
//SDK). better-auth does NOT use the app's {status, data} envelope, so these
//calls parse the response body directly instead of going through shared/api
import { ApiError } from "../../../shared/api/http";

export interface Session {
  user: { id: string; name: string; email: string };
}

const base = "/api/auth";

async function raw(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(base + path, {
    credentials: "include",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new ApiError(res.status, json.message ?? "Request failed");
  return json;
}

export const authApi = {
  //null body when signed out
  session: async (): Promise<Session | null> => {
    const json = await raw("/get-session");
    return json?.user ? { user: json.user } : null;
  },
  signIn: (email: string, password: string) =>
    raw("/sign-in/email", { method: "POST", body: JSON.stringify({ email, password }) }),
  signUp: (name: string, email: string, password: string) =>
    raw("/sign-up/email", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  signOut: () => raw("/sign-out", { method: "POST" }),
};
