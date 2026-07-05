// Cliente Groq — misma key (zs_gkey) y modelos que la app legacy
export const getKey = () => localStorage.getItem('zs_gkey') || ''
export const setKey = k => localStorage.setItem('zs_gkey', k.trim())
export const hasKey = () => !!getKey()

export async function callAI(systemPrompt, userMessage, maxTokens = 800) {
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
  if (!res.ok) throw new Error(`Groq ${res.status}: ${data.error?.message || JSON.stringify(data)}`)
  return data.choices[0].message.content
}

export async function callAIWithImage(prompt, imageBase64) {
  const key = getKey()
  if (!key) throw new Error('Sin API key')
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.2-11b-vision-preview',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      }],
      max_tokens: 600,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Groq Vision ${res.status}: ${data.error?.message}`)
  return data.choices[0].message.content
}

// Extrae el primer objeto JSON de una respuesta de IA
export function parseAIJson(raw) {
  const clean = raw.replace(/```json|```/g, '').trim()
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
  if (s === -1 || e === -1) throw new Error('La IA no devolvió JSON válido')
  return JSON.parse(clean.slice(s, e + 1))
}
