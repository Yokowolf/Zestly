// ═══════════════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════════════
function updateHome() {
  const h = new Date().getHours();
  document.getElementById('h-greet').textContent = h<12?'Buenos días 👋':h<18?'Buenas tardes 👋':'Buenas noches 👋';
  const name = ST.profile.name || (window.currentUser?.displayName?.split(' ')[0]) || 'Mi Dashboard';
  document.getElementById('h-name').textContent = name;
  document.getElementById('h-date').textContent = new Date().toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long'});

  const goal = ST.nutrition.kcal, eaten = ST.today.kcal;
  const rem = Math.max(0, goal - eaten), pct = Math.min(1, eaten / goal);
  document.getElementById('ring-fill').style.strokeDashoffset = 521 * (1 - pct);
  document.getElementById('ring-kcal').textContent  = rem;
  document.getElementById('ring-eaten').textContent = eaten + ' kcal';
  document.getElementById('qs-pct').textContent = Math.round(pct*100) + '%';

  const n = ST.nutrition;
  document.getElementById('m-p').textContent = ST.today.prot + 'g';
  document.getElementById('m-c').textContent = ST.today.carb + 'g';
  document.getElementById('m-f').textContent = ST.today.fat  + 'g';
  document.getElementById('m-p-b').style.width = Math.min(100, ST.today.prot/n.prot*100) + '%';
  document.getElementById('m-c-b').style.width = Math.min(100, ST.today.carb/n.carb*100) + '%';
  document.getElementById('m-f-b').style.width = Math.min(100, ST.today.fat/n.fat*100)  + '%';

  document.getElementById('qs-water').textContent  = ST.today.water + '/8';
  document.getElementById('qs-streak').textContent = ST.streak;
  document.getElementById('qs-fast').textContent   = ST.fastingActive ? 'ON' : 'OFF';

  const fc = document.getElementById('fast-card');
  if (ST.fastingActive) {
    fc.style.display = 'block';
    document.getElementById('fast-body').style.display = 'block';
  } else {
    fc.style.display = 'none';
  }

  renderMeals();
}

function renderMeals() {
  const c = document.getElementById('meals-cont'); c.innerHTML = '';
  for (const [key, info] of Object.entries(MEALS)) {
    const items = ST.meals[key] || [];
    const mkcal = items.reduce((s,i) => s+i.kcal, 0);
    const div = document.createElement('div'); div.className = 'meal-card fu';
    const itemsHTML = items.map((it,idx) => {
      return `<div class="meal-item">
        <span class="mi-name" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${it.name}</span>
        <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
          <span style="font-size:12px;font-weight:700;color:var(--cyan)">${it.kcal}</span>
          <span style="font-size:10px;color:var(--t3)">kcal</span>
          <span class="mi-del" onclick="removeFood('${key}',${idx})" title="Eliminar">✕</span>
        </div>
      </div>`;
    }).join('');
    div.innerHTML = `<div class="meal-head"><div class="meal-left"><span class="meal-icon">${info.icon}</span><div><div class="meal-nm">${info.name}</div><div class="meal-kc">${mkcal} kcal</div></div></div><div class="meal-add" onclick="openFood('${key}')">+</div></div>
    ${items.length ? `<div class="meal-items">${itemsHTML}</div>` : ''}`;
    c.appendChild(div);
  }
}

function editFoodQty(meal, idx, newQty) {
  const it = ST.meals[meal][idx];
  if (!it.fromDB) return; // AI items are fixed portions
  const qty = parseFloat(newQty) || 100;
  const ratio = qty / 100; // Always per 100g for DB items
  // Remove old from totals
  ST.today.kcal = Math.max(0, ST.today.kcal - it.kcal);
  ST.today.prot = Math.max(0, ST.today.prot - it.prot);
  ST.today.carb = Math.max(0, ST.today.carb - it.carb);
  ST.today.fat  = Math.max(0, ST.today.fat  - it.fat);
  // Update with new qty
  it.qty  = qty;
  it.kcal = Math.round((it.baseKcal) * ratio);
  it.prot = Math.round((it.baseProt) * ratio * 10)/10;
  it.carb = Math.round((it.baseCarb) * ratio * 10)/10;
  it.fat  = Math.round((it.baseFat)  * ratio * 10)/10;
  // Add new to totals
  ST.today.kcal += it.kcal;
  ST.today.prot += it.prot;
  ST.today.carb += it.carb;
  ST.today.fat  += it.fat;
  save(); updateHome();
}

// ═══════════════════════════════════════════════════════
// WATER / FASTING
// ═══════════════════════════════════════════════════════
function addWater() {
  if (ST.today.water < 8) {
    ST.today.water++;
    save(); updateHome();
    toast('💧 Vaso ' + ST.today.water + '/8 registrado', 'ok');
  } else {
    toast('✅ ¡Ya completaste tus 8 vasos!','ok');
  }
}

function toggleFast() {
  ST.fastingActive = !ST.fastingActive;
  ST.fastingStart  = ST.fastingActive ? Date.now() : null;
  save(); updateHome();
  toast(ST.fastingActive ? '⏱ Ayuno 16:8 iniciado' : '✅ Ayuno finalizado', 'ok');
}

setInterval(() => {
  if (!ST.fastingActive || !ST.fastingStart) return;
  const el = document.getElementById('fast-time'); if (!el) return;
  const ms = Date.now() - ST.fastingStart;
  const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000), s=Math.floor((ms%60000)/1000);
  el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const rf = document.getElementById('fast-ring-f');
  if (rf) rf.style.strokeDashoffset = 289 * (1 - Math.min(1, ms/(16*3600000)));
  const st = document.getElementById('fast-stat');
  if (st) st.textContent = h >= 16 ? '🎉 ¡Meta 16:8 alcanzada!' : `${15-h}h ${59-m}min para la meta`;
}, 1000);
