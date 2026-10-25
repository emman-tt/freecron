import { WebClient } from "@slack/web-api";
import { workerLogger as logger } from "./logger.service.js";

const token = process.env.SLACK_TOKEN;

export const slack = new WebClient(token);

async function runAuth() {
  await slack.auth.test();

  logger.info(
    {
      filename: "slack.service.ts",
      functionname: "runAuth",
    },
    "slack auth verified",
  );
}

process.env.NODE_ENV === "test" ? null : runAuth();
