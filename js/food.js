let photoBase64 = null;

// ═══════════════════════════════════════════════════════
// FOOD
// ═══════════════════════════════════════════════════════
function openFood(meal) {
  ST.curMeal = meal;
  document.getElementById('food-title').textContent = 'Añadir a ' + MEALS[meal].name;
  const fsearch = document.getElementById('fsearch');
  if (fsearch) fsearch.value = '';
  document.getElementById('fresults').innerHTML = '';
  document.getElementById('qgrid').innerHTML = QUICK.map(q =>
    `<div class="qi" onclick='selectFood(${JSON.stringify(q)})'><div class="qi-n">${q.name}</div><div class="qi-m">${q.kcal} kcal · P:${q.prot}g · C:${q.carb}g</div></div>`).join('');
  fTab(document.querySelector('.ftab'), 'search');
  renderFoodCats();
  openOverlay('ov-food');
}

function fTab(el, tab) {
  document.querySelectorAll('.ftab').forEach(t => t.classList.remove('on')); el.classList.add('on');
  ['search','cam','text','quick'].forEach(t => document.getElementById('ft-'+t).style.display = t===tab?'block':'none');
}

function renderFoodCats() {
  const cats = document.getElementById('fcats'); if (!cats) return;
  const entries = Object.entries(FOOD_CATS);
  cats.innerHTML = entries.map(([cat, foods]) =>
    `<details style="margin-bottom:8px">
      <summary style="font-size:12px;font-weight:700;color:var(--t2);cursor:pointer;padding:8px 12px;background:var(--card);border-radius:var(--rs);list-style:none;display:flex;justify-content:space-between">
        <span>${cat}</span><span style="color:var(--t3)">${foods.length} alimentos ›</span>
      </summary>
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">
        ${foods.map(f => `<div class="fr-item" onclick='selectFood(${JSON.stringify(f)})'>
          <div><div class="fr-name">${f.name}</div><div class="fr-detail">P:${f.prot}g · C:${f.carb}g · G:${f.fat}g por ${f.unit}</div></div>
          <div style="text-align:right"><div class="fr-kcal">${f.kcal}</div><div class="fr-unit">kcal/${f.unit}</div></div>
        </div>`).join('')}
      </div>
    </details>`
  ).join('');
}

function doSearch() {
  const q = document.getElementById('fsearch').value.toLowerCase().trim();
  const res = document.getElementById('fresults');
  const cats = document.getElementById('fcats');
  if (!q) {
    res.innerHTML = '';
    if (cats) cats.style.display = 'block';
    return;
  }
  if (cats) cats.style.display = 'none';
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const qn = norm(q);
  const m = FOODS.filter(f => norm(f.name).includes(qn)).slice(0, 10);
  if (!m.length) {
    res.innerHTML = `<div style="text-align:center;color:var(--t3);padding:16px;font-size:12px">
      Sin resultados para "<strong>${q}</strong>"<br><span style="font-size:11px">Prueba Texto IA para descripciones libres ✨</span></div>`;
    return;
  }
  res.innerHTML = m.map(f =>
    `<div class="fr-item" id="fri-${f.name.replace(/\s/g,'_')}" onclick='selectFood(${JSON.stringify(f).replace(/'/g,"\'")})''>
      <div><div class="fr-name">${f.name}</div><div class="fr-detail">P:${f.prot}g · C:${f.carb}g · G:${f.fat}g</div></div>
      <div style="text-align:right"><div class="fr-kcal">${f.kcal}</div><div class="fr-unit">kcal/${f.unit}</div></div>
    </div>`).join('');
}

// ── Inline portion selector ─────────────────────────────────────────────────
let _selFood = null;

function selectFood(food) {
  _selFood = food;
  // Remove any existing inline selector
  document.querySelectorAll('.inline-selector').forEach(el => el.remove());
  // Find the clicked item
  const itemEl = event.currentTarget;
  const isLiquid = (food.unit || '100g').includes('ml');
  const defaultQty = isLiquid ? 200 : 100;

  const sel = document.createElement('div');
  sel.className = 'inline-selector';
  sel.style.cssText = 'background:var(--card2);border:1.5px solid var(--cyan);border-radius:var(--rs);padding:12px;margin-top:6px';
  sel.innerHTML = `
    <div style="font-size:12px;color:var(--t2);margin-bottom:8px">
      <strong style="color:var(--text)">${food.name}</strong> — ${food.kcal} kcal por ${food.unit}
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <button onclick="adjQty(-${isLiquid?50:25})" style="width:36px;height:36px;border-radius:50%;background:var(--card);border:1px solid var(--border);color:var(--text);font-size:20px;cursor:pointer;flex-shrink:0">−</button>
      <div style="flex:1;text-align:center">
        <input id="inline-qty" type="number" value="${defaultQty}" min="1" max="3000" step="${isLiquid?50:25}"
          style="width:70px;background:transparent;border:none;color:var(--cyan);font-size:22px;font-weight:700;font-family:'Space Grotesk',sans-serif;text-align:center;outline:none"
          oninput="updateInlinePreview(${food.kcal},${food.prot},${food.carb},${food.fat},${isLiquid?100:100})">
        <span style="font-size:13px;color:var(--t2)">${isLiquid?'ml':'g'}</span>
      </div>
      <button onclick="adjQty(${isLiquid?50:25})" style="width:36px;height:36px;border-radius:50%;background:var(--cyan);border:none;color:#000;font-size:20px;cursor:pointer;flex-shrink:0">+</button>
    </div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">
      ${(isLiquid ? [150,200,250,300,400,500] : [50,75,100,150,200,250]).map(v =>
        `<div onclick="setQty(${v})" style="padding:5px 10px;background:var(--card);border:1px solid var(--border);border-radius:12px;font-size:12px;cursor:pointer">${v}${isLiquid?'ml':'g'}</div>`).join('')}
    </div>
    <div id="inline-preview" style="font-size:13px;font-weight:600;color:var(--green);margin-bottom:10px">
      = ${Math.round(food.kcal * defaultQty / 100)} kcal · P:${Math.round(food.prot * defaultQty / 100 * 10)/10}g · C:${Math.round(food.carb * defaultQty / 100 * 10)/10}g · G:${Math.round(food.fat * defaultQty / 100 * 10)/10}g
    </div>
    <button onclick="addFoodWithQty()" style="width:100%;padding:12px;border-radius:var(--rs);background:linear-gradient(135deg,var(--cyan),var(--cyan2));border:none;color:#000;font-size:15px;font-weight:700;cursor:pointer">
      ✅ Añadir
    </button>`;
  itemEl.insertAdjacentElement('afterend', sel);
  sel.scrollIntoView({behavior:'smooth', block:'nearest'});
}

function adjQty(delta) {
  const inp = document.getElementById('inline-qty');
  if (!inp || !_selFood) return;
  const newVal = Math.max(1, (parseFloat(inp.value)||100) + delta);
  inp.value = newVal;
  updateInlinePreview(_selFood.kcal, _selFood.prot, _selFood.carb, _selFood.fat, 100);
}

function setQty(val) {
  const inp = document.getElementById('inline-qty');
  if (!inp || !_selFood) return;
  inp.value = val;
  updateInlinePreview(_selFood.kcal, _selFood.prot, _selFood.carb, _selFood.fat, 100);
}

function updateInlinePreview(kcal, prot, carb, fat, base) {
  const inp = document.getElementById('inline-qty');
  const prev = document.getElementById('inline-preview');
  if (!inp || !prev) return;
  const qty = parseFloat(inp.value) || base;
  const r = qty / base;
  prev.textContent = `= ${Math.round(kcal*r)} kcal · P:${Math.round(prot*r*10)/10}g · C:${Math.round(carb*r*10)/10}g · G:${Math.round(fat*r*10)/10}g`;
}

function addFoodWithQty() {
  if (!_selFood) return;
  const inp = document.getElementById('inline-qty');
  const qty = parseFloat(inp?.value) || 100;
  const r = qty / 100;
  const it = {
    name: _selFood.name + ' (' + qty + ((_selFood.unit||'100g').includes('ml')?'ml':'g') + ')',
    qty: qty, unit: (_selFood.unit||'100g').includes('ml') ? 'ml' : 'g',
    fromDB: true,
    baseKcal: _selFood.kcal, baseProt: _selFood.prot,
    baseCarb: _selFood.carb, baseFat: _selFood.fat,
    kcal: Math.round(_selFood.kcal * r),
    prot: Math.round(_selFood.prot * r * 10)/10,
    carb: Math.round(_selFood.carb * r * 10)/10,
    fat:  Math.round(_selFood.fat  * r * 10)/10
  };
  ST.meals[ST.curMeal].push(it);
  ST.today.kcal += it.kcal; ST.today.prot += it.prot;
  ST.today.carb += it.carb; ST.today.fat  += it.fat;
  save(); closeOverlay('ov-food'); updateHome();
  toast('✅ ' + _selFood.name + ' (' + qty + (it.unit) + ') — ' + it.kcal + ' kcal', 'ok');
  _selFood = null;
}

function addFood(food) {
  const fromDB = !!food.unit; // Database items have unit (100g); AI items don't
  const base = food.unit || '100g';
  const isUnit = !fromDB || base.includes('unidad') || base.includes('porción');
  const qty = fromDB && !isUnit ? 100 : 1;
  const ratio = fromDB && !isUnit ? 1 : 1; // AI values already represent full portion
  const it = {
    name: food.name,
    qty: qty,
    unit: fromDB && !isUnit ? 'g' : 'porción',
    fromDB: fromDB,        // true = database (editable grams), false = AI (fixed portion)
    baseKcal: food.kcal||0,
    baseProt: food.prot||0,
    baseCarb: food.carb||0,
    baseFat:  food.fat||0,
    kcal: Math.round((food.kcal||0)),
    prot: Math.round((food.prot||0) * 10)/10,
    carb: Math.round((food.carb||0) * 10)/10,
    fat:  Math.round((food.fat||0)  * 10)/10
  };
  ST.meals[ST.curMeal].push(it);
  ST.today.kcal += it.kcal;
  ST.today.prot += it.prot;
  ST.today.carb += it.carb;
  ST.today.fat  += it.fat;
  save();
  closeOverlay('ov-food');
  updateHome();
  const label = fromDB && !isUnit ? '100g' : '1 porción';
  toast('✅ ' + food.name + ' añadido (' + label + ')', 'ok');
}

function updateQtyPreview(kcal, prot, carb, fat, baseQty, newQty) {
  const ratio = (parseFloat(newQty)||baseQty) / baseQty;
  const el = document.getElementById('qty-preview');
  if (el) el.textContent = `= ${Math.round(kcal*ratio)} kcal · P:${Math.round(prot*ratio)}g · C:${Math.round(carb*ratio)}g · G:${Math.round(fat*ratio)}g`;
}

function removeFood(meal, idx) {
  const it = ST.meals[meal][idx];
  ST.today.kcal = Math.max(0, ST.today.kcal - it.kcal);
  ST.today.prot = Math.max(0, ST.today.prot - it.prot);
  ST.today.carb = Math.max(0, ST.today.carb - it.carb);
  ST.today.fat  = Math.max(0, ST.today.fat  - it.fat);
  ST.meals[meal].splice(idx, 1);
  save(); updateHome();
}

// PHOTO
function analyzePhoto(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    // Redimensionar imagen para Groq Vision (máx 800px, calidad 0.7)
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 800;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const resized = canvas.toDataURL('image/jpeg', 0.72);
      photoBase64 = resized.split(',')[1];
      const prev = document.getElementById('cam-prev');
      prev.src = resized; prev.style.display = 'block';
      document.getElementById('cam-analyze-btn').style.display = 'block';
      document.querySelector('.cam-hint').textContent = 'Foto lista — toca Analizar con IA';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

let _photoItems = [];

async function sendPhotoAnalysis() {
  if (!photoBase64) return;
  const btn = document.getElementById('cam-analyze-btn');
  btn.textContent = '⏳ Analizando...'; btn.disabled = true;
  try {
    const prompt = 'Eres nutricionista experto en comida colombiana y latinoamericana. Analiza CUIDADOSAMENTE esta imagen. Identifica cada alimento visible con porciones realistas. Devuelve SOLO este JSON sin texto ni backticks: {"items":[{"name":"nombre en español","kcal":numero,"prot":numero,"carb":numero,"fat":numero}]}. Los kcal deben representar la PORCION VISIBLE, no 100g.';
    const raw = await callAIWithImage(prompt, photoBase64);
    const clean = raw.replace(/```json|```/g,'').trim();
    const s = clean.indexOf('{'), e2 = clean.lastIndexOf('}');
    if (s === -1) throw new Error('La IA no devolvio JSON valido');
    const parsed = JSON.parse(clean.slice(s, e2+1));
    if (!parsed.items?.length) throw new Error('No se detectaron alimentos');
    _photoItems = parsed.items;
    showPhotoReview(_photoItems);
    btn.style.display = 'none';
  } catch(e) {
    console.error('Photo:', e.message);
    toast('❌ No se pudo analizar — mejor iluminacion o usa Texto IA','err');
    btn.textContent = '✨ Analizar con IA'; btn.disabled = false;
  }
}

function showPhotoReview(items) {
  const preview = document.getElementById('cam-items-preview');
  const list = document.getElementById('cam-items-list');
  if (!preview || !list) { items.forEach(it => addFood(it)); return; }
  list.innerHTML = items.map((it, idx) =>
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--card);border-radius:var(--rs);margin-bottom:6px;border:1px solid var(--border)">' +
    '<div><div style="font-size:13px;font-weight:600">' + it.name + '</div>' +
    '<div style="font-size:11px;color:var(--t2)">' + it.kcal + ' kcal · P:' + (it.prot||0) + 'g · C:' + (it.carb||0) + 'g · G:' + (it.fat||0) + 'g</div></div>' +
    '<span onclick="removePhotoItem(' + idx + ')" style="font-size:18px;color:var(--t3);cursor:pointer;padding:4px 6px">✕</span></div>'
  ).join('');
  preview.style.display = 'block';
}

function removePhotoItem(idx) {
  _photoItems.splice(idx, 1);
  if (!_photoItems.length) {
    document.getElementById('cam-items-preview').style.display = 'none';
    const btn = document.getElementById('cam-analyze-btn');
    btn.style.display = 'block'; btn.textContent = '✨ Analizar de nuevo'; btn.disabled = false;
  } else { showPhotoReview(_photoItems); }
}

function confirmPhotoItems() {
  _photoItems.forEach(it => {
    const item = { name:it.name, qty:1, unit:'porción', fromDB:false,
      baseKcal:it.kcal||0, baseProt:it.prot||0, baseCarb:it.carb||0, baseFat:it.fat||0,
      kcal:Math.round(it.kcal||0), prot:Math.round((it.prot||0)*10)/10,
      carb:Math.round((it.carb||0)*10)/10, fat:Math.round((it.fat||0)*10)/10 };
    ST.meals[ST.curMeal].push(item);
    ST.today.kcal += item.kcal; ST.today.prot += item.prot;
    ST.today.carb += item.carb; ST.today.fat  += item.fat;
  });
  const total = _photoItems.reduce((s,i) => s+(i.kcal||0), 0);
  save(); closeOverlay('ov-food'); updateHome();
  toast('✅ ' + _photoItems.length + ' alimentos — ' + Math.round(total) + ' kcal', 'ok');
  _photoItems = []; photoBase64 = null;
}

// TEXT AI
async function analyzeText() {
  const txt = document.getElementById('txt-food').value.trim();
  if (!txt) return;
  if (!GEMINI_KEY) { toast('⚠️ Configura tu clave IA en Perfil primero','err'); return; }
  const btn = document.querySelector('#ft-text .btn');
  btn.textContent = '⏳ Analizando...'; btn.disabled = true;
  try {
    const prompt = 'Devuelve SOLO JSON sin texto ni backticks, sin explicaciones:\n{"items":[{"name":"nombre en español","kcal":número,"prot":número,"carb":número,"fat":número}]}\n\nAlimentos:\n' + txt;
    const raw = await callAI('Eres nutricionista. Analiza los alimentos y devuelve SOLO el JSON pedido.', prompt);
    const clean = raw.replace(/```json|```/g,'').trim();
    const s = clean.indexOf('{'), e2 = clean.lastIndexOf('}');
    if (s === -1) throw new Error('Respuesta inesperada de la IA');
    const parsed = JSON.parse(clean.slice(s, e2+1));
    if (!parsed.items?.length) throw new Error('No se encontraron alimentos');
    parsed.items.forEach(it => addFood(it));
    document.getElementById('txt-food').value = '';
    toast('✅ ' + parsed.items.length + ' alimento(s) añadidos', 'ok');
  } catch(e) {
    console.error('analyzeText:', e.message);
    toast('❌ Error IA: ' + (e.message||'').slice(0,60),'err');
  }
  btn.textContent = '✨ Analizar con IA'; btn.disabled = false;
}
