// Proxy de IA compartido — recibe las peticiones de la app, llama a Gemini
// con la clave centralizada (guardada como secreto, nunca en el código) y
// aplica un tope diario por dispositivo para que ningún tester agote la
// cuota compartida. Los usuarios que configuren su PROPIA clave en Perfil
// siguen llamando a Gemini directo desde el navegador (sin pasar por aquí,
// sin tope).
const { onRequest } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

initializeApp()
const db = getFirestore()

const GEMINI_KEY = defineSecret('GEMINI_KEY')

// Misma cadena de modelos que el cliente: cada uno tiene su propia cuota,
// así que si uno se satura (429) probamos el siguiente con la misma clave.
const MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite']

// Peticiones por dispositivo/día. Ajustar aquí si hace falta más o menos
// margen — protege la cuota compartida de que un solo tester la agote.
const DAILY_LIMIT = 40

const ALLOWED_ORIGINS = ['https://yokowolf.github.io', 'http://localhost:5173']

async function checkAndBumpQuota(deviceId) {
  if (!deviceId) throw new Error('Falta identificador de dispositivo')
  const day = new Date().toISOString().slice(0, 10)
  const ref = db.collection('aiUsage').doc(`${deviceId}_${day}`)
  await db.runTransaction(async t => {
    const snap = await t.get(ref)
    const count = snap.exists ? snap.data().count : 0
    if (count >= DAILY_LIMIT) {
      throw new Error('Límite diario de IA compartida alcanzado — intenta mañana o configura tu propia clave en Perfil')
    }
    t.set(ref, { count: count + 1, day }, { merge: true })
  })
}

async function requestGemini(model, key, body) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { res, data: await res.json() }
}

function friendlyError(status, data) {
  const msg = data?.error?.message || ''
  if (status === 429) return 'Límite de uso alcanzado en IA — espera un minuto e intenta de nuevo'
  return `IA ${status}: ${msg.slice(0, 80)}`
}

exports.aiText = onRequest({ secrets: [GEMINI_KEY], cors: ALLOWED_ORIGINS }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')
  try {
    const { deviceId, systemPrompt, userMessage, maxTokens = 800, jsonMode = false } = req.body || {}
    if (!systemPrompt || !userMessage) return res.status(400).json({ error: 'Falta systemPrompt o userMessage' })
    await checkAndBumpQuota(deviceId)

    const body = {
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    }
    let lastErr
    for (const model of MODELS) {
      const { res: r, data } = await requestGemini(model, GEMINI_KEY.value(), body)
      if (!r.ok) {
        lastErr = friendlyError(r.status, data)
        if (r.status === 429) continue
        return res.status(400).json({ error: lastErr })
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (!text) { lastErr = 'La IA no devolvió respuesta — intenta de nuevo'; continue }
      return res.json({ text })
    }
    return res.status(429).json({ error: lastErr || 'Límite de uso alcanzado en IA — espera un minuto e intenta de nuevo' })
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
})

exports.aiImage = onRequest({ secrets: [GEMINI_KEY], cors: ALLOWED_ORIGINS }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')
  try {
    const { deviceId, prompt, imageBase64 } = req.body || {}
    if (!prompt || !imageBase64) return res.status(400).json({ error: 'Falta prompt o imageBase64' })
    await checkAndBumpQuota(deviceId)

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
      const { res: r, data } = await requestGemini(model, GEMINI_KEY.value(), body)
      if (!r.ok) {
        lastErr = friendlyError(r.status, data)
        if (r.status === 429) continue
        return res.status(400).json({ error: lastErr })
      }
      const cand = data.candidates?.[0]
      const text = cand?.content?.parts?.[0]?.text || ''
      if (!text) {
        lastErr = cand?.finishReason === 'SAFETY'
          ? 'La IA no pudo analizar esta imagen — intenta con otra foto'
          : 'La IA no devolvió respuesta — intenta de nuevo'
        continue
      }
      return res.json({ text })
    }
    return res.status(429).json({ error: lastErr || 'Límite de uso alcanzado en IA — espera un minuto e intenta de nuevo' })
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
})
