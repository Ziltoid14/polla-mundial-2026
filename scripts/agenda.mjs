/**
 * agenda.mjs — Qué hay que hacer hoy. Lo usa la tarea diaria de Claude.
 *
 * Imprime un JSON con:
 *   - today: fecha de hoy en horario de Chile (YYYY-MM-DD)
 *   - todayMatches: partidos de HOY (para que el 🧠 Analista los prediga)
 *   - pendingResults: partidos ya jugados (fecha < hoy) que AÚN no tienen resultado
 *
 * Uso: node scripts/agenda.mjs
 */
import { db } from "../src/firebase.js";
import { doc, getDoc } from "firebase/firestore";
import { ALL_MATCHES } from "../src/tournament.js";

const chileToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());

async function main() {
  const today = chileToday();
  const snap = await getDoc(doc(db, "polla2026", "data"));
  const data = snap.exists() ? snap.data() : {};
  const results = data.results || {};
  const analyst = (data.predictions || {})["🧠 Analista"] || {};

  const hasResult = (id) => results[id] && results[id].h != null && results[id].a != null;
  const has = (m, obj) => obj[m.id] && obj[m.id].h != null && obj[m.id].a != null;

  const todayMatches = ALL_MATCHES
    .filter((m) => m.date === today)
    .map((m) => ({ id: m.id, home: m.home, away: m.away, analystDone: has(m, analyst) }));

  const pendingResults = ALL_MATCHES
    .filter((m) => m.date && m.date < today && !hasResult(m.id))
    .map((m) => ({ id: m.id, home: m.home, away: m.away, date: m.date }));

  console.log(JSON.stringify({ today, todayMatches, pendingResults }, null, 2));
  process.exit(0);
}

main().catch((e) => { console.error("✗ Error:", e.message); process.exit(1); });
