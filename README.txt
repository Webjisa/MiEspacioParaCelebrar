# Interfaz móvil + contacto de propietarios — 30/09/2026

Paquete de cambios para MiEspacioParaCelebrar.

## Archivos web
Reemplazar en el repositorio los archivos que aparecen en la raíz de este paquete. No sustituir otros archivos del proyecto.

## SQL
Ejecutar manualmente en Supabase SQL Editor:
`supabase/SOLICITUD-INCLUSION-ESPACIO-2026-09-30.sql`

Título para guardar: `SOLICITUD-INCLUSION-ESPACIO-2026-09-30`

## Worker de email
Reemplazar el `index.ts` de la Edge Function `email-worker` por el incluido en:
`supabase/functions/email-worker/index.ts`

Este cambio añade el correo `space_inclusion_request` y permite Reply-To al email del propietario.
