import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { withTx, type TxStats } from "./db";
import { buyCost, sellProceeds, sellFee, spotPrice } from "./curve";

export type Side = "BUY" | "SELL";

export interface TradeResult {
  tradeId: string;
  side: Side;
  qty: string;
  total: string;      // micro, signed semantics: cost for BUY, net proceeds for SELL
  fee: string;        // micro (0 for BUY)
  avgPrice: string;   // micro per share
  newPrice: string;   // micro per share after the trade
  cashAfter: string;  // micro
  retries: number;
}

export class TradeError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

interface AssetRow {
  id: string;
  base_price: string;
  slope: string;
  supply: string;
  reserve: string;
}

/**
 * The settlement transaction. Reads a consistent snapshot, computes exact
 * integer amounts, writes the new ledger state. If any other transaction
 * touched the same rows in between, Aurora DSQL aborts the commit with
 * SQLSTATE 40001 and withTx() retries from a fresh snapshot — optimistic
 * concurrency instead of locks. No double-spend is possible.
 */
export async function executeTrade(
  userId: string,
  symbol: string,
  side: Side,
  qtyNum: number,
  treasuryId: string
): Promise<TradeResult> {
  if (!Number.isInteger(qtyNum) || qtyNum < 1 || qtyNum > 100_000) {
    throw new TradeError("BAD_QTY", "Quantity must be a whole number between 1 and 100,000.");
  }
  const qty = BigInt(qtyNum);
  const stats: TxStats = { retries: 0 };

  const out = await withTx(async (c: PoolClient) => {
    const assetRes = await c.query<AssetRow>(
      "SELECT id, base_price, slope, supply, reserve FROM assets WHERE symbol = $1",
      [symbol]
    );
    if (assetRes.rowCount === 0) throw new TradeError("NO_ASSET", `Unknown symbol ${symbol}.`);
    const a = assetRes.rows[0];
    const base = BigInt(a.base_price);
    const slope = BigInt(a.slope);
    const supply = BigInt(a.supply);

    const userRes = await c.query("SELECT cash FROM users WHERE id = $1", [userId]);
    if (userRes.rowCount === 0) throw new TradeError("NO_USER", "Session user not found.");
    const cash = BigInt(userRes.rows[0].cash);

    const now = new Date();
    const tradeId = randomUUID();

    if (side === "BUY") {
      const cost = buyCost(base, slope, supply, qty);
      if (cash < cost) {
        throw new TradeError("INSUFFICIENT_FUNDS", "Not enough $H for this order.");
      }
      await c.query("UPDATE users SET cash = cash - $1 WHERE id = $2", [cost.toString(), userId]);
      await c.query(
        "UPDATE assets SET supply = supply + $1, reserve = reserve + $2 WHERE id = $3",
        [qty.toString(), cost.toString(), a.id]
      );
      const h = await c.query(
        "SELECT qty, cost_basis FROM holdings WHERE user_id = $1 AND asset_id = $2",
        [userId, a.id]
      );
      if (h.rowCount === 0) {
        await c.query(
          "INSERT INTO holdings (user_id, asset_id, qty, cost_basis, updated_at) VALUES ($1,$2,$3,$4,$5)",
          [userId, a.id, qty.toString(), cost.toString(), now]
        );
      } else {
        await c.query(
          "UPDATE holdings SET qty = qty + $1, cost_basis = cost_basis + $2, updated_at = $3 WHERE user_id = $4 AND asset_id = $5",
          [qty.toString(), cost.toString(), now, userId, a.id]
        );
      }
      await c.query(
        "INSERT INTO trades (id, user_id, asset_id, side, qty, price, total, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
        [tradeId, userId, a.id, "BUY", qty.toString(), (cost / qty).toString(), cost.toString(), now]
      );
      return {
        tradeId,
        side,
        qty: qty.toString(),
        total: cost.toString(),
        fee: "0",
        avgPrice: (cost / qty).toString(),
        newPrice: spotPrice(base, slope, supply + qty).toString(),
        cashAfter: (cash - cost).toString(),
        retries: 0,
      };
    }

    // SELL
    const h = await c.query(
      "SELECT qty, cost_basis FROM holdings WHERE user_id = $1 AND asset_id = $2",
      [userId, a.id]
    );
    const held = h.rowCount ? BigInt(h.rows[0].qty) : 0n;
    if (held < qty) {
      throw new TradeError("INSUFFICIENT_SHARES", `You hold ${held} share(s) of ${symbol}.`);
    }
    const proceeds = sellProceeds(base, slope, supply, qty);
    const fee = sellFee(proceeds);
    const net = proceeds - fee;

    // cost basis released proportionally (integer division; remainder stays
    // in the position until it closes, then releases exactly)
    const basis = BigInt(h.rows[0].cost_basis);
    const basisOut = held === qty ? basis : (basis * qty) / held;

    await c.query("UPDATE users SET cash = cash + $1 WHERE id = $2", [net.toString(), userId]);
    await c.query("UPDATE users SET cash = cash + $1 WHERE id = $2", [fee.toString(), treasuryId]);
    await c.query(
      "UPDATE assets SET supply = supply - $1, reserve = reserve - $2 WHERE id = $3",
      [qty.toString(), proceeds.toString(), a.id]
    );
    if (held === qty) {
      await c.query("DELETE FROM holdings WHERE user_id = $1 AND asset_id = $2", [userId, a.id]);
    } else {
      await c.query(
        "UPDATE holdings SET qty = qty - $1, cost_basis = cost_basis - $2, updated_at = $3 WHERE user_id = $4 AND asset_id = $5",
        [qty.toString(), basisOut.toString(), now, userId, a.id]
      );
    }
    await c.query(
      "INSERT INTO trades (id, user_id, asset_id, side, qty, price, total, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [tradeId, userId, a.id, "SELL", qty.toString(), (proceeds / qty).toString(), proceeds.toString(), now]
    );
    return {
      tradeId,
      side,
      qty: qty.toString(),
      total: net.toString(),
      fee: fee.toString(),
      avgPrice: (proceeds / qty).toString(),
      newPrice: spotPrice(base, slope, supply - qty).toString(),
      cashAfter: (cash + net).toString(),
      retries: 0,
    };
  }, stats);

  out.retries = stats.retries;
  return out;
}
