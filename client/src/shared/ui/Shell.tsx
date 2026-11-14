//App shell: fixed sidebar (design: 248px, logo, nav, plan box) + rounded main
//area on the bg color. Nav paths mirror the lifecycle map's stage names
import { NavLink, Outlet } from "react-router";
import {
  LayoutDashboard,
  ListChecks,
  CalendarDays,
  Bell,
} from "lucide-react";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/jobs", label: "Jobs", icon: ListChecks },
  { to: "/scheduled", label: "Scheduled", icon: CalendarDays },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

export function Shell() {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col gap-8 border-r border-border bg-card p-5 pt-8">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-full bg-primary" />
          <span className="text-[20px] font-bold">FreeCron</span>
        </div>
        <nav className="flex flex-col gap-1.5">
          {items.map(({ to, label, icon: Icon, ...rest }) => (
            <NavLink
              key={to}
              to={to}
              end={"end" in rest}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-[14px] ${
                  isActive
                    ? "bg-muted-bg font-semibold text-[#0a0a0a]"
                    : "text-muted hover:text-[#0a0a0a]"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 bg-bg p-7">
        <Outlet />
      </main>
    </div>
  );
}
