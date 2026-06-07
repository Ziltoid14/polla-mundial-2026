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
   Esto imprime un JSON con `today`, `todayMatches` y `pendingResults`.

3. **Si `todayMatches` y `pendingResults` están ambos vacíos → TERMINA AQUÍ.** No hagas nada más (día sin actividad, costo casi cero).

4. **Resultados pendientes** (`pendingResults`): para cada partido, busca en la web el marcador final oficial del Mundial 2026. Solo si encuentras un resultado confiable, agrégalo. Formato: `results[ID] = { "h": golesLocal, "a": golesVisitante }` (el 1er equipo es local `h`, el 2do visitante `a`). Si no hay marcador confiable, omítelo.

5. **Predicciones del 🧠 Analista** (`todayMatches` con `analystDone:false`): para cada partido de HOY, predice un marcador razonable analizando la forma reciente y resultados previos del torneo. Sé conciso. Formato: `predictions["🧠 Analista"][ID] = { "h": n, "a": n }`.

6. Construye UN solo parche JSON con lo encontrado y escríbelo a un archivo, por ejemplo `/tmp/patch.json`:
   ```json
   {
     "results": { "A01": { "h": 2, "a": 1 } },
     "predictions": { "🧠 Analista": { "A02": { "h": 1, "a": 1 } } }
   }
   ```

7. Súbelo a Firebase:
   ```bash
   node scripts/sync.mjs /tmp/patch.json
   ```

8. Reporta en una línea cuántos resultados y cuántas predicciones escribiste. Listo.

## Reglas de eficiencia
- Máximo 1 búsqueda web por partido pendiente. No investigues de más.
- No toques otros participantes ni otros campos.
- Si algo falla, reporta y termina; no reintentes en bucle.
