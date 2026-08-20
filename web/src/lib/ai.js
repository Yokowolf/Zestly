// Cliente de IA — un solo proveedor para todo (chat, coach, recetas, texto y fotos).
// La clave se guarda en localStorage/Firestore del propio usuario y NUNCA se expone en el código ni en git.
export const getKey = () => localStorage.getItem('zs_gemini_key') || ''
export const setKey = k => localStorage.setItem('zs_gemini_key', k.trim())
export const hasKey = () => !!getKey()

// Modelo optimizado para cuota gratuita de alto rendimiento
const MODEL = 'gemini-1.5-flash'

export async function callAI(systemPrompt, userMessage, maxTokens = 1500) {
  const key = getKey()
  if (!key) throw new Error('Sin clave IA — configúrala en Perfil')
  
  const body = {
    contents: [{ parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
    generationConfig: { 
      maxOutputTokens: maxTokens, 
      temperature: 0.2, // Baja temperatura para precisión matemática y cero texto de relleno
      responseMimeType: 'application/json' // 👈 Fuerza a Gemini a responder SIEMPRE en JSON puro
    },
  }
  
  let res, data
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    data = await res.json()
  } catch {
    throw new Error('Sin conexión con el servidor de IA')
  }
  
  if (!res.ok) throw new Error(friendlyError(res.status, data))
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  if (!text) throw new Error('La IA no devolvió respuesta — intenta de nuevo')
  return text
}

// Analiza una foto con IA y devuelve el texto crudo.
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
    generationConfig: { 
      responseMimeType: 'application/json', 
      temperature: 0.2,
      maxOutputTokens: 1500
    },
  }
  let res, data
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    data = await res.json()
  } catch {
    throw new Error('Sin conexión con el servidor de IA')
  }
  if (!res.ok) throw new Error(friendlyError(res.status, data))
  const cand = data.candidates?.[0]
  const text = cand?.content?.parts?.[0]?.text || ''
  if (!text) {
    throw new Error(cand?.finishReason === 'SAFETY'
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

// Traduce errores comunes de la API a mensajes accionables
function friendlyError(status, data) {
  const msg = data?.error?.message || ''
  if (status === 400 && /API key/i.test(msg)) return 'Clave IA inválida — revísala en Perfil'
  if (status === 403) return 'Clave IA inválida o sin permisos — revísala en Perfil'
  if (status === 429) return 'Límite de uso alcanzado en IA — espera un minuto e intenta de nuevo'
  return `IA ${status}: ${msg.slice(0, 80)}`
}

// 🛡️ Extractor ultra-robusto de JSON: soporta objetos {}, arrays [], limpia markdown y comas huérfanas
export function parseAIJson(raw) {
  if (!raw) throw new Error('La IA no devolvió respuesta')
  
  // 1. Eliminar bloques de código markdown (```json o ```)
  let clean = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()

  // 2. Intentar parsear directo
  try {
    return JSON.parse(clean)
  } catch {}

  // 3. Localizar si es un objeto {} o un array []
  const firstObj = clean.indexOf('{')
  const lastObj = clean.lastIndexOf('}')
  const firstArr = clean.indexOf('[')
  const lastArr = clean.lastIndexOf(']')

  let start = -1
  let end = -1

  if (firstObj !== -1 && (firstArr === -1 || firstObj < firstArr)) {
    start = firstObj
    end = lastObj
  } else if (firstArr !== -1) {
    start = firstArr
    end = lastArr
  }

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('La IA no devolvió JSON válido — intenta de nuevo')
  }

  const jsonStr = clean.slice(start, end + 1)

  try {
    return JSON.parse(jsonStr)
  } catch {
    // Limpiar comas finales huérfanas antes de cerrar corchetes/llaves (trailing commas)
    const sanitized = jsonStr.replace(/,\s*([\}\]])/g, '$1')
    return JSON.parse(sanitized)
  }
}
