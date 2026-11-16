// Cliente de IA — Groq (API compatible con OpenAI). Se volvió a Groq porque
// Google AI Studio bloquea la creación de clave a cuentas sin proyecto de
// Cloud propio (testers sin experiencia técnica quedaban sin poder usar la
// app) — Groq permite crear clave con solo Gmail/GitHub, sin ese muro.
// La clave se guarda en localStorage/Firestore del propio usuario y NUNCA
// se expone en el código ni en git. Crear clave: https://console.groq.com/keys
export const getKey = () => localStorage.getItem('zs_groq_key') || ''
export const setKey = k => localStorage.setItem('zs_groq_key', k.trim())
export const hasKey = () => !!getKey()

const BASE = 'https://api.groq.com/openai/v1'

// Orden preferido de modelos de texto — cada uno tiene su PROPIA cuota en
// Groq (por clave, no compartida), así que si uno se satura o se retira
// probamos el siguiente con la misma clave. Groq retira modelos seguido
// (llama-3.1/3.3 se descontinuaron en ago-2026 y rompieron la app), así
// que además de esta lista fija se consulta /models una vez por sesión y
// se usan solo los que de verdad existen hoy — ver availableTextModels().
const PREFERRED_TEXT = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
]
// Groq ya no ofrece ningún modelo con visión (llama-4-scout/maverick se
// retiraron sin reemplazo multimodal) — se deja el último conocido para que
// el error sea claro y no un 404 críptico. Ver PHOTO_UNAVAILABLE abajo.
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'
export const PHOTO_UNAVAILABLE = 'El análisis de fotos no está disponible con el proveedor de IA actual — describe el plato en "Texto IA" o usa el buscador'

// Sin timeout, una petición colgada dejaba el botón "Generando…" infinito
// (reportado con listas largas de alimentos). 45 s para texto, 60 s para
// imagen — Groq normalmente responde en 1-5 s.
const TEXT_TIMEOUT_MS = 45000
const IMAGE_TIMEOUT_MS = 60000

async function request(model, key, body, timeoutMs = TEXT_TIMEOUT_MS, signal) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  signal?.addEventListener('abort', () => ctrl.abort(), { once: true })
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, ...body }),
      signal: ctrl.signal,
    })
    let data = null
    try { data = await res.json() } catch { data = null }
    return { res, data }
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('La IA tardó demasiado en responder — intenta con menos texto o de nuevo')
    throw new Error('Sin conexión con el servidor de IA')
  } finally {
    clearTimeout(t)
  }
}

// Descubrimiento de modelos: una sola consulta a /models por sesión (y por
// clave). Si falla (sin red, clave inválida) se usa la lista fija tal cual.
let modelsCache = { key: null, promise: null }
export function availableTextModels() {
  const key = getKey()
  if (!key) return Promise.resolve(PREFERRED_TEXT)
  if (modelsCache.key === key && modelsCache.promise) return modelsCache.promise
  const promise = (async () => {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch(`${BASE}/models`, { headers: { Authorization: `Bearer ${key}` }, signal: ctrl.signal })
      clearTimeout(t)
      if (!res.ok) return PREFERRED_TEXT
      const data = await res.json()
      const ids = new Set((data?.data || []).map(m => m.id))
      const live = PREFERRED_TEXT.filter(id => ids.has(id))
      // Si Groq sacó TODOS los preferidos, probamos cualquier modelo de chat
      // que quede (excluye audio/guardas), así la app no muere sola.
      if (live.length) return live
      const fallback = [...ids].filter(id => !/whisper|tts|orpheus|guard|safeguard|embed/i.test(id))
      return fallback.length ? fallback.slice(0, 4) : PREFERRED_TEXT
    } catch {
      return PREFERRED_TEXT
    }
  })()
  modelsCache = { key, promise }
  return promise
}

// Un modelo se salta al siguiente de la cadena ante CUALQUIER error salvo
// clave inválida (401/403 — ningún otro modelo lo arregla). Groq decomisiona
// modelos seguido y no siempre con el mismo código: a veces 400
// "decommissioned", a veces 404 "does not exist".
function shouldTryNext(status) {
  return status !== 401 && status !== 403
}

// Los gpt-oss son modelos "razonadores": sin esto piensan largo y tardan
// varios segundos de más en respuestas simples. Si Groq rechazara el
// parámetro para algún modelo, se reintenta sin él (ver abajo).
const isReasoningModel = m => /^openai\/gpt-oss/.test(m)

// Los modelos razonadores a veces devuelven el razonamiento entre etiquetas
// <think>…</think> antes de la respuesta — se recorta.
const stripThink = txt => txt.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

// opts.history: [{ role: 'user'|'assistant', content }] — turnos previos
// para el chat (sin esto cada mensaje era una conversación nueva).
// opts.signal: AbortSignal externo para cancelar.
export async function callAI(systemPrompt, userMessage, maxTokens = 800, jsonMode = false, opts = {}) {
  const key = getKey()
  if (!key) throw new Error('Sin clave IA — configúrala en Perfil')
  const history = (opts.history || []).slice(-10)
  const baseBody = {
    messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: userMessage }],
    max_tokens: maxTokens, temperature: jsonMode ? 0.3 : 0.7,
    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
  }
  const models = await availableTextModels()
  let lastErr
  for (const model of models) {
    let body = isReasoningModel(model) ? { ...baseBody, reasoning_effort: 'low' } : baseBody
    let { res, data } = await request(model, key, body, TEXT_TIMEOUT_MS, opts.signal)
    if (!res.ok && res.status === 400 && body.reasoning_effort && /reasoning/i.test(data?.error?.message || '')) {
      body = baseBody
      ;({ res, data } = await request(model, key, body, TEXT_TIMEOUT_MS, opts.signal))
    }
    if (!res.ok) {
      lastErr = new Error(friendlyError(res.status, data))
      if (shouldTryNext(res.status)) continue
      throw lastErr
    }
    const text = stripThink(data?.choices?.[0]?.message?.content || '')
    if (!text) { lastErr = new Error('La IA no devolvió respuesta — intenta de nuevo'); continue }
    return text
  }
  throw lastErr || new Error('Límite de uso alcanzado en IA — espera un minuto e intenta de nuevo')
}

// Analiza una foto con IA y devuelve el texto crudo. `validate` recibe el
// texto y debe lanzar si no sirve. Groq hoy no tiene modelo de visión: si el
// modelo no existe (400/404) se avisa con un mensaje claro y accionable.
export async function callAIWithImage(prompt, imageBase64, validate) {
  const key = getKey()
  if (!key) throw new Error('Sin clave IA — configúrala en Perfil')
  const body = {
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ],
    }],
    response_format: { type: 'json_object' }, temperature: 0.2,
  }
  const { res, data } = await request(VISION_MODEL, key, body, IMAGE_TIMEOUT_MS)
  if (!res.ok) {
    const msg = data?.error?.message || ''
    if (res.status === 404 || (res.status === 400 && /model|decommission|not exist|deprecat/i.test(msg))) {
      throw new Error(PHOTO_UNAVAILABLE)
    }
    throw new Error(friendlyError(res.status, data))
  }
  const choice = data?.choices?.[0]
  const text = stripThink(choice?.message?.content || '')
  if (!text) {
    throw new Error(choice?.finish_reason === 'content_filter'
      ? 'La IA no pudo analizar esta imagen — intenta con otra foto'
      : 'La IA no devolvió respuesta — intenta de nuevo')
  }
  try {
    validate?.(text)
  } catch (e) {
    throw new Error(`${e.message} — IA dijo: "${text.slice(0, 120)}"`)
  }
  return text
}

// Traduce errores comunes de la API a mensajes accionables — nunca se nombra
// el proveedor en el texto que ve el usuario, solo "IA" (pedido explícito).
function friendlyError(status, data) {
  const msg = data?.error?.message || ''
  if (status === 401 || status === 403) return 'Clave IA inválida o sin permisos — revísala en Perfil'
  if (status === 429) return 'Límite de uso alcanzado en IA — espera un minuto e intenta de nuevo'
  if (status === 413) return 'El texto es demasiado largo para la IA — divídelo en partes'
  return `IA ${status}: ${msg.slice(0, 80)}`
}

// Extrae el primer objeto o arreglo JSON de una respuesta de IA y corrige
// comas colgantes (error común cuando la respuesta se corta cerca del
// límite de tokens). Mensaje genérico a propósito — esta función la
// comparten TODAS las funciones de IA (fotos, texto, recetas, plan,
// rutinas).
export function parseAIJson(raw) {
  if (!raw) throw new Error('La IA no devolvió una respuesta válida — intenta de nuevo')
  const clean = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()

  try {
    return JSON.parse(clean)
  } catch { /* se intenta recortar abajo */ }

  const firstObj = clean.indexOf('{'), lastObj = clean.lastIndexOf('}')
  const firstArr = clean.indexOf('['), lastArr = clean.lastIndexOf(']')
  let start = -1, end = -1
  if (firstObj !== -1 && (firstArr === -1 || firstObj < firstArr)) { start = firstObj; end = lastObj }
  else if (firstArr !== -1) { start = firstArr; end = lastArr }
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('La IA no devolvió una respuesta válida — intenta de nuevo')
  }

  const jsonStr = clean.slice(start, end + 1)
  try {
    return JSON.parse(jsonStr)
  } catch {
    try {
      // JSON recortado con coma colgante antes del cierre — se repara antes
      // de rendirse, en vez de mostrarle al usuario el error crudo de
      // JSON.parse (ej. "Unexpected end of JSON input").
      return JSON.parse(jsonStr.replace(/,\s*([}\]])/g, '$1'))
    } catch {
      throw new Error('La IA no logró estructurar la respuesta — intenta de nuevo')
    }
  }
}
