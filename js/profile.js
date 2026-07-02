// ═══════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════
function updateProfile() {
  const p = ST.profile, n = ST.nutrition;
  const name = p.name || window.currentUser?.displayName?.split(' ')[0] || 'Zestly';
  const letter = name[0].toUpperCase();
  document.getElementById('pf-init').textContent = letter;
  const photo = window.currentUser?.photoURL;
  if (photo) { document.querySelectorAll('.g-photo').forEach(el=>{el.src=photo;el.style.display='block';}); document.getElementById('pf-init').style.display='none'; }
  document.getElementById('pf-name').textContent = name;
  const gt = p.goal==='lose'?'Perder grasa':p.goal==='gain'?'Ganar músculo':'Mantener peso';
  document.getElementById('pf-goal').textContent  = gt;
  document.getElementById('pb-goal').textContent  = gt;
  document.getElementById('pb-kcal').textContent  = n.kcal + ' kcal';
  document.getElementById('pb-str').textContent   = ST.streak + (ST.streak===1?' día':' días');
  document.getElementById('e-name').textContent   = p.name || '-';
  document.getElementById('e-age').textContent    = p.age + ' años';
  document.getElementById('e-height').textContent = p.height + ' cm';
  document.getElementById('e-weight').textContent = p.weight + ' kg';
  document.getElementById('e-goal').textContent   = gt;
  document.getElementById('set-kcal').textContent = n.kcal + ' kcal';
  document.getElementById('set-p').textContent    = n.prot + 'g';
  document.getElementById('set-c').textContent    = n.carb + 'g';
  document.getElementById('set-f').textContent    = n.fat  + 'g';
  const gs = document.getElementById('ai-status');
  if (gs) gs.textContent = geminiStatus();
}

// ═══════════════════════════════════════════════════════
// GEMINI KEY
// ═══════════════════════════════════════════════════════
function checkGeminiKey() {
  if (!localStorage.getItem('zs_gkey')) {
    setTimeout(() => openOverlay('ov-gkey'), 1500);
  }
}
function saveGeminiKey() {
  const key = document.getElementById('gkey-input').value.trim();
  if (!key || key.length < 10) { toast('❌ Key inválida — verifica que la copiaste completa','err'); return; }
  GEMINI_KEY = key;
  localStorage.setItem('zs_gkey', key);
  closeOverlay('ov-gkey');
  toast('🤖 Gemini AI activado correctamente','ok');
  updateProfile();
}
function openGeminiKeyModal() {
  document.getElementById('gkey-input').value = localStorage.getItem('zs_gkey') || '';
  openOverlay('ov-gkey');
}
function geminiStatus() {
  const k = localStorage.getItem('zs_gkey');
  if (!k) return '⚠️ Sin configurar';
  if (k.startsWith('gsk_')) return '✅ Groq activo';
  return '✅ Configurado';
}

// ═══════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════
function exportData() {
  const blob = new Blob([JSON.stringify(window.ST,null,2)],{type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='zestly_backup.json'; a.click();
  toast('📤 Backup descargado','ok');
}
function resetApp() {
  if (confirm('¿Seguro? Se borrarán todos tus datos locales.')) { localStorage.clear(); location.reload(); }
}
