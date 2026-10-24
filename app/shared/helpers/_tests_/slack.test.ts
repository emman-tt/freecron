import { describe, expect, it } from "@jest/globals";
import {
  failedSlack,
  successSlack,
  type SlackBlock,
  type SlackMessage,
} from "../slack.js";
import type {
  FailedMailParams,
  SuccessMailParams,
} from "../email.js";

describe("slack messages", () => {
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

  function getBlock<T extends SlackBlock["type"]>(
    msg: SlackMessage,
    type: T,
  ): Extract<SlackBlock, { type: T }> {
    const found = msg.blocks.find((b) => b.type === type);
    expect(found).toBeDefined();
    return found as Extract<SlackBlock, { type: T }>;
  }

  function getSections(msg: SlackMessage): string[] {
    return msg.blocks
      .filter((b) => b.type === "section")
      .map((b) =>
        b.type === "section" ? (b.text?.text ?? "") : "",
      );
  }

  it("should build a success message with fallback text and report action", () => {
    const msg = successSlack(successParams);

    // Plain-text fallback carries the full outcome for notifications
    expect(msg.text).toBe("All good: Nightly Backup ran in 1.1s (200)");

    const header = getBlock(msg, "header");
    expect(header.text.text).toContain("All good: Nightly Backup");

    const [body] = getSections(msg);
    expect(body).toContain("Hi Ada");
    expect(body).toContain("*200*");
    expect(body).toContain("next run tomorrow at 02:00");

    const context = getBlock(msg, "context");
    expect(context.elements[0]?.text).toContain("*200* • 1.1s • 02:00 run");

    const actions = getBlock(msg, "actions");
    expect(actions.elements).toHaveLength(1);
    expect(actions.elements[0]).toMatchObject({
      type: "button",
      action_id: "view_report",
      url: "https://app.freecron.io/jobs/12/report",
      style: "primary",
    });
    expect(actions.elements[0]?.text.text).toBe("View report");
  });

  it("should build a failure message with error block and both actions", () => {
    const msg = failedSlack(failedParams);

    expect(msg.text).toBe(
      "Needs care: Nightly Backup failed (500) after 3 retries",
    );

    const header = getBlock(msg, "header");
    expect(header.text.text).toContain("Needs care: Nightly Backup failed");

    const [body, errorBlock] = getSections(msg);
    expect(body).toContain("Hi Ada");
    expect(body).toContain("It took 30.0s");
    expect(body).toContain("(limit 30s)");
    expect(body).toContain("*500*");
    expect(body).toContain("Already retried 3 times.");
    expect(errorBlock).toContain("ECONNABORTED");
    expect(errorBlock).toContain("https://api…/backup");
    expect(errorBlock).toContain("tomorrow at 02:00");

    const actions = getBlock(msg, "actions");
    expect(actions.elements).toHaveLength(2);
    expect(actions.elements[0]).toMatchObject({
      action_id: "view_report",
      url: "https://app.freecron.io/jobs/12/report",
    });
    expect(actions.elements[1]).toMatchObject({
      action_id: "fix_job",
      url: "https://app.freecron.io/jobs/12/edit",
    });
    expect(actions.elements[1]?.text.text).toBe("Fix job");
  });

  it("should use singular wording for a single retry", () => {
    const msg = failedSlack({ ...failedParams, retries: 1 });

    expect(msg.text).toContain("after 1 retry");
    expect(msg.text).not.toContain("retries");
    const [body] = getSections(msg);
    expect(body).toContain("Already retried 1 time.");
  });

  it("should format sub-second durations in milliseconds", () => {
    const msg = successSlack({ ...successParams, duration: 350 });

    expect(msg.text).toContain("ran in 350ms");
    const context = getBlock(msg, "context");
    expect(context.elements[0]?.text).toContain("350ms");
  });

  it("should omit actions when urls are empty", () => {
    const msg = failedSlack({
      ...failedParams,
      reportUrl: "",
      fixUrl: "",
    });

    expect(msg.blocks.some((b) => b.type === "actions")).toBe(false);
  });
});
