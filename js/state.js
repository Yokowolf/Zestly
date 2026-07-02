// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════
window.ST = {
  onboarded:false,
  profile:{name:'',sex:'male',age:25,height:170,weight:70,goal:'lose',activity:'moderate'},
  nutrition:{kcal:2000,prot:150,carb:200,fat:65},
  today:{kcal:0,prot:0,carb:0,fat:0,water:0},
  meals:{breakfast:[],lunch:[],dinner:[],snack:[]},
  log:[],weightLog:[],streak:1,
  fastingActive:false,fastingStart:null,
  curMeal:'breakfast',
  // Fitness
  routines:[],        // rutinas creadas por el usuario
  workoutLogs:[],     // historial de sesiones (últimas 60)
  activeWorkout:null  // sesión en curso (sobrevive recargas)
};

const MEALS = {
  breakfast:{name:'Desayuno',icon:'🌅'},
  lunch:{name:'Almuerzo',icon:'☀️'},
  dinner:{name:'Cena',icon:'🌙'},
  snack:{name:'Snack',icon:'🍎'}
};

// ═══════════════════════════════════════════════════════
// SAVE / LOAD
// ═══════════════════════════════════════════════════════
function save() {
  if (window.cloudSave) window.cloudSave();
  else localStorage.setItem('zs2', JSON.stringify(window.ST));
}

window.appReady = function() {
  document.getElementById('bnav').style.display = 'flex';
  showScreen('sh');
  updateHome();
  updateProfile();
  updateProgress();
  if (typeof updateTrain === 'function') updateTrain();
  checkGeminiKey();
  const li = document.getElementById('li-section');
  const lo = document.getElementById('lo-section');
  const lb = document.getElementById('lo-btn');
  if (window.currentUser) {
    if(li) li.style.display='none';
    if(lo) lo.style.display='flex';
    if(lb) lb.style.display='flex';
  } else {
    if(li) li.style.display='flex';
    if(lo) lo.style.display='none';
    if(lb) lb.style.display='none';
  }
};

window.hideSplash = function() {
  const sp = document.getElementById('splash');
  if (sp) { sp.style.opacity = '0'; setTimeout(() => sp.remove(), 400); }
};

window.showSync = function() {
  const b = document.getElementById('sync-badge');
  b.style.display = 'flex';
  clearTimeout(window._syncT);
  window._syncT = setTimeout(() => b.style.display = 'none', 3000);
};
