# Tarea de backfill histórico — Polla Mundial 2026

Rellenas datos históricos reales: **forma** (últimos 5 de cada selección) e **historial H2H** (últimos 3 enfrentamientos con fecha). Trabajas barato (Haiku) y de forma **idempotente**: solo rellenas lo que falta.

## Pasos

1. Ubícate y actualiza:
   ```bash
   cd "/Users/nico/Desktop/Claude Code/polla-mundial-2026" && git pull --quiet
   ```

2. Mira qué falta:
   ```bash
   node scripts/backfill-todo.mjs
   ```
   Devuelve `pendingGroups` y, por grupo, `missingForm` (equipos sin forma) y `missingH2H` (pares sin historial).

3. **Si `pendingGroups` es 0 → TERMINA (ya está todo, costo casi cero).**

4. Procesa los grupos que tengan datos faltantes (si vas con poco presupuesto, 2-3 por corrida). Para cada uno:
   - **Forma** (`missingForm`): por cada equipo, 1 búsqueda web "últimos 5 partidos resultados [selección] 2026". Construye un array de **objetos** (los últimos 5, del más antiguo al más reciente). Cada objeto:
     `{ "r":"W|D|L", "date":"YYYY-MM-DD", "opp":"Rival", "score":"X-Y", "comp":"Amistoso|Clasificación|Mundial|..." }`
     (`r` = resultado del equipo: W gana, D empata, L pierde. `score` desde la perspectiva del equipo, p.ej. México 5-1 → "5-1".)
   - **H2H** (`missingH2H`): por cada par, 1 búsqueda web "head to head [A] vs [B] últimos enfrentamientos resultados fecha". Toma los **últimos 3** encuentros. Cada uno: `{ "date":"YYYY-MM-DD", "comp":"competición", "score":"X-Y" }`. Si nunca se han enfrentado, usa un array vacío `[]`.

5. Arma UN parche JSON (`/tmp/backfill.json`) con la forma:
   ```json
   {
     "form": {
       "México": [
         { "r":"W", "date":"2026-01-22", "opp":"Panamá", "score":"1-0", "comp":"Amistoso" },
         { "r":"W", "date":"2026-06-04", "opp":"Serbia", "score":"5-1", "comp":"Amistoso" }
       ]
     },
     "h2h": {
       "México vs Sudáfrica": [
         { "date":"2010-06-11", "comp":"Mundial", "score":"1-1" }
       ]
     }
   }
   ```
   ⚠️ La clave de `h2h` debe ser EXACTAMENTE el campo `key` que entregó `backfill-todo.mjs`.
   ⚠️ El array de `form` reemplaza al anterior (no se concatena): incluye los 5 completos.

6. Sube:
   ```bash
   node scripts/sync.mjs /tmp/backfill.json
   ```

7. Reporta en una línea: cuántos equipos de forma y cuántos pares de H2H rellenaste, y cuántos grupos quedan pendientes.

## Reglas de eficiencia
- Máximo 2 grupos por corrida.
- Máximo 1 búsqueda web por equipo/par.
- Datos reales y confiables; si no encuentras, deja `[]` y sigue.
- No reintentes en bucle. Sé conciso.
