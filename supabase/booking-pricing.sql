-- MiEspacioParaCelebrar — cálculo económico de reservas
-- 🗂️ GUARDAR — Booking pricing v1
-- ▶️ SOLO EJECUTAR en Supabase SQL Editor.
-- Esta función NO guarda importes en bookings. Los calcula a partir
-- de los precios configurados en spaces y de las fechas solicitadas.

create or replace function public.get_booking_pricing(
  p_space_id uuid,
  p_start_date date,
  p_end_date date,
  p_cleaning_requested boolean default false
)
returns table (
  rental_total numeric,
  cleaning_total numeric,
  deposit numeric,
  grand_total numeric
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_rental numeric := 0;
  v_cleaning numeric := 0;
  v_deposit numeric := 0;
  v_weekday numeric;
  v_friday numeric;
  v_saturday numeric;
  v_sunday numeric;
  v_cleaning_available boolean;
  v_cleaning_price numeric;
  v_start date;
  v_end date;
  v_day date;
begin
  if p_space_id is null or p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'Rango de fechas no válido';
  end if;

  select
    coalesce(s.weekday_price, 0),
    coalesce(s.friday_price, 0),
    coalesce(s.saturday_price, 0),
    coalesce(s.sunday_price, 0),
    coalesce(s.deposit, 0),
    coalesce(s.cleaning_available, false),
    coalesce(s.cleaning_price, 0)
  into
    v_weekday,
    v_friday,
    v_saturday,
    v_sunday,
    v_deposit,
    v_cleaning_available,
    v_cleaning_price
  from public.spaces s
  where s.id = p_space_id;

  if not found then
    raise exception 'El espacio no existe';
  end if;

  if p_cleaning_requested and not v_cleaning_available then
    raise exception 'El servicio de limpieza no está disponible';
  end if;

  v_start := p_start_date;
  v_end := p_end_date;

  for v_day in
    select generate_series(v_start, v_end, interval '1 day')::date
  loop
    case extract(isodow from v_day)::integer
      when 5 then v_rental := v_rental + v_friday;
      when 6 then v_rental := v_rental + v_saturday;
      when 7 then v_rental := v_rental + v_sunday;
      else v_rental := v_rental + v_weekday;
    end case;
  end loop;

  if coalesce(p_cleaning_requested, false) then
    v_cleaning := v_cleaning_price;
  end if;

  return query
  select
    round(v_rental, 2),
    round(v_cleaning, 2),
    round(v_deposit, 2),
    round(v_rental + v_cleaning + v_deposit, 2);
end;
$$;

revoke all on function public.get_booking_pricing(uuid,date,date,boolean)
from public, anon, authenticated;

grant execute on function public.get_booking_pricing(uuid,date,date,boolean)
to anon, authenticated;
