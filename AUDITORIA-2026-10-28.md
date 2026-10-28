# Auditoría interna — MiEspacioParaCelebrar
**Fecha:** 28 de octubre de 2026  
**Alcance:** código fuente, enlaces internos, recursos estáticos, reglas de acceso, Edge Functions, tareas automáticas e indicadores de Supabase.

## Corregido
- Corregidos enlaces de activación/reenvío de invitación y enlaces de correo para usar el dominio de producción Cloudflare Worker, no el antiguo GitHub Pages.
- Publicadas en Supabase: `email-worker` v20, `create-owner` v13 y `resend-owner-invitation` v12. `booking-action` continúa activa en v3.
- Actualizadas las referencias de caché del CSS y del menú móvil en las páginas principales, área privada, administración, activación, restablecimiento, encuesta y páginas legales.
- Revisadas las referencias locales de archivos y enlaces en las páginas clave: no se encontraron rutas locales inexistentes en la muestra revisada.
- Añadidos índices para cinco claves foráneas señaladas por el analizador de rendimiento.
- Eliminados dos índices duplicados manteniendo los equivalentes con mayor uso.
- Actualizadas las instrucciones operativas para reflejar Cloudflare como destino público.

## Comprobado
- Proyecto Supabase en estado `ACTIVE_HEALTHY`.
- RLS habilitado en todas las tablas del esquema público inspeccionadas. Las tablas internas sin políticas (`local_holidays` y `owner_booking_action_tokens`) siguen sin acceso directo definido por políticas.
- Seis tareas automáticas de Supabase aparecen activas.
- Cola de correo revisada: 31 registros en estado `sent`, sin registros `pending` ni `failed` en la consulta realizada.
- Dos espacios en base de datos: La Nube tiene siete imágenes; Bajo casa no tiene aún imágenes asignadas.
- La clave del navegador es publishable; no se encontró una clave service-role pegada en los archivos de código inspeccionados.
- Los RPC privilegiados muestreados incluyen comprobaciones de rol y/o pertenencia. No se revocaron permisos de forma masiva porque varias funciones son necesarias para reservas públicas y el área privada.

## Pendiente de verificación
- **Publicación frontend en Cloudflare:** el código está en GitHub, pero no se pudo verificar desde esta sesión el despliegue del Worker ni hacer pruebas visuales reales en navegador.
- **Pruebas extremo a extremo:** todavía deben probarse con cuenta/datos de prueba la activación de propietario, recuperación de contraseña y el ciclo completo de solicitud, confirmación/rechazo y correos. No se crearon reservas ni se enviaron correos de prueba a clientes durante esta auditoría.
- **Seguridad de contraseñas filtradas:** el asesor de Supabase indica que la protección de contraseñas comprometidas está desactivada; debe activarse en la configuración de Auth.
- **Avisos no modificados a ciegas:** Supabase señala `pg_net` instalado en `public`, políticas RLS permisivas solapadas y RPC `SECURITY DEFINER` accesibles según rol. Antes de ajustar estos elementos hay que validar las dependencias de cron y los permisos funcionales.
- **Imágenes:** cargar fotografías reales para Bajo casa antes de ofrecer su ficha con galería.

## Conclusión
Se corrigieron enlaces transaccionales, sincronización de recursos y avisos de índices redundantes, y se verificaron procesos automáticos y controles de acceso clave. La auditoría no se considera certificación de producción completa hasta verificar el despliegue del frontend y ejecutar pruebas funcionales reales con datos de prueba.
