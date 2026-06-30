/* ═══════════════════════ LÓGICA DE ELIMINACIÓN (pura, compartida app + scripts) ═══════════════════════
   Clasificación de grupos, cuadro OFICIAL del Mundial 2026 (12 grupos → 32) y puntaje de la fase final.
   Sin React ni Firebase: se puede importar desde scripts de Node y testear directo.

   Estructura del cuadro tomada del esquema oficial FIFA 2026 (partidos 73–104). */
import { GD, MATCHES, GK } from "./tournament.js";

/* Tabla de posiciones de un grupo a partir de un mapa { matchId: {h,a} }
   (sirve igual para resultados reales o para predicciones de una persona). */
export const getStandings = (g, results) => {
  const st = {};
  GD[g].forEach(t => (st[t] = { pts: 0, gf: 0, ga: 0, gd: 0, p: 0, w: 0, d: 0, l: 0 }));
  MATCHES[g].forEach(m => {
    const r = results[m.id];
    if (!r || r.h == null || r.a == null) return;
    const [h, a] = [+r.h, +r.a];
    if (isNaN(h) || isNaN(a)) return;
    st[m.home].p++; st[m.away].p++;
    st[m.home].gf += h; st[m.home].ga += a; st[m.home].gd += h - a;
    st[m.away].gf += a; st[m.away].ga += h; st[m.away].gd += a - h;
    if (h > a) { st[m.home].pts += 3; st[m.home].w++; st[m.away].l++; }
    else if (h < a) { st[m.away].pts += 3; st[m.away].w++; st[m.home].l++; }
    else { st[m.home].pts++; st[m.away].pts++; st[m.home].d++; st[m.away].d++; }
  });
  return GD[g].map(t => ({ t, ...st[t] })).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
};

/* ¿Terminó un grupo? (sus 6 partidos con resultado válido) */
export const groupDone = (g, results) =>
  MATCHES[g].every(m => { const r = results?.[m.id]; return r && r.h != null && r.a != null && !isNaN(+r.h) && !isNaN(+r.a); });
/* Grupos que aún no terminan (para avisos) */
export const pendingGroups = (results) => GK.filter(g => !groupDone(g, results));
export const allGroupsDone = (results) => pendingGroups(results).length === 0;

/* ═══ CUADRO OFICIAL MUNDIAL 2026 ═══
   16avos (partidos 73–88): cada cruce definido por puestos de grupo. "T" = mejor tercero asignado. */
const T = "T";
const KO_R32 = [
  ["2A", "2B"],  // 73
  ["1E", T],     // 74
  ["1F", "2C"],  // 75
  ["1C", "2F"],  // 76
  ["1I", T],     // 77
  ["2E", "2I"],  // 78
  ["1A", T],     // 79
  ["1L", T],     // 80
  ["1D", T],     // 81
  ["1G", T],     // 82
  ["2K", "2L"],  // 83
  ["1H", "2J"],  // 84
  ["1B", T],     // 85
  ["1J", "2H"],  // 86
  ["1K", T],     // 87
  ["2D", "2G"],  // 88
];
/* Grupos permitidos para el 3er lugar de cada cruce (índice = posición en KO_R32). */
const THIRD_SLOTS = {
  1:  ["A", "B", "C", "D", "F"], // 74
  4:  ["C", "D", "F", "G", "H"], // 77
  6:  ["C", "E", "F", "H", "I"], // 79
  7:  ["E", "H", "I", "J", "K"], // 80
  8:  ["B", "E", "F", "I", "J"], // 81
  9:  ["A", "E", "H", "I", "J"], // 82
  12: ["E", "F", "G", "I", "J"], // 85
  14: ["D", "E", "I", "J", "L"], // 87
};
/* Árbol: cómo se alimentan octavos→cuartos→semis→final (índices de la ronda anterior). */
const KO_FEEDS = {
  R16: [[1, 4], [0, 2], [3, 5], [6, 7], [10, 11], [8, 9], [13, 15], [12, 14]], // 89–96
  QF:  [[0, 1], [4, 5], [2, 3], [6, 7]],                                       // 97–100
  SF:  [[0, 1], [2, 3]],                                                       // 101–102
  F:   [[0, 1]],                                                               // 104
};
const ROUND_LABELS = { R32: "16avos", R16: "Octavos", QF: "Cuartos", SF: "Semis", F: "Final" };

/* Orden de VISUALIZACIÓN del cuadro (arriba→abajo), según el árbol oficial 2026.
   Los datos siguen indexados por nº de partido (R32-0..15 = partidos 73..88); esto solo
   reordena el dibujo para que cada ganador avance al cruce adyacente que corresponde. */
export const KO_DISPLAY = {
  R32: [1, 4, 0, 2, 10, 11, 8, 9, 3, 5, 6, 7, 13, 15, 12, 14],
  R16: [0, 1, 4, 5, 2, 3, 6, 7],
  QF:  [0, 1, 2, 3],
  SF:  [0, 1],
  F:   [0],
};
/* Devuelve los cruces de una ronda en orden de visualización. */
export const orderedMatches = (round) => (KO_DISPLAY[round.id] || round.matches.map((_, i) => i)).map(i => round.matches[i]);

/* Calendario de la fase final (controla el bloqueo "día antes", en hora de Chile). */
export const KO_DATES = {
  "R32-0":"2026-06-28","R32-1":"2026-06-29","R32-2":"2026-06-29","R32-3":"2026-06-29",
  "R32-4":"2026-06-30","R32-5":"2026-06-30","R32-6":"2026-06-30",
  "R32-7":"2026-07-01","R32-8":"2026-07-01","R32-9":"2026-07-01",
  "R32-10":"2026-07-02","R32-11":"2026-07-02","R32-12":"2026-07-02",
  "R32-13":"2026-07-03","R32-14":"2026-07-03","R32-15":"2026-07-03",
  "R16-0":"2026-07-04","R16-1":"2026-07-04","R16-2":"2026-07-05","R16-3":"2026-07-05",
  "R16-4":"2026-07-06","R16-5":"2026-07-06","R16-6":"2026-07-07","R16-7":"2026-07-07",
  "QF-0":"2026-07-09","QF-1":"2026-07-09","QF-2":"2026-07-10","QF-3":"2026-07-11",
  "SF-0":"2026-07-14","SF-1":"2026-07-15",
  "TP-0":"2026-07-18","F-0":"2026-07-19",
};

const rankPerf = (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf;

/* 1° y 2° de cada grupo (cuando el grupo terminó). { "1A": equipo|null, "2A": ... } */
const groupSlots = (results) => {
  const out = {};
  GK.forEach(g => {
    const done = groupDone(g, results);
    const st = getStandings(g, results);
    out["1" + g] = done ? (st[0]?.t ?? null) : null;
    out["2" + g] = done ? (st[1]?.t ?? null) : null;
  });
  return out;
};

/* Los 8 mejores terceros (ranking entre los 12), o [] si aún no terminan todos los grupos. */
export const bestThirds = (results) => {
  if (!allGroupsDone(results)) return [];
  const all = GK.map(g => { const st = getStandings(g, results); return st[2] ? { ...st[2], g } : null; }).filter(Boolean);
  return [...all].sort(rankPerf).slice(0, 8);
};

/* Asigna cada mejor-tercero a su cruce respetando los grupos permitidos (emparejamiento oficial FIFA).
   Devuelve { idxCruce: equipo|null } para los 8 slots de tercero. */
export const assignThirds = (results) => {
  const slots = [1, 4, 6, 7, 8, 9, 12, 14];
  const out = {}; slots.forEach(s => (out[s] = null));
  const thirds = bestThirds(results);
  if (thirds.length < 8) return out;
  const groups = thirds.map(t => t.g);
  const teamByG = {}; thirds.forEach(t => (teamByG[t.g] = t.t));
  // Procesar primero los slots con menos candidatos → emparejamiento perfecto determinista
  const order = [...slots].sort((s1, s2) => {
    const c1 = THIRD_SLOTS[s1].filter(g => groups.includes(g)).length;
    const c2 = THIRD_SLOTS[s2].filter(g => groups.includes(g)).length;
    return c1 - c2 || s1 - s2;
  });
  const used = new Set(); const pick = {};
  const bt = (i) => {
    if (i === order.length) return true;
    const s = order[i];
    for (const g of THIRD_SLOTS[s]) {
      if (groups.includes(g) && !used.has(g)) {
        used.add(g); pick[s] = g;
        if (bt(i + 1)) return true;
        used.delete(g); delete pick[s];
      }
    }
    return false;
  };
  if (bt(0)) slots.forEach(s => (out[s] = teamByG[pick[s]] ?? null));
  return out;
};

const validScore = (x) => x && x.h !== "" && x.a !== "" && x.h != null && x.a != null && !isNaN(+x.h) && !isNaN(+x.a);

/* Equipo que un pronóstico hace avanzar: por marcador, o por penales (adv) si predice empate. */
export const predAdvancer = (pred, a, b) => {
  if (!validScore(pred)) return null;
  const ph = +pred.h, pa = +pred.a;
  if (ph > pa) return a;
  if (pa > ph) return b;
  return (pred.adv === a || pred.adv === b) ? pred.adv : null;
};
/* Equipo que avanzó de verdad. El resultado guarda `adv` ya resuelto (admin elige si hay empate). */
export const realAdvancer = (res, a, b) => {
  if (!validScore(res)) return null;
  const rh = +res.h, ra = +res.a;
  if (rh > ra) return a;
  if (ra > rh) return b;
  return (res.adv === a || res.adv === b) ? res.adv : null;
};

/* Construye todo el cuadro desde los resultados de grupos y los resultados de la fase final.
   Devuelve { rounds:[{id,label,matches:[{slot,a,b,w,idx}]}], thirdPlace, champion }. */
export const buildKO = (results, koResults, thirdOverride) => {
  const gs = groupSlots(results);
  const thirds = assignThirds(results);
  const kr = koResults || {};
  const ov = thirdOverride || {};
  // tercero asignado a un cruce: override del admin (si lo hay) o el automático
  const thirdAt = (i, slot) => (ov[slot] != null && ov[slot] !== "") ? ov[slot] : (thirds[i] ?? null);
  const r32 = KO_R32.map((def, i) => {
    const slot = `R32-${i}`;
    const a = def[0] === T ? thirdAt(i, slot) : (gs[def[0]] ?? null);
    const b = def[1] === T ? thirdAt(i, slot) : (gs[def[1]] ?? null);
    return { slot, a, b, w: realAdvancer(kr[slot], a, b), idx: i };
  });
  const buildRound = (id, feeds, prev) => feeds.map((f, i) => {
    const a = prev[f[0]].w, b = prev[f[1]].w, slot = `${id}-${i}`;
    return { slot, a, b, w: realAdvancer(kr[slot], a, b), idx: i };
  });
  const r16 = buildRound("R16", KO_FEEDS.R16, r32);
  const qf  = buildRound("QF",  KO_FEEDS.QF,  r16);
  const sf  = buildRound("SF",  KO_FEEDS.SF,  qf);
  const f   = buildRound("F",   KO_FEEDS.F,   sf);
  const loser = (m) => (m.w ? (m.a === m.w ? m.b : m.a) : null);
  const tpA = loser(sf[0]), tpB = loser(sf[1]);
  const thirdPlace = { slot: "TP-0", a: tpA, b: tpB, w: realAdvancer(kr["TP-0"], tpA, tpB) };
  return {
    rounds: [
      { id: "R32", label: ROUND_LABELS.R32, matches: r32 },
      { id: "R16", label: ROUND_LABELS.R16, matches: r16 },
      { id: "QF",  label: ROUND_LABELS.QF,  matches: qf },
      { id: "SF",  label: ROUND_LABELS.SF,  matches: sf },
      { id: "F",   label: ROUND_LABELS.F,   matches: f },
    ],
    thirdPlace,
    champion: f[0].w || null,
  };
};

/* ═══ PUNTAJE DE ELIMINACIÓN (igual en todas las rondas) ═══
   Acertar quién avanza: +3 · acierto parcial (diferencia O goles de un equipo): +2 ·
   marcador exacto de los 90': +5 → máximo 8 por cruce.
   BONO EMPATE: clavar el marcador exacto de un empate Y acertar quién pasa por
   penales suma +2 extra → 10 puntos (premia el riesgo de apostar al empate). */
export const KO_RESULT = 3;     // acertar el RESULTADO (1X2) a los 90'
export const KO_PARTIAL = 2;    // diferencia de goles O goles de un equipo
export const KO_EXACT = 5;      // marcador exacto a los 90'
export const KO_DRAW_BONUS = 2; // empate acertado + quién clasifica (post-90': alargue/penales)
export const KO_MAX = KO_RESULT + KO_EXACT;          // 8 (cruce decisivo)
export const KO_MAX_DRAW = KO_MAX + KO_DRAW_BONUS;   // 10 (empate exacto + clasificado acertado)

export const koSlotPts = (pred, res, a, b) => {
  if (!validScore(res) || !validScore(pred)) return null;
  const ph = +pred.h, pa = +pred.a, rh = +res.h, ra = +res.a;
  let pts = 0;
  const predOut = Math.sign(ph - pa), realOut = Math.sign(rh - ra);
  if (predOut === realOut) pts += KO_RESULT;                                // acierto del 1X2 a los 90'
  if (ph === rh && pa === ra) pts += KO_EXACT;                              // marcador exacto a los 90'
  else if (ph === rh || pa === ra || (ph - pa) === (rh - ra)) pts += KO_PARTIAL;
  // Solo si apuestas empate Y fue empate a los 90': acertar quién clasifica post-90' suma +2.
  if (predOut === 0 && realOut === 0) {
    const radv = realAdvancer(res, a, b), padv = predAdvancer(pred, a, b);
    if (radv && padv && radv === padv) pts += KO_DRAW_BONUS;
  }
  return pts;
};

/* Total de puntos de eliminación de una persona. */
export const koTotalFor = (name, data) => {
  const { rounds, thirdPlace } = buildKO(data.results || {}, data.koResults || {}, data.koThirds || {});
  const kr = data.koResults || {};
  const myPreds = data.koPreds?.[name] || {};
  let s = 0;
  rounds.forEach(R => R.matches.forEach(m => {
    const p = koSlotPts(myPreds[m.slot], kr[m.slot], m.a, m.b);
    if (p != null) s += p;
  }));
  if (thirdPlace.a && thirdPlace.b) {
    const p = koSlotPts(myPreds["TP-0"], kr["TP-0"], thirdPlace.a, thirdPlace.b);
    if (p != null) s += p;
  }
  return s;
};
