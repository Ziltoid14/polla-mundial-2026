import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

/* ═══════════════════════ DATA ═══════════════════════ */
const GD = {
  A:["México","Sudáfrica","Corea","Chequia"],
  B:["Canadá","Bosnia","Qatar","Suiza"],
  C:["Brasil","Marruecos","Haití","Escocia"],
  D:["EE.UU.","Paraguay","Australia","Turquía"],
  E:["Alemania","Curazao","C.Marfil","Ecuador"],
  F:["P.Bajos","Japón","Suecia","Túnez"],
  G:["Bélgica","Egipto","Irán","N.Zelanda"],
  H:["España","Cabo Verde","Arabia S.","Uruguay"],
  I:["Francia","Senegal","Noruega","Irak"],
  J:["Argentina","Argelia","Austria","Jordania"],
  K:["Portugal","RD Congo","Uzbekistán","Colombia"],
  L:["Inglaterra","Croacia","Ghana","Panamá"],
};

const FL = {
  "México":"🇲🇽","Sudáfrica":"🇿🇦","Corea":"🇰🇷","Chequia":"🇨🇿",
  "Canadá":"🇨🇦","Bosnia":"🇧🇦","Qatar":"🇶🇦","Suiza":"🇨🇭",
  "Brasil":"🇧🇷","Marruecos":"🇲🇦","Haití":"🇭🇹","Escocia":"🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "EE.UU.":"🇺🇸","Paraguay":"🇵🇾","Australia":"🇦🇺","Turquía":"🇹🇷",
  "Alemania":"🇩🇪","Curazao":"🇨🇼","C.Marfil":"🇨🇮","Ecuador":"🇪🇨",
  "P.Bajos":"🇳🇱","Japón":"🇯🇵","Suecia":"🇸🇪","Túnez":"🇹🇳",
  "Bélgica":"🇧🇪","Egipto":"🇪🇬","Irán":"🇮🇷","N.Zelanda":"🇳🇿",
  "España":"🇪🇸","Cabo Verde":"🇨🇻","Arabia S.":"🇸🇦","Uruguay":"🇺🇾",
  "Francia":"🇫🇷","Senegal":"🇸🇳","Noruega":"🇳🇴","Irak":"🇮🇶",
  "Argentina":"🇦🇷","Argelia":"🇩🇿","Austria":"🇦🇹","Jordania":"🇯🇴",
  "Portugal":"🇵🇹","RD Congo":"🇨🇩","Uzbekistán":"🇺🇿","Colombia":"🇨🇴",
  "Inglaterra":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","Croacia":"🇭🇷","Ghana":"🇬🇭","Panamá":"🇵🇦",
};

const DATES = {
  A01:"2026-06-11",A23:"2026-06-11",A02:"2026-06-18",A13:"2026-06-18",A03:"2026-06-24",A12:"2026-06-24",
  B01:"2026-06-12",B23:"2026-06-13",B02:"2026-06-18",B13:"2026-06-18",B03:"2026-06-24",B12:"2026-06-24",
  C01:"2026-06-13",C23:"2026-06-13",C02:"2026-06-19",C13:"2026-06-19",C03:"2026-06-24",C12:"2026-06-24",
  D01:"2026-06-12",D23:"2026-06-13",D02:"2026-06-19",D13:"2026-06-19",D03:"2026-06-25",D12:"2026-06-25",
  E01:"2026-06-14",E23:"2026-06-14",E02:"2026-06-20",E13:"2026-06-20",E03:"2026-06-25",E12:"2026-06-25",
  F01:"2026-06-14",F23:"2026-06-14",F02:"2026-06-20",F13:"2026-06-20",F03:"2026-06-25",F12:"2026-06-25",
  G01:"2026-06-15",G23:"2026-06-15",G02:"2026-06-21",G13:"2026-06-21",G03:"2026-06-26",G12:"2026-06-26",
  H01:"2026-06-15",H23:"2026-06-15",H02:"2026-06-21",H13:"2026-06-21",H03:"2026-06-26",H12:"2026-06-26",
  I01:"2026-06-16",I23:"2026-06-16",I03:"2026-06-22",I12:"2026-06-22",I02:"2026-06-27",I13:"2026-06-27",
  J01:"2026-06-16",J23:"2026-06-16",J02:"2026-06-22",J13:"2026-06-22",J03:"2026-06-27",J12:"2026-06-27",
  K01:"2026-06-17",K23:"2026-06-17",K02:"2026-06-23",K13:"2026-06-23",K03:"2026-06-27",K12:"2026-06-27",
  L01:"2026-06-17",L23:"2026-06-17",L02:"2026-06-23",L13:"2026-06-23",L03:"2026-06-27",L12:"2026-06-27",
};

const MATCHES = {};
Object.entries(GD).forEach(([g,ts]) => {
  MATCHES[g]=[];
  for(let i=0;i<4;i++) for(let j=i+1;j<4;j++){
    const id=`${g}${i}${j}`;
    MATCHES[g].push({id,home:ts[i],away:ts[j],date:DATES[id]||null});
  }
  MATCHES[g].sort((a,b)=>(a.date||"9999")<(b.date||"9999")?-1:1);
});

const GK = Object.keys(GD);
const ADMIN_PWD = "mundial2026";

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
`;

/* ═══════════════════════ APP ═══════════════════════ */
const DOC_REF = doc(db, "polla2026", "data");
const EMPTY   = { participants: [], predictions: {}, results: {} };

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
  const [nameErr,    setNErr]  = useState("");
  const [fetching,   setFetch] = useState(false);
  const [fetchMsg,   setFMsg]  = useState("");

  /* Firestore real-time sync */
  useEffect(() => {
    const unsub = onSnapshot(DOC_REF, (snap) => {
      if (snap.exists()) {
        const s = snap.data();
        setData(s);
        setPerson(p => p || (s.participants?.[0] ?? ""));
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
    if (!n) return;
    if (data.participants.includes(n)) { setNErr("Ese nombre ya existe"); return; }
    if (data.participants.length >= 8) { setNErr("Máximo 8 participantes"); return; }
    persist(s => ({ ...s, participants: [...s.participants, n] }));
    if (!person) setPerson(n);
    setNName(""); setNErr("");
  };

  const removePart = (name) => {
    persist(s => { const p = { ...s.predictions }; delete p[name]; return { ...s, participants: s.participants.filter(x => x !== name), predictions: p }; });
    if (person === name) setPerson(data.participants.find(x => x !== name) || "");
  };

  const setPred = (matchId, side, val) => {
    if (!person) return;
    persist(s => ({ ...s, predictions: { ...s.predictions, [person]: { ...(s.predictions[person] || {}), [matchId]: { ...(s.predictions[person]?.[matchId] || { h: "", a: "" }), [side]: val } } } }));
  };

  const setResult = (matchId, side, val) => {
    persist(s => ({ ...s, results: { ...s.results, [matchId]: { ...(s.results[matchId] || { h: null, a: null }), [side]: val === "" ? null : Math.max(0, Math.min(30, +val || 0)) } } }));
  };

  const switchGrp = (g) => { setGrp(g); setGrpKey(k => k + 1); };

  /* Auto-fetch results via Anthropic API */
  const autoFetch = async () => {
    setFetch(true); setFMsg("");
    try {
      const today = todayStr();
      const past = Object.values(MATCHES).flat().filter(m => m.date && m.date <= today);
      if (!past.length) { setFMsg("⚽ El torneo aún no comienza"); setFetch(false); return; }
      const list = past.map(m => `${m.id}|${m.home} vs ${m.away}|${m.date}`).join("\n");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 2000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          system: "Rastreador de resultados del Mundial 2026. Devuelve SOLO JSON, sin markdown.",
          messages: [{ role: "user", content: `Busca resultados del Mundial FIFA 2026 fase de grupos para:\n\n${list}\n\nResponde SOLO:\n{"results":{"ID":{"h":GOLES_O_NULL,"a":GOLES_O_NULL}}}\nJugados=enteros. No jugados=null. 1er equipo=local(h), 2do=visitante(a).` }]
        })
      });
      const apiData = await res.json();
      const text = (apiData.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      const m = text.match(/\{[\s\S]*?"results"[\s\S]*?\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        if (parsed.results) {
          let upd = 0;
          const nr = { ...data.results };
          Object.entries(parsed.results).forEach(([id, sc]) => { if (sc && sc.h != null && sc.a != null) { nr[id] = { h: +sc.h, a: +sc.a }; upd++; } });
          persist(s => ({ ...s, results: nr }));
          setFMsg(`✓ ${upd} resultado${upd !== 1 ? "s" : ""} actualizado${upd !== 1 ? "s" : ""}`);
        } else setFMsg("⚠ Sin resultados aún");
      } else setFMsg("⚠ No se pudo parsear");
    } catch { setFMsg("✗ Error de conexión"); }
    setFetch(false); setTimeout(() => setFMsg(""), 5000);
  };

  if (!loaded) return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#03091a", gap: 16 }}>
      <div style={{ fontSize: 40 }}>⚽</div>
      <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 18, color: "#60a5fa", letterSpacing: 4 }}>CARGANDO...</div>
    </div>
  );

  const sorted = [...data.participants].sort((a, b) => totalPts(b, data.predictions, data.results) - totalPts(a, data.predictions, data.results));
  const totalRes = Object.keys(data.results).filter(k => data.results[k]?.h != null && data.results[k]?.a != null).length;
  const filledP = person ? Object.values(MATCHES).flat().filter(m => { const p = data.predictions[person]?.[m.id]; return p?.h !== "" && p?.h != null && p?.a !== "" && p?.a != null; }).length : 0;

  return (
    <div className="stadium-bg" style={{ minHeight: "100vh", color: "var(--white)", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{CSS}</style>

      {/* ══ HEADER ══ */}
      <header style={{ borderBottom: "1px solid rgba(148,163,184,0.1)", padding: "16px 20px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 className="shimmer-text" style={{ fontFamily: "'Oswald',sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: 4, marginBottom: 3 }}>
              ⚽ POLLA MUNDIALERA 2026
            </h1>
            <div style={{ fontSize: 12, color: "var(--silver)", letterSpacing: 1.5, fontWeight: 500 }}>
              {data.participants.length} PARTICIPANTE{data.participants.length !== 1 ? "S" : ""} &nbsp;·&nbsp; {totalRes}/72 RESULTADOS &nbsp;·&nbsp; FASE DE GRUPOS 11–27 JUN
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-green" onClick={autoFetch} disabled={fetching}>
              {fetching ? "🔄 Buscando..." : "🔄 Actualizar resultados"}
            </button>
            {fetchMsg && <span style={{ fontSize: 12, color: fetchMsg.startsWith("✓") ? "var(--emerald)" : "var(--rose)", fontWeight: 500 }}>{fetchMsg}</span>}
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
            <p style={{ fontSize: 11, color: "var(--silver)" }}>Contraseña: <span style={{ color: "var(--gold)" }}>mundial2026</span></p>
          </div>
        </div>
      )}

      {/* ══ TABS ══ */}
      <div style={{ background: "rgba(6,14,38,0.7)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(148,163,184,0.08)", overflowX: "auto" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", padding: "0 12px" }}>
          {[
            { id: "predicciones", label: "⚽  Predicciones" },
            { id: "clasificacion", label: "🏆  Clasificación" },
            { id: "llave", label: "📊  La Llave" },
            { id: "participantes", label: "👥  Participantes" },
          ].map(t => (
            <button key={t.id} className={`tab-btn${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "20px 16px" }}>

        {/* ════ PREDICCIONES ════ */}
        {tab === "predicciones" && (
          <div>
            <div className="glass" style={{ borderRadius: 14, padding: "16px 20px", marginBottom: 16 }}>
              <p style={{ fontSize: 11, letterSpacing: 2, color: "var(--silver)", marginBottom: 10, fontWeight: 500 }}>SELECCIONAR PARTICIPANTE</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: person ? 10 : 0 }}>
                {!data.participants.length && <span style={{ fontSize: 14, color: "var(--silver)" }}>Agrega participantes en la pestaña 👥 primero</span>}
                {data.participants.map(p => (
                  <button key={p} className={`part-chip${person === p ? " active" : ""}`} onClick={() => setPerson(p)}>{p}</button>
                ))}
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
            </div>

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
                  <span style={{ fontFamily: "'Oswald',sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: 3 }}>GRUPO {grp}</span>
                  <div style={{ display: "flex", gap: 6 }}>
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

              <div style={{ display: "grid", gridTemplateColumns: "56px 1fr 130px 1fr 96px 52px", gap: 8, padding: "8px 18px", borderBottom: "1px solid rgba(148,163,184,0.08)", fontSize: 10, color: "var(--silver)", letterSpacing: 1.5, fontWeight: 600 }}>
                <div>FECHA</div>
                <div>LOCAL</div>
                <div style={{ textAlign: "center" }}>{person ? `PRED. ${person.split(" ")[0].toUpperCase()}` : "PREDICCIÓN"}</div>
                <div style={{ textAlign: "right" }}>VISITANTE</div>
                <div style={{ textAlign: "center" }}>RESULTADO</div>
                <div style={{ textAlign: "center" }}>PTS</div>
              </div>

              {MATCHES[grp].map((m, i) => {
                const locked = isLocked(m.date);
                const pred = data.predictions[person]?.[m.id] || { h: "", a: "" };
                const res = data.results[m.id];
                const p = getPts(pred, res);
                const hasRes = res?.h != null && res?.a != null;
                const rowCls = `match-row row-anim${locked ? " locked" : ""}${p === 3 ? " pts3-row" : p === 1 ? " pts1-row" : p === 0 ? " pts0-row" : ""}`;

                return (
                  <div key={m.id} className={rowCls} style={{ animationDelay: `${i * 45}ms` }}>
                    <div>
                      <div style={{ fontSize: 12, color: locked ? "var(--gold)" : "var(--silver)", fontWeight: 500 }}>{fmtDate(m.date)}</div>
                      {locked && <div style={{ fontSize: 9, color: "var(--silver)", marginTop: 1, letterSpacing: 0.5 }}>🔒 CERRADO</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className={`flag-bubble${hasRes && res.h > res.a ? " active" : ""}`}>{FL[m.home] || "🏳️"}</div>
                      <span style={{ fontFamily: "'Oswald',sans-serif", fontSize: 15, fontWeight: 600, letterSpacing: 0.3 }}>{m.home}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <input type="number" min="0" max="30" className="score-inp" value={pred.h}
                        onChange={e => setPred(m.id, "h", e.target.value)} disabled={!person || locked}
                        style={{ borderColor: p === 3 ? "var(--gold)" : p === 1 ? "var(--emerald)" : p === 0 ? "var(--rose)" : "rgba(148,163,184,0.2)" }}
                      />
                      <span style={{ color: "var(--silver)", fontFamily: "'Oswald',sans-serif", fontSize: 16 }}>—</span>
                      <input type="number" min="0" max="30" className="score-inp" value={pred.a}
                        onChange={e => setPred(m.id, "a", e.target.value)} disabled={!person || locked}
                        style={{ borderColor: p === 3 ? "var(--gold)" : p === 1 ? "var(--emerald)" : p === 0 ? "var(--rose)" : "rgba(148,163,184,0.2)" }}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
                      <span style={{ fontFamily: "'Oswald',sans-serif", fontSize: 15, fontWeight: 600, textAlign: "right", letterSpacing: 0.3 }}>{m.away}</span>
                      <div className={`flag-bubble${hasRes && res.a > res.h ? " active" : ""}`}>{FL[m.away] || "🏳️"}</div>
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
          </div>
        )}

        {/* ════ CLASIFICACIÓN ════ */}
        {tab === "clasificacion" && (
          <div>
            <div style={{ marginBottom: 20, display: "flex", alignItems: "baseline", gap: 12 }}>
              <h2 style={{ fontFamily: "'Oswald',sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: 3 }}>CLASIFICACIÓN</h2>
              <span style={{ fontSize: 13, color: "var(--silver)" }}>fase de grupos · {totalRes}/72 resultados registrados</span>
            </div>
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
                const pts = totalPts(name, data.predictions, data.results);
                const exact = countExact(name, data.predictions, data.results);
                const played = countPlayed(name, data.predictions, data.results);
                const winners = Object.values(MATCHES).flat().filter(m => getPts(data.predictions[name]?.[m.id], data.results[m.id]) === 1).length;
                const medal = ["🥇", "🥈", "🥉"][i] || (i + 1);
                const isTop = i === 0;
                return (
                  <div key={name} className="lb-card" style={{ background: isTop ? "rgba(245,158,11,0.06)" : "transparent" }}>
                    <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: i < 3 ? 22 : 16, color: i < 3 ? "var(--gold-l)" : "var(--silver)", fontWeight: 700 }}>{medal}</div>
                    <div>
                      <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 17, fontWeight: 600, color: isTop ? "var(--gold-l)" : "var(--white)", letterSpacing: 0.5 }}>{name}</div>
                      {played > 0 && <div style={{ fontSize: 11, color: "var(--silver)", marginTop: 1 }}>{played} partidos con resultado</div>}
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
        )}

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
                      <div key={row.t} className={`st-row${i < 2 ? " top" : ""}${i === 2 ? " div" : ""}`}>
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
            <div style={{ marginTop: 14 }} className="glass-sm">
              <div style={{ padding: "12px 16px", borderRadius: 10, fontSize: 12, color: "var(--silver)" }}>
                ℹ️  Jornadas finales simultáneas: Grupos A–C el 24 jun · D–F el 25 jun · G–H el 26 jun · I–L el 27 jun
              </div>
            </div>
          </div>
        )}

        {/* ════ PARTICIPANTES ════ */}
        {tab === "participantes" && (
          <div style={{ maxWidth: 540 }}>
            <h2 style={{ fontFamily: "'Oswald',sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: 3, marginBottom: 20 }}>PARTICIPANTES</h2>
            <div className="glass" style={{ borderRadius: 14, padding: "18px 20px", marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: "var(--silver)", letterSpacing: 1.5, marginBottom: 10, fontWeight: 500 }}>AGREGAR PARTICIPANTE</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" placeholder="Nombre..." value={newName}
                  onChange={e => { setNName(e.target.value); setNErr(""); }}
                  onKeyDown={e => e.key === "Enter" && addParticipant()} maxLength={24}
                  style={{ flex: 1, padding: "10px 14px", background: "rgba(6,14,38,0.7)", border: `1.5px solid ${nameErr ? "var(--rose)" : "rgba(148,163,184,0.18)"}`, borderRadius: 10, color: "var(--white)", fontSize: 14, outline: "none", fontFamily: "'DM Sans',sans-serif" }}
                />
                <button className="btn btn-primary" onClick={addParticipant} disabled={data.participants.length >= 8}>+ Agregar</button>
              </div>
              {nameErr && <p style={{ fontSize: 12, color: "var(--rose)", marginTop: 7 }}>{nameErr}</p>}
              <p style={{ fontSize: 11, color: "var(--silver)", marginTop: 8 }}>{data.participants.length}/8 participantes</p>
            </div>

            {!data.participants.length && (
              <div style={{ padding: "28px", textAlign: "center", color: "var(--silver)", background: "rgba(15,31,66,0.3)", borderRadius: 12, border: "1px dashed rgba(148,163,184,0.15)", fontSize: 14, marginBottom: 16 }}>
                Agrega hasta 8 participantes para comenzar 🌍
              </div>
            )}

            {data.participants.map((name, i) => {
              const pts = totalPts(name, data.predictions, data.results);
              const filled = Object.values(MATCHES).flat().filter(m => { const p = data.predictions[name]?.[m.id]; return p?.h !== "" && p?.h != null && p?.a !== "" && p?.a != null; }).length;
              return (
                <div key={name} className="glass lift" style={{ borderRadius: 12, padding: "14px 18px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 21, background: "rgba(37,99,235,0.2)", border: "2px solid rgba(37,99,235,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Oswald',sans-serif", fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                    {name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 16, fontWeight: 600, letterSpacing: 0.5, marginBottom: 3 }}>{name}</div>
                    <div style={{ fontSize: 11, color: "var(--silver)", marginBottom: 5 }}>{filled}/72 predicciones · <span style={{ color: "var(--gold)", fontWeight: 600 }}>{pts} pts</span></div>
                    <div className="prog-track">
                      <div className="prog-fill" style={{ width: `${(filled / 72) * 100}%`, background: filled === 72 ? "var(--emerald)" : "var(--blue-l)" }} />
                    </div>
                  </div>
                  <button onClick={() => removePart(name)} style={{ padding: "5px 10px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", color: "var(--rose)", borderRadius: 7, cursor: "pointer", fontSize: 12, flexShrink: 0 }}>✕</button>
                </div>
              );
            })}

            <div className="glass" style={{ borderRadius: 14, padding: "20px", marginTop: 20 }}>
              <p style={{ fontFamily: "'Oswald',sans-serif", fontSize: 16, fontWeight: 600, letterSpacing: 2, color: "var(--blue-xl)", marginBottom: 12 }}>🔗 CÓMO COMPARTIR</p>
              <div style={{ fontSize: 13, color: "var(--silver)", lineHeight: 1.8 }}>
                <p style={{ marginBottom: 8 }}>Una vez desplegada en Vercel, todos los participantes entran al mismo link y cada uno selecciona su nombre.</p>
                <p style={{ marginBottom: 8 }}><strong style={{ color: "var(--white)" }}>Importante:</strong> cada persona usa su propio dispositivo/navegador — los datos se guardan localmente. Para datos compartidos en tiempo real necesitarás Firebase (Paso 3).</p>
                <p>El primer partido se juega el <strong style={{ color: "var(--gold)" }}>11 de junio</strong>. Desde esa fecha las predicciones del Grupo A quedan bloqueadas automáticamente.</p>
                <p style={{ marginTop: 8 }}>Admin: <span style={{ color: "var(--gold)" }}>mundial2026</span></p>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
