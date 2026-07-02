let curPick = null;

// ═══════════════════════════════════════════════════════
// SCREENS / NAV
// ═══════════════════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function setNav(id) {
  const map = {'sh':0,'sp':1,'st':2,'sai':3,'spf':4};
  document.querySelectorAll('.bnav-item').forEach((n,i) => n.classList.toggle('on', i === map[id]));
}
function navTo(id, el) {
  showScreen(id);
  document.querySelectorAll('.bnav-item').forEach(n => n.classList.remove('on'));
  el.classList.add('on');
  if (id === 'sh')  updateHome();
  if (id === 'sp')  updateProgress();
  if (id === 'st')  updateTrain();
  if (id === 'spf') updateProfile();
}

// ═══════════════════════════════════════════════════════
// PICKERS — Stepper confiable para móvil y PC
// ═══════════════════════════════════════════════════════
function openPick(field) {
  curPick = field;
  const c = document.getElementById('pick-content');
  const titles = {sex:'Sexo biológico',goal:'Objetivo',name:'Tu nombre',age:'Edad',height:'Altura',weight:'Peso',activity:'Actividad'};
  document.getElementById('pick-title').textContent = titles[field] || field;

  if (field === 'sex') {
    c.innerHTML = `<div class="pick-opts">
      <div class="pick-opt ${ST.profile.sex==='male'?'sel':''}" onclick="pickSel('sex','male',this)">👨 Masculino</div>
      <div class="pick-opt ${ST.profile.sex==='female'?'sel':''}" onclick="pickSel('sex','female',this)">👩 Femenino</div>
    </div>`;

  } else if (field === 'goal') {
    c.innerHTML = `<div class="pick-opts">
      <div class="pick-opt ${ST.profile.goal==='lose'?'sel':''}" onclick="pickSel('goal','lose',this)">🔥 Perder grasa</div>
      <div class="pick-opt ${ST.profile.goal==='gain'?'sel':''}" onclick="pickSel('goal','gain',this)">💪 Ganar músculo</div>
      <div class="pick-opt ${ST.profile.goal==='maintain'?'sel':''}" onclick="pickSel('goal','maintain',this)">⚖️ Mantener peso</div>
    </div>`;

  } else if (field === 'activity') {
    c.innerHTML = `<div class="pick-opts">
      ${[['sedentary','🪑','Sedentario'],['light','🚶','Ligero'],['moderate','🏃','Moderado'],['active','💪','Activo'],['very_active','🔥','Muy activo']]
        .map(([v,i,n]) => `<div class="pick-opt ${ST.profile.activity===v?'sel':''}" onclick="pickSel('activity','${v}',this)">${i} ${n}</div>`).join('')}
    </div>`;

  } else if (field === 'name') {
    c.innerHTML = `<input class="num-big" type="text" id="name-inp" value="${ST.profile.name||''}" placeholder="Tu nombre" style="font-size:20px;font-family:'Inter',sans-serif;text-align:center" oninput="ST.profile.name=this.value">`;
    setTimeout(() => document.getElementById('name-inp')?.focus(), 100);

  } else if (field === 'age') {
    c.innerHTML = buildStepper('age', ST.profile.age, 10, 100, 1, 'años');

  } else if (field === 'height') {
    c.innerHTML = buildStepper('height', ST.profile.height, 100, 230, 1, 'cm');

  } else if (field === 'weight') {
    c.innerHTML = buildStepper('weight', ST.profile.weight, 30, 250, 0.5, 'kg');
  }
  openOverlay('ov-pick');
}

function buildStepper(field, current, min, max, step, unit) {
  const displayVal = Number.isInteger(step) ? current : current.toFixed(1);
  return `
  <div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:8px 0">
    <div style="display:flex;align-items:center;gap:16px">
      <button id="step-btn-minus-${field}"
        style="width:58px;height:58px;border-radius:50%;background:var(--card2);border:2px solid var(--border);color:var(--text);font-size:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;user-select:none;-webkit-user-select:none"
        onpointerdown="stepStart('${field}',${-step},${min},${max},${step})" onpointerup="stepStop()" onpointerleave="stepStop()">−</button>
      <div style="text-align:center">
        <input id="step-val-${field}" type="number" value="${displayVal}" min="${min}" max="${max}" step="${step}"
          style="font-family:'Space Grotesk',sans-serif;font-size:48px;font-weight:700;color:var(--cyan);background:transparent;border:none;outline:none;width:140px;text-align:center;-moz-appearance:textfield"
          oninput="ST.profile['${field}']=parseFloat(this.value)||${current}">
        <div style="font-size:13px;color:var(--t2);margin-top:2px">${unit}</div>
      </div>
      <button id="step-btn-plus-${field}"
        style="width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,var(--cyan),var(--cyan2));border:none;color:#000;font-size:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;user-select:none;-webkit-user-select:none"
        onpointerdown="stepStart('${field}',${step},${min},${max},${step})" onpointerup="stepStop()" onpointerleave="stepStop()">+</button>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center">
      ${getPresets(field, unit).map(p => `<div onclick="setStepperVal('${field}',${p.v})" style="padding:7px 13px;background:var(--card);border:1.5px solid var(--border);border-radius:18px;font-size:13px;cursor:pointer;font-weight:500">${p.l} ${unit}</div>`).join('')}
    </div>
  </div>`;
}

function getPresets(field, unit) {
  if (field === 'age')    return [{v:18,l:'18'},{v:25,l:'25'},{v:30,l:'30'},{v:35,l:'35'},{v:40,l:'40'},{v:50,l:'50'}];
  if (field === 'height') return [{v:155,l:'155'},{v:160,l:'160'},{v:165,l:'165'},{v:170,l:'170'},{v:175,l:'175'},{v:180,l:'180'},{v:185,l:'185'}];
  if (field === 'weight') return [{v:50,l:'50'},{v:60,l:'60'},{v:70,l:'70'},{v:80,l:'80'},{v:90,l:'90'},{v:100,l:'100'}];
  return [];
}

let _stepTimer = null, _stepInterval = null;

function stepStart(field, delta, min, max, step) {
  stepApply(field, delta, min, max, step);
  _stepTimer = setTimeout(() => {
    _stepInterval = setInterval(() => stepApply(field, delta, min, max, step), 100);
  }, 350);
}

function stepStop() {
  clearTimeout(_stepTimer);
  clearInterval(_stepInterval);
  _stepTimer = _stepInterval = null;
}

function stepApply(field, delta, min, max, step) {
  let cur = parseFloat(ST.profile[field]) || min;
  cur = Math.round((cur + delta) / step) * step;
  cur = parseFloat(Math.max(min, Math.min(max, cur)).toFixed(1));
  ST.profile[field] = cur;
  const el = document.getElementById('step-val-' + field);
  if (el) el.value = Number.isInteger(step) ? cur : cur.toFixed(1);
}

function setStepperVal(field, val) {
  ST.profile[field] = val;
  const el = document.getElementById('step-val-' + field);
  if (el) el.value = val;
}

// Legacy aliases
function stepperChange(f,d,mn,mx,st,u){stepApply(f,d,mn,mx,st);}
function startRepeat(f,d,mn,mx,st,u){stepStart(f,d,mn,mx,st);}
function stopRepeat(){stepStop();}

function pickSel(field, val, el) {
  ST.profile[field] = val;
  el.closest('.pick-opts').querySelectorAll('.pick-opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
}

// confirmPick integrated above

function confirmPick() {
  closeOverlay('ov-pick');
  calcNutr(); save(); updateProfile(); updateHome();
  const map = {sex:'v-sex',age:'v-age',height:'v-height',weight:'v-weight',name:'v-name'};
  Object.entries(map).forEach(([f,id]) => {
    const el = document.getElementById(id); if (!el) return;
    const p = ST.profile;
    if (f==='sex')         el.textContent = p.sex==='male'?'Masculino':'Femenino';
    else if (f==='name')   el.textContent = p.name||'Ingresar';
    else if (f==='age')    el.textContent = p.age+' años';
    else if (f==='height') el.textContent = p.height+' cm';
    else if (f==='weight') el.textContent = p.weight+' kg';
  });
  toast('✅ Datos actualizados','ok');
}

// ═══════════════════════════════════════════════════════
// OVERLAYS
// ═══════════════════════════════════════════════════════
function openOverlay(id)  { document.getElementById(id).classList.add('open'); }
function closeOverlay(id) { document.getElementById(id).classList.remove('open'); }
document.getElementById('ov-food').addEventListener('click', e => { if(e.target===document.getElementById('ov-food')) closeOverlay('ov-food'); });
document.getElementById('ov-pick').addEventListener('click', e => { if(e.target===document.getElementById('ov-pick')) closeOverlay('ov-pick'); });
document.getElementById('ov-gkey').addEventListener('click', e => { if(e.target===document.getElementById('ov-gkey')) closeOverlay('ov-gkey'); });
document.getElementById('ov-routine').addEventListener('click', e => { if(e.target===document.getElementById('ov-routine')) closeOverlay('ov-routine'); });
document.getElementById('ov-anthro').addEventListener('click', e => { if(e.target===document.getElementById('ov-anthro')) closeOverlay('ov-anthro'); });
document.getElementById('ov-aigen').addEventListener('click', e => { if(e.target===document.getElementById('ov-aigen')) closeOverlay('ov-aigen'); });
document.getElementById('ov-mealplan').addEventListener('click', e => { if(e.target===document.getElementById('ov-mealplan')) closeOverlay('ov-mealplan'); });
// ov-workout NO se cierra tocando afuera — evita perder la sesión por error

// ═══════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════
window.toast = function(msg, type='') {
  const wrap = document.getElementById('toast-wrap');
  const el = document.createElement('div');
  el.className = 'toast-item' + (type?' '+type:'');
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); }, 2400);
};
