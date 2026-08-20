// Cliente de IA — Sistema en cascada automática de modelos (Básico -> Avanzado)
export const getKey = () => localStorage.getItem('zs_gemini_key') || ''
export const setKey = k => localStorage.setItem('zs_gemini_key', k.trim())
export const hasKey = () => !!getKey()

// Cadena ordenada de modelos: arranca desde el más básico/ligero hasta los más avanzados
const CASCADE_MODELS = [
  'gemini-1.5-flash-8b',       // 1. El más ligero, económico y rápido
  'gemini-2.0-flash-lite',     // 2. Versión ligera de nueva generación
  'gemini-1.5-flash-latest',   // 3. Versión estable actualizada de 1.5
  'gemini-2.0-flash',          // 4. Gemini 2.0 estándar (alta precisión en JSON)
  'gemini-2.5-flash'           // 5. Última generación de respaldo
]

// Recuerda el último modelo que funcionó para no repetir intentos fallidos
let activeModelIdx = 0

// Petición con salto automático de modelo si uno falla
async function fetchWithModelCascade(body, key) {
  let lastError = null

  for (let i = 0; i < CASCADE_MODELS.length; i++) {
    // Comenzamos desde el último modelo exitoso
    const idx = (activeModelIdx + i) % CASCADE_MODELS.length
    const currentModel = CASCADE_MODELS[idx]

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      // Si respondió con éxito (200 OK)
      if (res.ok) {
        activeModelIdx = idx // Guardamos este modelo como el nuevo predeterminado
        return data
      }

      // Si el modelo está deprecado/no encontrado (404), saturado (429) o caído (500/503):
      if (res.status === 404 || res.status === 429 || res.status >= 500) {
        console.warn(`[IA] Modelo ${currentModel} falló con código ${res.status}. Pasando al siguiente modelo...`)
        lastError = new Error(friendlyError(res.status, data))
        continue // Salto inmediato al siguiente modelo
      }

      // Si es error de credenciales/permisos (400/403), lanzar error directamente
      throw new Error(friendlyError(res.status, data))

    } catch (e) {
      if (e.message.includes('Clave IA') || e.message.includes('permisos')) {
        throw e
      }
      lastError = e
    }
  }

  throw lastError || new Error('No se pudo conectar con ningún modelo de IA disponible')
}

// Llamada de Texto (Coach, Macros, Recetas)
export async function callAI(systemPrompt, userMessage, maxTokens = 1500) {
  const key = getKey()
  if (!key) throw new Error('Sin clave IA — configúrala en Perfil')

  const body = {
    contents: [{ parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
    generationConfig: { 
      maxOutputTokens: maxTokens, 
      temperature: 0.2, // Temperatura baja = respuestas matemáticas exactas sin texto extra
      responseMimeType: 'application/json'
    },
  }

  const data = await fetchWithModelCascade(body, key)
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  if (!text) throw new Error('La IA no devolvió respuesta — intenta de nuevo')
  return text
}

// Llamada con Imagen (Scanner de fotos de comida)
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

  const data = await fetchWithModelCascade(body, key)
  const cand = data.candidates?.[0]
  const text = cand?.content?.parts?.[0]?.text || ''
  
  if (!text) {
    throw new Error(cand?.finishReason === 'SAFETY'
      ? 'La IA no pudo analizar esta imagen por seguridad — intenta con otra foto'
      : 'La IA no devolvió respuesta — intenta de nuevo')
  }
  
  try {
    validate?.(text)
  } catch (e) {
    throw new Error(`${e.message} — IA dijo: "${text.slice(0, 120)}"`)
  }
  return text
}

// Traducción de errores a mensajes claros para el usuario
function friendlyError(status, data) {
  const msg = data?.error?.message || ''
  if (status === 400 && /API key/i.test(msg)) return 'Clave IA inválida — revísala en Perfil'
  if (status === 403) return 'Clave IA inválida o sin permisos — revísala en Perfil'
  if (status === 429) return 'Límite de uso alcanzado en IA — reintentando...'
  return `IA ${status}: ${msg.slice(0, 80)}`
}

// Parser universal y blindado de JSON (soporta {} y [])
export function parseAIJson(raw) {
  if (!raw) throw new Error('La IA no devolvió respuesta')

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
    throw new Error('La IA no devolvió JSON válido — intenta de nuevo')
  }

  const jsonStr = clean.slice(start, end + 1)

  try {
    return JSON.parse(jsonStr)
  } catch {
    const sanitized = jsonStr.replace(/,\s*([\}\]])/g, '$1')
    return JSON.parse(sanitized)
  }
}
