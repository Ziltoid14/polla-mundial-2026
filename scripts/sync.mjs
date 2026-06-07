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
import { doc, getDoc, setDoc } from "firebase/firestore";

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

function deepMerge(base, patch) {
  const out = { ...base };
  for (const k of Object.keys(patch)) {
    if (isObj(base?.[k]) && isObj(patch[k])) out[k] = deepMerge(base[k], patch[k]);
    else out[k] = patch[k];
  }
  return out;
}

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
  const snap = await getDoc(ref);
  const current = snap.exists() ? snap.data() : {};
  const next = deepMerge(current, patch);

  await setDoc(ref, next);

  const keys = Object.keys(patch).join(", ");
  console.log(`✓ Firestore actualizado. Claves modificadas: ${keys}`);
  process.exit(0);
}

main().catch((e) => { console.error("✗ Error:", e.message); process.exit(1); });
