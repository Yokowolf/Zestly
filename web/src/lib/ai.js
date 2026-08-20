// Cliente de IA oficial para Gemini 3.6 Flash con Reintentos Silenciosos
export const getKey = () => localStorage.getItem('zs_gemini_key') || ''
export const setKey = k => localStorage.setItem('zs_gemini_key', k.trim())
export const hasKey = () => !!getKey()

const MODEL = 'gemini-3.6-flash'

// Llamada de Texto con Reintento Automático Silencioso (hasta 4 intentos)
export async function callAI(systemPrompt, userMessage, maxTokens = 1500, retries = 3) {
  const key = getKey()
  if (!key) throw new Error('Sin clave IA — configúrala en Perfil')

  let lastError = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Si es un reintento, reforzamos la instrucción de forma invisible
      const promptSuffix = attempt > 0 ? '\n\nIMPORTANTE: Devuelve exclusivamente un JSON válido sin texto adicional.' : ''
      const body = {
        contents: [{ parts: [{ text: `${systemPrompt}${promptSuffix}\n\n${userMessage}` }] }],
        generationConfig: { 
          maxOutputTokens: maxTokens, 
          temperature: attempt === 0 ? 0.2 : 0.1, // Baja temperatura para máxima rigidez
          responseMimeType: 'application/json'
        },
      }

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 400 || res.status === 403) {
          throw new Error(friendlyError(res.status, data))
        }
        throw new Error(friendlyError(res.status, data))
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (!text) throw new Error('Respuesta vacía')

      // Verificar que el JSON sea válido antes de aceptarlo
      parseAIJson(text)

      return text

    } catch (err) {
      lastError = err
      if (err.message.includes('Clave IA')) throw err

      // Si quedan intentos, espera un instante y reintenta en silencio
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 350 * (attempt + 1)))
        continue
      }
    }
  }

  // Mensaje amigable al usuario tras agotarse todos los intentos
  throw new Error('No se pudo analizar el plato — por favor intenta de nuevo')
}

// Llamada con Imagen con Reintento Silencioso
export async function callAIWithImage(prompt, imageBase64, validate, retries = 2) {
  const key = getKey()
  if (!key) throw new Error('Sin clave IA — configúrala en Perfil')

  let lastError = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
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

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 400 || res.status === 403) throw new Error(friendlyError(res.status, data))
        throw new Error(friendlyError(res.status, data))
      }

      const cand = data.candidates?.[0]
      const text = cand?.content?.parts?.[0]?.text || ''
      
      if (!text) {
        throw new Error(cand?.finishReason === 'SAFETY'
          ? 'La IA no pudo analizar esta imagen por seguridad — intenta con otra foto'
          : 'Respuesta vacía')
      }
      
      validate?.(text)
      return text

    } catch (e) {
      lastError = e
      if (e.message.includes('Clave IA') || e.message.includes('seguridad')) throw e
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 400 * (attempt + 1)))
        continue
      }
    }
  }

  throw new Error('No se pudo procesar la foto — intenta con un ángulo más claro')
}

function friendlyError(status, data) {
  const msg = data?.error?.message || ''
  if (status === 400 && /API key/i.test(msg)) return 'Clave IA inválida — revísala en Perfil'
  if (status === 403) return 'Clave IA inválida o sin permisos — revísala en Perfil'
  if (status === 429) return 'Límite de uso alcanzado — espera unos segundos'
  return `IA ${status}: ${msg.slice(0, 80)}`
}

// Parser universal ultra-robusto
export function parseAIJson(raw) {
  if (!raw) throw new Error('Sin datos')

  let clean = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()

  try {
    return JSON.parse(clean)
  } catch {}

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
    throw new Error('Formato no reconocido')
  }

  const jsonStr = clean.slice(start, end + 1)

  try {
    return JSON.parse(jsonStr)
  } catch {
    const sanitized = jsonStr.replace(/,\s*([\}\]])/g, '$1')
    return JSON.parse(sanitized)
  }
}
