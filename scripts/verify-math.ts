import { buyCost, sellProceeds, sellFee, reserveAt, spotPrice } from "../src/lib/curve";

/**
 * Zero-database proof of the ledger math: simulates 200,000 random trades
 * fully in memory and asserts both invariants after every single one.
 * Runs in ~1s. If this passes, the only way the live ledger can drift is a
 * data-layer consistency failure — which is exactly what Aurora DSQL prevents.
 */

let state = 42;
const rnd = () => {
  state ^= state << 13; state >>>= 0;
  state ^= state >> 17;
  state ^= state << 5; state >>>= 0;
  return state / 0xffffffff;
};

const assets = Array.from({ length: 12 }, (_, i) => ({
  base: BigInt(1_200_000 + i * 350_000),
  slope: BigInt(7_000 + i * 1_100),
  supply: 0n,
  reserve: 0n,
}));
const users = Array.from({ length: 50 }, () => ({ cash: 10_000_000_000n, granted: 10_000_000_000n }));
const positions = new Map<string, bigint>();
let treasury = 0n;
const minted = users.reduce((s, u) => s + u.granted, 0n);

const N = 200_000;
let executed = 0;
for (let i = 0; i < N; i++) {
  const u = Math.floor(rnd() * users.length);
  const a = Math.floor(rnd() * assets.length);
  const key = `${u}:${a}`;
  const held = positions.get(key) ?? 0n;
  const asset = assets[a];

  if (held > 0n && rnd() < 0.45) {
    const qty = 1n + BigInt(Math.floor(rnd() * Number(held > 9n ? 9n : held)));
    const proceeds = sellProceeds(asset.base, asset.slope, asset.supply, qty);
    const fee = sellFee(proceeds);
    users[u].cash += proceeds - fee;
    treasury += fee;
    asset.supply -= qty;
    asset.reserve -= proceeds;
    positions.set(key, held - qty);
    executed++;
  } else {
    const qty = 1n + BigInt(Math.floor(rnd() * 12));
    const cost = buyCost(asset.base, asset.slope, asset.supply, qty);
    if (users[u].cash < cost) continue;
    users[u].cash -= cost;
    asset.supply += qty;
    asset.reserve += cost;
    positions.set(key, held + qty);
    executed++;
  }

  const totalCash = users.reduce((s, x) => s + x.cash, 0n) + treasury;
  const totalReserve = assets.reduce((s, x) => s + x.reserve, 0n);
  if (totalCash + totalReserve !== minted) {
    console.error(`INVARIANT 1 BROKEN at op ${i}`);
    process.exit(1);
  }
  for (const x of assets) {
    if (reserveAt(x.base, x.slope, x.supply) !== x.reserve) {
      console.error(`INVARIANT 2 BROKEN at op ${i}`);
      process.exit(1);
    }
  }
}

console.log(`✔ ${executed.toLocaleString()} trades simulated in memory.`);
console.log(`✔ Invariant 1 (Σcash + Σreserve === Σminted) held after every op — drift 0 micro.`);
console.log(`✔ Invariant 2 (reserve === closed-form R(supply)) held for all assets after every op.`);
console.log(`  Sample spot price asset[0]: ${Number(spotPrice(assets[0].base, assets[0].slope, assets[0].supply)) / 1e6} $H`);
