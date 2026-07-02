import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
         setPersistence, browserLocalPersistence }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const FB = { apiKey:"AIzaSyAQ_Io3ZIzIEj6z4NV1nhFSoveFsq8ItjE", authDomain:"zestly-d13ae.firebaseapp.com",
  projectId:"zestly-d13ae", storageBucket:"zestly-d13ae.firebasestorage.app",
  messagingSenderId:"98909467544", appId:"1:98909467544:web:2b98f83eaa189877f071ed" };

const app  = initializeApp(FB);
const auth = getAuth(app);
const db   = getFirestore(app);
const provider = new GoogleAuthProvider();
setPersistence(auth, browserLocalPersistence).catch(() => {});
window.currentUser = null;

// ── SAVE ─────────────────────────────────────────────────────────────────
window.cloudSave = async function() {
  const s = window.ST;
  localStorage.setItem('zs2', JSON.stringify(s)); // siempre guardar local
  if (!window.currentUser) return;
  try {
    await Promise.all([
      setDoc(doc(db,'users',window.currentUser.uid,'d','profile'), {
        profile:s.profile, nutrition:s.nutrition, streak:s.streak,
        weightLog:s.weightLog, log:s.log,
        geminiKey: localStorage.getItem('zs_gkey') || '',
        fastingActive:s.fastingActive, fastingStart:s.fastingStart,
        ts: Date.now()
      }, {merge:true}),
      setDoc(doc(db,'users',window.currentUser.uid,'d','today'), {
        date: new Date().toDateString(),
        today:s.today, meals:s.meals, ts: Date.now()
      }, {merge:true}),
      setDoc(doc(db,'users',window.currentUser.uid,'d','fitness'), {
        routines: s.routines || [],
        workoutLogs: s.workoutLogs || [],
        activeWorkout: s.activeWorkout || null,
        ts: Date.now()
      }, {merge:true})
    ]);
    window.showSync();
  } catch(e) { console.warn('Cloud save error:',e); }
};

// ── LOAD ─────────────────────────────────────────────────────────────────
async function cloudLoad(uid) {
  try {
    const [pS, tS, fS] = await Promise.all([
      getDoc(doc(db,'users',uid,'d','profile')),
      getDoc(doc(db,'users',uid,'d','today')),
      getDoc(doc(db,'users',uid,'d','fitness'))
    ]);

    if (fS.exists()) {
      const f = fS.data();
      window.ST.routines      = f.routines      || [];
      window.ST.workoutLogs   = f.workoutLogs   || [];
      window.ST.activeWorkout = f.activeWorkout || null;
    }

    if (pS.exists()) {
      const d = pS.data();
      Object.assign(window.ST, {
        profile:       d.profile       || window.ST.profile,
        nutrition:     d.nutrition     || window.ST.nutrition,
        streak:        d.streak        || 1,
        weightLog:     d.weightLog     || [],
        log:           d.log           || [],
        fastingActive: d.fastingActive || false,
        fastingStart:  d.fastingStart  || null
      });
      if (d.geminiKey && !localStorage.getItem('zs_gkey')) {
        localStorage.setItem('zs_gkey', d.geminiKey);
        window.GEMINI_KEY = d.geminiKey;
      }
    }

    const todayStr = new Date().toDateString();

    if (tS.exists()) {
      const td = tS.data();
      if (td.date === todayStr) {
        // Mismo dia: cargar datos normalmente
        window.ST.today = td.today || window.ST.today;
        window.ST.meals = td.meals || window.ST.meals;
      } else if (td.date && td.today && (td.today.kcal || 0) > 0) {
        // Dia diferente: archivar ayer en el historial
        const yaArchivado = (window.ST.log || []).some(function(l) { return l.date === td.date; });
        if (!yaArchivado) {
          if (!window.ST.log) window.ST.log = [];
          window.ST.log.push(Object.assign({ date: td.date }, td.today));
          if (window.ST.log.length > 60) window.ST.log = window.ST.log.slice(-60);
          // Actualizar racha
          try {
            const prev = new Date(td.date);
            const diff = Math.round((new Date() - prev) / 86400000);
            if (diff === 1) window.ST.streak = (window.ST.streak || 0) + 1;
            else if (diff > 1) window.ST.streak = 1;
          } catch(e2) {}
          // Guardar historial en Firebase
          await setDoc(doc(db,'users',uid,'d','profile'),
            { log: window.ST.log, streak: window.ST.streak, ts: Date.now() },
            { merge: true }
          );
        }
        // Resetear dia nuevo
        window.ST.today = { kcal:0, prot:0, carb:0, fat:0, water:0 };
        window.ST.meals = { breakfast:[], lunch:[], dinner:[], snack:[] };
        await setDoc(doc(db,'users',uid,'d','today'),
          { date: todayStr, today: window.ST.today, meals: window.ST.meals, ts: Date.now() },
          { merge: true }
        );
      } else {
        window.ST.today = { kcal:0, prot:0, carb:0, fat:0, water:0 };
        window.ST.meals = { breakfast:[], lunch:[], dinner:[], snack:[] };
      }
    } else {
      window.ST.today = { kcal:0, prot:0, carb:0, fat:0, water:0 };
      window.ST.meals = { breakfast:[], lunch:[], dinner:[], snack:[] };
    }

    window.ST.onboarded = true;
    localStorage.setItem('zs2', JSON.stringify(window.ST));
    localStorage.setItem('zs_day', todayStr);

  } catch(e) { console.warn('Cloud load error:', e); }
  window.hideSplash();
  window.appReady();
}

onAuthStateChanged(auth, async user => {
  window.currentUser = user;
  if (user) {
    document.querySelectorAll('.g-name').forEach(el => el.textContent = user.displayName || user.email.split('@')[0]);
    document.querySelectorAll('.g-email').forEach(el => el.textContent = user.email);
    document.querySelectorAll('.g-photo').forEach(el => { if(user.photoURL){el.src=user.photoURL;el.style.display='block';} });
    ['li-section'].forEach(id => { const e=document.getElementById(id); if(e) e.style.display='none'; });
    ['lo-section','sync-badge'].forEach(id => { const e=document.getElementById(id); if(e) e.style.display='flex'; });
    const lb = document.getElementById('lo-btn'); if(lb) lb.style.display='flex';
    await cloudLoad(user.uid);
  } else {
    const local = localStorage.getItem('zs2');
    if (local) try { Object.assign(window.ST, JSON.parse(local)); } catch(e) {}
    window.hideSplash();
    if (window.ST.onboarded) window.appReady();
    else showScreen('sw');
  }
});

window.gSignIn = async () => {
  try { await signInWithPopup(auth, provider); }
  catch(e) { window.toast('❌ Error al iniciar sesión','err'); }
};
window.gSignOut = async () => {
  await signOut(auth);
  window.toast('👋 Sesión cerrada');
  document.getElementById('bnav').style.display = 'none';
  showScreen('sw');
};
