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
      ${params.jobName} ${params.runAt} run succeeded (${params.status}) in ${params.duration}.
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
                  >Success &nbsp;•&nbsp; ${params.status} &nbsp;•&nbsp; ${params.runAt} run</span
                >
                <p
                  style="
                    font-size: 14px;
                    line-height: 22px;
                    color: #0a0a0a;
                    margin: 16px 0;
                  "
                >
                  Hi ${params.userName}, your ${params.runAt} run finished cleanly with a ${params.status}. No action
                  needed — next run ${params.nextRun}.
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
      ${params.jobName} ${params.runAt} run failed (${params.status}) after ${params.retries} ${params.retries === 1 ? "retry" : "retries"}.
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
                  >Failed &nbsp;•&nbsp; ${params.status} &nbsp;•&nbsp; ${params.runAt} run</span
                >
                <p
                  style="
                    font-size: 14px;
                    line-height: 22px;
                    color: #0a0a0a;
                    margin: 16px 0;
                  "
                >
                  Hi ${params.userName}, your ${params.runAt} run didn’t finish. It took ${params.duration} (limit
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
                      ${params.nextRun}
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
