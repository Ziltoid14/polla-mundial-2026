# Tarea diaria — Actualización de la Polla Mundial 2026

Eres un agente económico (Haiku). Tu trabajo es rápido y barato. Sigue estos pasos **en orden** y **detente apenas no haya nada que hacer** para no gastar tokens.

## Pasos

1. Posiciónate en el repo y trae lo último:
   ```bash
   cd "/Users/nico/Desktop/Claude Code/polla-mundial-2026" && git pull --quiet
   ```

2. Mira qué hay que hacer hoy:
   ```bash
   npm run agenda
   ```
   Esto imprime un JSON con `today`, `todayMatches`, `pendingResults` y `koNeedIA`.
   Cada partido trae `ko` (true = cruce de eliminación, su id es un slot como `R32-3`; false = partido de grupo).

3. **Si `todayMatches` y `pendingResults` están vacíos y `koNeedIA` es false → TERMINA AQUÍ.** No hagas nada más (día sin actividad, costo casi cero).

3.5. **Predicciones de eliminación de las IA** — si `koNeedIA` es true, corre el script determinista (rellena al 🔮 Oráculo SOLO por fuerza y al 🧠 Analista con la forma reciente, sin que tú tengas que razonar nada):
   ```bash
   node scripts/ko-ia.mjs
   ```

4. **Resultados pendientes** (`pendingResults`): para cada partido, busca en la web el marcador final oficial del Mundial 2026. Solo si encuentras un resultado confiable, agrégalo.
   - **Grupo** (`ko:false`): `results[ID] = { "h": golesLocal, "a": golesVisitante }` (1er equipo local `h`, 2do visitante `a`).
   - **Eliminación** (`ko:true`): `koResults[ID] = { "h": ..., "a": ..., "adv": "<equipo que avanzó>" }`. `adv` SIEMPRE va: si hubo empate en los 90' lo decide el penal; si no, es el que ganó. Usa el nombre EXACTO del equipo (home o away del cruce).
   - Si no hay marcador confiable, omítelo.

5. **Predicciones de grupo del 🧠 Analista** (`todayMatches` con `ko:false` y `analystDone:false`): predice un marcador razonable analizando la forma reciente. Formato: `predictions["🧠 Analista"][ID] = { "h": n, "a": n }`. (Las de eliminación las hace `ko-ia.mjs` en el paso 3.5, no a mano.)

6. **Forma (últimos 5)** — NO la escribas a mano. Después de cargar resultados (paso 8), corre el script determinista (gratis, sin web):
   ```bash
   node scripts/rebuild-form.mjs
   ```
   Recalcula `form[*]` desde los resultados ya cargados (grupos + eliminación). No incluyas `form` en el parche del paso 7.
   (Opcional **H2H entre ellos**: si quieres, agrega el partido jugado al inicio de `h2h[clave]` —clave = los dos equipos ordenados alfabéticamente unidos por " vs "—, últimos 3: `{ "date","comp":"Mundial","score":"X-Y" }`. No es crítico.)

7. Construye UN solo parche JSON con TODO lo anterior y escríbelo a `/tmp/patch.json`:
   ```json
   {
     "results": { "A01": { "h": 2, "a": 1 } },
     "koResults": { "R32-0": { "h": 1, "a": 1, "adv": "Canadá" } },
     "predictions": { "🧠 Analista": { "A02": { "h": 1, "a": 1 } } }
   }
   ```
   (`koResults` solo si hubo cruces de eliminación jugados. NO incluyas `form` (la hace `rebuild-form.mjs`) ni las predicciones KO de las IA (las hace `ko-ia.mjs`).)

8. Súbelo a Firebase:
   ```bash
   node scripts/sync.mjs /tmp/patch.json
   ```

9. Recalcula la forma (gratis) y, si hay cruces nuevos definidos, las predicciones KO de las IA:
   ```bash
   node scripts/rebuild-form.mjs
   node scripts/ko-ia.mjs
   ```

10. Reporta en una línea: resultados, predicciones del Analista, forma e IA. Listo.

## Reglas de eficiencia
- Máximo 1 búsqueda web por partido pendiente. No investigues de más.
- No toques otros participantes ni otros campos.
- Si algo falla, reporta y termina; no reintentes en bucle.
