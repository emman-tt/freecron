import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "../../database/db.config.js";
import * as schema from "../../database/db.schema.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    debugLogs: false,
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
    cookiePrefix: "freecron",
    database: { generateId: "uuid" },
    //Secure cookies are unreplayable by supertest's jar over its http
    //transport — keep them off under test
    useSecureCookies: process.env.NODE_ENV !== "test",
  },
});
