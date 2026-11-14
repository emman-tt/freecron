//Status — always visible, always kind (design system). Green = healthy,
//grey = paused by you, red = failed. Never blame; say what to do next

//UI-level health, derived (never stored): isActive=false → paused,
//recent failures → Needs care, otherwise Running well
type Status = "healthy" | "paused" | "failing";

const tone: Record<Status, string> = {
  healthy: "text-success",
  paused: "text-muted",
  failing: "text-danger",
};

const words: Record<Status, string> = {
  healthy: "Running well",
  paused: "Paused",
  failing: "Needs care",
};

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-[12px] font-semibold">
      <span className={`h-1.5 w-1.5 rounded-full ${tone[status]}`} />
      <span className={tone[status]}>{words[status]}</span>
    </span>
  );
}
