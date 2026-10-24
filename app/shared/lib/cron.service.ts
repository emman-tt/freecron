import { CronExpressionParser } from "cron-parser";

export class CronService {
  findNextRun(cron: string) {
    const interval = CronExpressionParser.parse(cron);
    const nextRunAt = interval.next().toDate();
    return nextRunAt;
  }

  findDelayMs(cron: string) {
    const interval = CronExpressionParser.parse(cron);
    const delay = interval.next().toDate().getTime() - Date.now();
    return delay;
  }

  validateCron(cron: string) {
    try {
      CronExpressionParser.parse(cron);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const cronManager = new CronService();
