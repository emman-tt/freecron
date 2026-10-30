import { Registry, Counter, Gauge } from "@prometheus-io/client";

export const register = new Registry();

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
