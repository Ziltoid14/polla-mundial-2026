/**
 * agenda.mjs — Qué hay que hacer hoy. Lo usa la tarea diaria de Claude.
 *
 * Imprime un JSON con:
 *   - today: fecha de hoy en horario de Chile (YYYY-MM-DD)
 *   - todayMatches: partidos de HOY (grupos + eliminación) — para que las IA los prediga
 *   - pendingResults: partidos ya jugados (fecha < hoy) que AÚN no tienen resultado
 *   - koNeedIA: hay cruces de eliminación definidos sin pronóstico de alguna IA
 *
 * La fase de eliminación: los cruces ya definidos (ambos equipos conocidos) aparecen
 * con su fecha; `ko:true` los distingue. Sus resultados van en `koResults[slot]`.
 *
 * Uso: node scripts/agenda.mjs
 */
import { db } from "../src/firebase.js";
import { doc, getDoc } from "firebase/firestore";
import { ALL_MATCHES } from "../src/tournament.js";
import { buildKO, KO_DATES } from "../src/knockout.js";

const chileToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());

async function main() {
  const today = chileToday();
  const snap = await getDoc(doc(db, "polla2026", "data"));
  const data = snap.exists() ? snap.data() : {};
  const results = data.results || {};
  const koResults = data.koResults || {};
  const analyst = (data.predictions || {})["🧠 Analista"] || {};
  const koAnalyst = (data.koPreds || {})["🧠 Analista"] || {};
  const koOracle = (data.koPreds || {})["🔮 Oráculo"] || {};

  // Cruces de eliminación ya definidos (ambos equipos conocidos)
  const { rounds, thirdPlace } = buildKO(results, koResults, data.koThirds || {});
  const koMatches = [...rounds.flatMap((R) => R.matches), thirdPlace]
    .filter((m) => m.a && m.b)
    .map((m) => ({ id: m.slot, home: m.a, away: m.b, date: KO_DATES[m.slot], ko: true }));

  const all = [...ALL_MATCHES.map((m) => ({ ...m, ko: false })), ...koMatches];
  const filled = (x) => x && x.h != null && x.a != null;
  const hasResult = (m) => filled(m.ko ? koResults[m.id] : results[m.id]);
  const analystDone = (m) => filled(m.ko ? koAnalyst[m.id] : analyst[m.id]);
  const oracleDone = (m) => (m.ko ? filled(koOracle[m.id]) : true); // el Oráculo de grupos ya está sembrado

  const todayMatches = all
    .filter((m) => m.date === today)
    .map((m) => ({ id: m.id, home: m.home, away: m.away, ko: m.ko, analystDone: analystDone(m), oracleDone: oracleDone(m) }));

  const pendingResults = all
    .filter((m) => m.date && m.date < today && !hasResult(m))
    .map((m) => ({ id: m.id, home: m.home, away: m.away, date: m.date, ko: m.ko }));

  // ¿Hay cruces KO definidos sin pronóstico de alguna IA? (entonces hay que correr ko-ia.mjs)
  const koNeedIA = koMatches.some((m) => !analystDone(m) || !filled(koOracle[m.id]));

  console.log(JSON.stringify({ today, todayMatches, pendingResults, koNeedIA }, null, 2));
  process.exit(0);
}

main().catch((e) => { console.error("✗ Error:", e.message); process.exit(1); });
