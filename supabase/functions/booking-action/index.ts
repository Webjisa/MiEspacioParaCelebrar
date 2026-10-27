const SUPABASE_URL = 'https://hvuseljtqdgekotrsiwd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
  Deno.env.get('SUPABASE_SECRET_KEY') ||
  '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders,
  });
}

function getParam(url: URL, name: string): string {
  return (url.searchParams.get(name) || '').trim();
}

async function consumeToken(token: string, action: string) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/consume_owner_booking_action_token`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_token: token,
        p_action: action,
      }),
    },
  );

  const text = await response.text();

  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      typeof data === 'object' && data !== null && 'message' in data
        ? String((data as { message: unknown }).message)
        : String(data || `Supabase RPC HTTP ${response.status}`),
    );
  }

  return data;
}

Deno.serve(async (req) => {
  // Necessary for browser calls from GitHub Pages.
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    let token = '';
    let action = '';

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      token = String(body?.token || '').trim();
      action = String(body?.action || '').trim().toLowerCase();
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      token = getParam(url, 'token');
      action = getParam(url, 'action').toLowerCase();
    } else {
      return json({ ok: false, error: 'Método no permitido' }, 405);
    }

    if (!token) {
      return json({ ok: false, error: 'Falta el token de decisión.' }, 400);
    }

    if (action === 'accept' || action === 'approve') {
      action = 'confirm';
    }

    if (action === 'decline' || action === 'deny') {
      action = 'reject';
    }

    if (!['confirm', 'reject'].includes(action)) {
      return json({ ok: false, error: 'Acción no válida.' }, 400);
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return json({
        ok: false,
        error: 'Falta la clave de servidor de Supabase en booking-action.',
      }, 500);
    }

    const result = await consumeToken(token, action);

    return json({
      ok: true,
      action,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return json({
      ok: false,
      error: message,
    }, 400);
  }
});
