/**
 * print-team-form.mjs — Imprime el array de forma actual de un equipo.
 * Útil para agregar el último partido manteniendo los 5 (el array se reemplaza completo al sincronizar).
 *
 * Uso: node scripts/print-team-form.mjs "México"
 */
import { db } from "../src/firebase.js";
import { doc, getDoc } from "firebase/firestore";

async function main() {
  const team = process.argv[2];
  if (!team) { console.error('Uso: node scripts/print-team-form.mjs "<Equipo>"'); process.exit(1); }
  const snap = await getDoc(doc(db, "polla2026", "data"));
  const form = (snap.exists() ? snap.data() : {}).form || {};
  console.log(JSON.stringify(form[team] || [], null, 2));
  process.exit(0);
}

main().catch((e) => { console.error("✗ Error:", e.message); process.exit(1); });
