# CLAUDE.md — HYPE · The Culture Exchange

> Contexto operativo para Claude Code. Lee este archivo completo antes de tocar nada.
> Estás retomando un proyecto que **ya funciona end-to-end y ya pasó verificación**. Tu trabajo es mejorar, no reconstruir. No rompas las invariantes.

---

## 0. Qué es esto (en 3 frases)

HYPE es una bolsa de valores para la cultura de internet (memes, sonidos, tendencias LATAM). Cada activo cotiza sobre una **bonding curve lineal entera**; comprar emite shares y sube el precio, vender las quema y lo baja. Lo construimos para el **H0 Hackathon (Vercel + AWS Databases, deadline 29 jun 2026)**, Track 3 Million-scale, con **Amazon Aurora DSQL** como protagonista y una **prueba de solvencia pública** como demo estrella.

## 1. La regla de oro: LAS INVARIANTES NO SE TOCAN

Todo el dinero son **enteros de micro-unidades** (`1 $H = 1_000_000 micro`), guardados como `BIGINT` en la DB y manejados como `BigInt` en TS. Nunca uses floats para dinero. Los floats solo existen en la capa de presentación (`microToFloat`, `src/lib/fmt.ts`).

Dos invariantes deben mantenerse **exactas** (`===`, no epsilon) en todo momento:

1. **Ledger balanceado:** `Σ user.cash + Σ asset.reserve === Σ user.granted` (no se crea ni se destruye dinero).
2. **Curva consistente:** por cada activo, `reserve === reserveAt(base, slope, supply)` (la curva nunca miente).

Antes de hacer commit de cualquier cambio que toque `curve.ts`, `engine.ts`, `db.ts`, `integrity.ts`, el schema o los scripts, corre:

```powershell
npm run verify:math    # 200k trades en memoria, asserts de ambas invariantes
npm run sim:pump       # invariantes bajo concurrencia real contra la DB
```

Si cualquiera imprime algo distinto a "drift 0 micro" / "THE LEDGER NEVER LIES", **revierte tu cambio**. Un cambio que rompe una invariante es un bug crítico, no una mejora.

## 2. Stack

- **Next.js 15.3** (App Router) · **React 19** · **TypeScript** estricto
- **Tailwind 3.4** (tema custom "amber terminal", ver §6)
- **SWR** para polling de datos en el cliente
- **node-postgres (`pg`)** como driver
- **`@aws-sdk/dsql-signer`** para auth IAM en Aurora DSQL
- **`tsx`** para correr los scripts de ops
- Deploy: **Vercel** (serverless). DB producción: **Amazon Aurora DSQL**. DB local: **PostgreSQL 16** vía `docker compose`.

Runtime de todas las API routes: `nodejs` (NO edge — usamos `pg` y `crypto`). Todas son `force-dynamic`.

## 3. Doble modo de base de datos (CRÍTICO de entender)

`src/lib/db.ts` → `getPool()` elige el modo así:

- Si **`DATABASE_URL`** está seteada → **Postgres local** (prioridad, modo dev).
- Si no, y **`DSQL_ENDPOINT`** está seteada → **Aurora DSQL** con tokens IAM firmados por conexión.
- Si ninguna → lanza error explícito.

`isDsql()` devuelve `true` solo en el segundo caso. Se usa para:
- Reescribir `CREATE INDEX` → `CREATE INDEX ASYNC` en `scripts/db-setup.ts` (DSQL construye índices secundarios async).
- Elegir el nivel de aislamiento de transacción en `withTx()` (ver abajo).

**Detalle que costó un bug real:** Postgres local corre en `READ COMMITTED` por defecto, lo que permitía *lost updates* en filas calientes y rompía la invariante 2 bajo `sim:pump`. La solución (ya aplicada) en `withTx()`:

```ts
await client.query(isDsql() ? "BEGIN" : "BEGIN ISOLATION LEVEL REPEATABLE READ");
```

Así local y DSQL se comportan idéntico: los conflictos abortan con SQLSTATE `40001` y caen en el retry path. **No quites esto.**

## 4. Mapa de archivos (qué hace cada uno)

```
src/lib/
  curve.ts       Matemática BigInt de la bonding curve. EL CORAZÓN. Tócalo con extremo cuidado.
                 spotPrice / buyCost / sellProceeds / sellFee / reserveAt / microToFloat / floatLabel
                 Constantes: MICRO=1_000_000n, SELL_FEE_BPS=100n (1% fee en ventas → treasury)
  db.ts          getPool() dual-mode, q() helper, withTx() con OCC retry (40001/40P01, max 8, backoff+jitter)
  engine.ts      executeTrade(). La transacción de liquidación. Valida, calcula, escribe las 4 tablas.
                 TradeError con códigos: BAD_QTY, NO_ASSET, NO_USER, INSUFFICIENT_FUNDS, INSUFFICIENT_SHARES
  session.ts     Cookie HMAC-SHA256 firmada (hype_session). getSessionUser / getOrCreateUser.
                 STARTING_CASH = 10,000 $H. Guests auto-creados tipo "wired_capy_1234".
  meta.ts        getTreasuryId() cacheado (busca el usuario HYPE_TREASURY)
  integrity.ts   checkIntegrity() → la Proof of Solvency. Recalcula ambas invariantes desde datos vivos.
  fmt.ts         SOLO presentación cliente: money/compact/pct/trendClass/fetcher. Nada de lógica de dinero.

src/app/api/             (todas force-dynamic, runtime nodejs)
  session/route.ts       POST → crea guest
  me/route.ts            GET (auto-create) · PATCH (rename handle, regex ^[a-zA-Z0-9_]{3,24}$)
  market/route.ts        Lista activos + spot + change24h + vol24h + sparkline + raw{base,slope,supply}
  asset/[symbol]/route.ts  Detalle + serie de precios + 24 trades recientes + posición del user
  trade/route.ts         POST → executeTrade(); mapea TradeError a 400
  portfolio/route.ts     Posiciones con valor de salida neto de fee, pnl, netWorth
  leaderboard/route.ts   Top 25 no-bots, net worth en UNA sola query SQL
  integrity/route.ts     checkIntegrity() + display en floats

src/app/                 (páginas)
  page.tsx               Landing (hero "Culture moves markets. Now it has one.")
  market/page.tsx        El board (tabla de activos con sparklines)
  asset/[symbol]/        page.tsx (server shell, await params) → AssetView.tsx (client)
  portfolio/page.tsx     Posiciones, net worth, PnL, claim handle
  leaderboard/page.tsx   Ranking
  ledger/page.tsx        ★ Proof of Solvency en vivo (refresh 2s). La pantalla estrella de la demo.
  layout.tsx             Fonts (@fontsource), Nav, Ticker, footer
  globals.css            Tema, scanlines CRT, clases .panel/.eyebrow/.btn-amber/.tnum

src/components/
  Nav.tsx                Barra superior, muestra @handle + cash (SWR /api/me, refresh 5s)
  Ticker.tsx             ★ Marquee animado (animate-tape). La firma visual. /api/market refresh 4s.
  Sparkline.tsx          SVG puro, mini gráfico de fila
  PriceChart.tsx         SVG puro con gradiente ámbar, gráfico grande del activo
  TradePanel.tsx         BUY/SELL. Preview de costo client-side con BigInt usando raw{base,slope,supply}
                         — usa la MISMA matemática de curve.ts, así el quote coincide al micro con el server
  IntegrityBadge.tsx     Badge "Proof of Solvency" en vivo

db/schema.sql            4 tablas: users, assets, holdings, trades. Diseñado PARA DSQL (ver §5).
scripts/
  db-setup.ts            Crea schema. Reescribe a INDEX ASYNC si DSQL. Salta "already exists".
  seed.ts                12 activos culturales LATAM + 72h de historia simulada con la MISMA curva.
                         Verifica la invariante ANTES de escribir. RNG determinístico (xorshift).
  simulate.ts            --mode pump (Insolvency Test) · --mode ambient (flujo suave para grabar video)
  verify-math.ts         200k trades en memoria, asserts de invariantes. Sin DB.

docs/                    architecture.md/.svg · demo-script.md (guion ≤3min) · submission.md (textos Devpost)
```

## 5. Decisiones de schema hechas A PROPÓSITO para DSQL

No las "corrijas" pensando que son omisiones — son deliberadas y los jueces (100% de AWS Databases) las notarán:

- **Sin SERIAL/sequences** → UUIDs minteados en la app (`crypto.randomUUID`). DSQL no tiene sequences.
- **Sin foreign keys** → la integridad la garantiza la transacción de liquidación (único camino de escritura). DSQL no las soporta.
- **PK compuesta en `holdings(user_id, asset_id)`** → dos primeras-compras concurrentes del mismo par chocan en la PK; una aborta al retry path y cae en el UPDATE (upsert OCC-safe sin `ON CONFLICT`).
- **Columna `granted` en users** → registra cada $H jamás minteado a esa cuenta, así "Σ minted" es un `SUM()` y la auditoría es UNA query.
- **`CREATE INDEX ASYNC`** → solo en modo DSQL, reescrito por `db-setup.ts`.

## 6. Tema visual "amber terminal" (no lo cambies sin pedirlo)

Terminal retro ámbar / fósforo CRT. Tokens en `tailwind.config.ts`:

```
ink #0B0E13 (fondo)   panel #10141C   panel2 #151A24   line #1E2532
amber #FFB300 (acento) amberdim #A87708   paper #EAE6DA (texto)   mut #8B93A3
up #2CE08B (verde)    down #FF4D6D (rojo)
```

Fuentes vía `@fontsource` (NO `next/font/google` — googleapis no estaba en el allowlist de red del build): `Unbounded` (display), `Space Grotesk` (sans), `IBM Plex Mono` (data/mono). Firma visual = el ticker tape ámbar animado + el badge "Proof of Solvency". Hay scanlines CRT sutiles vía `body::before` en globals.css. Respeta `prefers-reduced-motion`.

## 7. Comandos

```powershell
npm install
npm run dev            # http://localhost:3000
npm run build          # build de producción (debe pasar limpio)
npm run db:setup       # crea schema (local o DSQL según .env)
npm run db:seed        # 12 activos + 72h historia (WIPE + reseed)
npm run sim:pump       # Insolvency Test (200 trades concurrentes)
npm run sim:ambient    # flujo suave de fondo (para grabar la demo)
npm run verify:math    # prueba de invariantes en memoria (sin DB)
```

Variables de entorno (`.env`, ver `.env.example`):
- Local: `DATABASE_URL=postgresql://hype:hype@localhost:5432/hype` + `SESSION_SECRET`
- DSQL: `DSQL_ENDPOINT`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DSQL_USER=admin`, `SESSION_SECRET` (y comenta `DATABASE_URL`)

## 8. Estado actual (verificado)

- ✅ `npm run build` pasa limpio (8 páginas + 8 API routes).
- ✅ Insolvency Test: 200 trades concurrentes, ~240 tx/s, 55 conflictos OCC reintentados, **drift 0 micro**, ambas invariantes exactas.
- ✅ `verify:math`: 161k+ trades, ambas invariantes mantenidas tras cada op.
- ✅ Las 6 páginas responden 200; trade de guest se liquida; portfolio refleja la posición.
- ⏳ Pendiente: deploy a Aurora DSQL real + Vercel, grabar video, submission.

## 9. Reglas de trabajo para ti, Claude Code

1. **No rompas invariantes.** Cualquier cambio a dinero/curva/engine/schema exige correr `verify:math` y `sim:pump` y confirmar drift 0 antes de dar por bueno el cambio.
2. **Enteros para dinero, siempre.** Si te ves tentado a usar `number` o `parseFloat` para un monto, estás equivocándote. Usa `BigInt` y micro-unidades.
3. **Archivos completos, no fragmentos.** Cuando edites, deja el archivo funcional y verificado.
4. **No introduzcas dependencias pesadas** sin justificarlo (cada una agranda el bundle y el cold start de Vercel). El proyecto evita libs de gráficos a propósito — los charts son SVG hecho a mano.
5. **No toques el tema visual** ni los textos de marketing sin que el dueño lo pida.
6. **Respeta el doble modo de DB.** Todo lo nuevo debe funcionar en local Y en DSQL.
7. **Antes de un cambio grande, corre `npm run build`** para tener una línea base verde.

## 10. Ideas de mejora (backlog priorizado — pídele al dueño cuál atacar)

Alta prioridad (mejoran la demo o la robustez para el hackathon):
- **Tests automatizados** de `curve.ts` y `engine.ts` (Vitest): round-trips, fees, refusal de fondos/shares insuficientes, idempotencia bajo retry. Es el cinturón de seguridad de las invariantes.
- **Endpoint `/api/health`** que devuelva el modo de DB activo + latencia de un ping — útil para verificar el deploy.
- **Estados de error/empty más finos** en la UI cuando la DB no responde (hoy algunos componentes solo muestran skeletons infinitos).
- **Rate limiting** básico en `/api/trade` por sesión (evita que un bot tumbe la demo en vivo).

Media prioridad (features de producto):
- **Listing/IPO flow**: que cualquiera pueda listar una tendencia nueva (mint del activo en un activo-treasury, no rompe invariantes si se hace con cuidado).
- **WebSocket o SSE** para el tape en vez de polling SWR (mejora "million-scale" narrativa).
- **Royalties del creador** desde el treasury.
- **Market hours por región** como eventos que muevan volatilidad.

Baja prioridad (polish):
- Página `/asset` con profundidad de curva visualizada (cuánto cuesta comprar los próximos N shares).
- i18n ES/EN (el dueño y su audiencia son LATAM; los jueces son EN).
- Animación de "fill" cuando se liquida un trade.

> Cuando el dueño te diga qué atacar, propón un plan corto antes de escribir código, y al terminar corre las verificaciones de §1.

---

**Dueño:** Juan Pablo Enríquez Ortiz (@jpablortiz96) · Cali, Colombia · Windows/PowerShell · responde en español.
**Lema del proyecto:** *Play money. Real database guarantees. El ledger nunca miente.*
