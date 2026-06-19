-- HYPE ledger schema — designed deliberately for Amazon Aurora DSQL.
--   * No SERIAL/sequences  -> UUIDs minted in the application layer
--   * No foreign keys      -> referential integrity enforced by the trade
--                             transaction itself (single writer path)
--   * Composite PK on holdings -> concurrent first-buys of the same
--                             (user, asset) pair conflict on the PK and one
--                             retries into the UPDATE path (OCC-safe upsert)
--   * BIGINT micro-units   -> exact integer ledger, zero float drift
-- The same file runs on vanilla PostgreSQL; scripts/db-setup.ts rewrites
-- CREATE INDEX -> CREATE INDEX ASYNC when targeting DSQL.

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY,
  username    VARCHAR(32) NOT NULL,
  cash        BIGINT NOT NULL,
  granted     BIGINT NOT NULL,
  is_bot      BOOLEAN NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id          UUID PRIMARY KEY,
  symbol      VARCHAR(12) NOT NULL,
  name        VARCHAR(80) NOT NULL,
  category    VARCHAR(24) NOT NULL,
  emoji       VARCHAR(8)  NOT NULL,
  region      VARCHAR(40) NOT NULL,
  base_price  BIGINT NOT NULL,
  slope       BIGINT NOT NULL,
  supply      BIGINT NOT NULL,
  reserve     BIGINT NOT NULL,
  creator_user_id TEXT NULL,
  creator_handle TEXT NULL,
  origin_story TEXT NULL,
  is_sponsored BOOLEAN NULL,
  sponsor_name TEXT NULL,
  sponsor_type TEXT NULL,
  campaign_note TEXT NULL,
  created_by_listing BOOLEAN NULL,
  created_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS holdings (
  user_id     UUID NOT NULL,
  asset_id    UUID NOT NULL,
  qty         BIGINT NOT NULL,
  cost_basis  BIGINT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, asset_id)
);

CREATE TABLE IF NOT EXISTS trades (
  id          UUID PRIMARY KEY,
  user_id     UUID NOT NULL,
  asset_id    UUID NOT NULL,
  side        VARCHAR(4) NOT NULL,
  qty         BIGINT NOT NULL,
  price       BIGINT NOT NULL,
  total       BIGINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL
);

-- Access paths: asset charts (asset_id, time), user history (user_id, time),
-- symbol routing. holdings needs no extra index: the composite PK already
-- serves the only two queries (by user prefix, and by exact pair).
CREATE INDEX idx_trades_asset_time ON trades (asset_id, created_at);
CREATE INDEX idx_trades_user_time  ON trades (user_id, created_at);
CREATE INDEX idx_assets_symbol     ON assets (symbol);
