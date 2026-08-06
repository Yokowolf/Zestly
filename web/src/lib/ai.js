// Cliente Groq — misma key (zs_gkey) y modelos que la app legacy
export const getKey = () => localStorage.getItem('zs_gkey') || ''
export const setKey = k => localStorage.setItem('zs_gkey', k.trim())
export const hasKey = () => !!getKey()

// Proveedor principal (chat, coach, recetas, texto). Si falla por lo que sea
// (clave sin configurar, límite de uso, modelo caído) y hay clave de
// respaldo activa, se reintenta ahí mismo antes de reportar error — así un
// problema puntual de un proveedor no tumba el coach ni el generador.
export async function callAI(systemPrompt, userMessage, maxTokens = 800) {
  try {
    return await callGroqText(systemPrompt, userMessage, maxTokens)
  } catch (e) {
    if (!hasPhotoKey()) throw e
    return await callGeminiText(systemPrompt, userMessage, maxTokens)
  }
}

async function callGroqText(systemPrompt, userMessage, maxTokens) {
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

// Traduce errores comunes de la API a mensajes accionables — nunca se nombra
// el proveedor en el texto que ve el usuario, solo "IA" (pedido explícito).
function friendlyError(status, data) {
  const code = data.error?.code || ''
  const msg = data.error?.message || ''
  if (status === 401) return 'Clave IA inválida — revísala en Perfil'
  if (status === 429) return 'Límite de uso alcanzado en IA — espera un minuto e intenta de nuevo'
  if (code === 'model_decommissioned' || code === 'model_not_found') return 'Modelo IA desactualizado — actualiza la app'
  if (code === 'json_validate_failed') return 'La IA no logró estructurar la respuesta — intenta con otra foto o usa Texto IA'
  return `IA ${status}: ${msg.slice(0, 80)}`
}

// Extrae el primer objeto JSON de una respuesta de IA
export function parseAIJson(raw) {
  const clean = (raw || '').replace(/```json|```/g, '').trim()
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
  if (s === -1 || e === -1) throw new Error('La IA no devolvió JSON válido — intenta de nuevo o usa otra foto')
  return JSON.parse(clean.slice(s, e + 1))
}

// ── Proveedor de respaldo — también el único que analiza fotos ──────────
// El de arriba falla de forma recurrente con imágenes por límites de cuota
// de su modelo de visión, así que las fotos SIEMPRE usan este. Para
// texto (chat/recetas) solo entra en acción si el principal falla. La
// clave se guarda aparte (zs_gemini_key) y NUNCA se expone en el código
// ni en git — vive solo en localStorage/Firestore del propio usuario.
export const getPhotoKey = () => localStorage.getItem('zs_gemini_key') || ''
export const setPhotoKey = k => localStorage.setItem('zs_gemini_key', k.trim())
export const hasPhotoKey = () => !!getPhotoKey()

// Modelo "flash" (no "pro") a propósito: en el nivel gratuito los modelos
// pro traen cuotas mucho más bajas — flash es el que de verdad rinde gratis.
const GEMINI_MODEL = 'gemini-3.6-flash'

async function callGeminiText(systemPrompt, userMessage, maxTokens) {
  const key = getPhotoKey()
  const body = {
    contents: [{ parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
  }
  let res, data
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    data = await res.json()
  } catch {
    throw new Error('Sin conexión con el servidor de IA')
  }
  if (!res.ok) throw new Error(friendlyPhotoError(res.status, data))
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  if (!text) throw new Error('La IA no devolvió respuesta — intenta de nuevo')
  return text
}

// Analiza una foto con IA y devuelve el texto crudo.
// `validate` recibe el texto y debe lanzar si no sirve.
export async function callAIWithImage(prompt, imageBase64, validate) {
  const key = getPhotoKey()
  if (!key) throw new Error('Sin clave IA para fotos — configúrala en Perfil')
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
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    data = await res.json()
  } catch {
    throw new Error('Sin conexión con el servidor de IA')
  }
  if (!res.ok) throw new Error(friendlyPhotoError(res.status, data))
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

function friendlyPhotoError(status, data) {
  const msg = (data?.error?.message || '')
  if (status === 400 && /API key/i.test(msg)) return 'Clave IA para fotos inválida — revísala en Perfil'
  if (status === 403) return 'Clave IA para fotos inválida o sin permisos — revísala en Perfil'
  if (status === 429) return 'Límite de uso alcanzado en IA — espera un minuto e intenta de nuevo'
  return `IA ${status}: ${msg.slice(0, 80)}`
}
