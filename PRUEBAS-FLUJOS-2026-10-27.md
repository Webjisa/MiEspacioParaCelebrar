# Registro de pruebas de flujos — 27-10-2026

## Resultado general

Se ha sincronizado el código de las dos Edge Functions de producción con GitHub y se han realizado comprobaciones estáticas de integración. No se han ejecutado nuevas migraciones SQL ni se han creado reservas nuevas durante esta revisión.

## Comprobaciones superadas

| Área | Resultado | Evidencia |
|---|---|---|
| Sincronización de fuentes | OK | El contenido de `supabase/functions/email-worker/index.ts` coincide exactamente con `email-worker` desplegada (versión 16). |
| Sincronización de fuentes | OK | El contenido de `supabase/functions/booking-action/index.ts` coincide exactamente con `booking-action` desplegada (versión 3). |
| Revisión de secretos | OK | No se encontraron claves o tokens literales reconocibles en los dos archivos sincronizados; se leen desde variables de entorno. |
| Integración de correo | OK | `email-worker` exige POST y el encabezado secreto `x-cron-secret`, reclama lotes de `email_queue` y envía a través de Brevo. |
| Integración de decisiones | OK | `decidir-reserva.html` envía `{token, action}` por POST a `booking-action`; el backend valida el token/acción y llama al RPC desde servidor. |
| Formulario de reserva | OK estático | `app.js` llama a `create_booking_request` y consulta rangos no disponibles con `get_space_unavailable_ranges`. |
| Emails de encuestas | OK estático | El trabajador contiene una plantilla `survey_created`; el cron diario de encuestas figura activo en Supabase. |
| Caducidad de solicitudes | OK en producción | La prueba anterior de caducidad acabó con la solicitud en estado `expired` y los avisos `customer_expired` y `admin_booking_final` enviados. |
| Cola de emails | OK en producción | En la última comprobación, los 21 elementos estaban en estado `sent`; no había elementos pendientes o fallidos. |
| Automatizaciones | OK en configuración | Están activos el worker de emails, la caducidad de reservas, los recordatorios y los trabajos diarios de limpieza, caducidad de espacios y encuestas. |
| Recursos estáticos | OK tras corrección | Se actualizaron las referencias de caché en portada, acceso, listado, ficha, disponibilidad, área privada y encuesta para cargar los recursos actuales. |

## Pruebas aún no certificadas como extremo a extremo

Estas pruebas requieren interactuar con la web en un navegador con datos y sesión de prueba. No se marcan como aprobadas solo por haber revisado el código:

1. Crear una nueva solicitud desde el formulario público y comprobar los emails reales de cliente, propietario y administración.
2. Abrir el enlace de propietario de esa solicitud y confirmar; comprobar estado de reserva y notificaciones.
3. Repetir con otra solicitud y rechazarla; comprobar estado y notificaciones.
4. Completar una encuesta desde el enlace recibido y verificar que no se admite una segunda respuesta con el mismo token.
5. Completar una invitación de propietario, establecer contraseña y probar el restablecimiento de contraseña.
6. Hacer una revisión visual de móvil en portada, búsqueda, ficha, formulario, área privada y administración.

No se han usado reservas ni datos personales de clientes reales para estas comprobaciones. No se debe desplegar la antigua `process-email-queue` sobre `email-worker`: la primera es una integración heredada con Resend.

## Publicación

El código del sitio y de las Edge Functions está en GitHub. La validación de GitHub Pages debe considerarse finalizada cuando el workflow de publicación asociado al último commit de esta revisión termine en estado `success`.
