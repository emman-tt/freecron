export interface SuccessMailParams {
  jobName: string;
  userName: string;
  status: number;
  duration: number;
  runAt: string;
  nextRun: string;
  reportUrl: string;
}

export interface FailedMailParams {
  jobName: string;
  userName: string;
  status: number;
  duration: number;
  timeout: string;
  retries: number;
  error: string;
  command: string;
  runAt: string;
  nextRun: string;
  reportUrl: string;
  fixUrl: string;
}

function calendarDate(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Renders a timestamp as friendly relative text. Past values read "5 minutes
// ago"; future values (nextRun) read "in 2 hours"/"Tomorrow" rather than
// collapsing into "just now". Non-date strings are returned untouched so
// pre-formatted fixtures keep working.
function fmt(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diff = Date.now() - then; // ms; negative means future
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;

  if (abs < minute * 2) return "just now";

  if (diff < 0) {
    if (abs < minute * 60) {
      const minutes = Math.floor(abs / minute);
      return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
    }
    if (abs < hour * 2) return "in an hour";
    if (abs < hour * 24) {
      const hours = Math.floor(abs / hour);
      return `in ${hours} hour${hours === 1 ? "" : "s"}`;
    }
    if (abs < day * 2) return "Tomorrow";
    return `on ${calendarDate(then)}`;
  }

  if (diff < minute * 60) {
    const minutes = Math.floor(diff / minute);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (diff < hour * 2) return "an hour ago";
  if (diff < hour * 24) {
    const hours = Math.floor(diff / hour);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (diff < day * 2) return "Yesterday";
  return calendarDate(then);
}

export function successMail(params: SuccessMailParams) {
  return `
    <!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>All good: ${params.jobName} ran in ${params.duration}</title>
  </head>
  <body
    style="
      margin: 0;
      padding: 0;
      background-color: #f7f7f6;
      font-family:
        Inter,
        -apple-system,
        Helvetica,
        Arial,
        sans-serif;
    "
  >
    <div style="display: none; max-height: 0; overflow: hidden">
      ${params.jobName} ${fmt(params.runAt)} run succeeded (${params.status}) in ${params.duration}.
    </div>
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f7f7f6; padding: 24px 12px"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="
              max-width: 600px;
              width: 100%;
              background: #ffffff;
              border: 1px solid #e7e5e4;
              border-radius: 16px;
            "
          >
            <tr>
              <td style="padding: 28px 28px 24px 28px">
                <p style="margin: 0 0 8px 0; font-size: 11px; color: #737373">
                  FreeCron &nbsp;•&nbsp; just now
                </p>
                <h1
                  style="
                    margin: 0 0 12px 0;
                    font-size: 20px;
                    line-height: 28px;
                    color: #0a0a0a;
                  "
                >
                  All good: ${params.jobName} ran in ${params.duration}
                </h1>
                <span
                  style="
                    display: inline-block;
                    background: #f5f5f4;
                    border: 1px solid #e7e5e4;
                    border-radius: 999px;
                    padding: 6px 12px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #0a0a0a;
                  "
                  ><span
                    style="
                      display: inline-block;
                      width: 8px;
                      height: 8px;
                      border-radius: 50%;
                      background: #16a34a;
                      margin-right: 6px;
                      vertical-align: 1px;
                    "
                  ></span
                  >Success &nbsp;•&nbsp; ${params.status} &nbsp;•&nbsp; ${fmt(params.runAt)} run</span
                >
                <p
                  style="
                    font-size: 14px;
                    line-height: 22px;
                    color: #0a0a0a;
                    margin: 16px 0;
                  "
                >
                  Hi ${params.userName}, your ${fmt(params.runAt)} run finished cleanly with a ${params.status}. No action
                  needed — next run ${fmt(params.nextRun)}.
                </p>
                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="background: #f5f5f4; border-radius: 10px"
                >
                  <tr>
                    <td
                      style="
                        padding: 12px 14px;
                        font-size: 12px;
                        font-weight: 600;
                        color: #0a0a0a;
                      "
                    >
                      ${params.status} &nbsp;•&nbsp; ${params.duration}
                    </td>
                  </tr>
                </table>
                <table
                  role="presentation"
                  cellpadding="0"
                  cellspacing="0"
                  style="margin-top: 16px"
                >
                  <tr>
                    <td style="background: #0a0a0a; border-radius: 10px">
                      <a
                        href="${params.reportUrl}"
                        style="
                          display: inline-block;
                          padding: 12px 20px;
                          color: #ffffff;
                          font-size: 13px;
                          font-weight: 700;
                          text-decoration: none;
                        "
                        >View report</a
                      >
                    </td>
                  </tr>
                </table>
                <p style="margin: 16px 0 0 0; font-size: 11px; color: #737373">
                  You get this because you asked for success alerts.
                  <a href="#" style="color: #737373">Change anytime</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>

    `;
}

export function failedMail(params: FailedMailParams) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Needs care: ${params.jobName} failed</title>
  </head>
  <body
    style="
      margin: 0;
      padding: 0;
      background-color: #f7f7f6;
      font-family:
        Inter,
        -apple-system,
        Helvetica,
        Arial,
        sans-serif;
    "
  >
    <div style="display: none; max-height: 0; overflow: hidden">
      ${params.jobName} ${fmt(params.runAt)} run failed (${params.status}) after ${params.retries} ${params.retries === 1 ? "retry" : "retries"}.
    </div>
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f7f7f6; padding: 24px 12px"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="
              max-width: 600px;
              width: 100%;
              background: #ffffff;
              border: 1px solid #e7e5e4;
              border-radius: 16px;
            "
          >
            <tr>
              <td style="padding: 28px 28px 24px 28px">
                <p style="margin: 0 0 8px 0; font-size: 11px; color: #737373">
                  FreeCron &nbsp;•&nbsp; just now
                </p>
                <h1
                  style="
                    margin: 0 0 12px 0;
                    font-size: 20px;
                    line-height: 28px;
                    color: #0a0a0a;
                  "
                >
                  Needs care: ${params.jobName} failed
                </h1>
                <span
                  style="
                    display: inline-block;
                    background: #fef2f2;
                    border: 1px solid #e7e5e4;
                    border-radius: 999px;
                    padding: 6px 12px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #dc2626;
                  "
                  ><span
                    style="
                      display: inline-block;
                      width: 8px;
                      height: 8px;
                      border-radius: 50%;
                      background: #dc2626;
                      margin-right: 6px;
                      vertical-align: 1px;
                    "
                  ></span
                  >Failed &nbsp;•&nbsp; ${params.status} &nbsp;•&nbsp; ${fmt(params.runAt)} run</span
                >
                <p
                  style="
                    font-size: 14px;
                    line-height: 22px;
                    color: #0a0a0a;
                    margin: 16px 0;
                  "
                >
                  Hi ${params.userName}, your ${fmt(params.runAt)} run didn’t finish. It took ${params.duration} (limit
                  ${params.timeout}) and returned ${params.status}. We’ve already retried ${params.retries} ${params.retries === 1 ? "time" : "times"}.
                </p>
                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="background: #fef2f2; border-radius: 10px"
                >
                  <tr>
                    <td
                      style="
                        padding: 12px 14px;
                        font-size: 12px;
                        color: #dc2626;
                        font-family: monospace;
                      "
                    >
                      ${params.error} at ${params.command} — next try
                      ${fmt(params.nextRun)}
                    </td>
                  </tr>
                </table>
                <table
                  role="presentation"
                  cellpadding="0"
                  cellspacing="0"
                  style="margin-top: 16px"
                >
                  <tr>
                    <td style="background: #0a0a0a; border-radius: 10px">
                      <a
                        href="${params.reportUrl}"
                        style="
                          display: inline-block;
                          padding: 12px 20px;
                          color: #ffffff;
                          font-size: 13px;
                          font-weight: 700;
                          text-decoration: none;
                        "
                        >View report</a
                      >
                    </td>
                    <td width="8"></td>
                    <td style="border: 1px solid #e7e5e4; border-radius: 10px">
                      <a
                        href="${params.fixUrl}"
                        style="
                          display: inline-block;
                          padding: 12px 20px;
                          color: #0a0a0a;
                          font-size: 13px;
                          text-decoration: none;
                        "
                        >Fix job</a
                      >
                    </td>
                  </tr>
                </table>
                <p style="margin: 16px 0 0 0; font-size: 11px; color: #737373">
                  You get this because you asked for failure alerts.
                  <a href="#" style="color: #737373">Mute anytime</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>

`;
}
