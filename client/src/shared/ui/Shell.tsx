//App shell: sticky sidebar + rounded main area. Count chips and the user
//card are honest-data additions beyond the design (Notifications chip waits
//for a count endpoint — rules need N per-job calls)
import { NavLink, Outlet, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CodeXml,
  LayoutDashboard,
  LogOut,
  MessageSquare,
} from "lucide-react";
import { useJobStats } from "../../features/jobs/hooks/job.hooks";
import { useSession } from "../../features/auth/hooks/auth.hooks";
import { authApi } from "../../features/auth/api/auth.api";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/jobs", label: "Jobs", icon: CodeXml },
  { to: "/scheduled", label: "Scheduled", icon: CalendarDays },
  { to: "/notifications", label: "Notifications", icon: MessageSquare },
];

export function Shell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  //session is cached by the auth gate
  const session = useSession();
  const stats = useJobStats();
  const user = session.data?.user;

  const signOut = async () => {
    await authApi.signOut();
    //clear every cached query — nothing may survive the session
    queryClient.clear();
    navigate("/sign-in");
  };

  return (
    <div className="flex min-h-screen">
      {/*sticky + h-screen: stays in view while main scrolls*/}
      <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col gap-9 bg-card px-4 pt-7 pb-5">
        <div className="flex items-center gap-2 px-2">
          <img src="/logo-mark.svg" alt="" className="h-6 w-6" />
          <span className="text-[19px] font-bold tracking-[-0.01em] text-ink">FreeCron</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {items.map(({ to, label, icon: Icon, ...rest }, i) => (
            <NavLink
              key={to}
              to={to}
              end={"end" in rest}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14.5px] transition-colors ${
                  isActive
                    ? "bg-primary font-semibold text-white"
                    : "text-[#3f3f3f] hover:bg-muted-bg"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                  {label}
                  {/*count chip: light on the black active row, soft grey idle*/}
                  {i === 1 &&
                    stats.data?.totalJobs !== undefined &&
                    stats.data.totalJobs > 0 && (
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          isActive
                            ? "bg-white/15 text-white"
                            : "bg-muted-bg text-muted group-hover:bg-card"
                        }`}
                      >
                        {stats.data.totalJobs}
                      </span>
                    )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/*name + email from the session, real sign out*/}
        <div className="flex items-center gap-2.5 rounded-[10px] p-2.5 transition-colors hover:bg-muted-bg/70">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white">
            {user?.name?.[0]?.toUpperCase() ?? "—"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink">
              {user?.name ?? "—"}
            </p>
            <p className="truncate text-[11px] text-muted">{user?.email ?? ""}</p>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-card hover:text-ink"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 bg-bg p-7">
        <Outlet />
      </main>
    </div>
  );
}
