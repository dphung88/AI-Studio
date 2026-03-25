import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use service role key — bypasses RLS, has full storage access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const BUCKET = 'studio-media';

    // ── Single-path delete mode (for individual item delete) ──
    let body: any = {};
    try { body = await req.json(); } catch { /* no body = purge all */ }

    if (body.paths && Array.isArray(body.paths) && body.paths.length > 0) {
      const { error } = await supabase.storage.from(BUCKET).remove(body.paths);
      return new Response(
        JSON.stringify({ success: !error, error: error?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Purge ALL mode ──
    const FOLDERS = ['videos', 'images', 'audio'];
    const deleted: string[] = [];
    const errors: string[] = [];

    // List and delete every file in each known folder
    for (const folder of FOLDERS) {
      let offset = 0;
      const pageSize = 100;

      while (true) {
        const { data: files, error: listErr } = await supabase.storage
          .from(BUCKET)
          .list(folder, { limit: pageSize, offset });

        if (listErr) {
          errors.push(`list ${folder}: ${listErr.message}`);
          break;
        }
        if (!files || files.length === 0) break;

        const paths = files.map((f: any) => `${folder}/${f.name}`);
        const { error: removeErr } = await supabase.storage
          .from(BUCKET)
          .remove(paths);

        if (removeErr) {
          errors.push(`remove ${folder}: ${removeErr.message}`);
        } else {
          deleted.push(...paths);
        }

        if (files.length < pageSize) break;
        offset += pageSize;
      }
    }

    // Also delete all DB records
    const { error: dbErr } = await supabase
      .from('studio_gallery')
      .delete()
      .gt('id', 0);   // id is bigint — gt(0) matches all positive IDs

    if (dbErr) {
      errors.push(`db: ${dbErr.message}`);
    }

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        deletedFiles: deleted.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
