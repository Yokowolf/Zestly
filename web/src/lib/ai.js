// Cliente de IA — un solo proveedor para todo (chat, coach, recetas, texto
// y fotos). Antes se usaban dos proveedores distintos, pero el primero
// (Groq) fue decomisionando sus modelos de forma repetida y obligaba a
// parchar la app cada pocas semanas — se simplificó a uno solo.
// La clave se guarda en localStorage/Firestore del propio usuario y NUNCA
// se expone en el código ni en git.
export const getKey = () => localStorage.getItem('zs_gemini_key') || ''
export const setKey = k => localStorage.setItem('zs_gemini_key', k.trim())
export const hasKey = () => !!getKey()

// Modelo "flash" (no "pro") a propósito: en el nivel gratuito los modelos
// pro traen cuotas mucho más bajas — flash es el que de verdad rinde gratis.
const MODEL = 'gemini-3.6-flash'

export async function callAI(systemPrompt, userMessage, maxTokens = 800) {
  const key = getKey()
  if (!key) throw new Error('Sin clave IA — configúrala en Perfil')
  const body = {
    contents: [{ parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
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
// `validate` recibe el texto y debe lanzar si no sirve.
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
    generationConfig: { response_mime_type: 'application/json', temperature: 0.2 },
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

// Traduce errores comunes de la API a mensajes accionables — nunca se nombra
// el proveedor en el texto que ve el usuario, solo "IA" (pedido explícito).
function friendlyError(status, data) {
  const msg = data?.error?.message || ''
  if (status === 400 && /API key/i.test(msg)) return 'Clave IA inválida — revísala en Perfil'
  if (status === 403) return 'Clave IA inválida o sin permisos — revísala en Perfil'
  if (status === 429) return 'Límite de uso alcanzado en IA — espera un minuto e intenta de nuevo'
  return `IA ${status}: ${msg.slice(0, 80)}`
}

// Extrae el primer objeto JSON de una respuesta de IA
export function parseAIJson(raw) {
  const clean = (raw || '').replace(/```json|```/g, '').trim()
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
  if (s === -1 || e === -1) throw new Error('La IA no devolvió JSON válido — intenta de nuevo o usa otra foto')
  return JSON.parse(clean.slice(s, e + 1))
}
