//Buttons — one primary per view; destructive is red and separate (design system)
//primary: dark pill · secondary: white with border · danger: red
type Variant = "primary" | "secondary" | "danger";

const classes: Record<Variant, string> = {
  primary: "bg-primary text-white hover:opacity-90",
  secondary: "bg-card border border-border text-[#0a0a0a] hover:bg-muted-bg",
  danger: "bg-danger text-white hover:opacity-90",
};

export function btnClass(variant: Variant = "primary", className = "") {
  return `inline-flex items-center gap-2 rounded-control px-5 py-3 text-[13px] font-semibold transition ${classes[variant]} ${className}`;
}

export function Button({
  variant,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...props} className={btnClass(variant, className ?? "")} />;
}
