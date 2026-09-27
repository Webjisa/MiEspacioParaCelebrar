# MiEspacioParaCelebrar · v23

Versión consolidada para acercar el proyecto a la versión final.

## Qué incluye
- Web pública de espacios activos.
- Fichas individuales con galería, características, precios, condiciones, disponibilidad y mapa.
- Solicitud de reserva sin pago online ni almacenamiento de datos de pago.
- Retención de fechas durante 72 horas y confirmación/rechazo por propietario o administrador.
- Cálculo centralizado de alquiler, limpieza y fianza sin guardar importes de reserva en `bookings`.
- Área privada de propietarios con calendario, historial y acciones sobre solicitudes.
- Panel de administración para espacios, propietarios, fotografías, características, fechas bloqueadas, reservas y contenido.
- Mapas generales e individuales.
- Menú móvil y calendario de disponibilidad adaptado a móvil.
- Textos legales base.
- Display físico NFC + QR reutilizable por espacio.

## Display físico NFC + QR
Cada local puede disponer de un pequeño display de sobremesa impreso en 3D. La etiqueta NFC se coloca oculta detrás de la placa y el QR queda visible. Ambos llevan a la ficha del espacio y a su disponibilidad.

Archivos: `display-nfc/`
- `display_nfc_base.stl`
- `display_nfc_plate.stl`
- `display_nfc.scad`
- `display_nfc.stl`
- `tarjeta-display-la-nube.png`
- `qr-la-nube.png`
- `render-concepto-la-nube.png`

La etiqueta NFC no contiene datos personales; únicamente una URL NDEF. El destino puede evolucionar sin cambiar físicamente la etiqueta.

## Supabase
El archivo que hay que revisar/ejecutar para esta versión es:

`supabase/v23-final.sql`

Está preparado para ser idempotente en las partes de esquema y funciones: añade los campos de ubicación/actividad que falten, refuerza las políticas necesarias para administración y deja disponibles las funciones del panel.

**No ejecutes todos los SQL antiguos otra vez a ciegas.** Para la actualización a v23 utiliza el SQL final indicado y conserva los anteriores como histórico.

## Pendiente antes de considerarlo producción definitiva
1. Conectar el proveedor de correo real y desplegar sus Edge Functions.
2. Completar identidad y domicilio del responsable en los textos legales.
3. Ejecutar el SQL final en Supabase.
4. Conectar GitHub y publicar esta versión.
5. Hacer la prueba integral móvil/ordenador: alta de propietario → alta de espacio → fotos → disponibilidad → solicitud → aceptación/rechazo → bloqueo/desbloqueo → display NFC/QR.

## Seguridad
El navegador contiene únicamente la clave pública de Supabase. Las operaciones sensibles se realizan mediante RLS y funciones `security definer`; nunca se debe introducir una `service_role` key en GitHub Pages.

## V26
- Corrección de navegación del calendario de reservas: las flechas de mes ya no cierran el calendario.
- Panel de administración basado en las RPC V23 reales.
- Las coordenadas se pueden localizar mediante dirección, sin almacenar una columna de dirección en `spaces`.
- Estructura del paquete renombrada a `MiEspacioParaCelebrar-v26`.

## V27
Corrección del calendario de reservas: navegación mensual con manejadores directos en las flechas y renovación de cache-busting a `?v=27`.
