//Cron preview — mirrors the backend's CronService wording
import { CronExpressionParser } from "cron-parser";

export function describeCron(expr: string): string | null {
  try {
    const next = CronExpressionParser.parse(expr.trim()).next().toDate();
    const human = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(next);
    return `Next run: ${human}`;
  } catch {
    return null;
  }
}

export function isValidCron(expr: string): boolean {
  try {
    CronExpressionParser.parse(expr.trim());
    return true;
  } catch {
    return false;
  }
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

//Human wording for the common 5-field patterns the UI offers. Anything
//unusual falls back to the raw expression rather than guessing.
export function cronSummary(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;
  const [min, hour, dom, mon, dow] = parts;

  const every = min.match(/^\*\/(\d+)$/);
  if (every && hour === "*" && dom === "*" && mon === "*" && dow === "*") {
    return every[1] === "1" ? "Every minute" : `Every ${every[1]} minutes`;
  }
  if (min === "*" && hour === "*" && dom === "*" && mon === "*" && dow === "*") {
    return "Every minute";
  }
  if (min === "0" && hour === "*" && dom === "*" && mon === "*" && dow === "*") {
    return "Hourly";
  }

  const clock = /^\d+$/.test(min) && /^\d+$/.test(hour);
  if (clock && dom === "*" && mon === "*") {
    const time = `${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
    if (dow === "*") return `Daily at ${time}`;
    if (dow === "1-5") return `Weekdays at ${time}`;
    if (/^[0-6]$/.test(dow)) return `Every ${WEEKDAYS[Number(dow)]} at ${time}`;
  }

  if (min === "0" && hour === "0" && /^\d+$/.test(dom) && mon === "*" && dow === "*") {
    return `Monthly on the ${ordinal(Number(dom))}`;
  }

  return expr;
}
