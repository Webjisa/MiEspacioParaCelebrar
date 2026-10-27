# MiEspacioParaCelebrar — versión definitiva 2026

Portal web para consultar espacios privados de celebración y enviar solicitudes de reserva a sus propietarios.

## Arquitectura

- Frontend estático: GitHub Pages.
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

## Publicación

El repositorio contiene la web estática para GitHub Pages. El 27-10-2026 se verificó en el proyecto Supabase activo la caducidad automática y el envío de notificaciones mediante Brevo. Queda pendiente sincronizar el código fuente del trabajador de correo: la función desplegada `email-worker` todavía no está versionada aquí y `supabase/functions/process-email-queue/index.ts` es una implementación antigua basada en Resend.

## Importante: sincronización del correo pendiente

No despliegues `process-email-queue` desde este repositorio para sustituir el trabajador activo. La configuración comprobada en Supabase usa `email-worker` y Brevo, pero el código fuente de esa función aún no está incluido en el repositorio. Antes de volver a desplegar o reconstruir el proyecto, exporta la función activa a `supabase/functions/email-worker/index.ts` y revisa sus secretos sin publicarlos.
