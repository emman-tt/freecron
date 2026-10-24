import type { FailedMailParams, SuccessMailParams } from "./email.js";

export interface SlackTextObject {
  type: "plain_text" | "mrkdwn";
  text: string;
  emoji?: boolean;
}

export interface SlackButton {
  type: "button";
  text: SlackTextObject;
  action_id: string;
  url?: string;
  value?: string;
  style?: "primary" | "danger";
}

export type SlackBlock =
  | { type: "header"; text: SlackTextObject }
  | { type: "section"; text?: SlackTextObject; fields?: SlackTextObject[] }
  | { type: "divider" }
  | { type: "context"; elements: SlackTextObject[] }
  | { type: "actions"; elements: SlackButton[] };

export interface SlackMessage {
  /** Plain-text fallback (notifications, screen readers). */
  text: string;
  blocks: SlackBlock[];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function reportActions(reportUrl: string, fixUrl?: string): SlackBlock[] {
  const buttons: SlackButton[] = [];
  if (reportUrl) {
    buttons.push({
      type: "button",
      text: { type: "plain_text", text: "View report", emoji: true },
      action_id: "view_report",
      url: reportUrl,
      style: "primary",
    });
  }
  if (fixUrl) {
    buttons.push({
      type: "button",
      text: { type: "plain_text", text: "Fix job", emoji: true },
      action_id: "fix_job",
      url: fixUrl,
    });
  }
  return buttons.length ? [{ type: "actions", elements: buttons }] : [];
}

export function successSlack(params: SuccessMailParams): SlackMessage {
  const duration = formatDuration(params.duration);
  return {
    text: `All good: ${params.jobName} ran in ${duration} (${params.status})`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `:white_check_mark: All good: ${params.jobName}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Hi ${params.userName}, your ${params.runAt} run finished 
          cleanly with a *${params.status}*. No action needed — next run ${params.nextRun}.`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*${params.status}* • ${duration} • ${params.runAt} run`,
          },
        ],
      },
      ...reportActions(params.reportUrl),
    ],
  };
}

export function failedSlack(params: FailedMailParams): SlackMessage {
  const duration = formatDuration(params.duration);
  return {
    text: `Needs care: ${params.jobName} failed (${params.status}) after ${params.retries} ${params.retries === 1 ? "retry" : "retries"}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `:rotating_light: Needs care: ${params.jobName} failed`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Hi ${params.userName}, your  ${params.runAt} run didn't finish. It took ${duration}  (limit ${params.timeout}) and returned *${params.status}*. Already retried ${params.retries} ${params.retries === 1 ? "time" : "times"}.`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `\`\`\`${params.error}\nat ${params.command} — next try ${params.nextRun}\`\`\``,
        },
      },
      ...reportActions(params.reportUrl, params.fixUrl),
    ],
  };
}
