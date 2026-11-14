//Stat card — one number with its label (design: white R18 card, muted label,
//24px bold value). Presentational
import { Card } from "../../../shared/ui/Card";

export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <span className="text-[24px] font-bold">{value}</span>
    </Card>
  );
}
