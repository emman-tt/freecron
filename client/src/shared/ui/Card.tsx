//Card = white rounded surface from the design system (R20, border #E7E5E4)
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`rounded-card border border-border bg-card ${className ?? ""}`}
    />
  );
}
