//Routes mirror the backend's lifecycle map: discover (dashboard/jobs) →
//create → inspect → edit → control → observe → alert. The auth gate checks
//the better-auth session and redirects to /sign-in when there is none
import { Navigate, Route, Routes, useLocation } from "react-router";
import { Shell } from "./shared/ui/Shell";
import { useSession } from "./features/auth/hooks/auth.hooks";
import { SignInPage } from "./features/auth/sign-in.page";
import { DashboardPage } from "./features/dashboard/dashboard.page";
import { JobsPage } from "./features/jobs/jobs.page";
import { JobFormPage } from "./features/jobs/job-form.page";
import { JobDetailPage } from "./features/jobs/job-detail.page";
import { ScheduledPage } from "./features/scheduled/scheduled.page";
import { NotificationsPage } from "./features/notifications/notifications.page";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const location = useLocation();
  if (session.isLoading) return <p className="p-6 text-[13px] text-muted">Loading…</p>;
  if (session.isError || !session.data) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/sign-in"
        element={
          <SignInPage />
        }
      />
      <Route
        element={
          <RequireAuth>
            <Shell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/new" element={<JobFormPage />} />
        <Route path="/jobs/:jobId" element={<JobDetailPage />} />
        <Route path="/jobs/:jobId/edit" element={<JobFormPage />} />
        <Route path="/scheduled" element={<ScheduledPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>
    </Routes>
  );
}
