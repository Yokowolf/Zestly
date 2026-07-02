// ═══════════════════════════════════════════════════════
// ONBOARDING
// ═══════════════════════════════════════════════════════
let obStep = 0;

function startOb() { obStep = 0; showScreen('so'); renderOb(); }

function renderOb() {
  document.querySelectorAll('.ob-dot').forEach((d,i) => d.classList.toggle('on', i <= obStep));
  const c = document.getElementById('ob-content');
  const btn = document.getElementById('ob-btn');
  if (obStep === 0) {
    btn.textContent = 'Continuar';
    c.innerHTML = `<div class="ob-icon">🎯</div><div class="ob-title">¿Cuál es tu objetivo?</div><div class="ob-sub">Calcularemos tus calorías y macros exactos.</div>
    <div class="ob-opts">
      <div class="ob-opt ${ST.profile.goal==='lose'?'sel':''}" onclick="selOb(this,'goal','lose')"><span class="ob-opt-icon">🔥</span><div><h4>Perder grasa</h4><p>Déficit calórico controlado</p></div></div>
      <div class="ob-opt ${ST.profile.goal==='gain'?'sel':''}" onclick="selOb(this,'goal','gain')"><span class="ob-opt-icon">💪</span><div><h4>Ganar músculo</h4><p>Superávit con alta proteína</p></div></div>
      <div class="ob-opt ${ST.profile.goal==='maintain'?'sel':''}" onclick="selOb(this,'goal','maintain')"><span class="ob-opt-icon">⚖️</span><div><h4>Mantener peso</h4><p>Recomposición corporal</p></div></div>
    </div>`;
  } else if (obStep === 1) {
    c.innerHTML = `<div class="ob-icon">👤</div><div class="ob-title">Cuéntame sobre ti</div><div class="ob-sub">Necesito estos datos para calcular tus calorías.</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <div class="si" style="border:1.5px solid var(--border);border-radius:var(--r);background:var(--card)" onclick="openPick('sex')"><div class="si-icon">🧬</div><div class="si-label">Sexo</div><div class="si-val" id="v-sex">${ST.profile.sex==='male'?'Masculino':'Femenino'}</div></div>
      <div class="si" style="border:1.5px solid var(--border);border-radius:var(--r);background:var(--card)" onclick="openPick('age')"><div class="si-icon">🎂</div><div class="si-label">Edad</div><div class="si-val" id="v-age">${ST.profile.age} años</div></div>
      <div class="si" style="border:1.5px solid var(--border);border-radius:var(--r);background:var(--card)" onclick="openPick('height')"><div class="si-icon">📏</div><div class="si-label">Altura</div><div class="si-val" id="v-height">${ST.profile.height} cm</div></div>
      <div class="si" style="border:1.5px solid var(--border);border-radius:var(--r);background:var(--card)" onclick="openPick('weight')"><div class="si-icon">⚖️</div><div class="si-label">Peso</div><div class="si-val" id="v-weight">${ST.profile.weight} kg</div></div>
      <div class="si" style="border:1.5px solid var(--border);border-radius:var(--r);background:var(--card)" onclick="openPick('name')"><div class="si-icon">✏️</div><div class="si-label">Tu nombre</div><div class="si-val" id="v-name">${ST.profile.name||'Ingresar'}</div></div>
    </div>`;
  } else if (obStep === 2) {
    c.innerHTML = `<div class="ob-icon">🏃</div><div class="ob-title">Nivel de actividad</div><div class="ob-sub">¿Cuánto ejercicio haces por semana?</div>
    <div class="ob-opts">
      ${[['sedentary','🪑','Sedentario','Oficina, poco movimiento'],['light','🚶','Ligero','1-3 días/semana'],['moderate','🏃','Moderado','3-5 días/semana'],['active','💪','Activo','6-7 días o trabajo físico'],['very_active','🔥','Muy activo','Atleta o doble sesión']].map(([v,i,n,d])=>
      `<div class="ob-opt ${ST.profile.activity===v?'sel':''}" onclick="selOb(this,'activity','${v}')"><span class="ob-opt-icon">${i}</span><div><h4>${n}</h4><p>${d}</p></div></div>`).join('')}
    </div>`;
  } else {
    calcNutr();
    btn.textContent = '¡Comenzar Zestly! →';
    c.innerHTML = `<div class="ob-icon">✅</div><div class="ob-title">Tu plan está listo</div><div class="ob-sub">Metas diarias calculadas con la fórmula Mifflin-St Jeor.</div>
    <div class="ob-result">
      <div class="ob-kcal">${ST.nutrition.kcal}</div>
      <div class="ob-kcal-l">calorías por día</div>
      <div class="ob-macrow">
        <div class="ob-mac prot"><div class="ob-mac-v">${ST.nutrition.prot}g</div><div class="ob-mac-l">Proteína</div></div>
        <div class="ob-mac carb"><div class="ob-mac-v">${ST.nutrition.carb}g</div><div class="ob-mac-l">Carbos</div></div>
        <div class="ob-mac fat"><div class="ob-mac-v">${ST.nutrition.fat}g</div><div class="ob-mac-l">Grasas</div></div>
      </div>
    </div>`;
  }
}

function selOb(el, field, val) {
  el.closest('.ob-opts').querySelectorAll('.ob-opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
  ST.profile[field] = val;
}
function obNext() {
  if (obStep < 3) { obStep++; renderOb(); }
  else { ST.onboarded = true; save(); window.appReady(); }
}
function obBack() {
  if (obStep > 0) { obStep--; renderOb(); }
  else showScreen('sw');
}

function calcNutr() {
  const p = ST.profile;
  let bmr = p.sex === 'male' ? 10*p.weight + 6.25*p.height - 5*p.age + 5 : 10*p.weight + 6.25*p.height - 5*p.age - 161;
  const m = {sedentary:1.2,light:1.375,moderate:1.55,active:1.725,very_active:1.9};
  let tdee = Math.round(bmr * (m[p.activity] || 1.55));
  if (p.goal === 'lose') tdee -= 400;
  else if (p.goal === 'gain') tdee += 300;
  const prot = Math.round(p.weight * (p.goal === 'gain' ? 2.2 : 1.8));
  const fat  = Math.round(tdee * .25 / 9);
  const carb = Math.round((tdee - prot*4 - fat*9) / 4);
  ST.nutrition = { kcal:tdee, prot:Math.max(prot,80), carb:Math.max(carb,50), fat:Math.max(fat,40) };
}
