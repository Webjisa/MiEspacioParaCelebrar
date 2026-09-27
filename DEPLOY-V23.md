# Despliegue v23 — MiEspacioParaCelebrar

## 1. Supabase

**🗂️ GUARDAR — `supabase/v23-final.sql`**

**▶️ SOLO EJECUTAR — una sola vez en Supabase SQL Editor.**

No ejecutes de nuevo todos los SQL históricos. El resto de archivos SQL se conserva como documentación/histórico. Para pasar de la base actual a v23, ejecuta únicamente `supabase/v23-final.sql`.

El SQL:
- asegura `address`, `latitude`, `longitude`, `active_from` y `active_until` en `spaces`;
- actualiza la visibilidad pública de espacios activos/no caducados;
- refuerza RLS para características e imágenes;
- asegura el bucket público de fotografías y sus permisos de administración;
- habilita gestión de propietarios, espacios, características, fotografías, fechas bloqueadas y reservas desde el panel;
- actualiza la ubicación de La Nube a 37.417400, -4.485511;
- añade eliminación controlada de fotografías.

## 2. Proveedor de correo

Sigue pendiente conectar el proveedor real de correo y desplegar las Edge Functions del flujo de avisos. No se han inventado credenciales ni se han incluido secretos en el repositorio.

## 3. GitHub Pages

Subir el contenido de esta carpeta a la raíz del repositorio `webjisa/MiEspacioParaCelebrar` y publicar GitHub Pages desde la rama/configuración elegida. `.nojekyll` ya está incluido.

**Nunca subir una `service_role` key.**

## 4. Prueba final

1. Login administrador.
2. Crear propietario.
3. Crear espacio y vincular propietario.
4. Subir, quitar y volver a ordenar fotografías.
5. Editar características, precios, limpieza, ubicación y vigencia.
6. Bloquear/desbloquear fechas.
7. Crear solicitud de reserva.
8. Aceptar/rechazar desde propietario y administrador.
9. Comprobar calendario móvil y escritorio.
10. Probar `tocar.html?space=340c371d-e09b-4a59-bfaa-343d7509a35c` y el QR de La Nube.
11. Probar display NFC físico con una etiqueta NDEF real.
