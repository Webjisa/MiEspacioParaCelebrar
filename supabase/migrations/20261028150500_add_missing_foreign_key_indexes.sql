-- Mejora de rendimiento: índices para las claves foráneas señaladas por Database Linter.
-- No modifica datos ni permisos; CREATE INDEX IF NOT EXISTS permite repetir la migración sin duplicar índices.

CREATE INDEX IF NOT EXISTS idx_bookings_owner_decision_by
  ON public.bookings (owner_decision_by);

CREATE INDEX IF NOT EXISTS idx_change_log_actor_user_id
  ON public.change_log (actor_user_id);

CREATE INDEX IF NOT EXISTS idx_email_queue_space_id
  ON public.email_queue (space_id);

CREATE INDEX IF NOT EXISTS idx_space_services_depends_on_service_id
  ON public.space_services (depends_on_service_id);

CREATE INDEX IF NOT EXISTS idx_space_services_service_id
  ON public.space_services (service_id);
