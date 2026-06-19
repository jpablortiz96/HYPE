import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { getPool, isDsql } from "../src/lib/db";

/**
 * Creates the schema. On Aurora DSQL, secondary indexes must be created
 * with CREATE INDEX ASYNC (they build in the background as an async job),
 * so this script rewrites the portable schema accordingly.
 */
async function main() {
  const raw = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
  const dsql = isDsql();
  const sql = dsql ? raw.replace(/CREATE INDEX /g, "CREATE INDEX ASYNC ") : raw;

  const statements = sql
    .replace(/^--.*$/gm, "") // strip comments BEFORE splitting — comments may contain ';'
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  const pool = getPool();
  console.log(`Target: ${dsql ? "Amazon Aurora DSQL (" + process.env.DSQL_ENDPOINT + ")" : "PostgreSQL (DATABASE_URL)"}`);
  for (const st of statements) {
    const label = st.split("\n")[0].slice(0, 72);
    try {
      await pool.query(st);
      console.log(`  ok   ${label}`);
    } catch (e: any) {
      if (/already exists/i.test(e.message)) {
        console.log(`  skip ${label} (already exists)`);
      } else {
        throw e;
      }
    }
  }
  console.log("Schema ready.");
  await pool.end();
}

main().catch((e) => {
  console.error("db:setup failed:", e.message);
  process.exit(1);
});
