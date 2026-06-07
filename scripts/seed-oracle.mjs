/**
 * seed-oracle.mjs — Crea los dos participantes IA y llena al Oráculo.
 *
 *  🔮 Oráculo  → predicciones FIJAS, generadas ahora con un modelo de fuerza.
 *  🧠 Analista → se agrega vacío; lo rellena la tarea diaria partido a partido.
 *
 * Uso: node scripts/seed-oracle.mjs
 */
import { db } from "../src/firebase.js";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { MATCHES, GD, strengthOf } from "../src/tournament.js";

export const ORACLE = "🔮 Oráculo";
export const ANALYST = "🧠 Analista";

// Marcador determinista a partir de la fuerza relativa
export function predScore(home, away, salt = "") {
  const diff = strengthOf(home) - strengthOf(away);
  const ad = Math.abs(diff);
  const h = [...salt].reduce((x, c) => (x * 31 + c.charCodeAt(0)) % 997, 7) % 5;
  let strong, weak;
  if (ad <= 4) { strong = 1; weak = 1; }
  else if (ad <= 10) { strong = 2; weak = 1; }
  else if (ad <= 18) { strong = 2; weak = 0; }
  else { strong = 3; weak = 0; }
  if (h === 0) strong += 1;
  if (h === 3 && weak < strong) weak += 1;
  return diff >= 0 ? { h: strong, a: weak } : { h: weak, a: strong };
}

function oraclePredictions() {
  const preds = {};
  Object.values(MATCHES).flat().forEach((m) => {
    preds[m.id] = predScore(m.home, m.away, m.id);
  });
  return preds;
}

function oracleExtras() {
  const ranked = [...new Set(Object.values(GD).flat())].sort((a, b) => strengthOf(b) - strengthOf(a));
  return {
    campeon: ranked[0],
    subcampeon: ranked[1],
    tercero: ranked[2],
    goleador: "Kylian Mbappé",
    mvp: "Jude Bellingham",
    guante: "Emiliano Martínez",
  };
}

async function main() {
  const ref = doc(db, "polla2026", "data");
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};

  const participants = Array.isArray(data.participants) ? [...data.participants] : [];
  [ORACLE, ANALYST].forEach((p) => { if (!participants.includes(p)) participants.push(p); });

  const predictions = { ...(data.predictions || {}) };
  predictions[ORACLE] = oraclePredictions();
  if (!predictions[ANALYST]) predictions[ANALYST] = {}; // lo llena la tarea diaria

  const extras = { ...(data.extras || {}) };
  extras[ORACLE] = oracleExtras();
  if (!extras[ANALYST]) extras[ANALYST] = {};

  await setDoc(ref, { ...data, participants, predictions, extras });
  console.log(`✓ ${ORACLE} sembrado (${Object.keys(predictions[ORACLE]).length} partidos + premios).`);
  console.log(`✓ ${ANALYST} listo (vacío, lo llena la tarea diaria).`);
  process.exit(0);
}

main().catch((e) => { console.error("✗ Error:", e.message); process.exit(1); });
