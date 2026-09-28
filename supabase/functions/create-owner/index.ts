import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(url, service);
const APP_URL = 'https://webjisa.github.io/MiEspacioParaCelebrar';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

Deno.serve(async req => {
  let createdUserId: string | null = null;
  try {
    const auth = req.headers.get('Authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return json({ error: 'Sesión no válida' }, 401);

    const { data: p, error: profileError } = await admin
      .from('profiles')
      .select('role,active')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (p?.role !== 'admin' || p.active !== true) return json({ error: 'No autorizado' }, 403);

    const b = await req.json();
    const email = String(b.email || '').trim().toLowerCase();
    const firstName = String(b.first_name || '').trim();
    const lastName = String(b.last_name || '').trim();

    if (!email || !firstName) return json({ error: 'El nombre y el email son obligatorios.' }, 400);

    const { data: invitation, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${APP_URL}/activar-cuenta.html`
    });
    if (inviteError) throw inviteError;
    if (!invitation?.user) throw new Error('No se ha podido crear la invitación.');

    createdUserId = invitation.user.id;

    const { data: profile, error: profileInsertError } = await admin
      .from('profiles')
      .insert({
        id: createdUserId,
        email,
        first_name: firstName,
        last_name: lastName || null,
        phone: String(b.phone || '').trim() || null,
        address: String(b.address || '').trim() || null,
        city: String(b.city || '').trim() || null,
        postal_code: String(b.postal_code || '').trim() || null,
        role: 'owner',
        active: true
      })
      .select()
      .single();

    if (profileInsertError) throw profileInsertError;

    const { error: ownerError } = await admin
      .from('owners')
      .insert({
        profile_id: createdUserId,
        legal_name: null,
        tax_id: null,
        active: true
      });

    if (ownerError) throw ownerError;

    return json({ ok: true, invited: true, profile });
  } catch (e) {
    if (createdUserId) {
      await admin.from('owners').delete().eq('profile_id', createdUserId);
      await admin.from('profiles').delete().eq('id', createdUserId);
      await admin.auth.admin.deleteUser(createdUserId);
    }
    return json({ error: String((e as Error)?.message || e) }, 400);
  }
});
