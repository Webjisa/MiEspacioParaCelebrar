-- MiEspacioParaCelebrar — solicitudes en área privada
-- ▶️ SOLO EJECUTAR en Supabase SQL Editor. No es necesario guardarlo aparte.

create or replace function public.get_owner_bookings()
returns table (
  id uuid,
  space_id uuid,
  space_name text,
  customer_name text,
  customer_email text,
  customer_phone text,
  start_date date,
  end_date date,
  total_days integer,
  cleaning_requested boolean,
  booking_status text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.is_owner() then
    raise exception 'No tienes permisos de propietario';
  end if;

  update public.bookings
  set booking_status='expired'
  where booking_status='pending'
    and expires_at is not null
    and expires_at < now()
    and space_id in (select id from public.spaces where owner_id=private.current_owner_id());

  return query
  select b.id,b.space_id,s.name,b.customer_name,b.customer_email,b.customer_phone,
         b.start_date,b.end_date,b.total_days,b.cleaning_requested,b.booking_status,
         b.expires_at,b.created_at
  from public.bookings b
  join public.spaces s on s.id=b.space_id
  where s.owner_id=private.current_owner_id()
  order by b.created_at desc;
end;
$$;

revoke all on function public.get_owner_bookings() from public, anon;
grant execute on function public.get_owner_bookings() to authenticated;
