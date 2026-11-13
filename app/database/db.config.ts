import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

const client = postgres(connectionString);
const db = drizzle({ client });

export async function closeDb() {
  await client.end();
}

//Reachability probe for the startup guard: one round-trip query, rejecting
//on connection failure (ECONNREFUSED etc.) so the boot path can fail fast
export async function pingDb() {
  const rows = await client`select 1 as ping`;
  return rows.length > 0;
}

export default db;
