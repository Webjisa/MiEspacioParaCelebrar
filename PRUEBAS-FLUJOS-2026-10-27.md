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
| Editor de reservas del propietario | CORREGIDO EN FRONTEND | Los servicios de cada grupo se muestran como radios excluyentes; se indica el precio por día y se impide guardar sin elegir una opción de los grupos obligatorios. La validación final de fechas, dependencias e importes se realiza además en el servidor. |
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


## Revisión ampliada de seguridad y pruebas transaccionales — 27-10-2026

### Cambios aplicados

- Migración `20261027154213_harden_public_price_rpc_and_function_paths`: fija `search_path` de `set_updated_at` y `normalize_locality` a `pg_catalog`; elimina lectura directa de `public.local_holidays` para `anon` y `authenticated` (la web mantiene la consulta pública por RPC); endurece `get_space_price_for_date` con `search_path` vacío y validación de que el espacio esté publicado, activo y dentro de su periodo.
- Migración `20261027154334_restrict_legacy_public_rpc_execute`: retira `EXECUTE` a `PUBLIC`, `anon` y `authenticated` para cuatro RPC heredadas no llamadas por el frontend actual: `check_space_availability`, `get_booking_pricing`, `get_public_space_special_dates` y `get_space_price_for_date`. `get_booking_quote` conserva el cálculo por función propietaria y se verificó desde el rol público.
- El SDK de Supabase se ha fijado a la versión estable `2.118.0` en las diez páginas HTML que lo cargan. Referencia oficial: https://github.com/supabase/supabase-js/releases
- No se han concedido permisos de creación de objetos en el esquema `public` a `anon` ni a `authenticated`. La tabla `owner_booking_action_tokens` permanece inaccesible para esos roles; el flujo de decisión usa la función de servidor protegida.
- Se mantiene `pg_net` sin mover de esquema, porque el cron activo de correo depende de `net.http_post`. Mover la extensión sin una migración específica podría interrumpir el envío.

### Pruebas de base de datos superadas

- Lectura pública bajo el rol `anon`: `La Nube` devuelve siete fotografías registradas y `Bajo casa` devuelve cero, sin reutilizar imágenes de otro espacio.
- Consulta pública de festivos: el RPC devuelve 16 fechas para La Nube en 2026, sin conceder acceso directo a `local_holidays`.
- Presupuesto real de La Nube para el 28-10-2026, sin servicios ni limpieza: alquiler 120 €, fianza 50 €, total 170 €. Seleccionando el servicio opcional de monitor de 20 €, el total pasa a 190 €. Marcando limpieza, el cálculo actual añade 60 € y devuelve 230 € (sin el servicio opcional). Las cantidades se han obtenido de `get_booking_quote`; no se ha creado una reserva con estos cálculos.
- Presupuesto de dos días (28–29-10-2026), sin extras: alquiler 240 €, fianza 50 €, total 290 €.
- Validación de fechas pasadas: el presupuesto rechaza la fecha anterior al día actual con el error esperado.
- Prueba transaccional de reserva: se crearon dos solicitudes QA dentro de una transacción, se confirmó una y se rechazó la otra como el propietario autorizado simulado. Las notificaciones esperadas se insertaron temporalmente en la cola. La transacción se revirtió íntegramente; la consulta posterior confirmó cero reservas QA y cero correos QA persistentes. No se enviaron correos reales.
- Pruebas negativas de autorización: el acceso de un usuario no propietario a la configuración de festivos se rechazó, y un usuario no administrador no pudo leer datos de invitación de propietario.
- Auditoría estática de enlaces: las 19 páginas HTML del repositorio no tienen referencias locales rotas en sus atributos `href` y `src`, ni rutas locales absolutas que rompan el prefijo de GitHub Pages. La hoja `styles.css` no contiene referencias a archivos locales inexistentes.
- GitHub Pages: el workflow del commit `39b57cc0` terminó en `success`.

### Pendientes antes del cierre definitivo

- **Configuración de Auth:** el asesor de Supabase sigue indicando que la protección contra contraseñas filtradas está desactivada. Debe activarse en el Dashboard: Authentication → Providers → Email → Password security → activar “Leaked password protection”. Supabase indica que esta función está disponible en los planes Pro y superiores: https://supabase.com/docs/guides/auth/password-security. No se ha cambiado automáticamente porque la conexión disponible no permite editar esta configuración de Auth desde aquí. Para no bloquear accesos existentes, no se ha endurecido a ciegas la longitud/complejidad mínima de todas las contraseñas.
- El asesor sigue mostrando avisos sobre funciones `SECURITY DEFINER` expuestas. Los RPC públicos que necesita la web permanecen accesibles y validados; los RPC de administración/propietario comprueban internamente el rol activo y la propiedad. No se revocaron en bloque porque rompería las funciones de gestión y reserva.
- La advertencia sobre `pg_net` en el esquema `public` se mantiene pendiente de una migración independiente y de verificación del cron.
- **No se certifica todavía la revisión visual de extremo a extremo en un navegador real.** Se han comprobado las referencias estáticas y el comportamiento de los RPC/roles en base de datos, pero no se ha podido ejecutar la web publicada con interacción gráfica, sesión real ni buzón real desde esta sesión. Siguen pendientes la revisión visual de escritorio/móvil y la comprobación con una cuenta de prueba real de activación y restablecimiento de contraseña.
