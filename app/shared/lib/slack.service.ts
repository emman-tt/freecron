import { WebClient } from "@slack/web-api";

const token = process.env.SLACK_TOKEN;

export const slack = new WebClient(token);

async function runAuth() {
  await slack.auth.test();

  console.log("Done!");
}

process.env.NODE_ENV === "test" ? null : runAuth();
