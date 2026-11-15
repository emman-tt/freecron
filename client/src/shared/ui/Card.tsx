//Card = white rounded surface from the design system (R20, borderless —
//the design uses plain white cards on the #F7F7F6 canvas, no strokes)
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
