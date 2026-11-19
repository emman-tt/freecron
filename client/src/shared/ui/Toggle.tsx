//Pause/resume toggle — green track when on, grey when off, white knob
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
      className={`h-5 w-9 shrink-0 rounded-full p-[3px] transition-colors ${
        on ? "bg-live" : "bg-border"
      }`}
    >
      <span
        className={`block h-3.5 w-3.5 rounded-full bg-white shadow-[0_1px_2px_rgba(10,10,10,0.18)] transition-transform ${
          on ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
