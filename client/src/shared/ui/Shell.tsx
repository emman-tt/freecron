//App shell: fixed sidebar (design: 248px, logo, nav) + rounded main area on
//the bg color. Nav paths mirror the lifecycle map's stage names.
//Design nav: R14 items, 12/14 padding, icon 18; active = #F5F5F4 + 600 weight.
//Additions beyond the design: a real-data count chip on Jobs (totalJobs from
//the jobs/stats aggregate) and a session user card with sign-out pinned to
//the bottom. (Notifications chip deferred — rules need N per-job calls until
//a count endpoint exists)
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
  //session is already cached by the auth gate — no extra request
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
      <aside className="flex w-60 shrink-0 flex-col gap-8 bg-card p-5 pt-8">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-full bg-primary" />
          <span className="text-[20px] font-bold text-[#0a0a0a]">FreeCron</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1.5">
          {items.map(({ to, label, icon: Icon, ...rest }, i) => (
            <NavLink
              key={to}
              to={to}
              end={"end" in rest}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-[14px] transition-colors ${
                  isActive
                    ? "bg-muted-bg font-semibold text-[#0a0a0a]"
                    : "text-muted hover:text-[#0a0a0a]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} />
                  {label}
                  {/*count chip — real data only; Jobs carries the job total.
                  Layered: white chip on the filled active row, muted on idle*/}
                  {i === 1 &&
                    stats.data?.totalJobs !== undefined &&
                    stats.data.totalJobs > 0 && (
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold text-muted ${
                          isActive ? "bg-card" : "bg-muted-bg"
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

        {/*User card — name + email from the session, real sign out*/}
        <div className="flex items-center gap-2.5 rounded-[14px] p-2.5 transition-colors hover:bg-muted-bg/60">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-white">
            {user?.name?.[0]?.toUpperCase() ?? "—"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[#0a0a0a]">
              {user?.name ?? "—"}
            </p>
            <p className="truncate text-[11px] text-muted">{user?.email ?? ""}</p>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="rounded-lg p-2 text-muted transition-colors hover:bg-card hover:text-[#0a0a0a]"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-bg p-7">
        <Outlet />
      </main>
    </div>
  );
}
