// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
(() => {
  // Cargar key de Gemini guardada
  const savedKey = localStorage.getItem('zs_gkey');
  if (savedKey) GEMINI_KEY = savedKey;

  // Cargar datos locales como pre-carga (Firebase los actualizará)
  const local = localStorage.getItem('zs2');
  if (local) try { Object.assign(window.ST, JSON.parse(local)); } catch(e) {}

  // ¿Llegó una rutina compartida por link? (?r=...)
  importSharedRoutine();

  // Si Firebase tarda más de 5s, mostrar pantalla sin esperar
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash && splash.parentNode) {
      window.hideSplash();
      if (window.ST.onboarded) window.appReady();
      else showScreen('sw');
    }
  }, 5000);
})();
