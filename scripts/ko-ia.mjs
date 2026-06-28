/**
 * ko-ia.mjs — Genera las predicciones de eliminación de las dos IA, para todos los
 * cruces YA definidos (ambos equipos conocidos) que aún no tengan pronóstico.
 *
 *  🔮 Oráculo  → predice "como si el Mundial nunca hubiera pasado": SOLO fuerza base
 *                (TEAM_STRENGTH). No sabe cómo les ha ido en las últimas semanas.
 *  🧠 Analista → sí mira la forma reciente (data.form): ajusta la fuerza con los
 *                últimos resultados de cada equipo.
 *
 * Es idempotente: solo rellena los cruces que le falten a cada IA (no pisa nada).
 * Uso:  node scripts/ko-ia.mjs            (escribe a Firebase)
 *       node scripts/ko-ia.mjs --dry      (solo imprime lo que haría)
 */
import { db } from "../src/firebase.js";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { strengthOf } from "../src/tournament.js";
import { buildKO } from "../src/knockout.js";

const ORACLE = "🔮 Oráculo";
const ANALYST = "🧠 Analista";

// Marcador determinista a partir de una función de fuerza (igual lógica que el Oráculo de grupos)
function predScore(home, away, salt, strengthFn) {
  const diff = strengthFn(home) - strengthFn(away);
  const ad = Math.abs(diff);
  const h = [...salt].reduce((x, c) => (x * 31 + c.charCodeAt(0)) % 997, 7) % 5;
  let strong, weak;
  if (ad <= 4) { strong = 1; weak = 1; }
  else if (ad <= 10) { strong = 2; weak = 1; }
  else if (ad <= 18) { strong = 2; weak = 0; }
  else { strong = 3; weak = 0; }
  if (h === 0) strong += 1;
  if (h === 3 && weak < strong) weak += 1;
  const pred = diff >= 0 ? { h: strong, a: weak } : { h: weak, a: strong };
  // En eliminación no hay empates: si predice empate, pasa por penales el más fuerte
  if (pred.h === pred.a) pred.adv = strengthFn(home) >= strengthFn(away) ? home : away;
  return pred;
}

// Bono de forma reciente (últimos 5): cada W +2.5, D 0, L -2.5
const formDelta = (team, form) => {
  const f = (form || {})[team];
  if (!Array.isArray(f)) return 0;
  return f.slice(-5).reduce((s, e) => {
    const r = typeof e === "string" ? e : (e && e.r);
    return s + (r === "W" ? 2.5 : r === "L" ? -2.5 : 0);
  }, 0);
};

async function main() {
  const dry = process.argv.includes("--dry");
  const ref = doc(db, "polla2026", "data");
  const data = (await getDoc(ref)).data() || {};

  const { rounds, thirdPlace } = buildKO(data.results || {}, data.koResults || {}, data.koThirds || {});
  const matches = [...rounds.flatMap(R => R.matches), thirdPlace].filter(m => m.a && m.b);

  const oracleStrength = (t) => strengthOf(t);
  const analystStrength = (t) => strengthOf(t) + formDelta(t, data.form);

  const koPreds = data.koPreds || {};
  const haveO = koPreds[ORACLE] || {};
  const haveA = koPreds[ANALYST] || {};
  const patchO = {}, patchA = {};

  for (const m of matches) {
    if (!haveO[m.slot]) patchO[m.slot] = predScore(m.a, m.b, m.slot, oracleStrength);
    if (!haveA[m.slot]) patchA[m.slot] = predScore(m.a, m.b, m.slot + "x", analystStrength);
  }

  const nO = Object.keys(patchO).length, nA = Object.keys(patchA).length;
  console.log(`Cruces definidos: ${matches.length}. Nuevos pronósticos → 🔮 Oráculo: ${nO}, 🧠 Analista: ${nA}.`);
  if (dry) {
    for (const m of matches) console.log(`  ${m.slot}: ${m.a} vs ${m.b} → 🔮 ${JSON.stringify(patchO[m.slot] ?? haveO[m.slot])}  🧠 ${JSON.stringify(patchA[m.slot] ?? haveA[m.slot])}`);
    process.exit(0);
  }
  if (nO + nA === 0) { console.log("Nada que hacer."); process.exit(0); }

  await setDoc(ref, { koPreds: { [ORACLE]: patchO, [ANALYST]: patchA } }, { merge: true });
  console.log("✓ Firebase actualizado.");
  process.exit(0);
}

main().catch((e) => { console.error("✗ Error:", e.message); process.exit(1); });
