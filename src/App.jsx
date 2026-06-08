import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { GD, FL, MATCHES, GK } from "./tournament";

const ADMIN_PWD = "mundial2026";

/* Participantes manejados por la IA (no editables/borrables desde la web) */
const AI_PARTICIPANTS = ["🔮 Oráculo", "🧠 Analista"];
const isAI = (n) => AI_PARTICIPANTS.includes(n);

/* Clave canónica para historial entre dos selecciones */
const h2hKey = (a, b) => [a, b].sort((x, y) => x.localeCompare(y, "es")).join(" vs ");

/* Separa un emoji inicial del nombre. "🔮 Oráculo" -> { icon:"🔮", clean:"Oráculo" } */
const splitName = (full) => {
  const m = String(full || "").match(/^(\p{Extended_Pictographic}(?:‍\p{Extended_Pictographic})*️?)\s+(.*)$/u);
  if (m && m[2].trim()) return { icon: m[1], clean: m[2].trim() };
  return { icon: null, clean: String(full || "") };
};

/* Íconos elegibles para el perfil de cada participante */
const AVATAR_ICONS = [
  "⚽","🏆","🔥","⭐","👑","💎","🚀","⚡","🎯","🎩","🥇","💪","🧤","🥊","🎮","🌟",
  "🦁","🐯","🐻","🦅","🐺","🐉","🦊","🐸","🐼","🦈","🐙","🦄","🐲","🐮","🦓","🐔",
];

/* ═══════════════════════ UTILS ═══════════════════════ */
const todayStr = () => new Date().toISOString().split("T")[0];
const isLocked  = (date) => date && date <= todayStr();

const getPts = (pred,res) => {
  if(!res||res.h==null||res.a==null) return null;
  if(!pred||pred.h===""||pred.a==="") return null;
  const [ph,pa,rh,ra]=[+pred.h,+pred.a,+res.h,+res.a];
  if(isNaN(ph)||isNaN(pa)) return null;
  if(ph===rh&&pa===ra) return 3;
  const pw=ph>pa?1:ph<pa?-1:0, rw=rh>ra?1:rh<ra?-1:0;
  return pw===rw?1:0;
};

const totalPts=(name,preds,results)=>Object.values(MATCHES).flat().reduce((s,m)=>s+(getPts(preds[name]?.[m.id],results[m.id])??0),0);
const countExact=(name,preds,results)=>Object.values(MATCHES).flat().filter(m=>getPts(preds[name]?.[m.id],results[m.id])===3).length;
const countPlayed=(name,preds,results)=>Object.values(MATCHES).flat().filter(m=>getPts(preds[name]?.[m.id],results[m.id])!=null).length;

const getStandings=(g,results)=>{
  const st={};
  GD[g].forEach(t=>(st[t]={pts:0,gf:0,ga:0,gd:0,p:0,w:0,d:0,l:0}));
  MATCHES[g].forEach(m=>{
    const r=results[m.id];
    if(!r||r.h==null||r.a==null) return;
    const[h,a]=[+r.h,+r.a];
    if(isNaN(h)||isNaN(a)) return;
    st[m.home].p++;st[m.away].p++;
    st[m.home].gf+=h;st[m.home].ga+=a;st[m.home].gd+=h-a;
    st[m.away].gf+=a;st[m.away].ga+=h;st[m.away].gd+=a-h;
    if(h>a){st[m.home].pts+=3;st[m.home].w++;st[m.away].l++;}
    else if(h<a){st[m.away].pts+=3;st[m.away].w++;st[m.home].l++;}
    else{st[m.home].pts++;st[m.away].pts++;st[m.home].d++;st[m.away].d++;}
  });
  return GD[g].map(t=>({t,...st[t]})).sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf);
};

const fmtDate=(d)=>{
  if(!d) return "";
  const[,m,day]=d.split("-");
  const mes=["","ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${+day} ${mes[+m]}`;
};

/* ═══════════════════════ EXTRAS (premios) ═══════════════════════ */
const TOURNAMENT_START = "2026-06-11";

// Todos los países del torneo, ordenados alfabéticamente
const ALL_TEAMS = [...new Set(Object.values(GD).flat())].sort((a,b)=>a.localeCompare(b,"es"));

// Jugadores destacados (nombre + país) — para Goleador y MVP
const PLAYERS = [
  {n:"Kylian Mbappé",c:"Francia"},{n:"Ousmane Dembélé",c:"Francia"},{n:"Antoine Griezmann",c:"Francia"},
  {n:"Vinícius Jr",c:"Brasil"},{n:"Rodrygo",c:"Brasil"},{n:"Raphinha",c:"Brasil"},{n:"Endrick",c:"Brasil"},
  {n:"Lionel Messi",c:"Argentina"},{n:"Lautaro Martínez",c:"Argentina"},{n:"Julián Álvarez",c:"Argentina"},
  {n:"Lamine Yamal",c:"España"},{n:"Pedri",c:"España"},{n:"Nico Williams",c:"España"},{n:"Dani Olmo",c:"España"},
  {n:"Harry Kane",c:"Inglaterra"},{n:"Jude Bellingham",c:"Inglaterra"},{n:"Bukayo Saka",c:"Inglaterra"},{n:"Phil Foden",c:"Inglaterra"},
  {n:"Cristiano Ronaldo",c:"Portugal"},{n:"Bruno Fernandes",c:"Portugal"},{n:"Rafael Leão",c:"Portugal"},
  {n:"Jamal Musiala",c:"Alemania"},{n:"Florian Wirtz",c:"Alemania"},{n:"Kai Havertz",c:"Alemania"},
  {n:"Cody Gakpo",c:"P.Bajos"},{n:"Memphis Depay",c:"P.Bajos"},{n:"Xavi Simons",c:"P.Bajos"},
  {n:"Kevin De Bruyne",c:"Bélgica"},{n:"Romelu Lukaku",c:"Bélgica"},{n:"Jérémy Doku",c:"Bélgica"},
  {n:"Darwin Núñez",c:"Uruguay"},{n:"Federico Valverde",c:"Uruguay"},
  {n:"Erling Haaland",c:"Noruega"},{n:"Martin Ødegaard",c:"Noruega"},
  {n:"Mohamed Salah",c:"Egipto"},{n:"Sadio Mané",c:"Senegal"},{n:"Nicolas Jackson",c:"Senegal"},
  {n:"Son Heung-min",c:"Corea"},{n:"Achraf Hakimi",c:"Marruecos"},{n:"Youssef En-Nesyri",c:"Marruecos"},
  {n:"James Rodríguez",c:"Colombia"},{n:"Luis Díaz",c:"Colombia"},
  {n:"Takefusa Kubo",c:"Japón"},{n:"Kaoru Mitoma",c:"Japón"},{n:"Luka Modrić",c:"Croacia"},
  {n:"Alexander Isak",c:"Suecia"},{n:"Viktor Gyökeres",c:"Suecia"},
  {n:"Christian Pulisic",c:"EE.UU."},{n:"Alphonso Davies",c:"Canadá"},{n:"Jonathan David",c:"Canadá"},
  {n:"Arda Güler",c:"Turquía"},{n:"Hakan Çalhanoğlu",c:"Turquía"},{n:"Moisés Caicedo",c:"Ecuador"},
  {n:"Mohammed Kudus",c:"Ghana"},{n:"Breel Embolo",c:"Suiza"},{n:"Raúl Jiménez",c:"México"},
  {n:"Hirving Lozano",c:"México"},{n:"Sébastien Haller",c:"C.Marfil"},
];

// Arqueros destacados — para Guante de Oro
const GKS = [
  {n:"Emiliano Martínez",c:"Argentina"},{n:"Alisson",c:"Brasil"},{n:"Ederson",c:"Brasil"},
  {n:"Thibaut Courtois",c:"Bélgica"},{n:"Mike Maignan",c:"Francia"},{n:"Unai Simón",c:"España"},
  {n:"David Raya",c:"España"},{n:"Jordan Pickford",c:"Inglaterra"},{n:"Marc-André ter Stegen",c:"Alemania"},
  {n:"Yann Sommer",c:"Suiza"},{n:"Yassine Bono",c:"Marruecos"},{n:"Bart Verbruggen",c:"P.Bajos"},
  {n:"Guillermo Ochoa",c:"México"},{n:"Diogo Costa",c:"Portugal"},{n:"Dominik Livaković",c:"Croacia"},
  {n:"Sergio Rochet",c:"Uruguay"},{n:"Matt Turner",c:"EE.UU."},
];

const EXTRA_CATS = [
  {id:"campeon",   label:"Campeón",       icon:"🏆", pts:25, type:"country"},
  {id:"subcampeon",label:"Subcampeón",    icon:"🥈", pts:15, type:"country"},
  {id:"tercero",   label:"Tercer Puesto", icon:"🥉", pts:10, type:"country"},
  {id:"goleador",  label:"Goleador",      icon:"👟", pts:20, type:"player"},
  {id:"mvp",       label:"MVP",           icon:"⚽", pts:10, type:"player"},
  {id:"guante",    label:"Guante de Oro", icon:"🧤", pts:10, type:"gk"},
];

// Mapa nombre de jugador -> país, para mostrar su bandera
const PLAYER_COUNTRY = {};
[...PLAYERS, ...GKS].forEach(p => { PLAYER_COUNTRY[p.n] = p.c; });

const extrasPts = (name, extras, er) =>
  EXTRA_CATS.reduce((s,c) => {
    const pick = extras?.[name]?.[c.id];
    const real = er?.[c.id];
    return s + ((pick && real && pick === real) ? c.pts : 0);
  }, 0);

const grandTotal = (name, data) =>
  totalPts(name, data.predictions, data.results) + extrasPts(name, data.extras || {}, data.extrasResults || {});

/* ═══════════════════════ BRACKET (eliminación) ═══════════════════════ */
// Posiciones de siembra estándar para 32 equipos (mantiene a los mejores separados)
const SEED_POSITIONS = [1,32,16,17,8,25,9,24,4,29,13,20,5,28,12,21,2,31,15,18,7,26,10,23,3,30,14,19,6,27,11,22];
const ROUNDS = [
  { id: "R32", n: 16, label: "16avos" },
  { id: "R16", n: 8,  label: "Octavos" },
  { id: "QF",  n: 4,  label: "Cuartos" },
  { id: "SF",  n: 2,  label: "Semis" },
  { id: "F",   n: 1,  label: "Final" },
];

// 32 clasificados (1°+2° de cada grupo + 8 mejores 3°) según las predicciones de grupo de la persona
const getQualified = (predForPerson) => {
  const rankPerf = (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf;
  const firsts = [], seconds = [], thirdsAll = [];
  GK.forEach(g => {
    const st = getStandings(g, predForPerson || {});
    if (st[0]) firsts.push(st[0]);
    if (st[1]) seconds.push(st[1]);
    if (st[2]) thirdsAll.push(st[2]);
  });
  const thirds = [...thirdsAll].sort(rankPerf).slice(0, 8);
  return [...[...firsts].sort(rankPerf), ...[...seconds].sort(rankPerf), ...[...thirds].sort(rankPerf)].map(x => x.t);
};

// Construye todas las rondas a partir de los 32 sembrados y las elecciones del usuario.
// Parte SIN ganadores: cada cruce avanza solo cuando el usuario elige un equipo.
const buildBracket = (seeds, picks) => {
  const winnerOf = (rid, idx, a, b) => {
    if (!a || !b) return null;            // falta algún equipo todavía
    const p = picks?.[`${rid}-${idx}`];
    return (p === a || p === b) ? p : null; // null = aún no se elige
  };
  const roundsData = [];
  let prevWinners = null;
  ROUNDS.forEach((R, ri) => {
    const matches = [];
    for (let i = 0; i < R.n; i++) {
      let a, b;
      if (ri === 0) { a = seeds[SEED_POSITIONS[2 * i] - 1]; b = seeds[SEED_POSITIONS[2 * i + 1] - 1]; }
      else { a = prevWinners[2 * i]; b = prevWinners[2 * i + 1]; }
      const w = winnerOf(R.id, i, a, b);
      matches.push({ a, b, w, idx: i });
    }
    roundsData.push({ ...R, matches });
    prevWinners = matches.map(m => m.w);
  });
  return { roundsData, champion: prevWinners[0] || null };
};

/* ═══════════════════════ DESIGN TOKENS ═══════════════════════ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy-0: #03091a;
    --navy-1: #060e26;
    --navy-2: #0a1630;
    --navy-3: #0f1f42;
    --navy-4: #172a58;
    --blue:   #2563eb;
    --blue-l: #3b82f6;
    --blue-xl:#60a5fa;
    --silver: #94a3b8;
    --silver-l:#cbd5e1;
    --white:  #f0f6ff;
    --gold:   #f59e0b;
    --gold-l: #fcd34d;
    --emerald:#10b981;
    --rose:   #f43f5e;
    --glass:  rgba(15,31,66,0.55);
    --glass-b:rgba(148,163,184,0.12);
    --glass-b2:rgba(148,163,184,0.22);
    --shadow: 0 8px 32px rgba(0,0,0,0.5);
    --shadow-l:0 2px 12px rgba(0,0,0,0.35);
  }

  body { background: var(--navy-0); }

  input[type=number] { -moz-appearance:textfield; }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; }

  ::-webkit-scrollbar { width:5px; height:5px; }
  ::-webkit-scrollbar-track { background:var(--navy-1); }
  ::-webkit-scrollbar-thumb { background:var(--navy-4); border-radius:4px; }

  .stadium-bg {
    background:
      radial-gradient(ellipse 900px 500px at 50% -60px, rgba(37,99,235,0.18) 0%, transparent 65%),
      radial-gradient(ellipse 400px 200px at 20% 0%, rgba(59,130,246,0.08) 0%, transparent 60%),
      radial-gradient(ellipse 400px 200px at 80% 0%, rgba(59,130,246,0.08) 0%, transparent 60%),
      repeating-linear-gradient(0deg, transparent, transparent 79px, rgba(37,99,235,0.025) 79px, rgba(37,99,235,0.025) 80px),
      repeating-linear-gradient(90deg, transparent, transparent 79px, rgba(37,99,235,0.025) 79px, rgba(37,99,235,0.025) 80px),
      var(--navy-0);
  }

  .glass {
    background: var(--glass);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1px solid var(--glass-b);
    box-shadow: var(--shadow), inset 0 1px 0 rgba(255,255,255,0.04);
  }
  .glass-sm {
    background: rgba(15,31,66,0.45);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid var(--glass-b);
  }

  @keyframes shimmer {
    0%   { background-position: -400px center; }
    100% { background-position: 400px center; }
  }
  .shimmer-text {
    background: linear-gradient(90deg, var(--silver-l) 30%, #fff 48%, var(--blue-xl) 52%, var(--silver-l) 70%);
    background-size: 800px 100%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer 4s linear infinite;
  }

  @keyframes rowIn {
    from { opacity:0; transform:translateY(10px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .row-anim { animation: rowIn 0.3s ease both; }

  @keyframes pop {
    0%  { transform:scale(0.7); opacity:0; }
    70% { transform:scale(1.1); }
    100%{ transform:scale(1);   opacity:1; }
  }
  .badge-pop { animation: pop 0.25s ease both; }

  .lift { transition: transform 0.18s ease, box-shadow 0.18s ease; }
  .lift:hover { transform:translateY(-2px); box-shadow:0 12px 36px rgba(0,0,0,0.55); }

  .flag-bubble {
    width:42px; height:42px;
    border-radius:50%;
    background:rgba(37,99,235,0.12);
    border:1.5px solid rgba(148,163,184,0.15);
    display:flex; align-items:center; justify-content:center;
    font-size:24px; line-height:1;
    flex-shrink:0;
    transition: border-color 0.2s, background 0.2s;
  }
  .flag-bubble.active {
    background:rgba(37,99,235,0.22);
    border-color:var(--blue-l);
    box-shadow:0 0 12px rgba(59,130,246,0.3);
  }
  .flag-bubble.win {
    background:rgba(245,158,11,0.2);
    border-color:var(--gold);
    box-shadow:0 0 14px rgba(245,158,11,0.4);
  }

  .score-inp {
    width:42px; height:40px;
    background:rgba(6,14,38,0.7);
    border:1.5px solid rgba(148,163,184,0.2);
    border-radius:8px;
    color:var(--white);
    font-family:'Oswald',sans-serif;
    font-size:18px; font-weight:600;
    text-align:center; outline:none;
    transition:border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .score-inp:focus { border-color:var(--blue-l); box-shadow:0 0 0 3px rgba(59,130,246,0.2); }
  .score-inp:disabled { opacity:0.35; cursor:not-allowed; background:rgba(6,14,38,0.4); }

  .grp-btn {
    width:38px; height:38px;
    border-radius:8px;
    border:1.5px solid rgba(148,163,184,0.15);
    background:rgba(15,31,66,0.5);
    color:var(--silver);
    font-family:'Oswald',sans-serif;
    font-size:16px; font-weight:600;
    cursor:pointer;
    transition:all 0.18s ease;
    position:relative;
  }
  .grp-btn:hover { border-color:var(--blue-l); color:var(--white); }
  .grp-btn.active { background:var(--blue); border-color:var(--blue-l); color:#fff; box-shadow:0 0 16px rgba(37,99,235,0.5); }
  .grp-btn.done { border-color:var(--emerald); color:var(--emerald); }

  .part-chip {
    padding:6px 18px;
    border-radius:50px;
    border:1.5px solid rgba(148,163,184,0.2);
    background:rgba(15,31,66,0.5);
    color:var(--silver);
    font-family:'DM Sans',sans-serif;
    font-size:14px; font-weight:500;
    cursor:pointer;
    transition:all 0.18s ease;
  }
  .part-chip:hover { border-color:var(--blue-l); color:var(--white); }
  .part-chip.active { background:rgba(37,99,235,0.2); border-color:var(--blue-l); color:var(--white); box-shadow:0 0 12px rgba(37,99,235,0.25); }

  .tab-btn {
    padding:12px 18px;
    background:none; border:none;
    border-bottom:2.5px solid transparent;
    color:var(--silver);
    font-family:'DM Sans',sans-serif;
    font-size:13.5px; font-weight:500;
    cursor:pointer; white-space:nowrap;
    transition:color 0.18s, border-color 0.18s;
  }
  .tab-btn:hover { color:var(--silver-l); }
  .tab-btn.active { color:#fff; border-bottom-color:var(--blue-l); }

  .match-row {
    display:grid;
    grid-template-columns: 56px 1fr 130px 1fr 96px 52px;
    gap:8px;
    padding:12px 18px;
    align-items:center;
    border-bottom:1px solid rgba(148,163,184,0.06);
    transition:background 0.15s;
  }
  .match-row:hover { background:rgba(37,99,235,0.06); }
  .match-row:last-child { border-bottom:none; }
  .match-row.locked { opacity:0.7; }

  .pts3-row { border-left:3px solid var(--gold); }
  .pts1-row { border-left:3px solid var(--emerald); }
  .pts0-row { border-left:3px solid var(--rose); }

  .lb-card {
    display:grid;
    grid-template-columns:52px 1fr 64px 64px 64px 80px;
    padding:16px 20px;
    align-items:center;
    border-bottom:1px solid rgba(148,163,184,0.07);
    transition:background 0.15s;
  }
  .lb-card:hover { background:rgba(37,99,235,0.05); }
  .lb-card:last-child { border-bottom:none; }

  .btn {
    padding:8px 16px;
    border-radius:8px; border:none;
    font-family:'DM Sans',sans-serif;
    font-size:13px; font-weight:600;
    cursor:pointer;
    transition:all 0.18s ease;
  }
  .btn-primary { background:var(--blue); color:#fff; box-shadow:0 4px 12px rgba(37,99,235,0.3); }
  .btn-primary:hover { background:var(--blue-l); box-shadow:0 4px 16px rgba(37,99,235,0.45); }
  .btn-primary:disabled { opacity:0.4; cursor:not-allowed; }
  .btn-ghost { background:rgba(148,163,184,0.08); border:1px solid rgba(148,163,184,0.18); color:var(--silver-l); }
  .btn-ghost:hover { background:rgba(148,163,184,0.14); color:var(--white); }
  .btn-green { background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.4); color:var(--emerald); }
  .btn-green:hover { background:rgba(16,185,129,0.25); }

  .prog-track { width:100%; height:3px; background:rgba(148,163,184,0.12); border-radius:3px; overflow:hidden; }
  .prog-fill { height:100%; border-radius:3px; transition:width 0.5s ease; }

  .modal { position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:300;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px); }

  .res-score { font-family:'Oswald',sans-serif; font-size:20px; font-weight:700; color:var(--gold-l); letter-spacing:1px; }

  .st-row { display:grid; grid-template-columns:24px 1fr 24px 24px 24px 24px 30px 34px; gap:4px; padding:6px 12px; align-items:center; }
  .st-row.top { background:rgba(37,99,235,0.08); }
  .st-row.div { border-top:1px dashed rgba(148,163,184,0.15); }

  /* ═══ COUNTDOWN ═══ */
  .countdown {
    border-radius:14px; padding:14px 20px;
    display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;
    position:relative; overflow:hidden;
  }
  .countdown::before {
    content:''; position:absolute; inset:0;
    background:radial-gradient(ellipse 300px 80px at 0% 50%, rgba(245,158,11,0.10), transparent 70%),
               radial-gradient(ellipse 300px 80px at 100% 50%, rgba(37,99,235,0.12), transparent 70%);
    pointer-events:none;
  }
  .countdown-label { font-family:'Oswald',sans-serif; font-size:13px; letter-spacing:2px; color:var(--silver-l); font-weight:500; }
  .countdown-live { font-family:'Oswald',sans-serif; font-size:16px; letter-spacing:2px; color:var(--gold-l); font-weight:700; animation:pulseLive 1.6s ease-in-out infinite; }
  @keyframes pulseLive { 0%,100%{opacity:1;} 50%{opacity:0.55;} }
  .countdown-units { display:flex; gap:10px; }
  .cd-unit {
    display:flex; flex-direction:column; align-items:center; min-width:54px;
    padding:8px 6px; border-radius:10px;
    background:rgba(6,14,38,0.6); border:1px solid var(--glass-b);
  }
  .cd-num { font-family:'Oswald',sans-serif; font-size:26px; font-weight:700; color:#fff; line-height:1; letter-spacing:1px; }
  .cd-lbl { font-size:10px; color:var(--silver); letter-spacing:1.5px; margin-top:4px; text-transform:uppercase; }

  /* ═══ TAB FADE ═══ */
  .tab-fade { animation:tabFade 0.35s ease both; }
  @keyframes tabFade { 0% { opacity:0; transform:translateY(8px); } 100% { opacity:1; transform:translateY(0); } }

  /* ═══ FORM (últimos 5) + H2H ═══ */
  .form-row { display:flex; gap:4px; margin-top:5px; }
  .form-row.right { justify-content:flex-end; }
  .form-sq-wrap { position:relative; display:inline-flex; cursor:pointer; padding:1px; }
  .form-sq { width:14px; height:14px; border-radius:4px; flex-shrink:0; box-shadow:inset 0 1px 0 rgba(255,255,255,0.15); transition:transform 0.12s; }
  .form-sq-wrap:hover .form-sq { transform:scale(1.18); }
  .form-W { background:linear-gradient(160deg,#34d399,#059669); }
  .form-D { background:linear-gradient(160deg,#fcd34d,#d97706); }
  .form-L { background:linear-gradient(160deg,#fb7185,#e11d48); }
  .form-dot { width:9px; height:9px; border-radius:3px; display:inline-block; }
  .form-tip-fixed {
    position:fixed; transform:translate(-50%, calc(-100% - 12px));
    z-index:400; min-width:148px;
    display:flex; flex-direction:column; gap:3px;
    padding:11px 13px; border-radius:12px;
    background:rgba(8,16,40,0.98); backdrop-filter:blur(14px);
    border:1px solid var(--glass-b2); box-shadow:var(--shadow);
    pointer-events:none; white-space:nowrap;
    animation:tipIn 0.14s ease both;
  }
  .form-tip-fixed::after {
    content:''; position:absolute; top:100%; left:50%; transform:translateX(-50%);
    border:7px solid transparent; border-top-color:rgba(8,16,40,0.98);
  }
  .form-tip-top { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:600; color:var(--silver-l); letter-spacing:0.5px; }
  .form-tip-score { font-family:'Oswald',sans-serif; font-size:22px; font-weight:700; color:var(--white); letter-spacing:1px; }
  .form-tip-sub { font-size:12.5px; color:var(--silver-l); }
  .form-tip-date { font-size:10.5px; color:var(--silver); }
  @keyframes tipIn { 0% { opacity:0; transform:translate(-50%, calc(-100% - 6px)); } 100% { opacity:1; transform:translate(-50%, calc(-100% - 12px)); } }
  .h2h-btn {
    width:22px; height:22px; border-radius:6px; margin-top:3px;
    border:1px solid rgba(148,163,184,0.25); background:rgba(15,31,66,0.6);
    color:var(--blue-xl); font-size:11px; cursor:pointer; line-height:1;
    display:flex; align-items:center; justify-content:center;
    transition:all 0.15s;
  }
  .h2h-btn:hover { border-color:var(--blue-l); background:rgba(37,99,235,0.18); color:#fff; }
  .h2h-row {
    display:flex; align-items:center; justify-content:space-between;
    padding:11px 14px; border-radius:10px; background:rgba(6,14,38,0.5);
    border:1px solid rgba(148,163,184,0.1); margin-bottom:8px;
  }
  .h2h-score { font-family:'Oswald',sans-serif; font-size:18px; font-weight:700; color:var(--gold-l); letter-spacing:1px; }

  /* ═══ SEARCHABLE SELECT ═══ */
  .ss-wrap { position:relative; width:100%; }
  .ss-trigger {
    width:100%; display:flex; align-items:center; gap:10px;
    padding:10px 14px;
    background:rgba(6,14,38,0.7);
    border:1.5px solid rgba(148,163,184,0.2);
    border-radius:10px;
    color:var(--white);
    font-family:'DM Sans',sans-serif; font-size:14px;
    cursor:pointer; text-align:left;
    transition:border-color 0.2s, box-shadow 0.2s;
  }
  .ss-trigger:hover { border-color:var(--blue-l); }
  .ss-trigger.open { border-color:var(--blue-l); box-shadow:0 0 0 3px rgba(59,130,246,0.2); }
  .ss-trigger.gold { border-color:var(--gold); background:rgba(245,158,11,0.08); }
  .ss-trigger:disabled { opacity:0.5; cursor:not-allowed; }
  .ss-trigger .ss-flag { font-size:22px; line-height:1; flex-shrink:0; }
  .ss-trigger .ss-chev { margin-left:auto; color:var(--silver); font-size:11px; }
  .ss-placeholder { color:var(--silver); }
  .ss-panel {
    position:absolute; z-index:120; top:calc(100% + 5px); left:0; right:0;
    max-height:260px; overflow-y:auto;
    background:rgba(10,22,48,0.98);
    backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
    border:1px solid var(--glass-b2);
    border-radius:12px;
    box-shadow:var(--shadow);
    padding:6px;
  }
  .ss-searchbox {
    width:100%; padding:9px 12px; margin-bottom:4px;
    background:rgba(6,14,38,0.8);
    border:1.5px solid rgba(148,163,184,0.2);
    border-radius:8px; color:var(--white);
    font-family:'DM Sans',sans-serif; font-size:14px; outline:none;
    position:sticky; top:0;
  }
  .ss-searchbox:focus { border-color:var(--blue-l); }
  .ss-opt {
    display:flex; align-items:center; gap:10px;
    padding:9px 10px; border-radius:8px;
    cursor:pointer; transition:background 0.12s;
  }
  .ss-opt:hover, .ss-opt.kbd { background:rgba(37,99,235,0.18); }
  .ss-opt .ss-flag { font-size:20px; line-height:1; flex-shrink:0; }
  .ss-opt-label { font-size:14px; color:var(--white); }
  .ss-opt-sub { font-size:11px; color:var(--silver); margin-left:auto; }
  .ss-empty { padding:14px; text-align:center; color:var(--silver); font-size:13px; }

  /* ═══ EXTRAS CARDS ═══ */
  .extras-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
  .extra-card {
    border-radius:16px; padding:18px;
    border:1px solid var(--glass-b);
    background:var(--glass);
    position:relative;
  }
  .extra-card.done { border-color:rgba(245,158,11,0.4); }
  .extra-icon { font-size:38px; line-height:1; margin-bottom:8px; }
  .extra-pts {
    font-family:'Oswald',sans-serif; font-size:22px; font-weight:700;
    color:var(--gold-l); letter-spacing:1px;
  }

  /* ═══ BRACKET ═══ */
  .bracket-scroll { overflow-x:auto; overflow-y:hidden; padding:4px 4px 16px; --bk-line:rgba(148,163,184,0.30); --bk-gold:var(--gold-l); --tl:16px; --sp:16px; }
  .bracket { display:flex; gap:calc(var(--tl) + var(--sp) * 2); min-width:max-content; align-items:stretch; }
  .bk-round { display:flex; flex-direction:column; min-width:182px; }
  .bk-round-head {
    font-family:'Oswald',sans-serif; font-size:12px; letter-spacing:2px; color:var(--silver);
    text-align:center; padding:6px 0; margin-bottom:6px;
    border-bottom:1px solid rgba(148,163,184,0.1);
  }
  .bk-col { flex:1 1 auto; display:flex; flex-direction:column; }
  .bk-cell { flex:1 0 auto; padding:5px 0; display:flex; flex-direction:column; justify-content:center; position:relative; }
  .bk-match {
    background:rgba(15,31,66,0.6); border:1px solid var(--glass-b);
    border-radius:10px; position:relative; z-index:1;
  }

  .bk-team {
    display:flex; align-items:center; gap:8px; padding:8px 10px;
    cursor:pointer; font-size:13px; color:var(--silver-l);
    border-left:3px solid transparent; transition:background 0.15s, color 0.15s;
    user-select:none; position:relative;
  }
  .bk-team:first-child { border-radius:9px 9px 0 0; }
  .bk-team:last-child  { border-radius:0 0 9px 9px; }
  .bk-team:hover { background:rgba(37,99,235,0.12); color:var(--white); }
  .bk-team + .bk-team { border-top:1px solid rgba(148,163,184,0.08); }
  .bk-team.win {
    background:rgba(245,158,11,0.12); border-left-color:var(--gold);
    color:var(--gold-l); font-weight:600;
    animation:bkWin 0.32s ease;
  }
  .bk-team.lose { color:var(--silver); }
  .bk-team.lose .bk-flag { filter:grayscale(0.4); opacity:0.55; }
  .bk-team.lose .bk-name { opacity:0.7; }
  .bk-team.empty { opacity:0.3; font-style:italic; cursor:default; }
  .bk-team:not(.empty):not(.win) { animation:bkAppear 0.4s cubic-bezier(0.2,0.8,0.2,1) both; }
  .bk-team .bk-flag { font-size:17px; line-height:1; flex-shrink:0; }
  .bk-team .bk-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .bk-readonly .bk-team { cursor:default; }

  /* ── Conectores: una línea sale de CADA equipo y se fusiona al centro del partido ── */
  .bk-round:not(:last-of-type) .bk-team:not(.empty)::after {
    content:''; position:absolute; left:100%; width:var(--tl); height:50%;
    pointer-events:none; z-index:0;
  }
  .bk-round:not(:last-of-type) .bk-team:not(.empty):first-child::after {
    top:50%; border-top:2px solid var(--bk-line); border-right:2px solid var(--bk-line);
  }
  .bk-round:not(:last-of-type) .bk-team:not(.empty):last-child::after {
    bottom:50%; border-bottom:2px solid var(--bk-line); border-right:2px solid var(--bk-line);
  }
  /* Tramo desde la fusión hacia la siguiente columna (incluye el codo vertical del par).
     Se solapa 3px a la izquierda (rellena la esquina con la línea del equipo) y 2px hacia
     abajo (rellena la unión vertical en el punto medio del par). */
  .bk-round:not(:last-of-type) .bk-cell::after {
    content:''; position:absolute; left:calc(100% + var(--tl) - 2px); width:calc(var(--sp) + 2px); height:calc(50% + 2px);
    pointer-events:none; z-index:0;
  }
  .bk-round:not(:last-of-type) .bk-cell:nth-child(odd)::after {
    top:50%; border-top:2px solid var(--bk-line); border-right:2px solid var(--bk-line);
  }
  .bk-round:not(:last-of-type) .bk-cell:nth-child(even)::after {
    bottom:50%; border-bottom:2px solid var(--bk-line); border-right:2px solid var(--bk-line);
  }
  /* Entrada horizontal al partido de la columna siguiente (se solapa 3px sobre el codo vertical) */
  .bk-round:not(:first-of-type) .bk-cell::before {
    content:''; position:absolute; right:100%; top:calc(50% - 1px);
    width:calc(var(--sp) + 2px); height:2px; background:var(--bk-line);
    pointer-events:none; z-index:0;
  }
  /* Camino del ganador iluminado en dorado hasta la siguiente columna */
  .bk-team.win::after     { border-color:var(--bk-gold) !important; filter:drop-shadow(0 0 4px rgba(245,158,11,0.65)); z-index:2; }
  .bk-cell.bk-won::after  { border-color:var(--bk-gold) !important; filter:drop-shadow(0 0 4px rgba(245,158,11,0.6)); z-index:2; }
  .bk-cell.bk-lit::before { background:var(--bk-gold) !important; box-shadow:0 0 7px rgba(245,158,11,0.55); z-index:2; }
  @keyframes bkWin {
    0% { transform:scale(0.96); } 55% { transform:scale(1.03); } 100% { transform:scale(1); }
  }
  @keyframes bkAppear {
    0% { opacity:0; transform:translateX(-14px); }
    100% { opacity:1; transform:translateX(0); }
  }

  /* Champion column */
  .champ-col { display:flex; flex-direction:column; justify-content:center; min-width:210px; }
  .champ-card {
    border-radius:18px; padding:24px 20px; text-align:center;
    background:linear-gradient(160deg, rgba(245,158,11,0.18), rgba(15,31,66,0.6));
    border:1.5px solid rgba(245,158,11,0.45);
    animation:champIn 0.6s cubic-bezier(0.2,0.8,0.2,1) both, champGlow 2.4s ease-in-out infinite 0.6s;
    position:relative; overflow:hidden;
  }
  .champ-trophy { font-size:54px; line-height:1; margin-bottom:8px; animation:trophyFloat 2.6s ease-in-out infinite; }
  .champ-flag { font-size:46px; line-height:1; margin:6px 0; }
  .champ-name { font-family:'Oswald',sans-serif; font-size:24px; font-weight:700; letter-spacing:1px; color:var(--gold-l); }
  .champ-label { font-size:11px; letter-spacing:3px; color:var(--gold); margin-bottom:10px; }
  @keyframes champIn { 0%{transform:scale(0.5) rotate(-8deg);opacity:0;} 60%{transform:scale(1.12) rotate(3deg);} 100%{transform:scale(1) rotate(0);opacity:1;} }
  @keyframes champGlow { 0%,100%{box-shadow:0 0 28px rgba(245,158,11,0.35);} 50%{box-shadow:0 0 58px rgba(245,158,11,0.7);} }
  @keyframes trophyFloat { 0%,100%{transform:translateY(0) rotate(-3deg);} 50%{transform:translateY(-7px) rotate(3deg);} }
  .confetti { position:absolute; top:-10px; font-size:14px; animation:confettiFall linear infinite; }
  @keyframes confettiFall { 0%{transform:translateY(-10px) rotate(0);opacity:1;} 100%{transform:translateY(260px) rotate(360deg);opacity:0;} }

  /* ═══ PODIO ═══ */
  .podium-wrap { margin-top:26px; }
  .podium-title { font-family:'Oswald',sans-serif; font-size:13px; letter-spacing:3px; color:var(--silver); text-align:center; margin-bottom:14px; }
  .podium { display:flex; align-items:flex-end; justify-content:center; gap:12px; max-width:520px; margin:0 auto; }
  .pod { display:flex; flex-direction:column; align-items:center; flex:1; min-width:0; }
  .pod-top { display:flex; flex-direction:column; align-items:center; gap:3px; margin-bottom:8px; }
  .pod-medal { font-size:30px; line-height:1; }
  .pod-flag { font-size:34px; line-height:1; }
  .pod-name { font-family:'Oswald',sans-serif; font-weight:700; font-size:14px; text-align:center; color:var(--white); max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .pod-empty { font-size:24px; color:var(--silver); opacity:0.5; }
  .pod-base { width:100%; border-radius:12px 12px 0 0; display:flex; align-items:flex-start; justify-content:center; padding-top:10px; position:relative; overflow:hidden; }
  .pod-rank { font-family:'Oswald',sans-serif; font-weight:700; font-size:24px; color:rgba(255,255,255,0.85); }
  .pod-1 { height:120px; background:linear-gradient(180deg, rgba(245,158,11,0.32), rgba(245,158,11,0.05)); border:1.5px solid rgba(245,158,11,0.55); border-bottom:none; box-shadow:0 0 26px rgba(245,158,11,0.25); }
  .pod-2 { height:88px; background:linear-gradient(180deg, rgba(203,213,225,0.26), rgba(203,213,225,0.04)); border:1.5px solid rgba(203,213,225,0.4); border-bottom:none; }
  .pod-3 { height:64px; background:linear-gradient(180deg, rgba(205,127,50,0.3), rgba(205,127,50,0.05)); border:1.5px solid rgba(205,127,50,0.45); border-bottom:none; }
  /* Podio de participantes (clasificación) */
  .pod-av-lg { width:54px; height:54px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:26px; font-family:'Oswald',sans-serif; font-weight:700; color:var(--white); background:rgba(37,99,235,0.22); border:2px solid rgba(59,130,246,0.4); }
  .pod-1 .pod-av-host, .pod .pod-av-lg.gold { border-color:var(--gold); box-shadow:0 0 16px rgba(245,158,11,0.45); }
  .pod-pts { font-family:'Oswald',sans-serif; font-weight:700; font-size:18px; color:var(--gold-l); letter-spacing:0.5px; }
  .pod-sub { font-size:10px; color:var(--silver); letter-spacing:1px; }

  /* ═══ LEADERBOARD (clasificación) ═══ */
  .lb-av { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-family:'Oswald',sans-serif; font-weight:700; color:var(--white); background:rgba(37,99,235,0.18); border:1.5px solid rgba(59,130,246,0.3); flex-shrink:0; }
  .lb-av.gold { border-color:var(--gold); background:rgba(245,158,11,0.16); box-shadow:0 0 12px rgba(245,158,11,0.3); }
  .lb-bar { height:5px; border-radius:3px; background:rgba(148,163,184,0.12); overflow:hidden; margin-top:6px; max-width:260px; }
  .lb-bar-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,var(--blue),var(--blue-xl)); transition:width 0.7s cubic-bezier(0.2,0.8,0.2,1); }
  .lb-bar-fill.gold { background:linear-gradient(90deg,var(--gold),var(--gold-l)); }
  .lb-card.lb-me { background:rgba(37,99,235,0.12) !important; box-shadow:inset 3px 0 0 var(--blue-l); }
  .lb-me-badge { font-size:9px; font-weight:700; letter-spacing:1px; color:var(--blue-xl); background:rgba(59,130,246,0.18); border:1px solid rgba(59,130,246,0.4); border-radius:20px; padding:1px 7px; margin-left:7px; vertical-align:middle; }

  /* ═══ HERO host flags ═══ */
  .host-flags { display:inline-flex; gap:3px; font-size:14px; vertical-align:middle; }
  .leader-chip { display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:30px; background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.4); font-size:12px; color:var(--gold-l); font-weight:600; }

  /* ═══ Banner de predicciones completas ═══ */
  .done-banner {
    position:relative; overflow:hidden; margin-top:12px; padding:11px 16px; border-radius:12px;
    text-align:center; font-family:'Oswald',sans-serif; font-weight:600; letter-spacing:0.5px; font-size:14.5px;
    color:var(--emerald);
    background:linear-gradient(90deg, rgba(16,185,129,0.10), rgba(16,185,129,0.20), rgba(16,185,129,0.10));
    border:1px solid rgba(16,185,129,0.4);
    animation:doneIn 0.5s cubic-bezier(0.2,0.8,0.2,1) both;
  }
  @keyframes doneIn { 0%{opacity:0; transform:scale(0.96);} 100%{opacity:1; transform:scale(1);} }

  /* ═══ Premios: bandera de la elección ═══ */
  .extra-pick-flag {
    font-size:30px; line-height:1; width:46px; height:46px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    background:rgba(245,158,11,0.10); border:1.5px solid rgba(245,158,11,0.35);
    animation:pop 0.25s ease both;
  }
  .extra-card.picked { border-color:rgba(245,158,11,0.45); box-shadow:0 0 18px rgba(245,158,11,0.12); }

  /* ═══ MOBILE ═══ */
  @media (max-width: 640px) {
    /* Header */
    .header-title { font-size:18px !important; letter-spacing:2px !important; }
    .header-meta  { font-size:10px !important; }
    .header-btns  { gap:6px !important; }
    .header-btns .btn { font-size:11px !important; padding:6px 10px !important; }

    /* Group header title — no wrap */
    .group-title { font-size:20px !important; letter-spacing:2px !important; white-space:nowrap; }

    /* Group team pills — hide on mobile */
    .group-team-pills { display:none !important; }

    /* Column headers — hide on mobile */
    .match-col-headers { display:none !important; }

    /* Match row — 2-row grid layout */
    .match-row {
      grid-template-columns: 1fr auto 1fr !important;
      grid-template-rows: auto auto !important;
      grid-template-areas:
        "home pred away"
        "date result pts" !important;
      gap: 4px 6px !important;
      padding: 10px 12px !important;
    }
    .match-row > *:nth-child(1) { grid-area: date; align-self:center; }
    .match-row > *:nth-child(2) { grid-area: home; min-width:0; }
    .match-row > *:nth-child(3) { grid-area: pred; justify-content:center; }
    .match-row > *:nth-child(4) { grid-area: away; flex-direction:row-reverse !important; justify-content:flex-start !important; min-width:0; }
    .match-row > *:nth-child(5) { grid-area: result; justify-content:center; }
    .match-row > *:nth-child(6) { grid-area: pts; justify-content:flex-end; align-self:center; }

    /* Team names truncate on mobile */
    .match-row > *:nth-child(2) span,
    .match-row > *:nth-child(4) span { font-size:12px !important; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

    /* Smaller flags and inputs on mobile */
    .flag-bubble { width:26px !important; height:26px !important; font-size:15px !important; flex-shrink:0; }
    .score-inp   { width:32px !important; height:32px !important; font-size:14px !important; }

    /* Leaderboard — show only rank, name, total */
    .lb-card { grid-template-columns: 36px 1fr 64px !important; }
    .lb-card > *:nth-child(3),
    .lb-card > *:nth-child(4),
    .lb-card > *:nth-child(5) { display:none !important; }

    /* La llave standings */
    .st-row { padding:5px 10px; gap:2px; }

    /* Section headers — stack vertically */
    .section-header { flex-direction:column !important; align-items:flex-start !important; gap:4px !important; }
    .section-header span { font-size:11px !important; }

    /* Agregar participante — apilar en vertical */
    .add-part-row { flex-direction:column !important; }
    .add-part-row > * { width:100% !important; }
    .add-part-pass { width:100% !important; }
    .add-part-btn { padding:11px 0 !important; }

    /* Podio — un poco más compacto */
    .pod-name { font-size:12px !important; }
    .pod-flag { font-size:28px !important; }
    .pod-medal { font-size:24px !important; }
  }

  /* ═══ BANNER NUEVA VERSIÓN ═══ */
  .update-banner {
    position:fixed; left:50%; bottom:18px; transform:translateX(-50%);
    z-index:500; display:flex; align-items:center; gap:14px; flex-wrap:wrap; justify-content:center;
    max-width:calc(100vw - 24px);
    padding:11px 16px; border-radius:14px;
    background:rgba(8,16,40,0.97); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
    border:1px solid rgba(245,158,11,0.5); box-shadow:0 10px 30px rgba(0,0,0,0.55);
    font-family:'DM Sans',sans-serif; font-size:14px; color:var(--white); font-weight:500;
    animation:upIn 0.4s cubic-bezier(0.2,0.8,0.2,1) both;
  }
  .update-banner .btn { padding:7px 16px; }
  @keyframes upIn { 0%{opacity:0; transform:translate(-50%,18px);} 100%{opacity:1; transform:translate(-50%,0);} }
`;

/* ═══════════════════════ SEARCHABLE SELECT ═══════════════════════ */
function SearchableSelect({ options, value, onChange, placeholder = "Elegir…", disabled, gold }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected = options.find(o => o.value === value);
  const ql = q.trim().toLowerCase();
  const filtered = ql
    ? options.filter(o => o.label.toLowerCase().includes(ql) || (o.sub || "").toLowerCase().includes(ql))
    : options;
  const showCustom = ql && !options.some(o => o.label.toLowerCase() === ql);

  return (
    <div className="ss-wrap" ref={wrapRef}>
      <button type="button" disabled={disabled}
        className={`ss-trigger${open ? " open" : ""}${gold ? " gold" : ""}`}
        onClick={() => { if (!disabled) { setOpen(o => !o); setQ(""); } }}>
        {selected ? (
          <>
            {selected.flag && <span className="ss-flag">{selected.flag}</span>}
            <span>{selected.label}</span>
            {selected.sub && <span className="ss-opt-sub">{selected.sub}</span>}
          </>
        ) : (
          <span className="ss-placeholder">{placeholder}</span>
        )}
        <span className="ss-chev">▼</span>
      </button>
      {open && (
        <div className="ss-panel">
          <input className="ss-searchbox" autoFocus placeholder="Buscar…" value={q}
            onChange={e => setQ(e.target.value)} />
          {value && (
            <div className="ss-opt" onClick={() => { onChange(""); setOpen(false); }}>
              <span className="ss-flag">✖️</span><span className="ss-opt-label" style={{ color: "var(--silver)" }}>Quitar selección</span>
            </div>
          )}
          {filtered.map(o => (
            <div key={o.value} className="ss-opt" onClick={() => { onChange(o.value); setOpen(false); }}>
              {o.flag && <span className="ss-flag">{o.flag}</span>}
              <span className="ss-opt-label">{o.label}</span>
              {o.sub && <span className="ss-opt-sub">{o.sub}</span>}
            </div>
          ))}
          {showCustom && (
            <div className="ss-opt" onClick={() => { onChange(q.trim()); setOpen(false); }}>
              <span className="ss-flag">➕</span><span className="ss-opt-label">Usar: “{q.trim()}”</span>
            </div>
          )}
          {!filtered.length && !showCustom && <div className="ss-empty">Sin resultados</div>}
        </div>
      )}
    </div>
  );
}

// Opciones para los selects de premios
const COUNTRY_OPTS = ALL_TEAMS.map(t => ({ value: t, label: t, flag: FL[t] || "🏳️" }));
const PLAYER_OPTS  = PLAYERS.map(p => ({ value: p.n, label: p.n, flag: FL[p.c] || "🏳️", sub: p.c }));
const GK_OPTS      = GKS.map(p => ({ value: p.n, label: p.n, flag: FL[p.c] || "🏳️", sub: p.c }));
const optsFor = (type) => type === "country" ? COUNTRY_OPTS : type === "gk" ? GK_OPTS : PLAYER_OPTS;

/* ═══════════════════════ APP ═══════════════════════ */
const DOC_REF = doc(db, "polla2026", "data");
const EMPTY   = { participants: [], predictions: {}, results: {}, passwords: {}, extras: {}, extrasResults: {}, brackets: {}, icons: {} };

export default function App() {
  const [data,   setData]   = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [tab,    setTab]    = useState("predicciones");
  const [grp,    setGrp]    = useState("A");
  const [grpKey, setGrpKey] = useState(0);
  const [person, setPerson] = useState("");
  const [adminMode,  setAdmin] = useState(false);
  const [showLogin,  setLogin] = useState(false);
  const [loginVal,   setLVal]  = useState("");
  const [loginErr,   setLErr]  = useState(false);
  const [newName,    setNName] = useState("");
  const [newPass,    setNPass] = useState("");
  const [nameErr,    setNErr]  = useState("");
  // session-only auth: which participants have entered their password this session
  const [authed,     setAuthed] = useState(new Set());
  const [showPartLogin,  setPartLogin]  = useState(false);
  const [partLoginTarget, setPartTarget] = useState("");
  const [partLoginVal,   setPLVal]  = useState("");
  const [partLoginErr,   setPLErr]  = useState(false);
  const [showDeleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteTarget,  setDeleteTarget] = useState("");
  const [deletePassVal, setDPVal]  = useState("");
  const [deletePassErr, setDPErr]  = useState(false);
  // edición de perfil (nombre + ícono)
  const [showEdit,   setShowEdit]   = useState(false);
  const [editTarget, setEditTarget] = useState("");
  const [editName,   setEditName]   = useState("");
  const [editIcon,   setEditIcon]   = useState("");
  const [editErr,    setEditErr]    = useState("");
  const [pendingEdit, setPendingEdit] = useState(false);
  const [h2hMatch,   setH2h]   = useState(null);
  const [formTip,    setFormTip] = useState(null); // { team, idx }
  const tipTimer = useRef(null);
  const [now, setNow] = useState(Date.now());
  const [updateReady, setUpdateReady] = useState(false);
  const newVerRef = useRef(false);

  /* Reloj para la cuenta regresiva */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* Detección de nueva versión desplegada (para pestañas ya abiertas) */
  useEffect(() => {
    const hashOf = (s) => (String(s || "").match(/index-([A-Za-z0-9_-]+)\.js/) || [])[1];
    const curHash = hashOf([...document.querySelectorAll("script[src]")]
      .map((s) => s.getAttribute("src")).find((s) => s && /\/assets\/index-.*\.js/.test(s)));
    if (!curHash) return; // dev mode: no hay bundle hasheado
    let cancelled = false;
    const check = async () => {
      try {
        const r = await fetch("/", { cache: "no-store" });
        if (!r.ok) return;
        const newHash = hashOf(await r.text());
        if (newHash && newHash !== curHash && !cancelled) {
          newVerRef.current = true;
          setUpdateReady(true);
        }
      } catch { /* sin red: reintenta luego */ }
    };
    const id = setInterval(check, 120000); // cada 2 min
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (newVerRef.current) window.location.reload(); // al volver a la pestaña, se actualiza solo
      else check();
    };
    document.addEventListener("visibilitychange", onVis);
    const t0 = setTimeout(check, 8000);
    return () => { cancelled = true; clearInterval(id); clearTimeout(t0); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  /* Cerrar tooltip de forma al tocar fuera */
  useEffect(() => {
    if (!formTip) return;
    const onDoc = (e) => { if (!e.target.closest?.(".form-sq-wrap")) setFormTip(null); };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [formTip]);

  /* Firestore real-time sync */
  useEffect(() => {
    const unsub = onSnapshot(DOC_REF, (snap) => {
      if (snap.exists()) {
        const s = snap.data();
        setData(s);
        // No auto-seleccionar perfil: arranca deseleccionado (no se ven predicciones sin elegir)
        setPerson(p => (p && s.participants?.includes(p) ? p : ""));
      }
      setLoaded(true);
    }, () => setLoaded(true));
    return unsub;
  }, []);

  const persist = (updater) => {
    setData(prev => {
      const next = updater(prev);
      setDoc(DOC_REF, next).catch(() => {});
      return next;
    });
  };

  /* Handlers */
  const addParticipant = () => {
    const n = newName.trim();
    const pw = newPass.trim();
    if (!n) return;
    if (!pw) { setNErr("La contraseña no puede estar vacía"); return; }
    if (data.participants.includes(n)) { setNErr("Ese nombre ya existe"); return; }
    if (isAI(n)) { setNErr("Ese nombre está reservado"); return; }
    if (data.participants.length >= 16) { setNErr("Máximo 16 participantes"); return; }
    persist(s => ({ ...s, participants: [...s.participants, n], passwords: { ...(s.passwords || {}), [n]: pw } }));
    setAuthed(prev => new Set(prev).add(n));
    if (!person) setPerson(n);
    setNName(""); setNPass(""); setNErr("");
  };

  const removePart = (name) => {
    persist(s => {
      const p = { ...s.predictions }; delete p[name];
      const pw = { ...(s.passwords || {}) }; delete pw[name];
      return { ...s, participants: s.participants.filter(x => x !== name), predictions: p, passwords: pw };
    });
    if (person === name) setPerson(data.participants.find(x => x !== name) || "");
  };

  const selectPerson = (name) => {
    if (isAI(name) || authed.has(name) || adminMode) {
      setPerson(name);
    } else {
      setPartTarget(name);
      setPLVal(""); setPLErr(false);
      setPartLogin(true);
    }
  };

  const requestDelete = (name) => {
    if (adminMode) { removePart(name); return; }
    setDeleteTarget(name); setDPVal(""); setDPErr(false); setDeleteConfirm(true);
  };

  const submitDelete = () => {
    const stored = (data.passwords || {})[deleteTarget];
    if (deletePassVal === stored) {
      removePart(deleteTarget);
      setDeleteConfirm(false); setDPVal("");
    } else {
      setDPErr(true);
    }
  };

  const submitPartLogin = () => {
    const stored = (data.passwords || {})[partLoginTarget];
    if (partLoginVal === stored) {
      const target = partLoginTarget;
      setAuthed(prev => new Set(prev).add(target));
      setPartLogin(false); setPLVal("");
      if (pendingEdit) { setPendingEdit(false); openEdit(target, true); }
      else setPerson(target);
    } else {
      setPLErr(true);
    }
  };

  /* Edición de perfil: nombre + ícono (requiere contraseña / sesión) */
  const openEdit = (name, skipAuth = false) => {
    if (isAI(name)) return;
    if (!skipAuth && !(authed.has(name) || adminMode)) {
      setPartTarget(name); setPLVal(""); setPLErr(false);
      setPendingEdit(true); setPartLogin(true);
      return;
    }
    setEditTarget(name);
    setEditName(displayName(name));
    setEditIcon(iconFor(name) || "");
    setEditErr("");
    setShowEdit(true);
  };

  const saveProfile = () => {
    const oldName = editTarget;
    const newName = editName.trim();
    if (!newName) { setEditErr("El nombre no puede estar vacío"); return; }
    if (newName.length > 24) { setEditErr("Nombre muy largo (máx. 24)"); return; }
    if (newName !== oldName) {
      if (data.participants.includes(newName)) { setEditErr("Ese nombre ya existe"); return; }
      if (isAI(newName)) { setEditErr("Ese nombre está reservado"); return; }
    }
    persist(s => {
      const move = (obj) => {
        const n = { ...(obj || {}) };
        if (oldName !== newName && (oldName in n)) { n[newName] = n[oldName]; delete n[oldName]; }
        return n;
      };
      const icons = move(s.icons || {});
      if (editIcon) icons[newName] = editIcon; else delete icons[newName];
      return {
        ...s,
        participants: s.participants.map(x => x === oldName ? newName : x),
        predictions: move(s.predictions),
        passwords:   move(s.passwords),
        extras:      move(s.extras),
        brackets:    move(s.brackets),
        icons,
      };
    });
    if (oldName !== newName) {
      setAuthed(prev => { const nx = new Set(prev); if (nx.has(oldName)) { nx.delete(oldName); nx.add(newName); } return nx; });
      setPerson(p => (p === oldName ? newName : p));
    }
    setShowEdit(false); setEditErr("");
  };

  const setPred = (matchId, side, val) => {
    if (!person) return;
    persist(s => ({ ...s, predictions: { ...s.predictions, [person]: { ...(s.predictions[person] || {}), [matchId]: { ...(s.predictions[person]?.[matchId] || { h: "", a: "" }), [side]: val } } } }));
  };

  const setResult = (matchId, side, val) => {
    persist(s => ({ ...s, results: { ...s.results, [matchId]: { ...(s.results[matchId] || { h: null, a: null }), [side]: val === "" ? null : Math.max(0, Math.min(30, +val || 0)) } } }));
  };

  const setExtra = (catId, val) => {
    if (!person) return;
    persist(s => ({ ...s, extras: { ...(s.extras || {}), [person]: { ...((s.extras || {})[person] || {}), [catId]: val } } }));
  };

  const setExtraResult = (catId, val) => {
    persist(s => ({ ...s, extrasResults: { ...(s.extrasResults || {}), [catId]: val } }));
  };

  const setBracketPick = (slotId, team) => {
    if (!person) return;
    persist(s => ({ ...s, brackets: { ...(s.brackets || {}), [person]: { ...((s.brackets || {})[person] || {}), [slotId]: team } } }));
  };

  const resetBracket = () => {
    if (!person) return;
    persist(s => ({ ...s, brackets: { ...(s.brackets || {}), [person]: {} } }));
  };

  const switchGrp = (g) => { setGrp(g); setGrpKey(k => k + 1); };

  if (!loaded) return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#03091a", gap: 16 }}>
      <div style={{ fontSize: 40 }}>⚽</div>
      <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 18, color: "#60a5fa", letterSpacing: 4 }}>CARGANDO...</div>
    </div>
  );

  const sorted = [...data.participants].sort((a, b) => grandTotal(b, data) - grandTotal(a, data));
  const totalRes = Object.keys(data.results).filter(k => data.results[k]?.h != null && data.results[k]?.a != null).length;
  const filledP = person ? Object.values(MATCHES).flat().filter(m => { const p = data.predictions[person]?.[m.id]; return p?.h !== "" && p?.h != null && p?.a !== "" && p?.a != null; }).length : 0;

  const openTip = (el, payload) => {
    const r = el.getBoundingClientRect();
    setFormTip({ ...payload, x: r.left + r.width / 2, y: r.top });
  };

  /* Nombre e ícono de visualización (el emoji inicial se vuelve ícono) */
  const displayName = (name) => splitName(name).clean;
  const iconFor = (name) => (data.icons || {})[name] || splitName(name).icon || null;
  const avatarFor = (name) => iconFor(name) || displayName(name)[0]?.toUpperCase() || "?";

  /* Chips de participantes (reutilizado en varias pestañas) */
  const renderPartChips = () => data.participants.map(p => {
    const ic = iconFor(p);
    return (
      <button key={p} className={`part-chip${person === p ? " active" : ""}`} onClick={() => selectPerson(p)}>
        {ic && <span style={{ marginRight: 5 }}>{ic}</span>}{displayName(p)}
        {!isAI(p) && !authed.has(p) && !adminMode && <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 4 }}>🔒</span>}
        {isAI(p) && <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 4 }}>🤖</span>}
      </button>
    );
  });

  const renderForm = (team, right) => {
    const f = (data.form || {})[team];
    if (!f || !f.length) return null;
    return (
      <div className={`form-row${right ? " right" : ""}`}>
        {f.slice(-5).map((entry, i) => {
          const e = typeof entry === "string" ? { r: entry } : (entry || {});
          const payload = { team, idx: i, e };
          const isOpen = formTip && formTip.team === team && formTip.idx === i;
          return (
            <span key={i} className="form-sq-wrap"
              onMouseEnter={(ev) => { const el = ev.currentTarget; clearTimeout(tipTimer.current); tipTimer.current = setTimeout(() => openTip(el, payload), 500); }}
              onMouseLeave={() => { clearTimeout(tipTimer.current); setFormTip(t => (t && t.team === team && t.idx === i ? null : t)); }}
              onClick={(ev) => { ev.stopPropagation(); clearTimeout(tipTimer.current); isOpen ? setFormTip(null) : openTip(ev.currentTarget, payload); }}>
              <span className={`form-sq form-${e.r}`} />
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="stadium-bg" style={{ minHeight: "100vh", color: "var(--white)", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{CSS}</style>

      {/* ══ BANNER NUEVA VERSIÓN ══ */}
      {updateReady && (
        <div className="update-banner">
          <span>🔄 Hay una nueva versión disponible</span>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Actualizar</button>
        </div>
      )}

      {/* ══ HEADER ══ */}
      <header style={{ borderBottom: "1px solid rgba(148,163,184,0.1)", padding: "16px 20px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 className="header-title" style={{ fontFamily: "'Oswald',sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: 4, marginBottom: 3, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ filter: "drop-shadow(0 0 6px rgba(59,130,246,0.5))" }}>⚽</span>
              <span className="shimmer-text">POLLA MUNDIALERA 2026</span>
            </h1>
            <div className="header-meta" style={{ fontSize: 12, color: "var(--silver)", letterSpacing: 1.5, fontWeight: 500 }}>
              {data.participants.length} PARTICIPANTE{data.participants.length !== 1 ? "S" : ""} &nbsp;·&nbsp; {totalRes}/72 RESULTADOS &nbsp;·&nbsp; <span className="host-flags">🇨🇦🇲🇽🇺🇸</span> ANFITRIONES
            </div>
          </div>
          <div className="header-btns" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {adminMode ? (
              <button className="btn" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", color: "var(--gold)" }} onClick={() => setAdmin(false)}>
                🔧 ADMIN ACTIVO
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={() => setLogin(true)}>🔒 Admin</button>
            )}
          </div>
        </div>
      </header>

      {/* ══ LOGIN MODAL ══ */}
      {showLogin && (
        <div className="modal" onClick={e => e.target === e.currentTarget && setLogin(false)}>
          <div className="glass" style={{ borderRadius: 16, padding: 32, width: 340 }}>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 24, fontWeight: 600, letterSpacing: 2, marginBottom: 6 }}>ACCESO ADMIN</div>
            <div style={{ fontSize: 13, color: "var(--silver)", marginBottom: 20 }}>Introduce la contraseña para gestionar resultados.</div>
            <input type="password" placeholder="Contraseña..." value={loginVal}
              onChange={e => { setLVal(e.target.value); setLErr(false); }}
              onKeyDown={e => { if (e.key === "Enter") { if (loginVal === ADMIN_PWD) { setAdmin(true); setLogin(false); setLVal(""); } else setLErr(true); } }}
              style={{ width: "100%", padding: "11px 14px", background: "rgba(6,14,38,0.8)", border: `1.5px solid ${loginErr ? "var(--rose)" : "rgba(148,163,184,0.2)"}`, borderRadius: 10, color: "var(--white)", fontSize: 15, outline: "none", marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }}
            />
            {loginErr && <p style={{ fontSize: 12, color: "var(--rose)", marginBottom: 10 }}>Contraseña incorrecta.</p>}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button className="btn btn-primary" style={{ flex: 1, padding: "11px 0" }} onClick={() => { if (loginVal === ADMIN_PWD) { setAdmin(true); setLogin(false); setLVal(""); } else setLErr(true); }}>Entrar</button>
              <button className="btn btn-ghost" onClick={() => { setLogin(false); setLVal(""); setLErr(false); }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRM MODAL ══ */}
      {showDeleteConfirm && (
        <div className="modal" onClick={e => e.target === e.currentTarget && setDeleteConfirm(false)}>
          <div className="glass" style={{ borderRadius: 16, padding: 32, width: 340 }}>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 22, fontWeight: 600, letterSpacing: 2, marginBottom: 6, color: "var(--rose)" }}>ELIMINAR PARTICIPANTE</div>
            <div style={{ fontSize: 13, color: "var(--silver)", marginBottom: 20 }}>
              Ingresa la contraseña de <strong style={{ color: "var(--white)" }}>{deleteTarget}</strong> para confirmar la eliminación.
            </div>
            <input type="password" placeholder="Contraseña..." value={deletePassVal} autoFocus
              onChange={e => { setDPVal(e.target.value); setDPErr(false); }}
              onKeyDown={e => e.key === "Enter" && submitDelete()}
              style={{ width: "100%", padding: "11px 14px", background: "rgba(6,14,38,0.8)", border: `1.5px solid ${deletePassErr ? "var(--rose)" : "rgba(148,163,184,0.2)"}`, borderRadius: 10, color: "var(--white)", fontSize: 15, outline: "none", marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }}
            />
            {deletePassErr && <p style={{ fontSize: 12, color: "var(--rose)", marginBottom: 10 }}>Contraseña incorrecta.</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" style={{ flex: 1, padding: "11px 0", background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.4)", color: "var(--rose)" }} onClick={submitDelete}>Eliminar</button>
              <button className="btn btn-ghost" onClick={() => { setDeleteConfirm(false); setDPVal(""); setDPErr(false); }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PARTICIPANT LOGIN MODAL ══ */}
      {showPartLogin && (
        <div className="modal" onClick={e => e.target === e.currentTarget && setPartLogin(false)}>
          <div className="glass" style={{ borderRadius: 16, padding: 32, width: 340 }}>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 24, fontWeight: 600, letterSpacing: 2, marginBottom: 6 }}>ACCESO</div>
            <div style={{ fontSize: 13, color: "var(--silver)", marginBottom: 20 }}>
              Ingresa tu contraseña para editar las predicciones de <strong style={{ color: "var(--white)" }}>{partLoginTarget}</strong>.
            </div>
            <input type="password" placeholder="Contraseña..." value={partLoginVal} autoFocus
              onChange={e => { setPLVal(e.target.value); setPLErr(false); }}
              onKeyDown={e => e.key === "Enter" && submitPartLogin()}
              style={{ width: "100%", padding: "11px 14px", background: "rgba(6,14,38,0.8)", border: `1.5px solid ${partLoginErr ? "var(--rose)" : "rgba(148,163,184,0.2)"}`, borderRadius: 10, color: "var(--white)", fontSize: 15, outline: "none", marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }}
            />
            {partLoginErr && <p style={{ fontSize: 12, color: "var(--rose)", marginBottom: 10 }}>Contraseña incorrecta.</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1, padding: "11px 0" }} onClick={submitPartLogin}>Entrar</button>
              <button className="btn btn-ghost" onClick={() => { setPartLogin(false); setPLVal(""); setPLErr(false); setPendingEdit(false); }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ EDIT PROFILE MODAL ══ */}
      {showEdit && (
        <div className="modal" onClick={e => e.target === e.currentTarget && setShowEdit(false)}>
          <div className="glass" style={{ borderRadius: 16, padding: 28, width: 380, maxWidth: "92vw" }}>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 22, fontWeight: 600, letterSpacing: 2, marginBottom: 6 }}>EDITAR PERFIL</div>
            <div style={{ fontSize: 13, color: "var(--silver)", marginBottom: 18 }}>Cambia tu nombre y elige un ícono.</div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 54, height: 54, borderRadius: 27, background: "rgba(37,99,235,0.2)", border: "2px solid rgba(37,99,235,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: editIcon ? 28 : 22, fontFamily: "'Oswald',sans-serif", fontWeight: 700, flexShrink: 0 }}>
                {editIcon || editName.trim()[0]?.toUpperCase() || "?"}
              </div>
              <input type="text" placeholder="Nombre..." value={editName} autoFocus maxLength={24}
                onChange={e => { setEditName(e.target.value); setEditErr(""); }}
                onKeyDown={e => e.key === "Enter" && saveProfile()}
                style={{ flex: 1, padding: "11px 14px", background: "rgba(6,14,38,0.8)", border: `1.5px solid ${editErr ? "var(--rose)" : "rgba(148,163,184,0.2)"}`, borderRadius: 10, color: "var(--white)", fontSize: 15, outline: "none", fontFamily: "'DM Sans',sans-serif" }}
              />
            </div>

            <p style={{ fontSize: 11, letterSpacing: 1.5, color: "var(--silver)", marginBottom: 8, fontWeight: 500 }}>ÍCONO</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6, marginBottom: 16, maxHeight: 150, overflowY: "auto" }}>
              {AVATAR_ICONS.map(ic => (
                <button key={ic} onClick={() => setEditIcon(ic === editIcon ? "" : ic)}
                  style={{ aspectRatio: "1", fontSize: 20, borderRadius: 9, cursor: "pointer",
                    border: `1.5px solid ${editIcon === ic ? "var(--blue-l)" : "rgba(148,163,184,0.15)"}`,
                    background: editIcon === ic ? "rgba(37,99,235,0.25)" : "rgba(15,31,66,0.5)",
                    boxShadow: editIcon === ic ? "0 0 10px rgba(37,99,235,0.4)" : "none" }}>
                  {ic}
                </button>
              ))}
            </div>

            {editErr && <p style={{ fontSize: 12, color: "var(--rose)", marginBottom: 10 }}>{editErr}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1, padding: "11px 0" }} onClick={saveProfile}>Guardar</button>
              <button className="btn btn-ghost" onClick={() => { setShowEdit(false); setEditErr(""); }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ FORM TOOLTIP (fijo) ══ */}
      {formTip && formTip.e && (() => {
        const e = formTip.e;
        const resWord = e.r === "W" ? "Victoria" : e.r === "D" ? "Empate" : e.r === "L" ? "Derrota" : "";
        return (
          <div className="form-tip-fixed" style={{ left: formTip.x, top: formTip.y }}>
            {e.opp ? (
              <>
                <span className="form-tip-top"><span className={`form-dot form-${e.r}`} />{resWord}</span>
                <span className="form-tip-score">{e.score || "—"}</span>
                <span className="form-tip-sub">vs {e.opp}</span>
                <span className="form-tip-date">{e.date ? fmtDate(e.date) : "fecha s/d"}{e.comp ? ` · ${e.comp}` : ""}</span>
              </>
            ) : (
              <span className="form-tip-sub">{resWord || "Sin detalle"}</span>
            )}
          </div>
        );
      })()}

      {/* ══ H2H MODAL ══ */}
      {h2hMatch && (() => {
        const key = h2hKey(h2hMatch.home, h2hMatch.away);
        const games = (data.h2h || {})[key] || [];
        return (
          <div className="modal" onClick={e => e.target === e.currentTarget && setH2h(null)}>
            <div className="glass" style={{ borderRadius: 16, padding: 24, width: 380, maxWidth: "92vw" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 4 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 30 }}>{FL[h2hMatch.home] || "🏳️"}</div>
                  <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 14, fontWeight: 600 }}>{h2hMatch.home}</div>
                </div>
                <span style={{ fontFamily: "'Oswald',sans-serif", fontSize: 14, color: "var(--silver)" }}>VS</span>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 30 }}>{FL[h2hMatch.away] || "🏳️"}</div>
                  <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 14, fontWeight: 600 }}>{h2hMatch.away}</div>
                </div>
              </div>
              <p style={{ fontSize: 11, letterSpacing: 2, color: "var(--silver)", textAlign: "center", margin: "10px 0 14px" }}>ÚLTIMOS ENFRENTAMIENTOS</p>
              {games.length ? games.slice(0, 3).map((g, i) => (
                <div key={i} className="h2h-row">
                  <div>
                    <div style={{ fontSize: 13, color: "var(--white)" }}>{key.replace(" vs ", " – ")}</div>
                    <div style={{ fontSize: 11, color: "var(--silver)" }}>{g.date}{g.comp ? ` · ${g.comp}` : ""}</div>
                  </div>
                  <span className="h2h-score">{g.score}</span>
                </div>
              )) : (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--silver)", fontSize: 13 }}>
                  Sin datos de historial aún.<br /><span style={{ fontSize: 11 }}>Se completará con la actualización automática.</span>
                </div>
              )}
              <button className="btn btn-ghost" style={{ width: "100%", marginTop: 12 }} onClick={() => setH2h(null)}>Cerrar</button>
            </div>
          </div>
        );
      })()}

      {/* ══ TABS ══ */}
      <div style={{ background: "rgba(6,14,38,0.7)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(148,163,184,0.08)", overflowX: "auto" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", padding: "0 12px" }}>
          {[
            { id: "predicciones", label: "⚽  Predicciones" },
            { id: "premios", label: "🎖️  Premios" },
            { id: "clasificacion", label: "🏆  Clasificación" },
            { id: "llave", label: "📊  Grupos" },
            { id: "bracket", label: "🔮  Eliminación" },
            { id: "participantes", label: "👥  Participantes" },
          ].map(t => (
            <button key={t.id} className={`tab-btn${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* ══ COUNTDOWN ══ */}
      {(() => {
        const kickoff = new Date(2026, 5, 11, 12, 0, 0).getTime(); // 11 jun 2026, primer partido
        const diff = kickoff - now;
        const pad = (n) => String(n).padStart(2, "0");
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        return (
          <div style={{ maxWidth: 1080, margin: "0 auto", padding: "16px 16px 0" }}>
            <div className="countdown glass">
              {diff > 0 ? (
                <>
                  <span className="countdown-label">⏱ FALTA PARA EL PRIMER PARTIDO</span>
                  <div className="countdown-units">
                    {[[d, "días"], [pad(h), "hrs"], [pad(m), "min"], [pad(s), "seg"]].map(([v, l]) => (
                      <div key={l} className="cd-unit">
                        <span className="cd-num">{v}</span>
                        <span className="cd-lbl">{l}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <span className="countdown-live">🔴 ¡EL MUNDIAL ESTÁ EN MARCHA!</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
              {sorted.length > 0 && grandTotal(sorted[0], data) > 0 && (
                <span className="leader-chip">👑 Líder: {avatarFor(sorted[0])} {displayName(sorted[0])} · {grandTotal(sorted[0], data)} pts</span>
              )}
              <p style={{ fontSize: 11.5, color: "var(--silver)", textAlign: "center", letterSpacing: 0.3 }}>
                🌅 Los resultados de cada jornada se actualizan a la mañana del día siguiente.
              </p>
            </div>
          </div>
        );
      })()}

      {/* ══ CONTENT ══ */}
      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "20px 16px" }}>
        <div key={tab} className="tab-fade">

        {/* ════ PREDICCIONES ════ */}
        {tab === "predicciones" && (
          <div>
            <div className="glass" style={{ borderRadius: 14, padding: "16px 20px", marginBottom: 16 }}>
              <p style={{ fontSize: 11, letterSpacing: 2, color: "var(--silver)", marginBottom: 10, fontWeight: 500 }}>SELECCIONAR PARTICIPANTE</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: person ? 10 : 0 }}>
                {!data.participants.length && <span style={{ fontSize: 14, color: "var(--silver)" }}>Agrega participantes en la pestaña 👥 primero</span>}
                {renderPartChips()}
              </div>
              {person && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: "var(--silver)", minWidth: 80 }}>{filledP}/72 completadas</span>
                  <div className="prog-track" style={{ flex: 1 }}>
                    <div className="prog-fill" style={{ width: `${(filledP / 72) * 100}%`, background: filledP === 72 ? "var(--emerald)" : "var(--blue-l)" }} />
                  </div>
                  <span style={{ fontSize: 12, color: filledP === 72 ? "var(--emerald)" : "var(--silver)", fontWeight: 600 }}>{Math.round((filledP / 72) * 100)}%</span>
                </div>
              )}
              {person && filledP === 72 && (
                <div className="done-banner">
                  {["🎉","🎊","✨","⭐","🍀","🎉","⚽","🎊"].map((c, i) => (
                    <span key={i} className="confetti" style={{ left: `${6 + i * 12}%`, animationDuration: `${2 + (i % 4) * 0.6}s`, animationDelay: `${(i % 5) * 0.3}s` }}>{c}</span>
                  ))}
                  <span style={{ position: "relative" }}>🎉 ¡Predicciones completas! Mucha suerte 🍀</span>
                </div>
              )}
            </div>

            {!person ? (
              <div className="glass" style={{ borderRadius: 14, padding: "44px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>👤</div>
                <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 20, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>Selecciona tu perfil</div>
                <div style={{ fontSize: 13.5, color: "var(--silver)", maxWidth: 360, margin: "0 auto", lineHeight: 1.6 }}>
                  {data.participants.length
                    ? "Elige tu perfil arriba e ingresa tu contraseña para ver y editar tus predicciones."
                    : "Agrega participantes en la pestaña 👥 para comenzar."}
                </div>
              </div>
            ) : (<>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--silver)", letterSpacing: 1.5, marginRight: 4, fontWeight: 500 }}>GRUPO</span>
              {GK.map(g => {
                const done = person ? MATCHES[g].every(m => { const p = data.predictions[person]?.[m.id]; return p?.h !== "" && p?.h != null && p?.a !== "" && p?.a != null; }) : false;
                return (
                  <button key={g} className={`grp-btn${grp === g ? " active" : ""}${done ? " done" : ""}`} onClick={() => switchGrp(g)} title={`Grupo ${g}: ${GD[g].join(", ")}`}>
                    {g}
                    {done && <span style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, borderRadius: 4, background: "var(--emerald)", border: "1.5px solid var(--navy-0)" }} />}
                  </button>
                );
              })}
            </div>

            <div className="glass" style={{ borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", background: "rgba(37,99,235,0.1)", borderBottom: "1px solid rgba(148,163,184,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span className="group-title" style={{ fontFamily: "'Oswald',sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: 3 }}>GRUPO {grp}</span>
                  <div className="group-team-pills" style={{ display: "flex", gap: 6 }}>
                    {GD[grp].map(t => (
                      <div key={t} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 20, background: "rgba(148,163,184,0.07)", border: "1px solid rgba(148,163,184,0.1)" }}>
                        <span style={{ fontSize: 14 }}>{FL[t]}</span>
                        <span style={{ fontSize: 11, color: "var(--silver)", fontWeight: 500 }}>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {adminMode && <span style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600, letterSpacing: 1 }}>🔧 MODO ADMIN</span>}
              </div>

              <div className="match-col-headers" style={{ display: "grid", gridTemplateColumns: "56px 1fr 130px 1fr 96px 52px", gap: 8, padding: "8px 18px", borderBottom: "1px solid rgba(148,163,184,0.08)", fontSize: 10, color: "var(--silver)", letterSpacing: 1.5, fontWeight: 600 }}>
                <div>FECHA</div>
                <div>LOCAL</div>
                <div style={{ textAlign: "center" }}>{person ? `PRED. ${displayName(person).split(" ")[0].toUpperCase()}` : "PREDICCIÓN"}</div>
                <div style={{ textAlign: "right" }}>VISITANTE</div>
                <div style={{ textAlign: "center" }}>RESULTADO</div>
                <div style={{ textAlign: "center" }}>PTS</div>
              </div>

              {MATCHES[grp].map((m, i) => {
                const dateLocked = isLocked(m.date);
                const locked = dateLocked || (!authed.has(person) && !adminMode);
                const pred = data.predictions[person]?.[m.id] || { h: "", a: "" };
                const res = data.results[m.id];
                const p = getPts(pred, res);
                const hasRes = res?.h != null && res?.a != null;
                const rowCls = `match-row row-anim${locked ? " locked" : ""}${p === 3 ? " pts3-row" : p === 1 ? " pts1-row" : p === 0 ? " pts0-row" : ""}`;

                return (
                  <div key={m.id} className={rowCls} style={{ animationDelay: `${i * 45}ms` }}>
                    <div>
                      <div style={{ fontSize: 12, color: dateLocked ? "var(--gold)" : "var(--silver)", fontWeight: 500 }}>{fmtDate(m.date)}</div>
                      {dateLocked && <div style={{ fontSize: 9, color: "var(--silver)", marginTop: 1, letterSpacing: 0.5 }}>🔒 CERRADO</div>}
                      <button className="h2h-btn" title="Historial entre estos equipos" onClick={() => setH2h(m)}>ℹ️</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className={`flag-bubble${hasRes && res.h > res.a ? " win" : ""}`}>{FL[m.home] || "🏳️"}</div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontFamily: "'Oswald',sans-serif", fontSize: 15, fontWeight: 600, letterSpacing: 0.3 }}>{m.home}</span>
                        {renderForm(m.home, false)}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      {isAI(person) && !adminMode ? (
                        <span style={{ fontSize: 12, color: "var(--silver)", letterSpacing: 0.5 }} title="Las predicciones de las IA están ocultas">🔒 oculto</span>
                      ) : (<>
                        <input type="number" min="0" max="30" className="score-inp" value={pred.h}
                          onChange={e => setPred(m.id, "h", e.target.value)} disabled={!person || locked}
                          style={{ borderColor: p === 3 ? "var(--gold)" : p === 1 ? "var(--emerald)" : p === 0 ? "var(--rose)" : "rgba(148,163,184,0.2)" }}
                        />
                        <span style={{ color: "var(--silver)", fontFamily: "'Oswald',sans-serif", fontSize: 16 }}>—</span>
                        <input type="number" min="0" max="30" className="score-inp" value={pred.a}
                          onChange={e => setPred(m.id, "a", e.target.value)} disabled={!person || locked}
                          style={{ borderColor: p === 3 ? "var(--gold)" : p === 1 ? "var(--emerald)" : p === 0 ? "var(--rose)" : "rgba(148,163,184,0.2)" }}
                        />
                      </>)}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
                      <div style={{ minWidth: 0, textAlign: "right" }}>
                        <span style={{ fontFamily: "'Oswald',sans-serif", fontSize: 15, fontWeight: 600, textAlign: "right", letterSpacing: 0.3 }}>{m.away}</span>
                        {renderForm(m.away, true)}
                      </div>
                      <div className={`flag-bubble${hasRes && res.a > res.h ? " win" : ""}`}>{FL[m.away] || "🏳️"}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      {adminMode ? (
                        <>
                          <input type="number" min="0" max="30" className="score-inp" value={res?.h ?? ""} onChange={e => setResult(m.id, "h", e.target.value)}
                            style={{ width: 36, height: 34, fontSize: 15, borderColor: "var(--gold)", background: "rgba(245,158,11,0.08)" }} />
                          <span style={{ color: "var(--silver)", fontSize: 12 }}>–</span>
                          <input type="number" min="0" max="30" className="score-inp" value={res?.a ?? ""} onChange={e => setResult(m.id, "a", e.target.value)}
                            style={{ width: 36, height: 34, fontSize: 15, borderColor: "var(--gold)", background: "rgba(245,158,11,0.08)" }} />
                        </>
                      ) : hasRes ? (
                        <span className="res-score">{res.h}–{res.a}</span>
                      ) : (
                        <span style={{ color: "var(--silver)", fontSize: 12, letterSpacing: 1 }}>– –</span>
                      )}
                    </div>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      {p != null && (
                        <span key={`${m.id}-${p}`} className="badge-pop" style={{
                          padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                          fontFamily: "'Oswald',sans-serif", letterSpacing: 0.5,
                          background: p === 3 ? "rgba(245,158,11,0.2)" : p === 1 ? "rgba(16,185,129,0.2)" : "rgba(244,63,94,0.18)",
                          border: `1px solid ${p === 3 ? "var(--gold)" : p === 1 ? "var(--emerald)" : "var(--rose)"}`,
                          color: p === 3 ? "var(--gold-l)" : p === 1 ? "var(--emerald)" : "var(--rose)",
                        }}>
                          {p === 3 ? "+3" : p === 1 ? "+1" : "0"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {person && (
                <div style={{ padding: "12px 20px", background: "rgba(37,99,235,0.07)", borderTop: "1px solid rgba(148,163,184,0.08)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "var(--silver)", letterSpacing: 1 }}>SUBTOTAL GRUPO {grp}</span>
                  <span style={{ fontFamily: "'Oswald',sans-serif", fontSize: 24, fontWeight: 700, color: "var(--gold-l)" }}>
                    {MATCHES[grp].reduce((s, m) => s + (getPts(data.predictions[person]?.[m.id], data.results[m.id]) ?? 0), 0)} pts
                  </span>
                  <span style={{ fontSize: 12, color: "var(--silver)" }}>·</span>
                  <span style={{ fontSize: 12, color: "var(--emerald)", fontWeight: 500 }}>
                    {MATCHES[grp].filter(m => getPts(data.predictions[person]?.[m.id], data.results[m.id]) === 3).length} exacto{MATCHES[grp].filter(m => getPts(data.predictions[person]?.[m.id], data.results[m.id]) === 3).length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
            </>)}
          </div>
        )}

        {/* ════ PREMIOS ════ */}
        {tab === "premios" && (() => {
          const tournamentStarted = todayStr() >= TOURNAMENT_START;
          const canEdit = !isAI(person) && (adminMode || (!!person && authed.has(person) && !tournamentStarted));
          const hideExtras = isAI(person) && !adminMode;
          const myExtras = (data.extras || {})[person] || {};
          const er = data.extrasResults || {};
          return (
            <div>
              <div className="section-header" style={{ marginBottom: 16, display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <h2 style={{ fontFamily: "'Oswald',sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: 3 }}>PREMIOS</h2>
                <span style={{ fontSize: 13, color: "var(--silver)" }}>predicciones especiales · suman puntos extra</span>
              </div>

              {/* Participant selector */}
              <div className="glass" style={{ borderRadius: 14, padding: "16px 20px", marginBottom: 16 }}>
                <p style={{ fontSize: 11, letterSpacing: 2, color: "var(--silver)", marginBottom: 10, fontWeight: 500 }}>SELECCIONAR PARTICIPANTE</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {!data.participants.length && <span style={{ fontSize: 14, color: "var(--silver)" }}>Agrega participantes en la pestaña 👥 primero</span>}
                  {data.participants.map(p => (
                    <button key={p} className={`part-chip${person === p ? " active" : ""}`} onClick={() => selectPerson(p)}>
                      {p} {!isAI(p) && !authed.has(p) && !adminMode && <span style={{ fontSize: 11, opacity: 0.6 }}>🔒</span>}{isAI(p) && <span style={{ fontSize: 10, opacity: 0.7 }}>🤖</span>}
                    </button>
                  ))}
                </div>
                {person && tournamentStarted && !adminMode && (
                  <p style={{ fontSize: 12, color: "var(--gold)", marginTop: 10 }}>🔒 El torneo ya comenzó — las predicciones de premios están cerradas.</p>
                )}
              </div>

              {/* Cards */}
              {person && hideExtras && (
                <div className="glass" style={{ borderRadius: 14, padding: "28px", textAlign: "center", color: "var(--silver)", fontSize: 14 }}>
                  🔒 Las predicciones de premios de las IA están ocultas.
                </div>
              )}
              {person && !hideExtras && (
                <div className="extras-grid">
                  {EXTRA_CATS.map(c => {
                    const pick = myExtras[c.id] || "";
                    const real = er[c.id];
                    const resolved = !!real;
                    const hit = resolved && pick && pick === real;
                    const opts = optsFor(c.type);
                    const flagFor = (v) => c.type === "country" ? (FL[v] || "🏳️") : (FL[PLAYER_COUNTRY[v]] || "🏳️");
                    return (
                      <div key={c.id} className={`extra-card lift${hit ? " done" : ""}${pick && !resolved ? " picked" : ""}`}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <div className="extra-icon">{c.icon}</div>
                          {pick && <div className="extra-pick-flag" title={pick}>{flagFor(pick)}</div>}
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                          <span style={{ fontFamily: "'Oswald',sans-serif", fontSize: 19, fontWeight: 600, letterSpacing: 1 }}>{c.label.toUpperCase()}</span>
                          <span className="extra-pts">+{c.pts}</span>
                        </div>
                        <SearchableSelect
                          options={opts}
                          value={pick}
                          onChange={(v) => setExtra(c.id, v)}
                          placeholder={c.type === "country" ? "Elegir país…" : "Elegir jugador…"}
                          disabled={!canEdit}
                        />
                        {resolved && (
                          <div style={{ marginTop: 10, fontSize: 12, display: "flex", alignItems: "center", gap: 6, color: hit ? "var(--emerald)" : "var(--rose)" }}>
                            <span>{hit ? "✓" : "✗"}</span>
                            <span>Resultado oficial: <strong>{flagFor(real)} {real}</strong> {hit ? `(+${c.pts})` : "(0)"}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Admin: official results */}
              {adminMode && (
                <div className="glass" style={{ borderRadius: 16, padding: 20, marginTop: 20, border: "1px solid rgba(245,158,11,0.3)" }}>
                  <p style={{ fontFamily: "'Oswald',sans-serif", fontSize: 16, fontWeight: 600, letterSpacing: 2, color: "var(--gold)", marginBottom: 14 }}>🔧 RESULTADOS OFICIALES (ADMIN)</p>
                  <div className="extras-grid">
                    {EXTRA_CATS.map(c => (
                      <div key={c.id}>
                        <p style={{ fontSize: 12, color: "var(--silver)", marginBottom: 6 }}>{c.icon} {c.label}</p>
                        <SearchableSelect
                          options={optsFor(c.type)}
                          value={er[c.id] || ""}
                          onChange={(v) => setExtraResult(c.id, v)}
                          placeholder="Definir ganador…"
                          gold
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ════ CLASIFICACIÓN ════ */}
        {tab === "clasificacion" && (() => {
          const maxPts = sorted.length ? Math.max(1, grandTotal(sorted[0], data)) : 1;
          const leaderPts = sorted.length ? grandTotal(sorted[0], data) : 0;
          const showPodium = sorted.length >= 2 && leaderPts > 0;
          const top3 = sorted.slice(0, 3);
          const podConfetti = ["🎉","🎊","✨","⭐","🏅","🎉","⭐","🎊"];
          return (
          <div>
            <div className="section-header" style={{ marginBottom: 18, display: "flex", alignItems: "baseline", gap: 12 }}>
              <h2 style={{ fontFamily: "'Oswald',sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: 3 }}>CLASIFICACIÓN</h2>
              <span style={{ fontSize: 13, color: "var(--silver)" }}>fase de grupos · {totalRes}/72 resultados registrados</span>
            </div>

            {/* Podio de líderes */}
            {showPodium && (
              <div className="podium-wrap" style={{ marginTop: 0, marginBottom: 24 }}>
                <div className="podium">
                  {[{ rank: 2, name: top3[1], cls: "pod-2", medal: "🥈" },
                    { rank: 1, name: top3[0], cls: "pod-1", medal: "🥇" },
                    { rank: 3, name: top3[2], cls: "pod-3", medal: "🥉" }].map(({ rank, name, cls, medal }) => (
                    <div key={rank} className="pod">
                      {name ? (
                        <>
                          <div className="pod-top">
                            <div className="pod-medal">{medal}</div>
                            <div className={`pod-av-lg${rank === 1 ? " gold" : ""}`}>{avatarFor(name)}</div>
                            <div className="pod-name">{displayName(name)}</div>
                            <div className="pod-pts">{grandTotal(name, data)} pts</div>
                          </div>
                          <div className={`pod-base ${cls}`}>
                            {rank === 1 && podConfetti.map((c, i) => (
                              <span key={i} className="confetti" style={{ left: `${6 + i * 11}%`, animationDuration: `${2 + (i % 4) * 0.6}s`, animationDelay: `${(i % 5) * 0.3}s` }}>{c}</span>
                            ))}
                            <span className="pod-rank">{rank}</span>
                          </div>
                        </>
                      ) : <div className="pod-top"><div className="pod-empty">—</div></div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="glass" style={{ borderRadius: 14, overflow: "hidden" }}>
              <div className="lb-card" style={{ background: "rgba(37,99,235,0.1)", borderBottom: "1px solid rgba(148,163,184,0.1)", fontSize: 10, color: "var(--silver)", letterSpacing: 1.5, fontWeight: 600 }}>
                <div>#</div><div>PARTICIPANTE</div>
                <div style={{ textAlign: "center" }}>JUGADOS</div>
                <div style={{ textAlign: "center", color: "var(--gold)" }}>+3 pts</div>
                <div style={{ textAlign: "center", color: "var(--emerald)" }}>+1 pt</div>
                <div style={{ textAlign: "center", fontSize: 11 }}>TOTAL</div>
              </div>
              {!sorted.length && <div style={{ padding: "36px", textAlign: "center", color: "var(--silver)", fontSize: 14 }}>No hay participantes aún — ve a la pestaña 👥</div>}
              {sorted.map((name, i) => {
                const pts = grandTotal(name, data);
                const exact = countExact(name, data.predictions, data.results);
                const played = countPlayed(name, data.predictions, data.results);
                const winners = Object.values(MATCHES).flat().filter(m => getPts(data.predictions[name]?.[m.id], data.results[m.id]) === 1).length;
                const medal = ["🥇", "🥈", "🥉"][i] || (i + 1);
                const isTop = i === 0;
                const isMe = !!person && person === name;
                const barPct = Math.round((pts / maxPts) * 100);
                return (
                  <div key={name} className={`lb-card row-anim${isMe ? " lb-me" : ""}`} style={{ animationDelay: `${Math.min(i, 12) * 40}ms`, background: isTop ? "rgba(245,158,11,0.06)" : undefined }}>
                    <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: i < 3 ? 22 : 16, color: i < 3 ? "var(--gold-l)" : "var(--silver)", fontWeight: 700 }}>{medal}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                      <div className={`lb-av${isTop ? " gold" : ""}`}>{avatarFor(name)}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 17, fontWeight: 600, color: isTop ? "var(--gold-l)" : "var(--white)", letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {displayName(name)}{isMe && <span className="lb-me-badge">TÚ</span>}
                        </div>
                        <div className="lb-bar"><div className={`lb-bar-fill${isTop ? " gold" : ""}`} style={{ width: `${barPct}%` }} /></div>
                      </div>
                    </div>
                    <div style={{ textAlign: "center", color: "var(--silver)", fontSize: 14 }}>{played}</div>
                    <div style={{ textAlign: "center", fontFamily: "'Oswald',sans-serif", fontSize: 17, fontWeight: 700, color: "var(--gold)" }}>{exact}</div>
                    <div style={{ textAlign: "center", fontFamily: "'Oswald',sans-serif", fontSize: 17, fontWeight: 700, color: "var(--emerald)" }}>{winners}</div>
                    <div style={{ textAlign: "center", fontFamily: "'Oswald',sans-serif", fontSize: 28, fontWeight: 700, color: isTop ? "var(--gold-l)" : "var(--white)" }}>{pts}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[{ c: "var(--gold)", l: "Marcador exacto = 3 pts" }, { c: "var(--emerald)", l: "Ganador correcto = 1 pt" }, { c: "var(--rose)", l: "Fallo total = 0 pts" }].map(x => (
                <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: `${x.c}14`, border: `1px solid ${x.c}55`, borderRadius: 20, fontSize: 12, color: "var(--silver-l)", fontWeight: 500 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 4, background: x.c, display: "inline-block" }} />{x.l}
                </div>
              ))}
            </div>
          </div>
          );
        })()}

        {/* ════ LA LLAVE ════ */}
        {tab === "llave" && (
          <div>
            <div style={{ marginBottom: 6 }}>
              <h2 style={{ fontFamily: "'Oswald',sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: 3, marginBottom: 4 }}>LA LLAVE</h2>
              <p style={{ fontSize: 12, color: "var(--silver)" }}>Top 2 de cada grupo clasifican directamente · 8 mejores terceros también avanzan al Round of 32</p>
            </div>
            <div style={{ height: 16 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
              {GK.map(g => {
                const st = getStandings(g, data.results);
                const done = MATCHES[g].filter(m => data.results[m.id]?.h != null && data.results[m.id]?.a != null).length;
                const complete = done === 6;
                return (
                  <div key={g} className="glass lift" style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${complete ? "rgba(16,185,129,0.25)" : "rgba(148,163,184,0.1)"}` }}>
                    <div style={{ padding: "10px 14px", background: "rgba(37,99,235,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
                      <span style={{ fontFamily: "'Oswald',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>GRUPO {g}</span>
                      <span style={{ fontSize: 10, color: complete ? "var(--emerald)" : "var(--silver)", letterSpacing: 1, fontWeight: 600 }}>{complete ? "✓ COMPLETO" : `${done}/6 partidos`}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 24px 24px 24px 24px 30px 34px", gap: 4, padding: "5px 12px 4px", fontSize: 9, color: "var(--silver)", letterSpacing: 1, fontWeight: 600 }}>
                      <div /><div>EQUIPO</div>
                      <div style={{ textAlign: "center" }}>PJ</div><div style={{ textAlign: "center" }}>G</div>
                      <div style={{ textAlign: "center" }}>E</div><div style={{ textAlign: "center" }}>P</div>
                      <div style={{ textAlign: "center" }}>DG</div><div style={{ textAlign: "center" }}>PTS</div>
                    </div>
                    {st.map((row, i) => (
                      <div key={row.t} className={`st-row${i < 2 ? " top" : ""}${i === 2 ? " div" : ""}`}
                        style={{ borderLeft: `3px solid ${i < 2 ? "var(--emerald)" : i === 2 ? "rgba(245,158,11,0.6)" : "transparent"}` }}>
                        <div style={{ fontSize: 18, lineHeight: 1 }}>{FL[row.t] || "🏳️"}</div>
                        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: i < 2 ? 600 : 400, color: i < 2 ? "var(--white)" : "var(--silver)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.t}
                        </div>
                        {[row.p, row.w, row.d, row.l].map((v, vi) => (
                          <div key={vi} style={{ textAlign: "center", fontSize: 11, color: "var(--silver)" }}>{v}</div>
                        ))}
                        <div style={{ textAlign: "center", fontSize: 11, color: row.gd > 0 ? "var(--emerald)" : row.gd < 0 ? "var(--rose)" : "var(--silver)" }}>{row.gd > 0 ? "+" : ""}{row.gd}</div>
                        <div style={{ textAlign: "center", fontFamily: "'Oswald',sans-serif", fontSize: 17, fontWeight: 700, color: i < 2 ? "var(--gold-l)" : "var(--silver)" }}>{row.pts}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[{ c: "var(--emerald)", l: "1° y 2° clasifican directo" }, { c: "var(--gold)", l: "3° opta a mejor tercero" }].map(x => (
                <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: `${x.c}14`, border: `1px solid ${x.c}55`, borderRadius: 20, fontSize: 12, color: "var(--silver-l)", fontWeight: 500 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: x.c, display: "inline-block" }} />{x.l}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }} className="glass-sm">
              <div style={{ padding: "12px 16px", borderRadius: 10, fontSize: 12, color: "var(--silver)" }}>
                ℹ️  Jornadas finales simultáneas: Grupos A–C el 24 jun · D–F el 25 jun · G–H el 26 jun · I–L el 27 jun
              </div>
            </div>
          </div>
        )}

        {/* ════ ELIMINACIÓN (bracket) ════ */}
        {tab === "bracket" && (() => {
          const canEdit = !!person && !isAI(person) && (adminMode || authed.has(person));
          const hideBracket = isAI(person) && !adminMode;
          const predForPerson = person ? (data.predictions[person] || {}) : {};
          const seeds = getQualified(predForPerson);
          const picks = person ? ((data.brackets || {})[person] || {}) : {};
          const { roundsData, champion } = buildBracket(seeds, picks);
          const confettiBits = ["🎉","🎊","⚽","✨","🏅","🎉","⭐","🎊"];
          // Podio: campeón, subcampeón y partido por el 3er lugar
          const sfRound = roundsData.find(r => r.id === "SF");
          const fRound  = roundsData.find(r => r.id === "F");
          const fMatch  = fRound?.matches[0];
          const runnerUp = (fMatch && fMatch.w) ? (fMatch.a === fMatch.w ? fMatch.b : fMatch.a) : null;
          const sfLosers = sfRound ? sfRound.matches.map(m => (m.w ? (m.a === m.w ? m.b : m.a) : null)) : [null, null];
          const tpReady = !!(sfLosers[0] && sfLosers[1]);
          const tpPick  = picks["TP-0"];
          const third   = (tpReady && (tpPick === sfLosers[0] || tpPick === sfLosers[1])) ? tpPick : null;
          const fourth  = third ? (third === sfLosers[0] ? sfLosers[1] : sfLosers[0]) : null;
          return (
            <div>
              <div className="section-header" style={{ marginBottom: 6, display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <h2 style={{ fontFamily: "'Oswald',sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: 3 }}>ELIMINACIÓN</h2>
                <span style={{ fontSize: 13, color: "var(--silver)" }}>simulador · NO afecta tu puntaje</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--silver)", marginBottom: 14, maxWidth: 620, lineHeight: 1.6 }}>
                El cuadro se arma con <strong style={{ color: "var(--white)" }}>tus predicciones de grupos</strong> (1° y 2° de cada grupo + los 8 mejores terceros). Haz clic en un equipo para hacerlo avanzar y ve quién sería tu campeón. 🏆
              </p>

              {/* Participant selector */}
              <div className="glass" style={{ borderRadius: 14, padding: "14px 18px", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 11, letterSpacing: 2, color: "var(--silver)", fontWeight: 500, marginRight: 4 }}>PARTICIPANTE</span>
                  {!data.participants.length && <span style={{ fontSize: 14, color: "var(--silver)" }}>Agrega participantes primero</span>}
                  {renderPartChips()}
                  {canEdit && <button className="btn btn-ghost" style={{ marginLeft: "auto" }} onClick={resetBracket}>↺ Reiniciar</button>}
                </div>
              </div>

              {!person ? (
                <div style={{ padding: "36px", textAlign: "center", color: "var(--silver)", fontSize: 14 }}>Selecciona un participante para ver su cuadro</div>
              ) : hideBracket ? (
                <div className="glass" style={{ borderRadius: 14, padding: "36px", textAlign: "center", color: "var(--silver)", fontSize: 14 }}>🔒 El cuadro de eliminación de las IA está oculto.</div>
              ) : (<>
                <div className="bracket-scroll">
                  <div className={`bracket${canEdit ? "" : " bk-readonly"}`}>
                    {roundsData.map((R) => (
                      <div key={R.id} className="bk-round">
                        <div className="bk-round-head">{R.label}</div>
                        <div className="bk-col">
                          {R.matches.map((m) => {
                            const renderTeam = (t, side) => {
                              if (!t) return <div key={`${R.id}-${m.idx}-${side}-empty`} className="bk-team empty"><span className="bk-flag">⬚</span><span className="bk-name">Por definir</span></div>;
                              const isWin = m.w === t;
                              const cls = `bk-team${isWin ? " win" : ""}${m.w && m.w !== t ? " lose" : ""}`;
                              return (
                                <div key={`${R.id}-${m.idx}-${t}`} className={cls} onClick={() => canEdit && setBracketPick(`${R.id}-${m.idx}`, t)}>
                                  <span className="bk-flag">{FL[t] || "🏳️"}</span>
                                  <span className="bk-name">{t}</span>
                                </div>
                              );
                            };
                            const cellCls = `bk-cell${m.w ? " bk-won" : ""}${(m.a || m.b) ? " bk-lit" : ""}`;
                            return (
                              <div key={m.idx} className={cellCls}>
                                <div className="bk-match">
                                  {renderTeam(m.a, "a")}{renderTeam(m.b, "b")}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Partido por el 3er lugar */}
                <div style={{ marginTop: 22, maxWidth: 360 }}>
                  <p style={{ fontSize: 11, letterSpacing: 2, color: "var(--silver)", fontWeight: 600, marginBottom: 8 }}>🥉 PARTIDO POR EL 3ER LUGAR</p>
                  {tpReady ? (
                    <div className={`bk-match${canEdit ? "" : " bk-readonly"}`} style={{ maxWidth: 360 }}>
                      {[sfLosers[0], sfLosers[1]].map((t) => {
                        const isWin = third === t;
                        const cls = `bk-team${isWin ? " win" : ""}${third && third !== t ? " lose" : ""}`;
                        return (
                          <div key={t} className={cls} onClick={() => canEdit && setBracketPick("TP-0", t)}>
                            <span className="bk-flag">{FL[t] || "🏳️"}</span>
                            <span className="bk-name">{t}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(15,31,66,0.5)", border: "1px solid var(--glass-b)", fontSize: 12.5, color: "var(--silver)" }}>
                      Define las dos semifinales para elegir el 3er lugar.
                    </div>
                  )}
                </div>

                {/* Podio */}
                <div className="podium-wrap">
                  <div className="podium-title">🏅 PODIO</div>
                  <div className="podium">
                    {[
                      { rank: 2, team: runnerUp, medal: "🥈", cls: "pod-2" },
                      { rank: 1, team: champion, medal: "🏆", cls: "pod-1" },
                      { rank: 3, team: third,    medal: "🥉", cls: "pod-3" },
                    ].map(({ rank, team, medal, cls }) => (
                      <div key={rank} className="pod">
                        <div className="pod-top">
                          <div className="pod-medal">{medal}</div>
                          {team ? (
                            <>
                              <div className="pod-flag">{FL[team] || "🏳️"}</div>
                              <div className="pod-name">{team}</div>
                            </>
                          ) : (
                            <div className="pod-empty">—</div>
                          )}
                        </div>
                        <div className={`pod-base ${cls}`}>
                          {rank === 1 && team && confettiBits.map((c, i) => (
                            <span key={i} className="confetti" style={{ left: `${6 + i * 11}%`, animationDuration: `${2 + (i % 4) * 0.6}s`, animationDelay: `${(i % 5) * 0.3}s` }}>{c}</span>
                          ))}
                          <span className="pod-rank">{rank}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>)}
            </div>
          );
        })()}

        {/* ════ PARTICIPANTES ════ */}
        {tab === "participantes" && (
          <div style={{ maxWidth: 540 }}>
            <h2 style={{ fontFamily: "'Oswald',sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: 3, marginBottom: 20 }}>PARTICIPANTES</h2>
            <div className="glass" style={{ borderRadius: 14, padding: "18px 20px", marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: "var(--silver)", letterSpacing: 1.5, marginBottom: 10, fontWeight: 500 }}>AGREGAR PARTICIPANTE</p>
              <div className="add-part-row" style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input type="text" placeholder="Nombre..." value={newName}
                  onChange={e => { setNName(e.target.value); setNErr(""); }}
                  onKeyDown={e => e.key === "Enter" && addParticipant()} maxLength={24}
                  style={{ flex: 1, minWidth: 0, padding: "10px 14px", background: "rgba(6,14,38,0.7)", border: `1.5px solid ${nameErr ? "var(--rose)" : "rgba(148,163,184,0.18)"}`, borderRadius: 10, color: "var(--white)", fontSize: 14, outline: "none", fontFamily: "'DM Sans',sans-serif" }}
                />
                <input type="password" placeholder="Contraseña..." value={newPass}
                  onChange={e => { setNPass(e.target.value); setNErr(""); }}
                  onKeyDown={e => e.key === "Enter" && addParticipant()} maxLength={32}
                  className="add-part-pass"
                  style={{ width: 140, padding: "10px 14px", background: "rgba(6,14,38,0.7)", border: `1.5px solid ${nameErr ? "var(--rose)" : "rgba(148,163,184,0.18)"}`, borderRadius: 10, color: "var(--white)", fontSize: 14, outline: "none", fontFamily: "'DM Sans',sans-serif" }}
                />
                <button className="btn btn-primary add-part-btn" onClick={addParticipant} disabled={data.participants.length >= 16}>+ Agregar</button>
              </div>
              {nameErr && <p style={{ fontSize: 12, color: "var(--rose)", marginTop: 7 }}>{nameErr}</p>}
              <p style={{ fontSize: 11, color: "var(--silver)", marginTop: 8 }}>{data.participants.length}/16 participantes (incluye 2 IA 🤖)</p>
            </div>

            {!data.participants.length && (
              <div style={{ padding: "28px", textAlign: "center", color: "var(--silver)", background: "rgba(15,31,66,0.3)", borderRadius: 12, border: "1px dashed rgba(148,163,184,0.15)", fontSize: 14, marginBottom: 16 }}>
                Agrega hasta 8 participantes para comenzar 🌍
              </div>
            )}

            {data.participants.map((name, i) => {
              const pts = grandTotal(name, data);
              const filled = Object.values(MATCHES).flat().filter(m => { const p = data.predictions[name]?.[m.id]; return p?.h !== "" && p?.h != null && p?.a !== "" && p?.a != null; }).length;
              return (
                <div key={name} className="glass lift" style={{ borderRadius: 12, padding: "14px 18px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 21, background: "rgba(37,99,235,0.2)", border: "2px solid rgba(37,99,235,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Oswald',sans-serif", fontSize: iconFor(name) ? 22 : 18, fontWeight: 700, flexShrink: 0 }}>
                    {avatarFor(name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 16, fontWeight: 600, letterSpacing: 0.5, marginBottom: 3 }}>
                      {displayName(name)} {isAI(name) && <span style={{ fontSize: 10, color: "var(--blue-xl)", fontWeight: 500, letterSpacing: 1 }}>· IA</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--silver)", marginBottom: 5 }}>{filled}/72 predicciones · <span style={{ color: "var(--gold)", fontWeight: 600 }}>{pts} pts</span></div>
                    <div className="prog-track">
                      <div className="prog-fill" style={{ width: `${(filled / 72) * 100}%`, background: filled === 72 ? "var(--emerald)" : "var(--blue-l)" }} />
                    </div>
                  </div>
                  {isAI(name) ? (
                    <span style={{ fontSize: 18, flexShrink: 0 }} title="Participante IA (no editable)">🤖</span>
                  ) : (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => openEdit(name)} title="Editar perfil (requiere tu contraseña)" style={{ padding: "5px 10px", background: "rgba(37,99,235,0.12)", border: "1px solid rgba(59,130,246,0.35)", color: "var(--blue-xl)", borderRadius: 7, cursor: "pointer", fontSize: 12 }}>✏️</button>
                      <button onClick={() => requestDelete(name)} title="Eliminar" style={{ padding: "5px 10px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", color: "var(--rose)", borderRadius: 7, cursor: "pointer", fontSize: 12 }}>✕</button>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="glass" style={{ borderRadius: 14, padding: "20px", marginTop: 20 }}>
              <p style={{ fontFamily: "'Oswald',sans-serif", fontSize: 16, fontWeight: 600, letterSpacing: 2, color: "var(--blue-xl)", marginBottom: 12 }}>ℹ️ CÓMO FUNCIONA</p>
              <div style={{ fontSize: 13, color: "var(--silver)", lineHeight: 1.8 }}>
                <p style={{ marginBottom: 8 }}>Cada participante entra al mismo link y selecciona su nombre. Para editar tus predicciones necesitas tu contraseña.</p>
                <p>El primer partido se juega el <strong style={{ color: "var(--gold)" }}>11 de junio</strong>. Desde esa fecha las predicciones de cada grupo quedan bloqueadas a medida que comienzan los partidos.</p>
              </div>
            </div>
          </div>
        )}

        </div>
      </main>
    </div>
  );
}
