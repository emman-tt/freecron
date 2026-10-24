import pino from "pino";

export const reqLogger = pino({
  level: process.env.NODE_ENV === "development" ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "token",
      "apiKey",
      "creditCard",
    ],
    censor: "[REDACTED]",
  },

  base: { service: "request-journey" },
});
export const workerLogger = pino({
  level: process.env.NODE_ENV === "development" ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "token",
      "apiKey",
      "creditCard",
    ],
    censor: "[REDACTED]",
  },

  base: { service: "worker-journey" },
});
export const watchManLogger = pino({
  level: process.env.NODE_ENV === "development" ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "token",
      "apiKey",
      "creditCard",
    ],
    censor: "[REDACTED]",
  },

  base: { service: "schedule-watchman" },
});
