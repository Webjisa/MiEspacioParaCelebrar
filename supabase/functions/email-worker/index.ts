const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') ?? '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? '';
const EMAIL_FROM_NAME = Deno.env.get('EMAIL_FROM_NAME') || 'MiEspacioParaCelebrar';
const APP_BASE_URL = (Deno.env.get('APP_BASE_URL') || 'https://webjisa.github.io/MiEspacioParaCelebrar').replace(/\/$/, '');

function getServiceKey(): string {
  const direct = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY');
  if (direct) return direct;
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') return parsed;
      if (parsed?.default) return parsed.default;
      if (parsed?.service_role) return parsed.service_role;
    } catch (_) {}
  }
  throw new Error('Falta la clave de servidor de Supabase.');
}

const SERVICE_KEY = getServiceKey();
const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>'"]/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  } as Record<string,string>)[c]);
}

function fmtDate(value: unknown): string {
  if (!value) return '';
  const d = new Date(`${String(value).slice(0,10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? String(value) : new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
}

function fmtMoney(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n);
}

function decisionUrl(token: string, action: 'confirm'|'reject'): string {
  return `${APP_BASE_URL}/decidir-reserva.html?token=${encodeURIComponent(token)}&action=${action}`;
}

function privateUrl(payload: any): string {
  return payload?.private_area_url || `${APP_BASE_URL}/area-privada.html`;
}

function statusLabel(value: unknown): string {
  const status = String(value ?? '').trim().toLowerCase();
  const labels: Record<string, string> = {
    pending: 'PENDIENTE',
    confirmed: 'CONFIRMADA',
    rejected: 'RECHAZADA',
    expired: 'CADUCADA',
    cancelled: 'CANCELADA',
  };
  return labels[status] || String(value ?? '').toUpperCase();
}

function button(label: string, href: string, kind: 'primary'|'secondary' = 'primary'): string {
  const bg = kind === 'primary' ? '#344234' : '#8b907f';
  return `<a href="${esc(href)}" style="display:inline-block;padding:13px 20px;margin:4px;border-radius:7px;background:${bg};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">${esc(label)}</a>`;
}

function layout(subject: string, recipientName: string, content: string): string {
  const greeting = recipientName ? `Hola ${esc(recipientName)},` : 'Hola,';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#cacdbd;color:#344234;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#cacdbd" style="width:100%;background:#cacdbd;margin:0;padding:0;">
<tr><td align="center" bgcolor="#cacdbd" style="background:#cacdbd;padding:28px 12px;">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" bgcolor="#cacdbd" style="width:100%;max-width:640px;background:#cacdbd;">
<tr><td bgcolor="#344234" style="background:#344234;padding:22px 28px;color:#ffffff;font-size:20px;font-weight:800;">MiEspacioParaCelebrar</td></tr>
<tr><td bgcolor="#cacdbd" style="background:#cacdbd;padding:30px 28px;color:#344234;">
<div style="font-size:14px;line-height:1.6;">${greeting}</div>
<div style="font-size:27px;line-height:1.2;font-weight:800;margin:8px 0 18px;">${esc(subject)}</div>
${content}
</td></tr>
<tr><td bgcolor="#8b907f" style="background:#8b907f;padding:18px 28px;color:#ffffff;font-size:12px;line-height:1.5;">MiEspacioParaCelebrar · Comunicación automática</td></tr>
</table></td></tr></table></body></html>`;
}

function details(payload: any): string {
  const rows = [
    ['Espacio', payload.space_name],
    ['Entrada', fmtDate(payload.start_date)],
    ['Salida', fmtDate(payload.end_date)],
  ].filter(([,v]) => v !== undefined && v !== null && String(v) !== '');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;border-collapse:collapse;">${rows.map(([k,v])=>`<tr><td style="padding:8px 0;font-weight:700;width:120px;">${esc(k)}</td><td style="padding:8px 0;">${esc(v)}</td></tr>`).join('')}</table>`;
}

function ownerRequestHtml(payload: any, reminder = false): string {
  const expires = payload.expires_at ? fmtDate(payload.expires_at) : '';
  const intro = reminder
    ? `Tienes una solicitud pendiente para <strong>${esc(payload.space_name)}</strong>. El plazo de respuesta está próximo a finalizar.`
    : `Has recibido una nueva solicitud de reserva para <strong>${esc(payload.space_name)}</strong>.`;
  const buttons = payload.confirm_token && payload.reject_token
    ? `<div style="margin:24px 0 8px;">${button('Aceptar solicitud',decisionUrl(payload.confirm_token,'confirm'),'primary')}${button('Rechazar solicitud',decisionUrl(payload.reject_token,'reject'),'secondary')}</div>
       <div style="margin-top:8px;">${button('Ver en área privada',privateUrl(payload),'secondary')}</div>`
    : `<div style="margin:24px 0;">${button('Ver en área privada',privateUrl(payload),'primary')}</div>`;
  return `${intro}${details(payload)}${payload.customer_name ? `<p style="line-height:1.6;"><strong>Cliente:</strong> ${esc(payload.customer_name)}</p>`:''}${payload.customer_phone ? `<p style="line-height:1.6;"><strong>Teléfono:</strong> ${esc(payload.customer_phone)}</p>`:''}${expires ? `<p style="line-height:1.6;"><strong>Fecha límite:</strong> ${esc(expires)}</p>`:''}${buttons}`;
}

function renderEmail(type: string, recipientName: string, payload: any): {subject:string, html:string, replyTo?:string} {
  const space = payload.space_name || 'el espacio';
  switch (type) {
    case 'customer_request_received':
      return {subject:`Solicitud recibida - ${space}`,html:`<p style="line-height:1.7;">Hemos recibido correctamente tu solicitud para <strong>${esc(space)}</strong>. El propietario debe formalizarla dentro del plazo indicado.</p>${details(payload)}<p style="line-height:1.7;">Te enviaremos otro correo cuando la solicitud haya sido aceptada, rechazada o haya caducado.</p>`};
    case 'request_created':
      return {subject:`Nueva solicitud - ${space}`,html:ownerRequestHtml(payload,false)};
    case 'owner_pending_reminder':
      return {subject:`Recordatorio: solicitud pendiente - ${space}`,html:ownerRequestHtml(payload,true)};
    case 'customer_confirmed':
      return {subject:`Reserva confirmada - ${space}`,html:`<p style="line-height:1.7;">Tu solicitud para <strong>${esc(space)}</strong> ha sido confirmada.</p>${details(payload)}<p style="line-height:1.7;">El propietario podrá contactar contigo para concretar la entrega de la llave y las condiciones acordadas.</p>`};
    case 'customer_not_processed':
      return {subject:`Solicitud no procesada - ${space}`,html:`<p style="line-height:1.7;">Tu solicitud para <strong>${esc(space)}</strong> no ha sido aceptada y no se ha formalizado la reserva.</p>${details(payload)}`};
    case 'customer_expired':
      return {subject:`Solicitud caducada - ${space}`,html:`<p style="line-height:1.7;">La solicitud para <strong>${esc(space)}</strong> ha caducado porque no fue formalizada dentro del plazo establecido.</p>${details(payload)}`};
    case 'customer_cancelled':
      return {subject:`Reserva cancelada - ${space}`,html:`<p style="line-height:1.7;">La reserva para <strong>${esc(space)}</strong> ha sido cancelada.</p>${details(payload)}${payload.reason?`<p style="line-height:1.7;"><strong>Motivo:</strong> ${esc(payload.reason)}</p>`:''}`};
    case 'customer_updated':
      return {subject:`Reserva actualizada - ${space}`,html:`<p style="line-height:1.7;">Los datos de tu reserva para <strong>${esc(space)}</strong> han sido actualizados.</p>${details(payload)}`};
    case 'admin_request_created':
      return {subject:`Nueva solicitud - ${space}`,html:`<p style="line-height:1.7;">Se ha creado una nueva solicitud de reserva.</p>${details(payload)}<p style="line-height:1.7;"><strong>Cliente:</strong> ${esc(payload.customer_name||'')}</p><p style="line-height:1.7;"><strong>Email:</strong> ${esc(payload.customer_email||'')}</p><p style="line-height:1.7;"><strong>Teléfono:</strong> ${esc(payload.customer_phone||'')}</p>`};
    case 'admin_booking_final':
      return {subject:`Reserva ${statusLabel(payload.status) || 'ACTUALIZADA'} - ${space}`,html:`<p style="line-height:1.7;">Se ha producido una decisión o cambio en una reserva.</p>${details(payload)}<p style="line-height:1.7;"><strong>Cliente:</strong> ${esc(payload.customer_name||'')}</p><p style="line-height:1.7;"><strong>Estado:</strong> ${esc(statusLabel(payload.status))}</p>${payload.comment?`<p style="line-height:1.7;"><strong>Comentario:</strong> ${esc(payload.comment)}</p>`:''}`};
    case 'owner_booking_confirmed':
      return {subject:`Reserva confirmada - ${space}`,html:`<p style="line-height:1.7;">La reserva de <strong>${esc(space)}</strong> ha sido confirmada correctamente.</p>${details(payload)}<p style="line-height:1.7;"><strong>Cliente:</strong> ${esc(payload.customer_name||'')}</p><div style="margin:24px 0;">${button('Ver en área privada',privateUrl(payload),'primary')}</div>`};
    case 'owner_booking_rejected':
      return {subject:`Solicitud rechazada - ${space}`,html:`<p style="line-height:1.7;">La solicitud para <strong>${esc(space)}</strong> ha sido rechazada correctamente.</p>${details(payload)}<p style="line-height:1.7;"><strong>Cliente:</strong> ${esc(payload.customer_name||'')}</p><div style="margin:24px 0;">${button('Ver en área privada',privateUrl(payload),'secondary')}</div>`};
    case 'owner_booking_final':
      return {subject:`Actualización de reserva - ${space}`,html:`<p style="line-height:1.7;">Se ha actualizado una reserva relacionada con <strong>${esc(space)}</strong>.</p>${details(payload)}<p style="line-height:1.7;"><strong>Cliente:</strong> ${esc(payload.customer_name||'')}</p><p style="line-height:1.7;"><strong>Estado:</strong> ${esc(payload.status||'')}</p>${payload.comment?`<p style="line-height:1.7;"><strong>Comentario:</strong> ${esc(payload.comment)}</p>`:''}`};
    case 'owner_email_changed':
      return {subject:`Email del cliente actualizado - ${space}`,html:`<p style="line-height:1.7;">Se ha actualizado el email del cliente de una reserva.</p>${details(payload)}<p style="line-height:1.7;"><strong>Cliente:</strong> ${esc(payload.customer_name||'')}</p><p style="line-height:1.7;"><strong>Nuevo email:</strong> ${esc(payload.customer_email||'')}</p>`};
    case 'admin_owner_email_changed':
      return {subject:`Email de cliente actualizado - ${space}`,html:`<p style="line-height:1.7;">El propietario ha modificado el email del cliente.</p>${details(payload)}<p style="line-height:1.7;"><strong>Cliente:</strong> ${esc(payload.customer_name||'')}</p><p style="line-height:1.7;"><strong>Nuevo email:</strong> ${esc(payload.customer_email||'')}</p>`};
    case 'survey_created': {
      const url = `${APP_BASE_URL}/encuesta.html?token=${encodeURIComponent(payload.token||'')}`;
      return {subject:`Cuéntanos tu experiencia - ${space}`,html:`<p style="line-height:1.7;">Gracias por utilizar <strong>${esc(space)}</strong>. Nos gustaría conocer tu experiencia.</p>${button('Completar encuesta',url,'primary')}`};
    }
    case 'space_enabled':
      return {subject:`Espacio habilitado - ${space}`,html:`<p style="line-height:1.7;">El espacio <strong>${esc(space)}</strong> ha sido habilitado.</p>`};
    case 'space_disabled':
      return {subject:`Espacio deshabilitado - ${space}`,html:`<p style="line-height:1.7;">El espacio <strong>${esc(space)}</strong> ha sido deshabilitado.</p>`};
    default:
      return {subject:`Notificación - ${space}`,html:`<p style="line-height:1.7;">Se ha generado una nueva comunicación relacionada con <strong>${esc(space)}</strong>.</p>${details(payload)}`};
  }
}

async function rpcClaim(limit = 10) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/claim_email_queue_batch`, {
    method:'POST',headers,body:JSON.stringify({p_limit:limit,p_max_attempts:5})
  });
  if (!r.ok) throw new Error(`No se pudo reclamar la cola: ${await r.text()}`);
  return await r.json();
}

async function updateQueue(id: string, patch: Record<string,unknown>) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/email_queue?id=eq.${encodeURIComponent(id)}`, {
    method:'PATCH',headers,body:JSON.stringify(patch)
  });
  if (!r.ok) throw new Error(`No se pudo actualizar email_queue: ${await r.text()}`);
}

async function sendBrevo(item: any) {
  const payload = item.payload || {};
  const rendered = renderEmail(item.communication_type, item.recipient_name || '', payload);
  const body: any = {
    sender:{email:EMAIL_FROM,name:EMAIL_FROM_NAME},
    to:[{email:item.recipient_email,name:item.recipient_name || undefined}],
    subject:rendered.subject,
    htmlContent:layout(rendered.subject,item.recipient_name || '',rendered.html)
  };
  if (rendered.replyTo || payload.reply_to) body.replyTo={email:rendered.replyTo || payload.reply_to};
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:'POST',
    headers:{'api-key':BREVO_API_KEY,'Content-Type':'application/json','accept':'application/json'},
    body:JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Brevo ${r.status}: ${await r.text()}`);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed',{status:405});
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) return new Response('Unauthorized',{status:401});
  if (!SUPABASE_URL || !BREVO_API_KEY || !EMAIL_FROM) return new Response('Faltan secretos de email-worker',{status:500});

  try {
    const items = await rpcClaim(10);
    let sent = 0, failed = 0;
    for (const item of items) {
      try {
        await sendBrevo(item);
        await updateQueue(item.id,{status:'sent',sent_at:new Date().toISOString(),last_error:null});
        sent++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await updateQueue(item.id,{status:'failed',last_error:message,next_attempt_at:new Date(Date.now()+10*60*1000).toISOString()});
        failed++;
      }
    }
    return Response.json({ok:true,claimed:items.length,sent,failed});
  } catch (error) {
    return Response.json({ok:false,error:error instanceof Error?error.message:String(error)},{status:500});
  }
});
