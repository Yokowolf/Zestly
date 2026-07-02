// ═══════════════════════════════════════════════════════
// IA — GENERADOR DE RUTINAS Y PLAN ALIMENTICIO SEMANAL
// ═══════════════════════════════════════════════════════

// Extrae el primer objeto JSON de una respuesta de IA
function parseAIJson(raw) {
  const clean = raw.replace(/```json|```/g, '').trim();
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('La IA no devolvió JSON válido');
  return JSON.parse(clean.slice(s, e + 1));
}

// ── Generador de rutinas ─────────────────────────────────
const _aiGen = { goal: 'hipertrofia', days: 4, equip: 'gym', level: 'intermedio' };

const AIGEN_OPTS = {
  goal:  [['hipertrofia','💪 Hipertrofia'], ['fuerza','🏋️ Fuerza'], ['definicion','🔥 Definición'], ['resistencia','🏃 Resistencia']],
  days:  [[2,'2 días'], [3,'3 días'], [4,'4 días'], [5,'5 días'], [6,'6 días']],
  equip: [['gym','🏢 Gym completo'], ['dumbbell','💪 Mancuernas'], ['body','🤸 Sin equipo']],
  level: [['principiante','Principiante'], ['intermedio','Intermedio'], ['avanzado','Avanzado']]
};

function openAiGen() {
  ['goal','days','equip','level'].forEach(f => renderAiGenRow(f));
  document.getElementById('aigen-btn').disabled = false;
  document.getElementById('aigen-btn').textContent = '✨ Generar rutina';
  openOverlay('ov-aigen');
}

function renderAiGenRow(f) {
  document.getElementById('aigen-' + f).innerHTML = AIGEN_OPTS[f].map(([v, l]) =>
    `<div class="sel-chip ${_aiGen[f] == v ? 'on' : ''}" onclick="_aiGen.${f}=${typeof v === 'number' ? v : `'${v}'`};renderAiGenRow('${f}')">${l}</div>`).join('');
}

function aiGenBank() {
  const byEquip = {
    gym: () => true,
    dumbbell: e => ['mancuerna','corporal','banda','kettlebell'].includes(e.equipment),
    body: e => ['corporal','banda'].includes(e.equipment)
  };
  return EXERCISES.filter(byEquip[_aiGen.equip] || (() => true));
}

async function aiGenRoutine() {
  const btn = document.getElementById('aigen-btn');
  btn.disabled = true; btn.textContent = '⏳ Generando...';
  try {
    const bank = aiGenBank().map(e => `${e.id}=${e.name}`).join(', ');
    const goalTxt = { hipertrofia:'hipertrofia muscular', fuerza:'fuerza máxima', definicion:'definición y pérdida de grasa', resistencia:'resistencia' }[_aiGen.goal];
    const prompt = `Crea UNA rutina de UN día de entrenamiento (la mejor sesión tipo para este perfil) para ${goalTxt}, nivel ${_aiGen.level}, que entrena ${_aiGen.days} días/semana.
Elige 5-8 ejercicios SOLO de esta lista usando el id exacto:
${bank}
Responde SOLO este JSON sin texto extra:
{"name":"nombre corto de la rutina","days":["lun","mie"],"exercises":[{"id":"id_exacto","sets":4,"reps":"8-12","rest":90}]}
Los days deben ser ${_aiGen.days} valores entre: lun,mar,mie,jue,vie,sab,dom.`;
    const raw = await callAI('Eres entrenador personal experto en ' + goalTxt + '. Respondes únicamente JSON válido.', prompt, 1200);
    const parsed = parseAIJson(raw);
    const valid = (parsed.exercises || []).filter(e => EX_BY_ID[e.id]);
    if (!valid.length) throw new Error('La IA no eligió ejercicios válidos — intenta de nuevo');
    const dayIds = DAYS.map(d => d[0]);
    closeOverlay('ov-aigen');
    openRoutineBuilder({
      name: parsed.name || 'Rutina IA',
      days: (parsed.days || []).filter(d => dayIds.includes(d)),
      exercises: valid.map(e => ({
        exerciseId: e.id,
        sets: Math.min(Math.max(parseInt(e.sets) || 3, 1), 8),
        reps: String(e.reps || EX_BY_ID[e.id].reps),
        rest: Math.min(Math.max(parseInt(e.rest) || 90, 0), 300)
      }))
    }, -1);
    toast('✨ Rutina generada — revísala y guárdala', 'ok');
  } catch (e) {
    console.error('aiGenRoutine:', e);
    toast('❌ ' + (e.message || 'Error generando').slice(0, 60), 'err');
    btn.disabled = false; btn.textContent = '✨ Generar rutina';
  }
}

// ── Plan alimenticio semanal ─────────────────────────────
function openMealPlan() {
  renderMealPlan();
  openOverlay('ov-mealplan');
}

function renderMealPlan() {
  const c = document.getElementById('mp-content');
  const btn = document.getElementById('mp-btn');
  const mp = ST.mealPlan;
  btn.textContent = mp ? '🔄 Regenerar plan' : '✨ Generar mi plan semanal';
  if (!mp) {
    c.innerHTML = `<div class="tr-empty">La IA creará un plan L–D con tus ${ST.nutrition.kcal} kcal y ${ST.nutrition.prot}g de proteína diarios, con comida colombiana accesible.</div>`;
    return;
  }
  c.innerHTML = (mp.days || []).map(d => `
    <div class="mp-day">
      <div class="mp-day-h"><span>${d.day}</span><span style="color:var(--cyan)">${d.kcal || ''} kcal</span></div>
      ${(d.meals || []).map(m => `<div class="mp-meal">
        <span class="mp-meal-t">${m.time}</span>
        <span class="mp-meal-n">${m.name}</span>
        <span class="mp-meal-k">${m.kcal}</span>
      </div>`).join('')}
    </div>`).join('') +
    (mp.shopping?.length ? `<div class="mp-day"><div class="mp-day-h">🛒 Lista de compras</div>
      <div style="font-size:12px;color:var(--t2);line-height:1.9">${mp.shopping.join(' · ')}</div></div>` : '') +
    `<div style="font-size:10px;color:var(--t3);text-align:center;margin-top:4px">Generado ${new Date(mp.ts).toLocaleDateString('es')}</div>`;
}

async function genMealPlan() {
  const btn = document.getElementById('mp-btn');
  btn.disabled = true; btn.textContent = '⏳ Generando plan...';
  try {
    const p = ST.profile, n = ST.nutrition;
    const goal = p.goal === 'lose' ? 'perder grasa' : p.goal === 'gain' ? 'ganar músculo' : 'mantener peso';
    const prompt = `Crea un plan alimenticio semanal (lunes a domingo) para ${goal}: ${n.kcal} kcal, ${n.prot}g proteína diarios. Usuario: ${p.sex === 'male' ? 'hombre' : 'mujer'}, ${p.age} años, ${p.weight} kg, entrena en las tardes. Comida colombiana económica y fácil (arroz, pollo, huevos, arepa, fríjoles, plátano, avena).
Responde SOLO este JSON, comidas con nombre corto:
{"days":[{"day":"Lunes","kcal":${n.kcal},"meals":[{"time":"Desayuno","name":"...","kcal":500},{"time":"Almuerzo","name":"...","kcal":800},{"time":"Pre-entreno","name":"...","kcal":300},{"time":"Post-entreno","name":"...","kcal":400},{"time":"Cena","name":"...","kcal":600}]}],"shopping":["item1","item2"]}
Incluye los 7 días. La lista shopping con máx 15 items.`;
    const raw = await callAI('Eres nutricionista deportivo colombiano. Respondes únicamente JSON válido y completo.', prompt, 3500);
    const parsed = parseAIJson(raw);
    if (!parsed.days?.length) throw new Error('Plan incompleto — intenta de nuevo');
    ST.mealPlan = { ts: Date.now(), days: parsed.days, shopping: parsed.shopping || [] };
    save(); renderMealPlan();
    toast('🍽 Plan semanal listo', 'ok');
  } catch (e) {
    console.error('genMealPlan:', e);
    toast('❌ ' + (e.message || 'Error generando').slice(0, 60), 'err');
  }
  btn.disabled = false;
  btn.textContent = ST.mealPlan ? '🔄 Regenerar plan' : '✨ Generar mi plan semanal';
}
