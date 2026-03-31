import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const db = drizzle({
  connection: {
    url: process.env.DATABASE_URL || "file:./data/gym-ledger.db",
  },
  schema,
});

export default db;
