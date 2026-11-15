//Small formatting helpers shared across features

//Mask header values: show first 4 + last 4 when long enough to hide a secret
export function mask(value: string): string {
  return value.length > 12 ? `${value.slice(0, 4)}••••${value.slice(-4)}` : value;
}

const UNITS: Array<[number, string]> = [
  [86_400_000, "d"],
  [3_600_000, "h"],
  [60_000, "m"],
  [1000, "s"],
];

//"in 6h 12m"-style compact duration
export function formatIn(ms: number): string {
  for (const [unit, suffix] of UNITS) {
    if (ms >= unit) return `${Math.floor(ms / unit)}${suffix}`;
  }
  return "now";
}

//"02:08" clock time
export function hm(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

//"02:08 Today" / "02:08 Yday" / "02:08 15 Nov" — run-card and lifecycle wording
export function dayLabel(iso: string): string {
  const dt = new Date(iso);
  const now = new Date();
  const yday = new Date(now);
  yday.setDate(now.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(dt, now)) return "Today";
  if (same(dt, yday)) return "Yday";
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
