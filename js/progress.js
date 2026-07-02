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
}
