import { beforeEach, describe, expect, it, test } from "@jest/globals";
import { CronService } from "../cron.service.js";

describe("CronService", () => {
  let cronService: CronService;

  beforeEach(() => {
    cronService = new CronService();
  });

  describe("validateCron", () => {
    it("returns false for an invalid cron expression", () => {
      expect(cronService.validateCron("0 a &")).toBe(false);
    });

    it("returns true for a valid cron expression", () => {
      expect(cronService.validateCron("0 * * * *")).toBe(true);
    });
  });

  describe("findNextRun", () => {
    it("returns a Date in the future for a valid cron expression", () => {
      const nextRunAt = cronService.findNextRun("0 * * * *");
      expect(nextRunAt).toBeInstanceOf(Date);
      expect(nextRunAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("findDelayMs", () => {
    it("returns a positive delay in milliseconds", () => {
      const cronExpression = "0 17 11 9 *";
      const delay = cronService.findDelayMs(cronExpression);
      expect(delay).toBeGreaterThan(0);
    });
  });
});
