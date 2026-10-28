# MiEspacioParaCelebrar — versión definitiva 2026

Portal web para consultar espacios privados de celebración y enviar solicitudes de reserva a sus propietarios.

## Arquitectura

- Frontend estático: Cloudflare Worker (`https://miespacioparacelebrar.jisaweb.workers.dev/`). GitHub conserva el código fuente; GitHub Pages no es el destino público.
- Datos, autenticación, RLS y RPC: Supabase.
- Correo transaccional desplegado: Brevo mediante la Edge Function `email-worker`, invocada por un cron de Supabase.
- Mapas: Leaflet/OpenStreetMap.
- Clientes: sin cuenta.
- Propietarios y administración: acceso privado.
- Pagos: fuera de la plataforma; cliente y propietario acuerdan directamente las condiciones económicas.

## Funcionalidades principales

- Búsqueda por fecha.
- Listado de todos los espacios públicos activos.
- Ficha individual con fotos, características, servicios, precios, condiciones, mapa y disponibilidad.
- Solicitudes de reserva con retención de 72 horas.
- Revisión final antes de enviar la solicitud.
- Snapshot de precios, servicios y condiciones en el momento de solicitar.
- Área privada de propietarios.
- Activación/desactivación operativa por propietario.
- Administración de propietarios y espacios.
- Administración de fotografías y características.
- Catálogo de servicios y servicios ofrecidos por espacio.
- Bloqueos de fechas.
- Modificación y cancelación de reservas confirmadas.
- Historial de emails.
- Encuestas de una sola respuesta.
- Limpieza automática de datos según los plazos definidos.
- Soporte físico NFC/QR conservado en `display-nfc/`.

## Puesta en marcha

Seguir **`DEPLOY-FINAL.md`** en el orden indicado.

La SQL definitiva es:

`supabase/FINAL-2026.sql`

### Regla SQL del proyecto

**🗂️ GUARDAR — FINAL-2026.sql**

Debe conservarse como la SQL consolidada de la versión final. Las SQL anteriores de `supabase/` se mantienen como histórico y no deben ejecutarse una detrás de otra como procedimiento de instalación.

## Seguridad

No guardar secretos en el frontend ni en GitHub. La service role key de Supabase y las claves API del proveedor de correo se configuran exclusivamente como secretos de Edge Functions.

## Publicación y sincronización de producción

La web pública se sirve desde Cloudflare Worker y la lógica sensible se ejecuta en Supabase. En la auditoría del 28-10-2026 se corrigieron y desplegaron los enlaces transaccionales para usar el dominio de producción. Versiones activas verificadas:
- `supabase/functions/email-worker/index.ts` — versión desplegada 19, envío mediante Brevo y enlaces al dominio Worker.
- `supabase/functions/create-owner/index.ts` — versión desplegada 13, invitación/activación al dominio Worker.
- `supabase/functions/resend-owner-invitation/index.ts` — versión desplegada 12, reenvío de invitación al dominio Worker.
- `supabase/functions/booking-action/index.ts` — versión desplegada 3, procesa el token de decisión de reserva.

Los archivos se copiaron desde Supabase a GitHub sin incluir claves API ni secretos. Esta sincronización de fuentes no vuelve a desplegar ni modifica las funciones en producción.

**No despliegues** `supabase/functions/process-email-queue/index.ts` para sustituir a `email-worker`: es una implementación heredada basada en Resend.

## Automatizaciones de producción verificadas

El 27-10-2026 se comprobaron como activos estos trabajos de Supabase: `email-worker-every-minute`, `expire-pending-bookings-every-5-minutes`, `miespacio-owner-reminders`, `miespacio-cleanup`, `miespacio-expire-spaces` y `miespacio-surveys-daily`. No hace falta volver a ejecutar la SQL de automatizaciones para esta sincronización.

La cola de correo tenía 21 comunicaciones con estado `sent` y ninguna pendiente o fallida. Los mensajes de error de GitHub del 24-10-2026 correspondían a una restricción temporal de Supabase por superar la cuota de transferencia; las ejecuciones posteriores comprobadas fueron satisfactorias.
