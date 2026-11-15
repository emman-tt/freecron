//White borderless R20 card from the design system
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`rounded-card bg-card ${className ?? ""}`}
    />
  );
}
