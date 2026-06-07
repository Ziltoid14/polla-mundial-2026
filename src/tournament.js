/* ═══════════════════════ DATOS DEL TORNEO (compartido app + scripts) ═══════════════════════ */

export const GD = {
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

export const FL = {
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

export const DATES = {
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

export const MATCHES = {};
Object.entries(GD).forEach(([g, ts]) => {
  MATCHES[g] = [];
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const id = `${g}${i}${j}`;
    MATCHES[g].push({ id, home: ts[i], away: ts[j], date: DATES[id] || null });
  }
  MATCHES[g].sort((a, b) => (a.date || "9999") < (b.date || "9999") ? -1 : 1);
});

export const GK = Object.keys(GD);

// Lista plana de todos los partidos
export const ALL_MATCHES = Object.values(MATCHES).flat();

// Fuerza relativa de cada selección (0-100), usada por el Oráculo para generar predicciones
export const TEAM_STRENGTH = {
  "Francia":92,"España":91,"Argentina":91,"Inglaterra":90,"Brasil":90,"Portugal":89,
  "P.Bajos":87,"Alemania":87,"Bélgica":85,"Croacia":83,"Uruguay":83,"Colombia":80,
  "Marruecos":80,"Suiza":79,"Senegal":79,"Japón":78,"EE.UU.":77,"México":77,
  "Ecuador":76,"Austria":76,"Corea":74,"Australia":73,"Egipto":73,"Turquía":73,
  "Noruega":78,"Suecia":74,"Canadá":74,"Panamá":70,"Escocia":72,"Paraguay":71,
  "Irán":72,"C.Marfil":72,"Argelia":72,"Ghana":71,"Qatar":69,"Túnez":71,
  "RD Congo":71,"Uzbekistán":69,"Sudáfrica":70,"N.Zelanda":67,"Chequia":74,"Bosnia":72,
  "Cabo Verde":66,"Arabia S.":68,"Irak":66,"Jordania":64,"Haití":62,"Curazao":63,
};
export const strengthOf = (t) => TEAM_STRENGTH[t] ?? 70;
