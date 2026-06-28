/**
 * rebuild-form.mjs — Reconstruye la "forma" (últimos 5 partidos) de cada equipo
 * de forma DETERMINISTA a partir de los resultados ya cargados (grupos + eliminación).
 * No usa web ni IA: cuesta ~0 créditos. Idóneo para correr seguido en la rutina.
 *
 * Cada partido jugado (con resultado) genera, para los dos equipos, una entrada:
 *   { r:"W|D|L", date, opp, score:"propios-rival", comp:"Mundial" }
 * Se ordena por fecha y se conservan los últimos 5. (En eliminación, el empate en los
 * 90' cuenta como D; el avance por penales no cambia la forma.)
 *
 * Uso:  node scripts/rebuild-form.mjs        (escribe)
 *       node scripts/rebuild-form.mjs --dry   (solo imprime)
 */
import { db } from "../src/firebase.js";
import { doc, getDoc, updateDoc, FieldPath } from "firebase/firestore";
import { ALL_MATCHES } from "../src/tournament.js";
import { buildKO, KO_DATES } from "../src/knockout.js";

const dry = process.argv.includes("--dry");
const ref = doc(db, "polla2026", "data");
const data = (await getDoc(ref)).data() || {};
const results = data.results || {};
const koResults = data.koResults || {};

// Todos los partidos con su resultado (grupos + cruces definidos)
const games = [];
ALL_MATCHES.forEach((m) => {
  const r = results[m.id];
  if (r && r.h != null && r.a != null) games.push({ date: m.date, home: m.home, away: m.away, h: +r.h, a: +r.a });
});
const { rounds, thirdPlace } = buildKO(results, koResults, data.koThirds || {});
[...rounds.flatMap((R) => R.matches), thirdPlace].forEach((m) => {
  if (!m.a || !m.b) return;
  const r = koResults[m.slot];
  if (r && r.h != null && r.a != null) games.push({ date: KO_DATES[m.slot], home: m.a, away: m.b, h: +r.h, a: +r.a });
});

const form = {};
const add = (team, date, opp, own, vs) => {
  (form[team] = form[team] || []).push({ r: own > vs ? "W" : own < vs ? "L" : "D", date, opp, score: `${own}-${vs}`, comp: "Mundial" });
};
games.forEach((g) => { add(g.home, g.date, g.away, g.h, g.a); add(g.away, g.date, g.home, g.a, g.h); });
// ordenar por fecha y dejar los últimos 5
Object.keys(form).forEach((t) => {
  form[t] = form[t].sort((x, y) => (x.date || "") < (y.date || "") ? -1 : 1).slice(-5);
});

console.log(`Equipos con forma: ${Object.keys(form).length}. Partidos procesados: ${games.length}.`);
if (dry) {
  Object.entries(form).slice(0, 6).forEach(([t, f]) => console.log(`  ${t}: ${f.map((e) => e.r).join("")}  (${f.map((e) => `${e.opp} ${e.score}`).join(", ")})`));
  process.exit(0);
}
await updateDoc(ref, new FieldPath("form"), form);
console.log("✓ Forma reconstruida en Firebase.");
process.exit(0);
