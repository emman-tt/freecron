import {
  type User as UserType,
  type Execution as ExecutionType,
  type Notification as NotificationType,
} from "../shared/types/entities.js";
import { type Job as JobType } from "../shared/types/entities.js";
import * as drizz from "drizzle-orm/pg-core";

export const timestamps = {
  updatedAt: drizz
    .timestamp()
    .$onUpdate(() => new Date())
    .notNull()
    .defaultNow(),
  createdAt: drizz.timestamp().defaultNow().notNull(),
  deletedAt: drizz.timestamp(),
};

export const User = drizz.pgTable("users", {
  id: drizz.uuid().defaultRandom().primaryKey(),
  name: drizz.text().notNull(),
  email: drizz.text().notNull().unique(),
  image: drizz.text(),
  emailVerified: drizz.boolean().notNull().default(false),
  ...timestamps,
});

export const Job = drizz.pgTable("job", {
  id: drizz.serial().primaryKey(),
  userId: drizz
    .uuid()
    .references(() => User.id, { onDelete: "cascade" })
    .notNull(),
  name: drizz.text().notNull(),
  description: drizz.varchar({ length: 300 }),
  cronExpression: drizz.text().notNull(),
  httpCommand: drizz.varchar({ length: 150 }).notNull(),
  httpMethod: drizz
    .text()
    .$type<"POST" | "PUT" | "PATCH" | "DELETE" | "GET">()
    .notNull(),
  httpHeader: drizz.jsonb().$type<Record<string, string>>().notNull(),
  httpBody: drizz.jsonb().$type<Record<string, unknown>>().notNull(),
  isActive: drizz.boolean().default(true).notNull(),
  maxRetries: drizz.integer().notNull(),
  retryDelay: drizz.integer().notNull(),
  timeout: drizz.integer().notNull(),
  nextRunAt: drizz.timestamp().notNull(),
  lastRunAt: drizz.timestamp(),
  ...timestamps,
});

export const Execution = drizz.pgTable("execution", {
  id: drizz.serial().primaryKey(),
  status: drizz
    .text()
    .$type<"success" | "failed" | "timeout" | "running">()
    .notNull(),
  startedAt: drizz.timestamp().notNull(),
  completedAt: drizz.timestamp(),
  duration: drizz.integer(),
  error: drizz.text(),
  response: drizz.jsonb().$type<Record<string, unknown>>(),
  statusCode: drizz.integer(),
  jobId: drizz
    .integer()
    .references(() => Job.id, { onDelete: "cascade" })
    .notNull(),
  ...timestamps,
});

export const Notification = drizz.pgTable("notification", {
  id: drizz.serial().primaryKey(),
  type: drizz.text().$type<"email" | "slack">().notNull(),
  event: drizz.text().$type<"start" | "failure" | "success">().notNull(),
  enabled: drizz.boolean().notNull().default(true),
  channelId: drizz.text(),
  target: drizz.varchar({ length: 150 }).notNull(),
  jobId: drizz
    .integer()
    .references(() => Job.id, { onDelete: "cascade" })
    .notNull(),
  ...timestamps,
});

// Better Auth tables (curated from CLI output — generated `user` block
// dropped: User above IS the auth user model. Old-style relations() blocks
// dropped: drizzle-orm 1.0 RC removed that API and the adapter uses no RQB.)
export const Session = drizz.pgTable(
  "session",
  {
    id: drizz.uuid().defaultRandom().primaryKey(),
    expiresAt: drizz.timestamp("expires_at").notNull(),
    token: drizz.text("token").notNull().unique(),
    createdAt: drizz.timestamp("created_at").defaultNow().notNull(),
    updatedAt: drizz
      .timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: drizz.text("ip_address"),
    userAgent: drizz.text("user_agent"),
    userId: drizz
      .uuid("user_id")
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
  },
  (table) => [drizz.index("session_userId_idx").on(table.userId)],
);

export const Account = drizz.pgTable(
  "account",
  {
    id: drizz.uuid().defaultRandom().primaryKey(),
    accountId: drizz.text("account_id").notNull(),
    providerId: drizz.text("provider_id").notNull(),
    userId: drizz
      .uuid("user_id")
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
    accessToken: drizz.text("access_token"),
    refreshToken: drizz.text("refresh_token"),
    idToken: drizz.text("id_token"),
    accessTokenExpiresAt: drizz.timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: drizz.timestamp("refresh_token_expires_at"),
    scope: drizz.text("scope"),
    password: drizz.text("password"),
    createdAt: drizz.timestamp("created_at").defaultNow().notNull(),
    updatedAt: drizz
      .timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [drizz.index("account_userId_idx").on(table.userId)],
);

export const Verification = drizz.pgTable(
  "verification",
  {
    id: drizz.uuid().defaultRandom().primaryKey(),
    identifier: drizz.text("identifier").notNull(),
    value: drizz.text("value").notNull(),
    expiresAt: drizz.timestamp("expires_at").notNull(),
    createdAt: drizz.timestamp("created_at").defaultNow().notNull(),
    updatedAt: drizz
      .timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [drizz.index("verification_identifier_idx").on(table.identifier)],
);

type InferredJob = typeof Job.$inferSelect;
type InferredUser = typeof User.$inferSelect;
type InferredExecution = typeof Execution.$inferSelect;
type InferredNotification = typeof Notification.$inferSelect;
const _userVerification = {} as InferredUser satisfies UserType;
const _jobVerification = {} as InferredJob satisfies JobType;
const _executionVerification = {} as InferredExecution satisfies ExecutionType;
const _notificationVerification =
  {} as InferredNotification satisfies NotificationType;
