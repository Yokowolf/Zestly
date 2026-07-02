// ═══════════════════════════════════════════════════════
// PROGRESS
// ═══════════════════════════════════════════════════════
function logWeight() {
  const val = parseFloat(document.getElementById('w-inp').value);
  if (!val || val < 20 || val > 300) return;
  ST.profile.weight = val;
  ST.weightLog.push({date: new Date().toDateString(), val});
  if (ST.weightLog.length > 30) ST.weightLog = ST.weightLog.slice(-30);
  save(); updateProgress(); toast('⚖️ Peso registrado: ' + val + ' kg', 'ok');
}

function updateProgress() {
  document.getElementById('s-streak').textContent = ST.streak;
  document.getElementById('s-kcal').textContent   = ST.today.kcal;
  document.getElementById('s-kcal-s').textContent = 'de ' + ST.nutrition.kcal + ' meta';
  document.getElementById('s-w').textContent = ST.profile.weight || '--';
  document.getElementById('s-p').textContent = ST.nutrition.prot + 'g';
  document.getElementById('s-wa').textContent = ST.today.water;

  const days = ['L','M','X','J','V','S','D'], td = new Date().getDay();
  const log = [...ST.log.slice(-6), {kcal: ST.today.kcal}];
  const maxK = Math.max(...log.map(l=>l.kcal), ST.nutrition.kcal, 1);
  document.getElementById('ch-kcal').innerHTML = log.map((l,i) => {
    const h = Math.round((l.kcal/maxK)*82)+3, isT = i===log.length-1;
    return `<div class="cb-wrap"><div class="cb cal" style="height:${h}px;opacity:${isT?1:.5}"></div><div class="cb-l">${isT?'Hoy':days[(td-log.length+i+7)%7]}</div></div>`;
  }).join('');

  const wl = ST.weightLog.slice(-7);
  if (wl.length > 1) {
    const mn=Math.min(...wl.map(w=>w.val))-1, mx=Math.max(...wl.map(w=>w.val))+1;
    document.getElementById('ch-w').innerHTML = wl.map((w,i) => {
      const h = Math.round(((w.val-mn)/(mx-mn||1))*82)+3;
      return `<div class="cb-wrap"><div class="cb wgt" style="height:${h}px;opacity:${i===wl.length-1?1:.6}"></div><div class="cb-l">${w.val}</div></div>`;
    }).join('');
  } else {
    document.getElementById('ch-w').innerHTML = '<div style="color:var(--t3);font-size:11px;padding:18px;text-align:center;width:100%">Registra tu peso para ver la gráfica</div>';
  }

  updateFitProgress();
}

// ═══════════════════════════════════════════════════════
// PROGRESO FITNESS — frecuencia, volumen por músculo, PRs
// ═══════════════════════════════════════════════════════
let _prSel = null;

function logTime(l) { const t = new Date(l.date).getTime(); return isNaN(t) ? 0 : t; }

function updateFitProgress() {
  const wl = ST.workoutLogs || [];
  const cut = Date.now() - 7 * 86400000;
  const week = wl.filter(l => logTime(l) >= cut);

  // Tarjetas resumen
  document.getElementById('fp-freq').textContent = week.length;
  const volW = week.reduce((s, l) => s + (l.volume || 0), 0);
  document.getElementById('fp-vol').textContent = fromKg(volW);
  document.getElementById('fp-vol-u').textContent = unitLbl() + ' totales';

  // Volumen por grupo muscular (7 días)
  const vols = {};
  week.forEach(l => l.exercises.forEach(e => {
    const m = (EX_BY_ID[e.exerciseId]?.muscle || ['otro'])[0];
    let v = 0; e.sets.forEach(s => v += (s.w || 0) * (s.r || 0));
    vols[m] = (vols[m] || 0) + v;
  }));
  const entries = Object.entries(vols).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]);
  const maxV = Math.max(...entries.map(e => e[1]), 1);
  document.getElementById('fp-muscles').innerHTML = entries.length
    ? entries.map(([m, v]) => `<div class="hbar-row">
        <div class="hbar-l">${MUSCLES[m] || m}</div>
        <div class="hbar-t"><div class="hbar-f" style="width:${Math.round(v/maxV*100)}%"></div></div>
        <div class="hbar-v">${fromKg(v)} ${unitLbl()}</div>
      </div>`).join('')
    : '<div style="color:var(--t3);font-size:11px;text-align:center;padding:12px">Entrena esta semana para ver tu volumen 💪</div>';

  // Progresión de PR por ejercicio
  const counts = {};
  wl.forEach(l => l.exercises.forEach(e => {
    if (EX_BY_ID[e.exerciseId]?.weight === false) return;
    counts[e.exerciseId] = (counts[e.exerciseId] || 0) + 1;
  }));
  const exIds = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 8).map(([id]) => id);
  if (!exIds.includes(_prSel)) _prSel = exIds[0] || null;
  document.getElementById('fp-pr-chips').innerHTML = exIds.map(id =>
    `<div class="sel-chip ${id===_prSel?'on':''}" onclick="_prSel='${id}';updateFitProgress()">${exName(id)}</div>`).join('')
    || '<div style="color:var(--t3);font-size:11px">Registra sets con peso para ver tu progresión</div>';

  const chart = document.getElementById('fp-pr-chart');
  if (_prSel) {
    const pts = wl.map(l => {
      const e = l.exercises.find(x => x.exerciseId === _prSel);
      if (!e) return null;
      return { d: l.date, w: Math.max(...e.sets.map(s => s.w || 0)) };
    }).filter(p => p && p.w > 0).slice(-10);
    if (pts.length) {
      const mx = Math.max(...pts.map(p => p.w));
      chart.innerHTML = pts.map((p, i) => {
        const h = Math.round(p.w / mx * 74) + 8;
        const pr = p.w === mx;
        return `<div class="cb-wrap"><div style="font-size:9px;color:${pr?'var(--gold)':'var(--t2)'};font-weight:700">${fromKg(p.w)}</div>
          <div class="cb cal" style="height:${h}px;opacity:${i===pts.length-1?1:.55}"></div>
          <div class="cb-l">${pr?'🏆':''}</div></div>`;
      }).join('');
    } else chart.innerHTML = '';
  } else chart.innerHTML = '';

  renderAnthro();
}

// ═══════════════════════════════════════════════════════
// ANTROPOMETRÍA — medidas corporales
// ═══════════════════════════════════════════════════════
const ANTHRO_FIELDS = [
  ['weight','Peso','kg'], ['fat','% Grasa','%'], ['chest','Pecho','cm'],
  ['waist','Cintura','cm'], ['abdomen','Abdomen','cm'], ['hip','Cadera','cm'],
  ['bicepR','Bíceps D','cm'], ['bicepL','Bíceps I','cm'],
  ['thighR','Muslo D','cm'], ['thighL','Muslo I','cm'], ['calf','Pantorrilla','cm']
];
let _anSel = 'weight';

function openAnthro() {
  const last = (ST.anthro || [])[ST.anthro.length - 1] || {};
  document.getElementById('an-form').innerHTML = ANTHRO_FIELDS.map(([k, label, unit]) =>
    `<label class="rb-f">${label} (${unit})<input type="number" step="0.1" id="an-${k}" placeholder="${last[k] ?? '--'}"></label>`).join('');
  openOverlay('ov-anthro');
}

function saveAnthro() {
  const entry = { date: new Date().toDateString() };
  let any = false;
  ANTHRO_FIELDS.forEach(([k]) => {
    const v = parseFloat(document.getElementById('an-' + k).value);
    if (!isNaN(v) && v > 0) { entry[k] = v; any = true; }
  });
  if (!any) { toast('⚠️ Ingresa al menos una medida', 'err'); return; }
  ST.anthro = ST.anthro || [];
  ST.anthro.push(entry);
  if (ST.anthro.length > 60) ST.anthro = ST.anthro.slice(-60);
  // El peso también alimenta la gráfica de peso general
  if (entry.weight) {
    ST.profile.weight = entry.weight;
    ST.weightLog.push({ date: entry.date, val: entry.weight });
    if (ST.weightLog.length > 30) ST.weightLog = ST.weightLog.slice(-30);
  }
  save(); closeOverlay('ov-anthro'); updateProgress();
  toast('📏 Medidas registradas', 'ok');
}

function renderAnthro() {
  const list = ST.anthro || [];
  const last = list[list.length - 1];
  const sum = document.getElementById('an-summary');
  if (!last) {
    sum.innerHTML = '<div style="color:var(--t3);font-size:11px;text-align:center;padding:8px">Registra tus medidas cada 2 semanas para ver tu evolución</div>';
    document.getElementById('an-chips').innerHTML = '';
    document.getElementById('an-chart').innerHTML = '';
    return;
  }
  sum.innerHTML = '<div class="an-sum">' + ANTHRO_FIELDS.filter(([k]) => last[k] != null)
    .map(([k, label, unit]) => `<div class="an-pill">${label}: <b>${last[k]}</b> ${unit}</div>`).join('') + '</div>';

  const avail = ANTHRO_FIELDS.filter(([k]) => list.some(e => e[k] != null));
  if (!avail.some(([k]) => k === _anSel)) _anSel = avail[0]?.[0];
  document.getElementById('an-chips').innerHTML = avail.map(([k, label]) =>
    `<div class="sel-chip ${k===_anSel?'on':''}" onclick="_anSel='${k}';renderAnthro()">${label}</div>`).join('');

  const pts = list.filter(e => e[_anSel] != null).slice(-10);
  const chart = document.getElementById('an-chart');
  if (pts.length > 1) {
    const mn = Math.min(...pts.map(p => p[_anSel])) - 1, mx = Math.max(...pts.map(p => p[_anSel])) + 1;
    chart.innerHTML = pts.map((p, i) => {
      const h = Math.round((p[_anSel] - mn) / (mx - mn || 1) * 70) + 8;
      return `<div class="cb-wrap"><div style="font-size:9px;color:var(--t2);font-weight:700">${p[_anSel]}</div>
        <div class="cb wgt" style="height:${h}px;opacity:${i===pts.length-1?1:.6}"></div></div>`;
    }).join('');
  } else {
    chart.innerHTML = '<div style="color:var(--t3);font-size:11px;padding:14px;text-align:center;width:100%">Con 2+ registros verás la evolución</div>';
  }
}
