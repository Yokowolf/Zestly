// ═══════════════════════════════════════════════════════
// ENTRENAMIENTO — rutinas, sesiones, PRs (estilo Strong/Hevy)
// ═══════════════════════════════════════════════════════
const DAYS = [['lun','L'],['mar','M'],['mie','X'],['jue','J'],['vie','V'],['sab','S'],['dom','D']];

let _editRoutine = null;   // rutina en edición (borrador)
let _restEnd = null, _restTotal = 0, _restTimer = null;
let _wkTimer = null;

// ── Helpers ──────────────────────────────────────────────
function exName(id) { return EX_BY_ID[id]?.name || id; }

// Unidad de peso: interno SIEMPRE en kg; se convierte solo al mostrar/capturar
const LB_PER_KG = 2.20462;
function unitLbl() { return (ST.unit || 'kg') === 'lb' ? 'lb' : 'kg'; }
function fromKg(kg) { return unitLbl() === 'lb' ? Math.round(kg * LB_PER_KG * 10) / 10 : Math.round(kg * 10) / 10; }
function toKg(val)  { return unitLbl() === 'lb' ? Math.round(val / LB_PER_KG * 100) / 100 : val; }

function toggleUnit() {
  ST.unit = unitLbl() === 'lb' ? 'kg' : 'lb';
  save();
  renderUnitBtns();
  if (ST.activeWorkout && document.getElementById('ov-workout').classList.contains('open')) renderWorkout();
  updateTrain();
  toast('⚖️ Pesos en ' + unitLbl().toUpperCase(), 'ok');
}

function renderUnitBtns() {
  document.querySelectorAll('.unit-tog').forEach(el => {
    el.innerHTML = `<span class="${unitLbl()==='kg'?'on':''}">KG</span><span class="${unitLbl()==='lb'?'on':''}">LB</span>`;
  });
}

function bestWeight(exId) {
  let best = 0;
  (ST.workoutLogs || []).forEach(l => l.exercises.forEach(e => {
    if (e.exerciseId !== exId) return;
    e.sets.forEach(s => { if ((s.w || 0) > best) best = s.w; });
  }));
  return best;
}

function sessionVolume(log) {
  let v = 0;
  log.exercises.forEach(e => e.sets.forEach(s => { v += (s.w || 0) * (s.r || 0); }));
  return Math.round(v);
}

// ── Pantalla Entrena ─────────────────────────────────────
function updateTrain() {
  renderUnitBtns();
  const banner = document.getElementById('tr-active');
  if (ST.activeWorkout) {
    const min = Math.round((Date.now() - ST.activeWorkout.startTs) / 60000);
    banner.style.display = 'flex';
    banner.innerHTML = `<div><div style="font-size:13px;font-weight:700">🏋️ ${ST.activeWorkout.name}</div>
      <div style="font-size:11px;color:var(--t2)">Sesión en curso — ${min} min</div></div>
      <button class="tr-mini-btn" onclick="openWorkout()">Reanudar ▸</button>`;
  } else { banner.style.display = 'none'; }

  // Rutinas del usuario
  const rc = document.getElementById('tr-routines');
  if (!(ST.routines || []).length) {
    rc.innerHTML = `<div class="tr-empty">Aún no tienes rutinas.<br>Crea una desde cero o usa una plantilla 👇</div>`;
  } else {
    rc.innerHTML = ST.routines.map((r, i) => `
      <div class="meal-card fu" style="padding:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:700">${r.name}</div>
            <div style="font-size:11px;color:var(--t2);margin-top:3px">${r.exercises.length} ejercicios · ${r.days.map(d=>DAYS.find(x=>x[0]===d)?.[1]||'').join(' ')}</div>
          </div>
          <button class="tr-mini-btn" onclick="startWorkout(${i})">▶ Iniciar</button>
        </div>
        <div style="display:flex;gap:12px;margin-top:9px">
          <span class="tr-link" onclick="editRoutine(${i})">✏️ Editar</span>
          <span class="tr-link" style="color:#a78bfa" onclick="shareRoutine(${i})">🔗 Compartir</span>
          <span class="tr-link" style="color:var(--pink)" onclick="deleteRoutine(${i})">🗑 Eliminar</span>
        </div>
      </div>`).join('');
  }

  // Plantillas
  document.getElementById('tr-templates').innerHTML = ROUTINE_TEMPLATES.map((t, i) =>
    `<div class="tr-chip" onclick="useTemplate(${i})">${t.name}</div>`).join('');

  // Historial
  const hc = document.getElementById('tr-history');
  const logs = (ST.workoutLogs || []).slice(-5).reverse();
  hc.innerHTML = logs.length ? logs.map(l => {
    const prs = l.exercises.filter(e => e.pr).length;
    return `<div class="meal-card" style="padding:12px 14px;display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-size:13px;font-weight:600">${l.name}</div>
        <div style="font-size:11px;color:var(--t2);margin-top:2px">${l.date} · ${l.duration_min} min</div></div>
      <div style="text-align:right"><div style="font-size:13px;font-weight:700;color:var(--cyan)">${fromKg(l.volume)} ${unitLbl()}</div>
        <div style="font-size:10px;color:${prs?'var(--gold)':'var(--t3)'}">${prs ? '🏆 ' + prs + ' PR' : 'volumen'}</div></div>
    </div>`;
  }).join('') : `<div class="tr-empty">Tus sesiones aparecerán aquí</div>`;
}

// ── Constructor de rutinas ───────────────────────────────
function openRoutineBuilder(routine, index) {
  _editRoutine = routine
    ? { ...JSON.parse(JSON.stringify(routine)), _index: index }
    : { name: '', days: [], exercises: [], _index: -1 };
  document.getElementById('rb-name').value = _editRoutine.name;
  document.getElementById('rb-search').value = '';
  document.getElementById('rb-results').innerHTML = '';
  renderRbDays(); renderRbExercises(); renderRbCats();
  openOverlay('ov-routine');
}

function editRoutine(i) { openRoutineBuilder(ST.routines[i], i); }

function useTemplate(i) {
  const t = ROUTINE_TEMPLATES[i];
  openRoutineBuilder({
    name: t.name, days: [...t.days],
    exercises: t.ex.filter(id => EX_BY_ID[id]).map(id => ({
      exerciseId: id, sets: EX_BY_ID[id].sets, reps: EX_BY_ID[id].reps, rest: EX_BY_ID[id].rest
    }))
  }, -1);
  document.getElementById('rb-name').focus();
}

function renderRbDays() {
  document.getElementById('rb-days').innerHTML = DAYS.map(([d, l]) =>
    `<div class="day-chip ${_editRoutine.days.includes(d)?'on':''}" onclick="rbToggleDay('${d}')">${l}</div>`).join('');
}
function rbToggleDay(d) {
  const i = _editRoutine.days.indexOf(d);
  i === -1 ? _editRoutine.days.push(d) : _editRoutine.days.splice(i, 1);
  renderRbDays();
}

function renderRbExercises() {
  const c = document.getElementById('rb-list');
  c.innerHTML = _editRoutine.exercises.length ? _editRoutine.exercises.map((e, i) => `
    <div class="rb-ex">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">
        <div style="font-size:13px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${exName(e.exerciseId)}</div>
        <span class="mi-del" onclick="rbRemoveEx(${i})">✕</span>
      </div>
      <div style="display:flex;gap:6px">
        <label class="rb-f">Sets<input type="number" min="1" max="10" value="${e.sets}" onchange="_editRoutine.exercises[${i}].sets=parseInt(this.value)||3"></label>
        <label class="rb-f">Reps<input type="text" value="${e.reps}" onchange="_editRoutine.exercises[${i}].reps=this.value"></label>
        <label class="rb-f">Desc. s<input type="number" min="0" max="600" step="15" value="${e.rest}" onchange="_editRoutine.exercises[${i}].rest=parseInt(this.value)||60"></label>
      </div>
    </div>`).join('')
  : `<div class="tr-empty" style="padding:12px">Agrega ejercicios buscando abajo 👇</div>`;
}

function rbRemoveEx(i) { _editRoutine.exercises.splice(i, 1); renderRbExercises(); }

function rbAddEx(id) {
  if (_editRoutine.exercises.some(e => e.exerciseId === id)) { toast('Ya está en la rutina'); return; }
  const ex = EX_BY_ID[id];
  _editRoutine.exercises.push({ exerciseId: id, sets: ex.sets, reps: ex.reps, rest: ex.rest });
  renderRbExercises();
  document.getElementById('rb-search').value = '';
  document.getElementById('rb-results').innerHTML = '';
  document.getElementById('rb-cats').style.display = 'block';
  toast('✅ ' + ex.name, 'ok');
}

function rbExItem(e) {
  return `<div class="fr-item" onclick="rbAddEx('${e.id}')">
    <div><div class="fr-name">${e.name}</div>
      <div class="fr-detail">${e.muscle.map(m=>MUSCLES[m]||m).join(' · ')} · ${EQUIP[e.equipment]||e.equipment}</div></div>
    <div style="font-size:18px;color:var(--cyan)">＋</div>
  </div>`;
}

function rbSearch() {
  const q = document.getElementById('rb-search').value.trim();
  const res = document.getElementById('rb-results');
  const cats = document.getElementById('rb-cats');
  if (!q) { res.innerHTML = ''; cats.style.display = 'block'; return; }
  cats.style.display = 'none';
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const qn = norm(q);
  const m = EXERCISES.filter(e =>
    norm(e.name).includes(qn) || e.muscle.some(mu => norm(MUSCLES[mu]||mu).includes(qn))
  ).slice(0, 12);
  res.innerHTML = m.length ? m.map(rbExItem).join('')
    : `<div class="tr-empty">Sin resultados para "${q}"</div>`;
}

function renderRbCats() {
  const groups = {};
  EXERCISES.forEach(e => {
    const key = e.muscle[0];
    (groups[key] = groups[key] || []).push(e);
  });
  document.getElementById('rb-cats').innerHTML = Object.entries(groups).map(([m, list]) =>
    `<details style="margin-bottom:8px">
      <summary style="font-size:12px;font-weight:700;color:var(--t2);cursor:pointer;padding:8px 12px;background:var(--card);border-radius:var(--rs);list-style:none;display:flex;justify-content:space-between">
        <span>${MUSCLES[m]||m}</span><span style="color:var(--t3)">${list.length} ›</span>
      </summary>
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">${list.map(rbExItem).join('')}</div>
    </details>`).join('');
}

function saveRoutine() {
  const name = document.getElementById('rb-name').value.trim();
  if (!name) { toast('⚠️ Ponle nombre a la rutina', 'err'); return; }
  if (!_editRoutine.exercises.length) { toast('⚠️ Agrega al menos un ejercicio', 'err'); return; }
  _editRoutine.name = name;
  const { _index, ...routine } = _editRoutine;
  routine.createdAt = routine.createdAt || Date.now();
  if (_index >= 0) ST.routines[_index] = routine;
  else ST.routines.push(routine);
  save(); closeOverlay('ov-routine'); updateTrain();
  toast('✅ Rutina "' + name + '" guardada', 'ok');
}

function deleteRoutine(i) {
  if (!confirm('¿Eliminar la rutina "' + ST.routines[i].name + '"?')) return;
  ST.routines.splice(i, 1);
  save(); updateTrain();
  toast('🗑 Rutina eliminada');
}

// ── Sesión de entrenamiento ──────────────────────────────
function startWorkout(routineIdx) {
  if (ST.activeWorkout && !confirm('Ya hay una sesión en curso. ¿Descartarla y empezar otra?')) { openWorkout(); return; }
  const r = routineIdx >= 0 ? ST.routines[routineIdx] : null;
  ST.activeWorkout = {
    routineName: r ? r.name : null,
    name: r ? r.name : 'Entreno libre',
    startTs: Date.now(),
    exercises: (r ? r.exercises : []).map(e => ({
      exerciseId: e.exerciseId, reps: e.reps, rest: e.rest,
      sets: Array.from({ length: e.sets }, () => ({ w: null, r: null, done: false }))
    }))
  };
  save(); openWorkout();
}

function startFreeWorkout() { startWorkout(-1); }

function openWorkout() {
  renderUnitBtns();
  renderWorkout();
  openOverlay('ov-workout');
  clearInterval(_wkTimer);
  _wkTimer = setInterval(() => {
    const el = document.getElementById('wk-elapsed');
    if (!el || !ST.activeWorkout) { clearInterval(_wkTimer); return; }
    const s = Math.floor((Date.now() - ST.activeWorkout.startTs) / 1000);
    el.textContent = `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  }, 1000);
}

function renderWorkout() {
  const w = ST.activeWorkout; if (!w) return;
  document.getElementById('wk-title').textContent = w.name;
  const c = document.getElementById('wk-list');
  c.innerHTML = w.exercises.map((e, ei) => {
    const ex = EX_BY_ID[e.exerciseId] || {};
    const best = bestWeight(e.exerciseId);
    return `<div class="rb-ex" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <div style="font-size:14px;font-weight:700">${exName(e.exerciseId)}</div>
        <span class="mi-del" onclick="wkRemoveEx(${ei})">✕</span>
      </div>
      <div style="font-size:11px;color:var(--t2);margin-bottom:8px">
        Objetivo: ${e.reps} reps · descanso ${e.rest}s${best ? ` · 🏆 mejor: ${fromKg(best)} ${unitLbl()}` : ''}${ex.notes ? `<br>💡 ${ex.notes}` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:5px">
        ${e.sets.map((s, si) => `
          <div class="set-row ${s.done?'done':''}">
            <span class="set-n">${si + 1}</span>
            <input type="number" inputmode="decimal" placeholder="${ex.weight === false ? '—' : unitLbl()}" value="${s.w != null ? fromKg(s.w) : ''}" ${ex.weight === false ? 'disabled' : ''}
              onchange="wkSet(${ei},${si},'w',this.value)">
            <span style="color:var(--t3);font-size:11px">×</span>
            <input type="number" inputmode="numeric" placeholder="reps" value="${s.r ?? ''}"
              onchange="wkSet(${ei},${si},'r',this.value)">
            <button class="set-check ${s.done?'on':''}" onclick="wkToggleSet(${ei},${si})">✓</button>
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:12px;margin-top:8px">
        <span class="tr-link" onclick="wkAddSet(${ei})">＋ set</span>
        ${e.sets.length > 1 ? `<span class="tr-link" style="color:var(--t3)" onclick="wkDelSet(${ei})">− set</span>` : ''}
      </div>
    </div>`;
  }).join('') || `<div class="tr-empty">Agrega ejercicios abajo 👇</div>`;

  // buscador para añadir sobre la marcha
  document.getElementById('wk-results').innerHTML = '';
  document.getElementById('wk-search').value = '';
}

function wkSet(ei, si, field, val) {
  const s = ST.activeWorkout.exercises[ei].sets[si];
  const num = val === '' ? null : parseFloat(val);
  s[field] = (field === 'w' && num != null) ? toKg(num) : num;
  save();
}

function wkToggleSet(ei, si) {
  const e = ST.activeWorkout.exercises[ei];
  const s = e.sets[si];
  s.done = !s.done;
  save();
  if (s.done && e.rest > 0) startRest(e.rest);
  renderWorkout();
}

function wkAddSet(ei) {
  const sets = ST.activeWorkout.exercises[ei].sets;
  const last = sets[sets.length - 1];
  sets.push({ w: last?.w ?? null, r: null, done: false });
  save(); renderWorkout();
}
function wkDelSet(ei) {
  ST.activeWorkout.exercises[ei].sets.pop();
  save(); renderWorkout();
}
function wkRemoveEx(ei) {
  ST.activeWorkout.exercises.splice(ei, 1);
  save(); renderWorkout();
}

function wkSearch() {
  const q = document.getElementById('wk-search').value.trim();
  const res = document.getElementById('wk-results');
  if (!q) { res.innerHTML = ''; return; }
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const qn = norm(q);
  const m = EXERCISES.filter(e => norm(e.name).includes(qn)).slice(0, 8);
  res.innerHTML = m.map(e => `<div class="fr-item" onclick="wkAddEx('${e.id}')">
    <div><div class="fr-name">${e.name}</div><div class="fr-detail">${e.muscle.map(x=>MUSCLES[x]||x).join(' · ')}</div></div>
    <div style="font-size:18px;color:var(--cyan)">＋</div></div>`).join('');
}

function wkAddEx(id) {
  const ex = EX_BY_ID[id];
  ST.activeWorkout.exercises.push({
    exerciseId: id, reps: ex.reps, rest: ex.rest,
    sets: Array.from({ length: ex.sets }, () => ({ w: null, r: null, done: false }))
  });
  save(); renderWorkout();
  toast('✅ ' + ex.name, 'ok');
}

// ── Timer de descanso ────────────────────────────────────
function startRest(seconds) {
  _restTotal = seconds;
  _restEnd = Date.now() + seconds * 1000;
  document.getElementById('rest-bar').style.display = 'flex';
  clearInterval(_restTimer);
  _restTimer = setInterval(tickRest, 250);
  tickRest();
}

function tickRest() {
  const left = Math.ceil((_restEnd - Date.now()) / 1000);
  if (left <= 0) { skipRest(); toast('💪 ¡Descanso terminado — siguiente set!', 'ok'); return; }
  document.getElementById('rest-time').textContent = `${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`;
  document.getElementById('rest-fill').style.width = (left / _restTotal * 100) + '%';
}

function skipRest() {
  clearInterval(_restTimer);
  _restTimer = null;
  document.getElementById('rest-bar').style.display = 'none';
}

// ── Finalizar sesión ─────────────────────────────────────
function finishWorkout() {
  const w = ST.activeWorkout; if (!w) return;
  const doneEx = w.exercises
    .map(e => ({ exerciseId: e.exerciseId, sets: e.sets.filter(s => s.done && (s.r || s.w)) }))
    .filter(e => e.sets.length);
  if (!doneEx.length) {
    if (!confirm('No registraste ningún set. ¿Descartar la sesión?')) return;
    ST.activeWorkout = null; skipRest(); save(); closeOverlay('ov-workout'); updateTrain();
    return;
  }
  // PRs: compara contra el mejor peso histórico ANTES de guardar esta sesión
  let prCount = 0;
  doneEx.forEach(e => {
    const prev = bestWeight(e.exerciseId);
    const maxNow = Math.max(...e.sets.map(s => s.w || 0));
    e.pr = maxNow > 0 && maxNow > prev;
    if (e.pr) prCount++;
    e.sets = e.sets.map(s => ({ w: s.w || 0, r: s.r || 0 }));
  });
  const log = {
    name: w.name, routineName: w.routineName,
    date: new Date().toDateString(),
    duration_min: Math.max(1, Math.round((Date.now() - w.startTs) / 60000)),
    exercises: doneEx,
    volume: 0
  };
  log.volume = sessionVolume(log);
  ST.workoutLogs.push(log);
  if (ST.workoutLogs.length > 60) ST.workoutLogs = ST.workoutLogs.slice(-60);
  ST.activeWorkout = null;
  skipRest(); clearInterval(_wkTimer);
  save(); closeOverlay('ov-workout'); updateTrain();
  toast(`🎉 ${log.duration_min} min · ${fromKg(log.volume)} ${unitLbl()} de volumen${prCount ? ` · 🏆 ${prCount} PR!` : ''}`, 'ok');
}

function cancelWorkout() {
  if (!confirm('¿Descartar la sesión en curso? Se perderá el registro.')) return;
  ST.activeWorkout = null;
  skipRest(); clearInterval(_wkTimer);
  save(); closeOverlay('ov-workout'); updateTrain();
}

// ── Compartir rutina por link ────────────────────────────
function shareRoutine(i) {
  const r = ST.routines[i];
  const payload = { name: r.name, days: r.days, exercises: r.exercises };
  const data = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const url = location.origin + location.pathname + '?r=' + data;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => toast('🔗 Link de la rutina copiado', 'ok'))
      .catch(() => prompt('Copia el link de la rutina:', url));
  } else prompt('Copia el link de la rutina:', url);
}

function importSharedRoutine() {
  const data = new URLSearchParams(location.search).get('r');
  if (!data) return;
  history.replaceState(null, '', location.pathname); // limpia la URL
  try {
    const r = JSON.parse(decodeURIComponent(escape(atob(data))));
    if (!r.name || !Array.isArray(r.exercises)) throw new Error('inválida');
    const exercises = r.exercises.filter(e => EX_BY_ID[e.exerciseId]);
    if (!exercises.length) throw new Error('sin ejercicios válidos');
    if (!confirm(`¿Importar la rutina compartida "${r.name}" (${exercises.length} ejercicios)?`)) return;
    ST.routines.push({ name: r.name, days: r.days || [], exercises, createdAt: Date.now() });
    save();
    toast('✅ Rutina "' + r.name + '" importada', 'ok');
    if (typeof updateTrain === 'function' && document.getElementById('tr-routines')) updateTrain();
  } catch (e) {
    toast('❌ El link de rutina no es válido', 'err');
  }
}
