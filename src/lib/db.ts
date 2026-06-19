import { Pool, type PoolClient } from "pg";

/**
 * One pool, two honest modes:
 *  - DATABASE_URL          -> local PostgreSQL (development fallback)
 *  - DSQL_ENDPOINT + IAM   -> Amazon Aurora DSQL (production / judging)
 *
 * Aurora DSQL authenticates with short-lived IAM tokens instead of static
 * passwords. `pg` accepts an async function as `password`, so every new
 * physical connection mints a fresh signed token via @aws-sdk/dsql-signer.
 */

let pool: Pool | null = null;

export function isDsql(): boolean {
  return !process.env.DATABASE_URL && !!process.env.DSQL_ENDPOINT;
}

export function getPool(): Pool {
  if (pool) return pool;

  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30_000,
    });
  } else if (process.env.DSQL_ENDPOINT) {
    const hostname = process.env.DSQL_ENDPOINT;
    const region = process.env.AWS_REGION || "us-east-1";
    const user = process.env.DSQL_USER || "admin";
    pool = new Pool({
      host: hostname,
      port: 5432,
      database: "postgres",
      user,
      ssl: { rejectUnauthorized: true },
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      password: async () => {
        const { DsqlSigner } = await import("@aws-sdk/dsql-signer");
        const signer = new DsqlSigner({ hostname, region });
        return user === "admin"
          ? signer.getDbConnectAdminAuthToken()
          : signer.getDbConnectAuthToken();
      },
    });
  } else {
    throw new Error(
      "No database configured. Set DSQL_ENDPOINT (+ AWS credentials) for Aurora DSQL, or DATABASE_URL for local Postgres."
    );
  }
  return pool;
}

export async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}

/** Aurora DSQL signals an optimistic-concurrency conflict with SQLSTATE 40001. */
const RETRYABLE = new Set(["40001", "40P01"]);

export interface TxStats {
  retries: number;
}

/**
 * Run `fn` inside a transaction with OCC retry.
 * DSQL never blocks writers with locks — conflicting commits simply abort,
 * and the correct response is to retry the whole transaction. This wrapper
 * is what makes a planet-scale active-active ledger practical.
 */
export async function withTx<T>(
  fn: (client: PoolClient) => Promise<T>,
  stats?: TxStats,
  maxAttempts = 8
): Promise<T> {
  const p = getPool();
  let attempt = 0;
  for (;;) {
    const client = await p.connect();
    try {
      // Aurora DSQL always runs strong snapshot isolation (OCC). Local Postgres
      // defaults to READ COMMITTED, which would silently allow lost updates on
      // hot asset rows. REPEATABLE READ makes both targets behave identically:
      // conflicting commits abort with SQLSTATE 40001 and land in the retry path.
      await client.query(
        isDsql() ? "BEGIN" : "BEGIN ISOLATION LEVEL REPEATABLE READ"
      );
      const out = await fn(client);
      await client.query("COMMIT");
      return out;
    } catch (err: any) {
      await client.query("ROLLBACK").catch(() => {});
      attempt++;
      const retryable = RETRYABLE.has(err?.code);
      if (!retryable || attempt >= maxAttempts) throw err;
      if (stats) stats.retries++;
      const backoff = Math.min(40 * 2 ** attempt, 500) * (0.5 + Math.random());
      await new Promise((r) => setTimeout(r, backoff));
    } finally {
      client.release();
    }
  }
}
