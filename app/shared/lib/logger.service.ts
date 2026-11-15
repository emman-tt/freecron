import pino from "pino";
import fs from "fs";
import path from "path";

const logFile = path.join(process.cwd(), "logs", "freecron.log");
const logStream = fs.createWriteStream(logFile, { flags: "a" });

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
  transport: {
    target: "pino-pretty",
    options: {
      destination: "./logs/freecron.log",
      mkdir: true,
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
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
  transport: {
    target: "pino-pretty",
    options: {
      destination: "./logs/freecron.log",
      mkdir: true,
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
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
  transport: {
    target: "pino-pretty",
    options: {
      destination: "./logs/freecron.log",
      mkdir: true,
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
  base: { service: "schedule-watchman" },
});
export const infraLogger = pino({
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
  transport: {
    target: "pino-pretty",
    options: {
      destination: "./logs/freecron.log",
      mkdir: true,
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
  base: { service: "infra-journey" },
});
