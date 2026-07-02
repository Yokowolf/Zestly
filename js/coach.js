// ═══════════════════════════════════════════════════════
// AI COACH — GEMINI
// ═══════════════════════════════════════════════════════
async function aiSend() {
  const inp = document.getElementById('ai-in');
  const msg = inp.value.trim(); if (!msg) return;
  inp.value = '';
  aiMsg(msg, 'user');
  const typ = aiTyping();
  const goal = ST.profile.goal==='lose'?'perder grasa':ST.profile.goal==='gain'?'ganar músculo':'mantener peso';
  const system = `Eres Zestly AI, coach nutricional personal. El usuario quiere ${goal}. Meta: ${ST.nutrition.kcal} kcal, proteína ${ST.nutrition.prot}g, carbos ${ST.nutrition.carb}g, grasas ${ST.nutrition.fat}g. Hoy lleva ${ST.today.kcal} kcal y ${ST.today.prot}g de proteína. Responde en español, amigable, máximo 3 párrafos cortos, sin asteriscos ni markdown.`;
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
