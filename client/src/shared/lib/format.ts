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
