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
