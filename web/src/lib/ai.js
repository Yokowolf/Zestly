// Cliente de IA — un solo proveedor para todo (chat, coach, recetas, texto
// y fotos). La clave se guarda en localStorage/Firestore del propio usuario
// y NUNCA se expone en el código ni en git.
export const getKey = () => localStorage.getItem('zs_gemini_key') || ''
export const setKey = k => localStorage.setItem('zs_gemini_key', k.trim())
export const hasKey = () => !!getKey()

// Cadena de modelos "flash" (nunca "pro" — en el nivel gratuito trae cuotas
// mucho más bajas). Cada modelo tiene su PROPIA cuota en Google, separada
// de los demás, así que si uno se satura (429) probamos el siguiente con
// la misma clave — sin esto, el contador de calorías (la función que más
// llamadas hace) se quedaba bloqueado apenas el modelo principal tocaba
// su límite del día/minuto.
const MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite']

async function request(model, key, body) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { res, data: await res.json() }
  } catch {
    throw new Error('Sin conexión con el servidor de IA')
  }
}

// `jsonMode`: fuerza que Gemini devuelva JSON válido de verdad, en vez de
// confiar en que el prompt "responde solo JSON" sea suficiente. Coach.jsx y
// tips.js NO lo usan porque su respuesta es conversación libre, no JSON —
// forzarlo ahí rompería el chat (Gemini intentaría meter la respuesta en
// un objeto JSON en vez de responder texto normal).
export async function callAI(systemPrompt, userMessage, maxTokens = 800, jsonMode = false) {
  const key = getKey()
  if (!key) throw new Error('Sin clave IA — configúrala en Perfil')
  const body = {
    contents: [{ parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
    generationConfig: {
      maxOutputTokens: maxTokens, temperature: 0.7,
      ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  }
  let lastErr
  for (const model of MODELS) {
    const { res, data } = await request(model, key, body)
    if (!res.ok) {
      lastErr = new Error(friendlyError(res.status, data))
      if (res.status === 429) continue // este modelo se saturó — probar el siguiente
      throw lastErr // otro tipo de error (clave inválida, etc.) no se arregla cambiando de modelo
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    if (!text) { lastErr = new Error('La IA no devolvió respuesta — intenta de nuevo'); continue }
    return text
  }
  throw lastErr || new Error('Límite de uso alcanzado en IA — espera un minuto e intenta de nuevo')
}

// Analiza una foto con IA y devuelve el texto crudo. `validate` recibe el
// texto y debe lanzar si no sirve. Misma cadena de modelos que callAI.
export async function callAIWithImage(prompt, imageBase64, validate) {
  const key = getKey()
  if (!key) throw new Error('Sin clave IA — configúrala en Perfil')
  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
      ],
    }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  }
  let lastErr
  for (const model of MODELS) {
    const { res, data } = await request(model, key, body)
    if (!res.ok) {
      lastErr = new Error(friendlyError(res.status, data))
      if (res.status === 429) continue
      throw lastErr
    }
    const cand = data.candidates?.[0]
    const text = cand?.content?.parts?.[0]?.text || ''
    if (!text) {
      lastErr = new Error(cand?.finishReason === 'SAFETY'
        ? 'La IA no pudo analizar esta imagen — intenta con otra foto'
        : 'La IA no devolvió respuesta — intenta de nuevo')
      continue
    }
    try {
      validate?.(text)
    } catch (e) {
      lastErr = new Error(`${e.message} — IA dijo: "${text.slice(0, 120)}"`)
      continue
    }
    return text
  }
  throw lastErr || new Error('Límite de uso alcanzado en IA — espera un minuto e intenta de nuevo')
}

// Traduce errores comunes de la API a mensajes accionables — nunca se nombra
// el proveedor en el texto que ve el usuario, solo "IA" (pedido explícito).
function friendlyError(status, data) {
  const msg = data?.error?.message || ''
  if (status === 400 && /API key/i.test(msg)) return 'Clave IA inválida — revísala en Perfil'
  if (status === 403) return 'Clave IA inválida o sin permisos — revísala en Perfil'
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
      return JSON.parse(jsonStr.replace(/,\s*([\}\]])/g, '$1'))
    } catch {
      throw new Error('La IA no logró estructurar la respuesta — intenta de nuevo')
    }
  }
}
