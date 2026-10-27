# MiEspacioParaCelebrar — versión definitiva 2026

## Orden exacto de puesta en marcha

### 1. Sustituir el contenido del repositorio

1. Descomprime este ZIP.
2. En el repositorio de GitHub elimina los archivos de la versión anterior.
3. Sube el contenido de esta carpeta, manteniendo `index.html` en la raíz.
4. No cambies los nombres de la carpeta `assets/` ni `display-nfc/`.
5. Comprueba que GitHub Pages sigue publicado desde la rama/carpeta configurada actualmente.

La versión pública sigue siendo una web estática; la lógica privada y las operaciones sensibles se ejecutan en Supabase.

### 2. Supabase: ejecutar la SQL definitiva

**🗂️ GUARDAR — FINAL-2026.sql**

En Supabase → SQL Editor:

1. Crea una consulta nueva.
2. Pon como título exacto: `FINAL-2026`.
3. Abre `supabase/FINAL-2026.sql` de este proyecto.
4. Copia todo el contenido.
5. Ejecuta la consulta completa una sola vez.
6. Si Supabase muestra un error, detente en ese punto y corrige el error antes de continuar. No ejecutes las SQL históricas una detrás de otra.

La SQL añade los estados definitivos de los espacios, servicios, snapshots de reservas, cola e historial de emails, encuestas, retención, funciones de propietario/administrador y tareas automáticas cuando `pg_cron` está disponible.

### 3. Comprobar los estados de La Nube

En SQL Editor, consulta `spaces` y comprueba que La Nube tenga:

- `admin_enabled = true`
- `owner_active = true`
- `active = true`
- `active_from = 2026-09-25`
- `active_until = 2027-12-31`
- latitud `37.417400`
- longitud `-4.485511`

No cambies las coordenadas si no es necesario.

### 4. Configurar los servicios

En Administración → Servicios:

1. Crea los servicios del catálogo.
2. Asigna a cada espacio los servicios que ofrece.
3. Marca como `Incluido` los que forman parte del espacio sin coste adicional.
4. En los servicios de pago introduce un precio único por reserva.
5. Para retirar temporalmente un servicio usa `Desactivar`, no lo borres del catálogo.

La reserva guarda el nombre y precio del servicio en un snapshot. Un cambio posterior no altera una solicitud ya creada.

### 5. Configurar el correo transaccional — estado verificado el 27-10-2026

En el proyecto Supabase activo se comprobó que:

- El cron `email-worker-every-minute` llama a la Edge Function `email-worker` cada minuto.
- La función activa envía mediante la API de Brevo.
- La caducidad de una solicitud y las dos notificaciones asociadas funcionaron en una prueba real.

**Importante: el código desplegado y el código versionado no están sincronizados.** En este repositorio no existe `supabase/functions/email-worker/index.ts`; sí existe `supabase/functions/process-email-queue/index.ts`, que implementa la integración antigua con Resend. No despliegues esta función antigua para sustituir el trabajador de producción.

Para recuperar despliegues reproducibles, copia primero el código de la función activa desde Supabase a `supabase/functions/email-worker/index.ts`, revisa que sus variables de entorno coincidan con las que utiliza el código y vuelve a probarla. Nunca copies claves API, tokens o secretos al repositorio.

### 6. Publicación de Edge Functions

Funciones que aparecen en el repositorio:

- `create-owner`
- `process-email-queue` — implementación heredada de Resend; **no desplegar sobre el sistema activo** hasta sincronizarla.
- `expire-bookings`
- `send-survey`

Antes de desplegar cualquier función, confirma que el código versionado coincide con el que se está utilizando en producción. La función `email-worker` que está activa actualmente debe incorporarse primero al repositorio. No hace falta modificar los cron que ya están funcionando para realizar esa sincronización.

### 7. Procesador de emails

La configuración verificada de producción utiliza el cron de Supabase `email-worker-every-minute`, activo cada minuto, que llama a `/functions/v1/email-worker`. La función envía la cola mediante Brevo.

El archivo `.github/workflows/email-worker.yml` queda disponible solo mediante ejecución manual como alternativa de diagnóstico. El procesamiento automático de producción lo realiza el cron de Supabase cada minuto; no hay una segunda ejecución programada desde GitHub.

La aplicación introduce las comunicaciones en `email_queue`; no hace falta crear un correo manual para cada reserva.

### 8. Expiración y limpieza

La SQL crea:

- expiración automática de solicitudes pendientes al superar 72 horas;
- eliminación de reservas confirmadas 30 días después del final del evento;
- eliminación de rechazadas/caducadas/canceladas sin evento a los 7 días;
- eliminación en cascada de la encuesta asociada.

Si `pg_cron` no está disponible, programa las Edge Functions `expire-bookings` y `send-survey` con el mecanismo de tareas disponible en tu proyecto.

### 8.1. Completar las tareas automáticas que faltan

La revisión de producción del 27-10-2026 encontró activos estos trabajos: `email-worker-every-minute`, `expire-pending-bookings-every-5-minutes` y `miespacio-owner-reminders`. No aparecían programados los trabajos de limpieza de datos, caducidad de espacios y creación/envío de encuestas.

Ejecuta una sola vez este archivo en Supabase → SQL Editor:

`supabase/CIERRE-AUTOMATIZACIONES-2026-10-27.sql`

La migración crea un planificador idempotente para las encuestas y programa los tres trabajos que faltaban. Mantiene intactos los cron que ya funcionan y aborta si `pg_cron` no está instalado. No vuelvas a ejecutar `FINAL-2026.sql` ni las migraciones históricas para activar estas tareas.

Después de ejecutarla, comprueba en una única consulta que aparecen los trabajos `miespacio-cleanup`, `miespacio-expire-spaces` y `miespacio-surveys-daily` con `active = true`. La primera ejecución de los trabajos diarios ocurrirá en su siguiente horario programado.

### 9. Comprobar autenticación

Debe existir:

- un único perfil `admin` para la administración;
- perfiles `owner` para los propietarios;
- clientes sin cuenta.

No actives registro público de usuarios.

El propietario entra desde `acceso.html` con su email y contraseña. La creación de propietarios se hace desde Administración mediante `create-owner`.

### 10. Comprobar espacios

Para cada espacio revisa:

- propietario asignado;
- habilitado por administración;
- activo/inactivo por propietario;
- fecha de inicio y fin de vigencia;
- ubicación;
- fotos;
- características;
- precios;
- horario;
- limpieza;
- fianza;
- condiciones;
- servicios.

La publicación pública exige las tres condiciones operativas: `active`, `admin_enabled` y `owner_active`, además de estar dentro de la vigencia.

### 11. Comprobar reservas

Prueba, por este orden:

1. Una fecha libre.
2. Un rango de varios días.
3. Un día pendiente.
4. Un día confirmado.
5. Un bloqueo del propietario.
6. Un rango que contenga un día no disponible.
7. Una solicitud pendiente durante 72 horas.
8. Aceptación.
9. Rechazo.
10. Caducidad.
11. Modificación de una confirmada.
12. Cancelación de una confirmada.
13. Error de entrega de correo.
14. Reenvío de la misma comunicación.

Nunca pruebes el flujo real usando datos personales de clientes reales.

### 12. Comprobar correos

Revisa en Administración → Emails las categorías:

- Todos
- Espacios
- Reservas
- Encuestas

Los emails al cliente no deben contener importes, servicios, depósitos ni métodos de pago.

Los emails internos de propietario/administración sí pueden contener la información necesaria para gestionar la solicitud.

### 13. Comprobar encuesta

1. Confirma una reserva.
2. Simula que el evento terminó el día anterior o utiliza una reserva de prueba.
3. Ejecuta `send-survey`.
4. Comprueba que se crea un enlace único.
5. Responde la encuesta.
6. Comprueba la sección Administración → Encuestas.
7. Comprueba que el segundo intento con el mismo enlace es rechazado.

### 14. Comprobar estados de espacio

Prueba específicamente esta secuencia:

- Espacio activo → administración lo deshabilita → queda inactivo.
- Administración vuelve a habilitarlo → sigue inactivo.
- Propietario lo activa → vuelve a estar disponible, si está dentro de vigencia.
- Espacio inactivo → administración lo deshabilita → al habilitarlo sigue inactivo.
- Espacio caducado → no aparece públicamente.
- Administración amplía la vigencia → conserva el estado activo/inactivo existente.

### 15. Comprobar móvil

Revisa al menos:

- portada;
- menú hamburguesa;
- listado de espacios;
- ficha de espacio;
- calendario;
- formulario de reserva;
- pantalla de revisión;
- área privada;
- administración;
- tablas y modales;
- mapas.

### 16. Publicación final

Después de superar las pruebas:

1. Comprueba GitHub Pages.
2. Abre la web en ventana privada.
3. Comprueba que no se necesita iniciar sesión para consultar espacios.
4. Comprueba que el área privada sí exige autenticación.
5. Haz una última reserva de prueba y elimínala conforme al procedimiento de pruebas.

## Archivos importantes

- `supabase/FINAL-2026.sql` → SQL definitiva.
- `supabase/functions/process-email-queue/index.ts` → implementación heredada de Resend; no equivale al trabajador activo `email-worker` de Brevo.
- `supabase/functions/create-owner/index.ts` → alta segura de propietarios.
- `supabase/functions/expire-bookings/index.ts` → expiración.
- `supabase/functions/send-survey/index.ts` → encuestas.
- `encuesta.html` → formulario de encuesta.
- `disponibilidad.html` + `disponibilidad.js` → búsqueda general por fecha.
- `display-nfc/` → recursos del soporte físico NFC/QR.

## Seguridad

Nunca subas al repositorio:

- `SUPABASE_SERVICE_ROLE_KEY`
- Claves API del proveedor de correo activo (no deben almacenarse en GitHub).
- contraseñas de propietarios
- tokens de encuesta
- datos reales de clientes

La clave pública de Supabase que aparece en `supabase-config.js` puede estar en una web estática; la protección real debe descansar en RLS, funciones `security definer` y la separación de secretos.

## Nota legal

Los textos de privacidad y uso ya reflejan el funcionamiento definido del proyecto, pero la identidad y domicilio del responsable deben completarse antes de la publicación definitiva y conviene revisar el conjunto de textos con asesoramiento jurídico.

### 17. Alta de propietarios mediante invitación

El alta de propietarios ya no utiliza una contraseña inicial creada por administración.

Flujo definitivo:

1. Administración → Propietarios → Añadir propietario.
2. Se introducen únicamente los datos necesarios: nombre, apellidos, email, teléfono, dirección, localidad y código postal.
3. La función `create-owner` crea la cuenta y envía una invitación.
4. El propietario abre el enlace recibido.
5. `activar-cuenta.html` permite establecer su propia contraseña.
6. Después accede a `area-privada.html`.

En Supabase → Authentication → URL Configuration debe estar permitida esta URL de redirección:

`https://webjisa.github.io/MiEspacioParaCelebrar/activar-cuenta.html`

Para recuperación de contraseña debe estar permitida también:

`https://webjisa.github.io/MiEspacioParaCelebrar/restablecer-contrasena.html`

La Edge Function `create-owner` incluida en este proyecto debe desplegarse en Supabase antes de utilizar el alta de propietarios.

## Actualización: precios diarios y paquetes por espacio

Para esta versión, además de la migración FINAL-2026 ya aplicada, ejecutar una sola vez:

**🗂️ GUARDAR — MIGRACION-PRECIOS-DIARIOS-Y-PAQUETES**

Archivo: `supabase/MIGRACION-PRECIOS-DIARIOS-Y-PAQUETES.sql`

Esta migración:
- crea precios independientes para lunes, martes, miércoles, jueves, viernes, sábado y domingo;
- conserva los campos antiguos de compatibilidad, pero las reservas nuevas utilizan la tabla de precios diarios;
- permite paquetes/opciones propios de cada espacio;
- permite grupos de selección, opciones obligatorias, precios por reserva o por día y paquetes que sustituyen el precio diario;
- añade los cuatro espacios Castravinaria asignados inicialmente a Manu Soniluc;
- añade sus fotografías, características, fianzas, horarios y paquetes/precios indicados en los carteles.

No volver a ejecutar `FINAL-2026.sql` después de esta migración.

## Actualización 2026-09-28 — precios diarios y paquetes

- La versión actual usa 7 precios independientes, uno por cada día de la semana.
- La reserva suma el precio de cada fecha seleccionada.
- Los paquetes y servicios propios del espacio se pueden seleccionar durante la reserva.
- `supabase/CORRECCION-PAQUETES-Y-RESERVA-2026-09-28.sql` corrige la validación de dependencias y amplía el snapshot con descripción y total de cada opción.
- Ejecutar esa corrección una vez si la migración de precios/paquetes ya fue ejecutada. No ejecutar `FINAL-2026.sql` después.
