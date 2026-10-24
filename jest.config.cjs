module.exports = {
  ...require("ts-jest/presets/default-esm/jest-preset"),
  testEnvironment: "node",
  roots: ["<rootDir>/app"],
  setupFilesAfterEnv: ["./jest.setup.ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  // Suites share one Postgres DB and one Redis DB, and each one TRUNCATEs and
  // flushes them in beforeEach. Running files in parallel makes them destroy
  // each other's fixtures (deadlocks, FK violations, missing BullMQ keys), so
  // serial execution is a correctness requirement, not a speed tweak.
  maxWorkers: 1,
};
