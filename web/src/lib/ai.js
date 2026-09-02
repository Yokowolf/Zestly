// Cliente de IA — Groq (API compatible con OpenAI). Se volvió a Groq porque
// Google AI Studio bloquea la creación de clave a cuentas sin proyecto de
// Cloud propio (testers sin experiencia técnica quedaban sin poder usar la
// app) — Groq permite crear clave con solo Gmail/GitHub, sin ese muro.
// La clave se guarda en localStorage/Firestore del propio usuario y NUNCA
// se expone en el código ni en git. Crear clave: https://console.groq.com/keys
export const getKey = () => localStorage.getItem('zs_groq_key') || ''
export const setKey = k => localStorage.setItem('zs_groq_key', k.trim())
export const hasKey = () => !!getKey()

// Cadena de modelos de texto — cada uno tiene su PROPIA cuota en Groq
// (por clave, no compartida entre usuarios), así que si uno se satura,
// fue decomisionado o renombrado probamos el siguiente con la misma
// clave. Empieza por el de mayor cuota diaria.
const TEXT_MODELS = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b']
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

async function request(model, key, body) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, ...body }),
    })
    return { res, data: await res.json() }
  } catch {
    throw new Error('Sin conexión con el servidor de IA')
  }
}

// Un modelo se salta al siguiente de la cadena ante CUALQUIER error salvo
// clave inválida (401/403 — ningún otro modelo lo arregla). Groq decomisiona
// modelos seguido y no siempre con el mismo código: a veces 400
// "decommissioned", a veces 404 "does not exist" — en vez de intentar
// adivinar cada variante de mensaje, se trata todo lo demás como señal de
// "este modelo no sirve ahora mismo, prueba el siguiente". Es justo la
// razón por la que Groq se había dejado antes (modelos retirados seguido
// rompían la app); con esto, mientras quede un modelo vivo en la lista la
// app sigue funcionando sola sin parchar nada a mano.
function shouldTryNext(status) {
  return status !== 401 && status !== 403
}

export async function callAI(systemPrompt, userMessage, maxTokens = 800, jsonMode = false) {
  const key = getKey()
  if (!key) throw new Error('Sin clave IA — configúrala en Perfil')
  const body = {
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
    max_tokens: maxTokens, temperature: 0.7,
    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
  }
  let lastErr
  for (const model of TEXT_MODELS) {
    const { res, data } = await request(model, key, body)
    if (!res.ok) {
      lastErr = new Error(friendlyError(res.status, data))
      if (shouldTryNext(res.status)) continue
      throw lastErr
    }
    const text = data.choices?.[0]?.message?.content || ''
    if (!text) { lastErr = new Error('La IA no devolvió respuesta — intenta de nuevo'); continue }
    return text
  }
  throw lastErr || new Error('Límite de uso alcanzado en IA — espera un minuto e intenta de nuevo')
}

// Analiza una foto con IA y devuelve el texto crudo. `validate` recibe el
// texto y debe lanzar si no sirve. Solo hay un modelo con visión en Groq
// por ahora, así que no hay cadena — si se satura, se avisa directo.
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
  const { res, data } = await request(VISION_MODEL, key, body)
  if (!res.ok) throw new Error(friendlyError(res.status, data))
  const choice = data.choices?.[0]
  const text = choice?.message?.content || ''
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
  return `IA ${status}: ${msg.slice(0, 80)}`
}

// Extrae el primer objeto o arreglo JSON de una respuesta de IA y corrige
// comas colgantes (error común cuando la respuesta se corta cerca del
// límite de tokens). Mensaje genérico a propósito — esta función la
// comparten TODAS las funciones de IA (fotos, texto, recetas, plan,
// rutinas); antes decía "usa otra foto" fijo, y ese texto aparecía también
// al generar una rutina, donde no hay ninguna foto de por medio (bug
// reportado: mensaje sin sentido al generar rutinas).
export function parseAIJson(raw) {
  if (!raw) throw new Error('La IA no devolvió una respuesta válida — intenta de nuevo')
  const clean = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()

  try {
    return JSON.parse(clean)
  } catch {}

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
