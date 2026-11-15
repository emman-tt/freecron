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
      destination: "./logs/freecron.log", // Write directly to this file
      mkdir: true, // Create the /logs folder if it doesn't exist
      colorize: true, // No color codes (since it's a file)
      translateTime: "SYS:standard", // Readable timestamp (e.g., 2026-11-15 10:30:00)
      ignore: "pid,hostname", // Hide the noisy stuff
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
      destination: "./logs/freecron.log", // Write directly to this file
      mkdir: true, // Create the /logs folder if it doesn't exist
      colorize: true, // No color codes (since it's a file)
      translateTime: "SYS:standard", // Readable timestamp (e.g., 2026-11-15 10:30:00)
      ignore: "pid,hostname", // Hide the noisy stuff
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
      destination: "./logs/freecron.log", // Write directly to this file
      mkdir: true, // Create the /logs folder if it doesn't exist
      colorize: true, // No color codes (since it's a file)
      translateTime: "SYS:standard", // Readable timestamp (e.g., 2026-11-15 10:30:00)
      ignore: "pid,hostname", // Hide the noisy stuff
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
      destination: "./logs/freecron.log", // Write directly to this file
      mkdir: true, // Create the /logs folder if it doesn't exist
      colorize: true, // No color codes (since it's a file)
      translateTime: "SYS:standard", // Readable timestamp (e.g., 2026-11-15 10:30:00)
      ignore: "pid,hostname", // Hide the noisy stuff
    },
  },
  base: { service: "infra-journey" },
});
