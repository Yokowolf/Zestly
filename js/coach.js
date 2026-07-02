// ═══════════════════════════════════════════════════════
// AI COACH — GROQ
// ═══════════════════════════════════════════════════════

// Contexto de entrenamiento para el coach (últimas sesiones, rutinas, PRs)
function fitContext() {
  const wl = ST.workoutLogs || [];
  if (!wl.length && !(ST.routines || []).length) return '';
  let ctx = ' Entrenamiento del usuario:';
  if (ST.routines?.length) ctx += ` rutinas [${ST.routines.map(r => r.name).join(', ')}].`;
  if (wl.length) {
    const last = wl.slice(-3).map(l => {
      const det = l.exercises.slice(0, 6).map(e => {
        const mx = Math.max(...e.sets.map(s => s.w || 0));
        return `${exName(e.exerciseId)} ${e.sets.length}x` + (mx ? ` máx ${mx}kg` : '');
      }).join(', ');
      return `${l.date}: ${l.name} (${l.duration_min}min, ${l.volume}kg volumen) — ${det}`;
    }).join(' | ');
    ctx += ` Últimas sesiones: ${last}.`;
  }
  return ctx;
}

async function aiSend() {
  const inp = document.getElementById('ai-in');
  const msg = inp.value.trim(); if (!msg) return;
  inp.value = '';
  aiMsg(msg, 'user');
  const typ = aiTyping();
  const goal = ST.profile.goal==='lose'?'perder grasa':ST.profile.goal==='gain'?'ganar músculo':'mantener peso';
  const system = `Eres Zestly AI, coach nutricional y de entrenamiento personal. El usuario quiere ${goal}. Meta: ${ST.nutrition.kcal} kcal, proteína ${ST.nutrition.prot}g, carbos ${ST.nutrition.carb}g, grasas ${ST.nutrition.fat}g. Hoy lleva ${ST.today.kcal} kcal y ${ST.today.prot}g de proteína.${fitContext()} Responde en español, amigable, máximo 3 párrafos cortos, sin asteriscos ni markdown.`;
  try {
    const text = await callAI(system, msg);
    typ.remove();
    aiMsg(text, 'bot');
  } catch(e) {
    typ.remove();
    aiMsg(`⚠️ ${e.message}`, 'bot');
  }
}

function chipSend(el) { document.getElementById('ai-in').value = el.textContent; aiSend(); }

function aiMsg(text, role) {
  const chat = document.getElementById('ai-chat');
  const div = document.createElement('div'); div.className = 'ai-msg ' + role;
  if (role === 'bot') div.innerHTML = `<div class="ai-lbl">Zestly AI</div>${text}`;
  else div.textContent = text;
  chat.appendChild(div); chat.scrollTop = chat.scrollHeight; return div;
}
function aiTyping() {
  const chat = document.getElementById('ai-chat');
  const div = document.createElement('div'); div.className = 'ai-typing';
  div.innerHTML = '<span></span><span></span><span></span>';
  chat.appendChild(div); chat.scrollTop = chat.scrollHeight; return div;
}
