//Toggle for pause/resume — the only Control verb (PATCH /jobs/:jobId).
//On: dark ring + green knob · Off: grey ring + grey knob
export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label ?? (on ? "Pause job" : "Resume job")}
      aria-pressed={on}
      onClick={onChange}
      className={`h-6 w-10 rounded-full border transition ${
        on ? "border-primary" : "border-border"
      } p-0.5`}
    >
      <span
        className={`block h-4 w-4 rounded-full transition ${
          on ? "translate-x-4 bg-success" : "bg-border"
        }`}
      />
    </button>
  );
}
