MiEspacioParaCelebrar · v18


> Versión de entrega: v16
# MiEspacioParaCelebrar

Web pública y base para la gestión privada de espacios para celebraciones.

## Modelo actual
- La portada explica únicamente la finalidad del servicio; los espacios se muestran en `espacios.html`.
- El cliente final solo ve espacios activos y dentro de su periodo de publicación.
- Cada espacio puede tener precios distintos para lunes-jueves, viernes, sábado y domingo.
- La fianza es opcional y configurable por espacio; si no está configurada, no se muestra.
- La solicitud de reserva retiene las fechas durante 72 horas y no implica confirmación automática.
- No existe descuento por cliente recurrente.
- No existe pago online ni depósito inicial del 50 %.
- El propietario acuerda directamente con el cliente las condiciones y el pago.
- El propietario tiene un área privada donde ve locales activos con su fecha de caducidad e inactivos en gris con su fecha de caducidad.
- Solo el administrador puede ampliar el periodo activo.
- El pie muestra `Admin: miespacioparacelebrar@gmail.com`.
- La ubicación pública usa mapa general de espacios activos y mapa individual del espacio.

## Supabase
`supabase/active-period-and-location.sql` añade ubicación y periodo de actividad.
`supabase/owner-area-and-prices.sql` añade fianza configurable y permisos de lectura para el área privada.

El frontend necesita la clave pública de Supabase en `supabase-config.js` para autenticación, solicitudes y área privada.


## V4
- Los espacios solo son públicos entre `active_from` y `active_until`, además de `active = true`.
- La web no muestra un precio "Desde"; muestra que el precio se calcula según el día.
- La fianza solo se muestra si existe un valor configurado.
- La portada no lista espacios ni muestra mapas de espacios.

## Ubicación de La Nube

La ubicación facilitada para **La Nube** es `37.417400, -4.485511`.
La SQL `supabase/set-la-nube-location.sql` actualiza esas coordenadas en Supabase.

## v14 — precios de la solicitud
- El área del propietario muestra alquiler, limpieza, fianza y total.
- El cálculo se centraliza en `public.get_booking_pricing` y no guarda importes económicos en `bookings`.
- La fianza se suma una sola vez.
- El alquiler se calcula día por día según lunes-jueves, viernes, sábado y domingo.
- El mismo cálculo queda preparado para reutilizarlo en las notificaciones por email.
