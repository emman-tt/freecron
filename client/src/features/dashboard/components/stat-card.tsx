//Stat card — design: borderless white R18 card, p-16 / gap-6; muted 12/500
//label, 24/700 value, and a tiny 12px "Stat Sub" info line under the value
//("+2 this week", "75% healthy", …). Presentational
export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[18px] bg-card p-4">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <span className="text-[24px] font-bold text-[#0a0a0a]">{value}</span>
      {sub != null && <span className="text-[12px] text-muted">{sub}</span>}
    </div>
  );
}
