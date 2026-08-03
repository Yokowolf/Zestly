// Cliente Groq — misma key (zs_gkey) y modelos que la app legacy
export const getKey = () => localStorage.getItem('zs_gkey') || ''
export const setKey = k => localStorage.setItem('zs_gkey', k.trim())
export const hasKey = () => !!getKey()

export async function callAI(systemPrompt, userMessage, maxTokens = 800) {
  const key = getKey()
  if (!key) throw new Error('Sin API key — configúrala en Perfil')
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(friendlyError(res.status, data))
  return data.choices[0].message.content
}

// Modelos de visión de Groq verificados (soportan imagen + instrucciones
// de formato). Groq decomisionó llama-4-maverick (9 mar 2026) y
// llama-4-scout (17 jul 2026) — a esta fecha (ago 2026) qwen3.6-27b es el
// ÚNICO modelo de visión activo en Groq (console.groq.com/docs/vision).
// Si Groq vuelve a cambiar su catálogo, revisar esa página antes de asumir
// que un modelo nuevo existe — su lineup cambia muy seguido.
const VISION_MODELS = [
  'qwen/qwen3.6-27b',
]

async function requestVision(model, key, prompt, imageBase64, jsonMode) {
  const body = {
    model,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ],
    }],
    max_tokens: 700,
    temperature: 0.2,
    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
  }
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return { res, data }
}

// Analiza una foto con IA y devuelve el texto crudo. `validate` (opcional)
// recibe el texto y debe lanzar si no sirve — en ese caso se prueba con el
// siguiente modelo en vez de devolver una respuesta inválida (esto era el
// bug: un modelo podía responder 200 con texto libre en vez de JSON y la
// app se quedaba con eso).
export async function callAIWithImage(prompt, imageBase64, validate) {
  const key = getKey()
  if (!key) throw new Error('Sin API key — configúrala en Perfil')
  let lastErr = null

  for (const model of VISION_MODELS) {
    // 1er intento: modo JSON forzado. Si el modelo/plan no lo soporta,
    // reintenta el MISMO modelo sin ese parámetro antes de descartarlo.
    for (const jsonMode of [true, false]) {
      let res, data
      try {
        ({ res, data } = await requestVision(model, key, prompt, imageBase64, jsonMode))
      } catch {
        lastErr = new Error('Sin conexión con el servidor de IA')
        continue
      }
      if (!res.ok) {
        const code = data.error?.code || ''
        const msg = (data.error?.message || '').toLowerCase()
        if (code === 'model_decommissioned' || code === 'model_not_found') { lastErr = new Error(friendlyError(res.status, data)); break }
        if (jsonMode && (msg.includes('response_format') || msg.includes('json_object') || code === 'json_validate_failed')) {
          lastErr = new Error(friendlyError(res.status, data)); continue // prueba sin json_object
        }
        lastErr = new Error(friendlyError(res.status, data))
        continue
      }
      const text = data.choices?.[0]?.message?.content || ''
      try {
        validate?.(text)
        return text
      } catch (e) {
        lastErr = e // el modelo respondió pero no en el formato esperado — prueba el siguiente
      }
    }
  }
  throw lastErr || new Error('La IA no devolvió una respuesta válida — intenta con otra foto o usa Texto IA')
}

// Traduce errores comunes de la API a mensajes accionables
function friendlyError(status, data) {
  const code = data.error?.code || ''
  const msg = data.error?.message || ''
  if (status === 401) return 'Clave IA inválida — revísala en Perfil'
  if (status === 429) return 'Límite de uso alcanzado — espera un minuto e intenta de nuevo'
  if (code === 'model_decommissioned' || code === 'model_not_found') return 'Modelo IA desactualizado — actualiza la app'
  return `Groq ${status}: ${msg.slice(0, 80)}`
}

// Extrae el primer objeto JSON de una respuesta de IA
export function parseAIJson(raw) {
  const clean = (raw || '').replace(/```json|```/g, '').trim()
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
  if (s === -1 || e === -1) throw new Error('La IA no devolvió JSON válido — intenta de nuevo o usa otra foto')
  return JSON.parse(clean.slice(s, e + 1))
}
