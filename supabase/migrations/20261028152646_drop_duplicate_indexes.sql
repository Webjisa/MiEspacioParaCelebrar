-- Elimina dos índices redundantes conservando los equivalentes que sí tienen uso.
-- email_queue_worker_idx conserva el índice usado por la cola de emails.
-- idx_spaces_owner conserva el índice de uso más frecuente sobre spaces.owner_id.
DROP INDEX IF EXISTS public.email_queue_pending_idx;
DROP INDEX IF EXISTS public.spaces_owner_id_idx;
