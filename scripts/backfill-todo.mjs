/**
 * backfill-todo.mjs — Qué datos históricos faltan (forma + H2H).
 * Lo usa la tarea de backfill para trabajar de forma idempotente.
 *
 * Imprime JSON con, por grupo: equipos sin `form` y pares sin `h2h`.
 * Uso: node scripts/backfill-todo.mjs
 */
import { db } from "../src/firebase.js";
import { doc, getDoc } from "firebase/firestore";
import { GD } from "../src/tournament.js";

const h2hKey = (a, b) => [a, b].sort((x, y) => x.localeCompare(y, "es")).join(" vs ");

async function main() {
  const snap = await getDoc(doc(db, "polla2026", "data"));
  const data = snap.exists() ? snap.data() : {};
  const form = data.form || {};
  const h2h = data.h2h || {};

  const groups = {};
  let pendingGroups = 0;
  for (const [g, teams] of Object.entries(GD)) {
    const missingForm = teams.filter((t) => !Array.isArray(form[t]) || form[t].length === 0);
    const pairs = [];
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
      const key = h2hKey(teams[i], teams[j]);
      if (!Array.isArray(h2h[key])) pairs.push({ key, a: teams[i], b: teams[j] });
    }
    if (missingForm.length || pairs.length) {
      groups[g] = { teams, missingForm, missingH2H: pairs };
      pendingGroups++;
    }
  }
  console.log(JSON.stringify({ pendingGroups, groups }, null, 2));
  process.exit(0);
}

main().catch((e) => { console.error("✗ Error:", e.message); process.exit(1); });
