-- MiEspacioParaCelebrar — completar automatizaciones de producción
-- Fecha de preparación: 2026-10-27
-- Ejecutar UNA VEZ en Supabase SQL Editor. No volver a ejecutar FINAL-2026.sql.
-- Conserva los trabajos que ya funcionan: email-worker-every-minute,
-- expire-pending-bookings-every-5-minutes y miespacio-owner-reminders.

BEGIN;

-- 1. Crear el planificador diario de encuestas para reservas finalizadas ayer.
--    La función de creación ya existe y comprueba que la reserva esté confirmada,
--    que finalizara ayer y que no tenga ya una encuesta.
CREATE OR REPLACE FUNCTION public.queue_surveys_for_completed_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
DECLARE
    b record;
    n integer := 0;
BEGIN
    FOR b IN
        SELECT bk.id
        FROM public.bookings AS bk
        WHERE bk.booking_status = 'confirmed'
          AND bk.end_date = current_date - 1
          AND NOT EXISTS (
              SELECT 1
              FROM public.surveys AS s
              WHERE s.booking_id = bk.id
          )
    LOOP
        PERFORM public.create_survey_for_booking(b.id);
        n := n + 1;
    END LOOP;

    RETURN n;
END;
$function$;

REVOKE ALL ON FUNCTION public.queue_surveys_for_completed_bookings()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.queue_surveys_for_completed_bookings()
TO service_role;

-- 2. Programar solo las tareas que faltaban.
--    Primero se retiran trabajos de igual nombre para evitar duplicados.
DO $schedule$
DECLARE
    j record;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        RAISE EXCEPTION 'pg_cron no está instalado; no se han programado las tareas';
    END IF;

    FOR j IN
        SELECT jobid
        FROM cron.job
        WHERE jobname IN (
            'miespacio-cleanup',
            'miespacio-expire-spaces',
            'miespacio-surveys-daily'
        )
    LOOP
        PERFORM cron.unschedule(j.jobid);
    END LOOP;

    PERFORM cron.schedule(
        'miespacio-cleanup',
        '20 3 * * *',
        'SELECT public.cleanup_old_reservation_data();'
    );

    PERFORM cron.schedule(
        'miespacio-expire-spaces',
        '10 2 * * *',
        'SELECT public.expire_space_validity();'
    );

    PERFORM cron.schedule(
        'miespacio-surveys-daily',
        '30 3 * * *',
        'SELECT public.queue_surveys_for_completed_bookings();'
    );
END;
$schedule$;

COMMIT;
