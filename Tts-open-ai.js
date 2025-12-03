Hak cipta by
https://t.me/Apisimpacientes
// Get your API key here: https://enter.pollinations.ai

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
const POLLINATIONS_TOKEN = "ENTER_YOUR_API_KEY_HERE"

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  if (request.method !== 'GET') {
    return errorResponse('Only GET requests are allowed', 400)
  }

  if (path === '/' || path === '') {
    return errorResponse('Se requieren los parámetros voice y text. Use /tts?voice=nova&text=Hello', 400)
  }

  if (path === '/voices' || path === '/voices/') {
    return jsonResponse({
      status_code: 200,
      message: 'Voces disponibles',
      voices: VOICES
    })
  }

  if (path === '/tts' || path === '/tts/') {
    const voice = url.searchParams.get('voice')
    const text = url.searchParams.get('text')

    if (!voice || !text || voice.trim() === '' || text.trim() === '') {
      return errorResponse('Se requieren los parámetros voice y text', 400)
    }

    const cleanVoice = voice.toLowerCase().trim()
    const cleanText = text.trim()

    if (!VOICES.includes(cleanVoice)) {
      return errorResponse(`Voz inválida. Voces disponibles: ${VOICES.join(', ')}`, 400)
    }

    try {
      const audio = await generateTTS(cleanVoice, cleanText)
      return new Response(audio, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': `attachment; filename="tts_${cleanVoice}.mp3"`,
          ...CORS
        }
      })
    } catch (error) {
      return errorResponse('Error al generar el audio. Intenta nuevamente.', 500)
    }
  }

  return errorResponse('Endpoint not found. Use /, /voices or /tts', 404)
}

async function generateTTS(voice, text) {
  const promptText = `In the following text, Fix grammar, punctuation, spelling, In your response, I should just see the updated text. I don't need your description such as: "Here is the text with modifications..."\nThe text is: ${text}`
  const apiUrl = `https://text.pollinations.ai/${encodeURIComponent(promptText)}?model=openai-audio&voice=${voice}`

  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Authorization': `Bearer ${POLLINATIONS_TOKEN}`
    },
    signal: AbortSignal.timeout(30000)
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }

  return response.arrayBuffer()
}

function errorResponse(message, status) {
  return jsonResponse({ status_code: status, message }, status)
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...extraHeaders }
  })
}