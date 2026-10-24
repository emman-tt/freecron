import { describe, expect, it } from "@jest/globals";
import {
  failedMail,
  successMail,
  type FailedMailParams,
  type SuccessMailParams,
} from "../email.js";

describe("email templates", () => {
  const successParams: SuccessMailParams = {
    jobName: "Nightly Backup",
    userName: "Ada",
    status: 200,
    duration: 1100,
    runAt: "02:00",
    nextRun: "tomorrow at 02:00",
    reportUrl: "https://app.freecron.io/jobs/12/report",
  };

  const failedParams: FailedMailParams = {
    jobName: "Nightly Backup",
    userName: "Ada",
    status: 500,
    duration: 30000,
    timeout: "30s",
    retries: 3,
    error: "ECONNABORTED",
    command: "https://api…/backup",
    runAt: "02:00",
    nextRun: "tomorrow at 02:00",
    reportUrl: "https://app.freecron.io/jobs/12/report",
    fixUrl: "https://app.freecron.io/jobs/12/edit",
  };

  it("should interpolate success values everywhere they appear", () => {
    const html = successMail(successParams);

    // Raw interpolation until email.ts formats duration (ms -> "1.1s", see fixture)
    expect(html).toContain("All good: Nightly Backup ran in 1100");
    expect(html).toContain("Hi Ada");
    expect(html).toContain("next run tomorrow at 02:00");
    expect(html).toContain("https://app.freecron.io/jobs/12/report");
    expect(html).not.toContain("Nightly Restore");
  });

  it("should interpolate failure values everywhere they appear", () => {
    const html = failedMail(failedParams);

    expect(html).toContain("Needs care: Nightly Backup failed");
    // Raw interpolation until email.ts formats duration (ms -> "30.0s", see fixture)
    expect(html).toContain("It took 30000 (limit");
    expect(html).toContain("30s)");
    expect(html).toContain("retried 3 times");
    expect(html).toContain("after 3 retries");
    expect(html).toContain("ECONNABORTED at https://api…/backup");
    expect(html).toContain("https://app.freecron.io/jobs/12/report");
    expect(html).toContain("https://app.freecron.io/jobs/12/edit");
  });

  it("should use singular wording for a single retry", () => {
    const html = failedMail({ ...failedParams, retries: 1 });

    expect(html).toContain("after 1 retry");
    expect(html).toContain("retried 1 time");
  });
});
