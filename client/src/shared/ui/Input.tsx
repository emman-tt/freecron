//Inputs — label, help, gentle errors (design system). The error state borrows
//the backend's Zod messages verbatim: "That doesn't look like a link. Try https://…"
import { useId } from "react";

export function Field({
  label,
  help,
  error,
  children,
}: {
  label: string;
  help?: string;
  error?: string;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-[#0a0a0a]">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="text-[11px] text-danger">{error}</p>
      ) : help ? (
        <p className="text-[11px] text-muted">{help}</p>
      ) : null}
    </div>
  );
}

export function Input({
  invalid,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      className={`rounded-field border px-3.5 py-3 text-[13px] outline-none placeholder:text-muted ${
        invalid
          ? "border-danger bg-danger-soft text-danger"
          : "border-border bg-card text-[#0a0a0a]"
      } ${className ?? ""}`}
    />
  );
}
