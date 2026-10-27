# Registro de pruebas de flujos — 27-10-2026

## Resultado general

Se ha revisado el recorrido de reserva, se han sincronizado cinco Edge Functions activas con GitHub y se han aplicado varias correcciones SQL en producción. El SQL consolidado se ha actualizado. No se crearon reservas nuevas ni se enviaron correos de prueba a clientes durante esta revisión.

## Comprobaciones superadas

| Área | Resultado | Evidencia |
|---|---|---|
| Sincronización de fuentes | OK | `supabase/functions/email-worker/index.ts` coincide con `email-worker` desplegada (versión 17). |
| Sincronización de fuentes | OK | `supabase/functions/booking-action/index.ts` coincide con `booking-action` desplegada (versión 3). |
| Sincronización de fuentes | OK | `supabase/functions/create-owner/index.ts` coincide con `create-owner` desplegada (versión 12); la diferencia encontrada era solo de comentarios. |
| Sincronización de fuentes | OK | `supabase/functions/resend-owner-invitation/index.ts` guarda el código de la función desplegada (versión 11). |
| Sincronización de fuentes | OK | `supabase/functions/festivos-sync/index.ts` guarda el código del sincronizador desplegado (versión 16). |
| Revisión de secretos | OK estático | Los cinco archivos sincronizados leen credenciales desde el entorno o las aporta el contexto autenticado; no se han encontrado claves privadas pegadas en el código fuente. |
| Integración de correo | OK | `email-worker` exige POST y el encabezado secreto `x-cron-secret`, reclama lotes de `email_queue` y envía a través de Brevo. |
| Integración de decisiones | OK | `decidir-reserva.html` envía `{token, action}` por POST a `booking-action`; el backend valida el token/acción y llama al RPC desde servidor. |
| Protección del RPC de decisiones | CORREGIDO | Se revocó EXECUTE de `consume_owner_booking_action_token` a `PUBLIC`, `anon` y `authenticated`; solo `service_role` puede ejecutarlo. Se verificaron los permisos y que `booking-action` usa la clave de servidor. |
| Formulario de reserva | OK estático | `app.js` llama a `create_booking_request` y consulta rangos no disponibles con `get_space_unavailable_ranges`. |
| Snapshot de servicios | CORREGIDO | La función de presupuesto devuelve también `services_snapshot`; se reconstruyeron cinco snapshots históricos a partir del presupuesto guardado. Un registro antiguo sigue sin snapshot porque el dato de origen no permite reconstruirlo de forma fiable. |
| Fechas pasadas | CORREGIDO | `get_booking_quote` rechaza fechas anteriores al día actual; se comprobó con una llamada de solo lectura, sin crear reservas. |
| Modificación de reservas | CORREGIDO EN PRODUCCIÓN | `owner_update_booking` reutiliza ahora `get_booking_quote` y guarda el presupuesto completo junto con `services_snapshot`. |
| Motor de precios de servicios | CORREGIDO EN PRODUCCIÓN | El backend multiplica servicios `per_day` por los días, respeta `replaces_rental`, valida `allowed_days`, dependencias y grupos obligatorios/únicos. Guarda detalle diario y precio total de cada servicio. |
| Presupuesto en la ficha | CORREGIDO | `app.js` carga `holiday_eve_price` y aplica esa tarifa cuando la fecha siguiente figura como festivo. |
| Fallo al consultar disponibilidad | CORREGIDO ESTÁTICO | Si falla `get_space_unavailable_ranges`, la ficha no permite enviar la solicitud y la búsqueda general no ofrece resultados como si todas las fechas estuvieran libres. |
| Encuestas | CORREGIDO, PARCIALMENTE VALIDADO | Se calificaron con `extensions` las llamadas a `digest` y `gen_random_bytes`, y se añadió bloqueo para evitar dos envíos simultáneos del mismo token. Se validan las puntuaciones entre 1 y 5. Una llamada con token ficticio se rechazó con el error esperado. No hay encuestas ni reservas confirmadas que terminasen ayer; no se envió ningún correo de encuesta. El cron de encuestas está activo, pero todavía no hay ejecución registrada en `cron.job_run_details`. |
| Invitaciones y acceso | OK de código y permisos | `create-owner` (versión 12) y `resend-owner-invitation` (versión 11) coinciden con sus archivos de GitHub; ambas funciones y los RPC auxiliares validan que el actor sea un administrador activo. Activación y restablecimiento de contraseña siguen pendientes de prueba con enlace real. |
| Caducidad de solicitudes | OK en producción | La prueba anterior de caducidad acabó con la solicitud en estado `expired` y los avisos `customer_expired` y `admin_booking_final` enviados. |
| Cola de emails | OK en cola | Los 30 elementos existentes aparecen con estado `sent`; no hay registros en otros estados. Esto refleja el estado de la cola, no garantiza por sí solo que cada proveedor de correo haya entregado el mensaje. |
| Automatizaciones | OK en configuración | Están activos el worker de emails, la caducidad de reservas, los recordatorios y los trabajos diarios de limpieza, caducidad de espacios y encuestas. |
| Recursos estáticos | OK tras corrección | Se actualizaron las referencias de caché en portada, acceso, listado, ficha, disponibilidad, área privada y encuesta para cargar los recursos actuales. |

La prueba de solo lectura para La Nube (28/10/2026) devuelve alquiler **120 €**, servicio fijo **20 €**, fianza **50 €** y total **190 €**. No se creó una reserva para validar ese cálculo.

## Pruebas aún no certificadas como extremo a extremo

Estas pruebas requieren interactuar con la web en un navegador con datos y sesión de prueba. No se marcan como aprobadas solo por haber revisado el código:

1. Crear una nueva solicitud desde el formulario público y comprobar los emails reales de cliente, propietario y administración.
2. Abrir el enlace de propietario de esa solicitud y confirmar; comprobar estado de reserva y notificaciones.
3. Repetir con otra solicitud y rechazarla; comprobar estado y notificaciones.
4. Completar una encuesta real desde el enlace recibido y verificar que el correo llega, la primera respuesta se registra y se rechaza el segundo envío. El proyecto no tiene todavía una reserva que haya terminado ayer para disparar automáticamente una encuesta real.
5. Completar una invitación de propietario, establecer contraseña y probar el restablecimiento de contraseña.
6. Hacer una revisión visual de móvil en portada, búsqueda, ficha, formulario, área privada y administración.

No se han usado reservas ni datos personales de clientes reales para estas comprobaciones. No se deben desplegar `process-email-queue`, `send-survey` ni `expire-bookings` sin una revisión específica: son fuentes heredadas que no figuran como funciones activas del proyecto. Tampoco se debe desplegar `process-email-queue` sobre `email-worker`: la primera es una integración heredada con Resend.

## Publicación

El código del sitio y de las Edge Functions está en GitHub. La validación de GitHub Pages debe considerarse finalizada cuando el workflow de publicación asociado al último commit de esta revisión termine en estado `success`.
