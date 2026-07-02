// ═══════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════
let GEMINI_KEY = localStorage.getItem('zs_gkey') || '';

// ── PROVEEDOR DE IA ───────────────────────────────────────────────────────
// Detecta automáticamente el proveedor según el formato de la key:
// gsk_...  → Groq  (gratis, rápido, funciona desde browser)
// AIzaSy...→ Gemini estándar
// AQ....   → Gemini service account (no funciona desde browser)

function getAIProvider() {
  if (GEMINI_KEY.startsWith('gsk_')) return 'groq';
  return 'gemini';
}

async function callAI(systemPrompt, userMessage, maxTokens = 800) {
  if (!GEMINI_KEY) throw new Error('Sin API key — configúrala en Perfil');
  const provider = getAIProvider();

  if (provider === 'groq') {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GEMINI_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: maxTokens, temperature: 0.7
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Groq ${res.status}: ${data.error?.message || JSON.stringify(data)}`);
    return data.choices[0].message.content;
  } else {
    // Gemini fallback
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents:[{ parts:[{ text: systemPrompt + '\n\n' + userMessage }] }] })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${data.error?.message}`);
    return data.candidates[0].content.parts[0].text;
  }
}

async function callAIWithImage(prompt, imageBase64) {
  if (!GEMINI_KEY) throw new Error('Sin API key');
  if (getAIProvider() === 'groq') {
    // Groq Llama Vision — soporta imágenes
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GEMINI_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
          ]
        }],
        max_tokens: 600
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Groq Vision ${res.status}: ${data.error?.message}`);
    return data.choices[0].message.content;
  }
  // Gemini Vision fallback
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents:[{ parts:[
      { text: prompt },
      { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
    ]}]})
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini Vision ${res.status}: ${data.error?.message}`);
  return data.candidates[0].content.parts[0].text;
}
