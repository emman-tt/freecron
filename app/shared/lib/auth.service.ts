import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "../../database/db.config.js";
import * as schema from "../../database/db.schema.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.User,
      session: schema.Session,
      account: schema.Account,
      verification: schema.Verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // Your Reset email logic here
    },
    revokeSessionsOnPasswordReset: true,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.CLIENT_URL],
  advanced: {
    // DB owns users.id (gen_random_uuid()), but session/account/verification
    // PKs are text with no DB default — so generate client-side UUIDs for
    // every model instead of omitting ids (generateId: false would break them).
    cookiePrefix: "freecron",
    database: { generateId: "uuid" },
  },
});
