//Toggle for pause/resume — the only Control verb (PATCH /jobs/:jobId).
//Design: 32x18 track, white fill, 1.5 stroke (dark when on, #E7E5E4 when
//off), 10px knob (#16A34A when on, grey when off)
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
      className={`h-[18px] w-8 shrink-0 rounded-full border-[1.5px] bg-white p-[2px] transition-colors ${
        on ? "border-primary" : "border-border"
      }`}
    >
      <span
        className={`block h-2.5 w-2.5 rounded-full transition ${
          on ? "translate-x-[15px] bg-success" : "bg-border"
        }`}
      />
    </button>
  );
}
