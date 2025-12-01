addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const PYTHON_API_BASE = "https://tiktok-tts-ivory.vercel.app"

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname
  
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({
      status_code: 400,
      message: 'Only GET requests are allowed',
      developer: 'El Impaciente',
      telegram_channel: 'https://t.me/Apisimpacientes'
    }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
  
  // Root endpoint: error for no params, matching example
  if (path === '/' || path === '') {
    return new Response(JSON.stringify({
      status_code: 400,
      message: "Parameters 'voice' and 'text' are required",
      developer: 'El Impaciente',
      telegram_channel: 'https://t.me/Apisimpacientes'
    }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
  
  if (path === '/voices' || path === '/voices/') {
    try {
      const voicesResponse = await fetch(`${PYTHON_API_BASE}/voices`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!voicesResponse.ok) {
        return new Response(JSON.stringify({
          status_code: 500,
          message: 'Error fetching voices from internal API',
          developer: 'El Impaciente',
          telegram_channel: 'https://t.me/Apisimpacientes'
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        })
      }
      
      const voicesData = await voicesResponse.json()
      
      return new Response(JSON.stringify({
        status_code: 200,
        developer: 'El Impaciente',
        telegram_channel: 'https://t.me/Apisimpacientes',
        total: voicesData.total || voicesData.voices?.length || 0,
        voices: voicesData.voices || voicesData.response || []  // Adaptar a estructura del Python (total y voices)
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    } catch (error) {
      return new Response(JSON.stringify({
        status_code: 500,
        message: 'Error processing voices request',
        developer: 'El Impaciente',
        telegram_channel: 'https://t.me/Apisimpacientes'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }
  }
  
  if (path === '/generate' || path === '/generate/') {
    const text = url.searchParams.get('text')
    const voice = url.searchParams.get('voice')
    
    if (!text || !voice) {
      return new Response(JSON.stringify({
        status_code: 400,
        message: "Parameters 'voice' and 'text' are required",
        developer: 'El Impaciente',
        telegram_channel: 'https://t.me/Apisimpacientes'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    try {
      // Llamar a la API Python para TTS (GET con query params)
      const ttsUrl = `${PYTHON_API_BASE}/tts?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(text)}`
      const response = await fetch(ttsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        // Parse error JSON y usar mensaje matching example
        let errorData = { message: 'Could not generate audio' }
        try {
          errorData = await response.json()
          // Personalizar para voz no encontrada si aplica
          if (errorData.message && errorData.message.includes('no encontrada')) {
            errorData.message = `Voice not found: ${voice}. Use /voices to see available voices.`
          }
        } catch {}
        return new Response(JSON.stringify({
          status_code: 400,
          message: errorData.message || 'Could not generate audio',
          developer: 'El Impaciente',
          telegram_channel: 'https://t.me/Apisimpacientes'
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        })
      }
      
      // Es audio: verificar content-type y retornar directamente
      const contentType = response.headers.get('Content-Type') || ''
      if (contentType.includes('audio/mpeg')) {
        const audioBuffer = await response.arrayBuffer()
        
        return new Response(audioBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': `attachment; filename="tts_${voice}.mp3"`,
            'Access-Control-Allow-Origin': '*'
          }
        })
      } else {
        // Fallback matching example
        return new Response(JSON.stringify({
          status_code: 400,
          message: 'Error processing the request',
          developer: 'El Impaciente',
          telegram_channel: 'https://t.me/Apisimpacientes'
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        })
      }
      
    } catch (error) {
      return new Response(JSON.stringify({
        status_code: 400,
        message: 'Error processing the request',
        developer: 'El Impaciente',
        telegram_channel: 'https://t.me/Apisimpacientes'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
  
  // Fallback para paths no manejados
  return new Response(JSON.stringify({
    status_code: 404,
    message: 'Endpoint not found. Use /, /voices or /generate.',
    developer: 'El Impaciente',
    telegram_channel: 'https://t.me/Apisimpacientes'
  }), {
    status: 404,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}
