import {
  Registry,
  Counter,
  Gauge,
  Histogram,
  collectDefaultMetrics,
} from "@prometheus-io/client";

export const register = new Registry();

collectDefaultMetrics({ register });

export const executionCounter = new Counter({
  name: "freecron_executions_total",
  help: "counter_for_total_executions",
  registers: [register],
  labelNames: ["status"] as const,
});

export const queueDepth = new Gauge({
  name: "freecron_queue_depth",
  help: "Jobs_in_queue_by_state",
  labelNames: ["queue", "state"] as const,
  registers: [register],
});


export const httpFetchDuration = new Histogram({
  name: "freecron_http_fetch_duration_seconds",
  help: "duration of the worker external HTTP fetch to job targets",
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  labelNames: ["outcome"] as const,
  registers: [register],
});

export const executionDuration = new Histogram({
  name: "freecron_execution_duration_seconds",
  help: "duration of a terminal execution inside the worker",
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  labelNames: ["status"] as const,
  registers: [register],
});
