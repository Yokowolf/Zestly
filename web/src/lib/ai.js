// Cliente de IA — Detección dinámica y automática de modelos oficiales
export const getKey = () => localStorage.getItem('zs_gemini_key') || ''
export const setKey = k => {
  cachedModel = null // Resetear caché al cambiar la clave
  localStorage.setItem('zs_gemini_key', k.trim())
}
export const hasKey = () => !!getKey()

// Caché en memoria del modelo activo
let cachedModel = null

// Consulta a Google qué modelo Flash está activo para esta API Key
async function getActiveModel(key) {
  if (cachedModel) return cachedModel

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
    if (!res.ok) throw new Error('No se pudo listar modelos')
    const data = await res.json()
    const list = data.models || []

    // Filtrar los que admiten generación de texto
    const valid = list.filter(m => m.supportedGenerationMethods?.includes('generateContent'))
    
    // Priorizar el modelo Flash más moderno disponible en tu cuenta
    const flash = valid.find(m => m.name.includes('2.0-flash') || m.name.includes('flash'))
    const selected = flash ? flash.name : (valid[0]?.name || 'models/gemini-2.0-flash')
    
    // Guardar nombre limpio sin el prefijo "models/"
    cachedModel = selected.replace(/^models\//, '')
    console.log('[Zestly IA] Modelo activo detectado:', cachedModel)
    return cachedModel
  } catch (e) {
    console.warn('[Zestly IA] Error detectando modelo, usando gemini-2.0-flash por defecto', e)
    return 'gemini-2.0-flash'
  }
}

// Llamada de Texto (Comidas, Macros, Recetas, Coach)
export async function callAI(systemPrompt, userMessage, maxTokens = 1500) {
  const key = getKey()
  if (!key) throw new Error('Sin clave IA — configúrala en Perfil')

  const model = await getActiveModel(key)

  const body = {
    contents: [{ parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
    generationConfig: { 
      maxOutputTokens: maxTokens, 
      temperature: 0.2,
      responseMimeType: 'application/json'
    },
  }

  let res, data
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    data = await res.json()
  } catch {
    throw new Error('Sin conexión con el servidor de IA')
  }

  if (!res.ok) {
    cachedModel = null // Si falla, limpia la caché para volver a detectar
    throw new Error(friendlyError(res.status, data))
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  if (!text) throw new Error('La IA no devolvió respuesta — intenta de nuevo')
  return text
}

// Llamada con Imagen (Scanner de fotos)
export async function callAIWithImage(prompt, imageBase64, validate) {
  const key = getKey()
  if (!key) throw new Error('Sin clave IA — configúrala en Perfil')

  const model = await getActiveModel(key)

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
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    data = await res.json()
  } catch {
    throw new Error('Sin conexión con el servidor de IA')
  }

  if (!res.ok) {
    cachedModel = null
    throw new Error(friendlyError(res.status, data))
  }

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

function friendlyError(status, data) {
  const msg = data?.error?.message || ''
  if (status === 400 && /API key/i.test(msg)) return 'Clave IA inválida — revísala en Perfil'
  if (status === 403) return 'Clave IA inválida o sin permisos — revísala en Perfil'
  if (status === 429) return 'Límite de uso alcanzado en IA — espera un momento'
  return `IA ${status}: ${msg.slice(0, 80)}`
}

// Parser universal de JSON para {} y []
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
