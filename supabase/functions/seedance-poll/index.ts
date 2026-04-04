// BytePlus ModelArk — Seedance Poll (server-side proxy to avoid CORS)
// Checks task status once and returns { status, videoUrl? }.
// Client loops and calls this repeatedly until status === 'succeeded'.

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
    const { apiKey, taskId } = await req.json()

    if (!apiKey) return new Response(JSON.stringify({ error: 'apiKey is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (!taskId) return new Response(JSON.stringify({ error: 'taskId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const res = await fetch(`${BYTEDANCE_VIDEO_TASKS}/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })

    const data = await res.json()

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Seedance poll failed (${res.status}): ${JSON.stringify(data)}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Pass through status; if succeeded, also download the video and return as base64
    // so the client doesn't have to hit ByteDance's pre-signed URL directly
    if (data.status === 'succeeded') {
      const videoUrl: string = data.content?.video_url
      if (!videoUrl) {
        return new Response(JSON.stringify({ error: 'Seedance succeeded but no video_url in response', raw: data }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Download the video server-side (pre-signed URL, no auth needed)
      const dlRes = await fetch(videoUrl)
      if (!dlRes.ok) {
        return new Response(JSON.stringify({ error: `Failed to download Seedance video: ${dlRes.statusText}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const videoBuffer = await dlRes.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(videoBuffer)))
      const mimeType = dlRes.headers.get('content-type') || 'video/mp4'

      return new Response(JSON.stringify({ status: 'succeeded', videoBase64: base64, mimeType }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (['failed', 'expired', 'cancelled'].includes(data.status)) {
      return new Response(JSON.stringify({ error: `Seedance task ${data.status}: ${data.error?.message ?? 'Unknown error'}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // queued | running → still in progress
    return new Response(JSON.stringify({ status: data.status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
