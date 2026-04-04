// BytePlus ModelArk — Seedance Start (server-side proxy to avoid CORS)
// Receives prompt + options from client, forwards to BytePlus, returns taskId.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BYTEDANCE_VIDEO_TASKS = 'https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { apiKey, modelId, prompt, image, ratio, resolution, duration } = await req.json()

    if (!apiKey) return new Response(JSON.stringify({ error: 'apiKey is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (!modelId) return new Response(JSON.stringify({ error: 'modelId (ep-xxxx) is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Build inline-flag prompt (BytePlus Seedance format)
    const textWithFlags = `${prompt} --ratio ${ratio ?? '16:9'} --resolution ${resolution ?? '720p'} --duration ${duration ?? 5} --camerafixed false`

    const content: object[] = []
    if (image) {
      content.push({ type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.data}` } })
    }
    content.push({ type: 'text', text: textWithFlags })

    const res = await fetch(BYTEDANCE_VIDEO_TASKS, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: modelId, content }),
    })

    const data = await res.json()

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Seedance create failed (${res.status}): ${JSON.stringify(data)}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!data.id) {
      return new Response(JSON.stringify({ error: 'Seedance: no task id returned', raw: data }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ taskId: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
