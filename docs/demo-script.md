# Guion del video demo — HYPE (≤ 3:00)

> Requisitos del brief cubiertos: explicar el problema, para quién es y por qué importa; mostrar la app funcionando; explicar qué base de datos AWS usa y cómo.
>
> Preparación antes de grabar:
> 1. App desplegada en Vercel apuntando a Aurora DSQL, con seed corrido.
> 2. Dos ventanas listas: navegador (pestaña `/ledger` + pestaña `/market`) y terminal con `npm run sim:pump` escrito sin ejecutar.
> 3. Opcional: `npm run sim:ambient` corriendo de fondo para que el tape se mueva solo.

---

## 0:00 – 0:25 · El problema (cámara o voz sobre el landing)

**[Pantalla: landing de HYPE, hero "Culture moves markets. Now it has one."]**

> "La cultura de internet ya se comporta como un mercado: un sonido de Medellín explota, un meme mexicano sube y se desploma, una tendencia hace ganadores y perdedores. Pero nadie puede *operar* ese mercado. HYPE es eso: una bolsa de valores global para la cultura, donde cualquier persona —sin registro— recibe 10,000 $H y empieza a tradear memes, sonidos y tendencias de Latinoamérica."

## 0:25 – 0:55 · La app funcionando (demo en vivo)

**[Pantalla: /market → click en CORRIDO → comprar 25 shares]**

> "Cada activo cotiza sobre una bonding curve transparente: comprar emite acciones y sube el precio; vender las quema y lo baja. Miren el preview: el costo que ve el usuario se calcula con la misma matemática entera del motor de liquidación — coincide al micro. Compro… y la operación queda asentada. El tape, el portafolio y el leaderboard se actualizan en vivo."

**[Mostrar 3 segundos el portfolio con la posición nueva]**

## 0:55 – 1:30 · El problema técnico real (por qué importa)

**[Pantalla: /ledger — la ecuación de Proof of Solvency en verde]**

> "Ahora lo difícil. Una bolsa para todo internet significa miles de trades concurrentes mutando las mismas filas calientes: billeteras, supplies, reservas. En la mayoría de demos, ahí se filtra dinero. HYPE lo audita en público: esta página recalcula cada 2 segundos la ecuación —la suma del cash de todos los usuarios más las reservas de todas las curvas debe ser igual a cada $H jamás emitido. Exacto. No aproximado: todo el ledger son enteros."

## 1:30 – 2:15 · El Insolvency Test (el momento WOW)

**[Pantalla dividida: /ledger a la izquierda, terminal a la derecha. Ejecutar `npm run sim:pump`]**

> "Vamos a intentar romperla. Este script dispara 200 trades concurrentes desde 24 bots contra la base de datos… Mientras corre, miren el contador de drift: cero micro-unidades. El reporte muestra decenas de conflictos de concurrencia — y ahí está la clave: cada conflicto fue detectado y reintentado, no ignorado."

**[Señalar en el terminal: "OCC conflicts retried" y "drift 0 micro · SOLVENT"]**

## 2:15 – 2:50 · La base de datos AWS (cómo y por qué)

**[Pantalla: consola AWS con el cluster de Aurora DSQL + diagrama de arquitectura]**

> "Esto es **Amazon Aurora DSQL** haciendo exactamente aquello para lo que fue construida. Cada trade es una transacción ACID con snapshot isolation fuerte: cuando dos trades chocan sobre el mismo activo, DSQL aborta uno con SQLSTATE 40001 y mi motor lo reintenta con una lectura fresca — sin locks, sin un master de escritura. Y como DSQL es activo-activo multi-región y serverless, un trader en Bogotá y uno en Tokio escriben sobre la misma base lógica, y los picos virales son el modelo de negocio, no una falla. El esquema está diseñado para DSQL: sin secuencias, sin foreign keys, llaves compuestas pensadas para el camino de reintento, e índices creados con CREATE INDEX ASYNC."

## 2:50 – 3:00 · Cierre

**[Pantalla: /ledger en verde + logo]**

> "HYPE: dinero de juguete, garantías de base de datos reales. El ledger nunca miente — porque Aurora DSQL no lo deja mentir. Gracias."

---

### Notas de grabación

- Hablar al ritmo del guion da ~2:50; ensayar una pasada con cronómetro.
- El screenshot de la consola AWS que exige el submission puede ser el mismo plano del minuto 2:15.
- Si el pump termina muy rápido en cámara, correr `npm run sim:pump -- --trades 400`.
