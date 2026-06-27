/**
 * sync.mjs — Motor de sincronización con Firebase.
 *
 * Hace un "deep merge" de un parche JSON sobre el documento polla2026/data.
 * Los arrays se REEMPLAZAN (no se concatenan): ideal para form[], h2h[], etc.
 *
 * Uso:
 *   node scripts/sync.mjs <ruta-al-parche.json>
 *   echo '{"results":{"A01":{"h":2,"a":1}}}' | node scripts/sync.mjs -
 *
 * El parche tiene la misma forma que el documento de Firestore, por ejemplo:
 *   {
 *     "results":  { "A01": { "h": 2, "a": 1 } },
 *     "form":     { "México": ["W","D","W","L","W"] },
 *     "h2h":      { "México vs Sudáfrica": [ { "date":"2010-06-11", "score":"1-1" } ] },
 *     "predictions": { "🧠 Analista": { "A01": { "h": 1, "a": 0 } } }
 *   }
 */
import { readFileSync } from "fs";
import { db } from "../src/firebase.js";
import { doc, setDoc } from "firebase/firestore";

function readInput(path) {
  if (path === "-") return readFileSync(0, "utf8"); // stdin
  return readFileSync(path, "utf8");
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Uso: node scripts/sync.mjs <parche.json>  (o '-' para stdin)");
    process.exit(1);
  }
  const patch = JSON.parse(readInput(path));

  const ref = doc(db, "polla2026", "data");
  // MERGE server-side: solo toca los campos del parche, jamás pisa lo de otros
  // participantes (no hay ventana lectura→escritura como con setDoc del doc entero).
  // Mapas anidados se fusionan; arrays se REEMPLAZAN (igual que antes).
  await setDoc(ref, patch, { merge: true });

  const keys = Object.keys(patch).join(", ");
  console.log(`✓ Firestore actualizado. Claves modificadas: ${keys}`);
  process.exit(0);
}

main().catch((e) => { console.error("✗ Error:", e.message); process.exit(1); });
