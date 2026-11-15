import { WebClient } from "@slack/web-api";
import { workerLogger as logger } from "./logger.service.js";

const token = process.env.SLACK_TOKEN;

export const slack = new WebClient(token);

async function runAuth() {
  try {
    await slack.auth.test();

    logger.info(
      {
        filename: "slack.service.ts",
        functionname: "runAuth",
      },
      "slack auth verified",
    );
  } catch (error) {
    logger.warn(
      {
        filename: "slack.service.ts",
        functionname: "runAuth",
        error: error instanceof Error ? error.message : String(error),
      },
      "slack auth test failed",
    );
  }
}

if (process.env.NODE_ENV !== "test") {
  runAuth().catch((error) => {
    logger.warn(
      {
        filename: "slack.service.ts",
        functionname: "runAuth",
        error: error instanceof Error ? error.message : String(error),
      },
      "slack auth test failed  invalid token",
    );
  });
}
