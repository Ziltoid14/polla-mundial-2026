# Actualización MANUAL de la Polla Mundial 2026

Este flujo lo dispara Nico escribiendo la frase clave en el chat (con el modelo en **Haiku** para gastar poco):

> **Frase clave:**  `⚽ actualiza la polla`

Cuando veas esa frase, ejecuta TODO esto de corrido, sin pedir confirmación y de forma concisa:

## 1) Rellenar datos históricos faltantes (forma + H2H)
Sigue `scripts/BACKFILL.md`:
- `cd "/Users/nico/Desktop/Claude Code/polla-mundial-2026" && git pull --quiet`
- `node scripts/backfill-todo.mjs` → ve qué grupos tienen `missingForm` / `missingH2H`.
- Para cada grupo pendiente: busca en la web la **forma** (últimos 5, formato objeto `{r,date,opp,score,comp}`) de cada equipo que falte y el **H2H** (últimos 3 con fecha) de cada par que falte.
- Sube con `node scripts/sync.mjs /tmp/backfill.json`.

## 2) Actualizar resultados del torneo + Analista + histórico
Sigue `scripts/DAILY_UPDATE.md`:
- `npm run agenda` → resultados pendientes y partidos de hoy.
- Busca resultados oficiales (máx. 1 búsqueda por partido).
- Genera predicciones del 🧠 Analista para los partidos de hoy.
- Actualiza la forma y el H2H de los partidos jugados.
- Sube con `node scripts/sync.mjs /tmp/patch.json`.

## Reglas
- Modelo Haiku, conciso, sin reintentos en bucle.
- Máximo 1 búsqueda web por equipo / par / partido.
- El formato de `form` SIEMPRE es objetos `{r,date,opp,score,comp}` (necesario para el tooltip de la app).
- Datos reales; si no encuentras algo, déjalo vacío `[]` y continúa.
- Al terminar, reporta en pocas líneas qué se actualizó.
