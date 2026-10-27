begin;

-- Tighten search_path on non-sensitive helper functions to avoid object
-- shadowing without changing their behavior.
alter function public.set_updated_at()
  set search_path = pg_catalog;

alter function public.normalize_locality(text)
  set search_path = pg_catalog;

-- The public holiday RPCs run as the function owner and remain the supported
-- way for the website to read holiday data. Direct table access is unnecessary.
revoke select on table public.local_holidays from anon, authenticated;

-- A SECURITY DEFINER function that returns a price must not disclose pricing
-- for unpublished, disabled or out-of-period spaces. Keep the current public
-- use case for spaces that are genuinely published.
create or replace function public.get_space_price_for_date(
  p_space_id uuid,
  p_date date
)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_holiday_price numeric;
  v_holiday_eve_price numeric;
  v_day_price numeric;
  v_municipality text;
  v_province text;
  v_next_date date;
begin
  if p_space_id is null or p_date is null then
    raise exception 'Espacio y fecha son obligatorios';
  end if;

  select
    coalesce(s.holiday_price, 0),
    coalesce(s.holiday_eve_price, 0),
    s.city,
    s.province
  into
    v_holiday_price,
    v_holiday_eve_price,
    v_municipality,
    v_province
  from public.spaces s
  where s.id = p_space_id;

  if not found then
    raise exception 'El espacio no existe';
  end if;

  if not public.final_space_is_public(p_space_id) then
    raise exception 'Espacio no disponible';
  end if;

  -- A holiday price takes precedence over all other day prices.
  if exists (
    select 1
    from public.local_holidays h
    where h.holiday_date = p_date
      and h.year = extract(year from p_date)::smallint
      and (
        h.scope in ('NATIONAL', 'AUTONOMIC')
        or (
          h.scope = 'LOCAL'
          and public.normalize_locality(h.municipality)
              = public.normalize_locality(v_municipality)
          and public.normalize_locality(h.province)
              = public.normalize_locality(v_province)
        )
      )
  ) then
    return v_holiday_price;
  end if;

  -- If the next day is a holiday, apply the specific eve price.
  v_next_date := p_date + 1;

  if exists (
    select 1
    from public.local_holidays h
    where h.holiday_date = v_next_date
      and h.year = extract(year from v_next_date)::smallint
      and (
        h.scope in ('NATIONAL', 'AUTONOMIC')
        or (
          h.scope = 'LOCAL'
          and public.normalize_locality(h.municipality)
              = public.normalize_locality(v_municipality)
          and public.normalize_locality(h.province)
              = public.normalize_locality(v_province)
        )
      )
  ) then
    return v_holiday_eve_price;
  end if;

  select p.price
    into v_day_price
  from public.space_day_prices p
  where p.space_id = p_space_id
    and p.day_of_week = extract(isodow from p_date)::smallint;

  if v_day_price is null then
    raise exception 'No hay un precio configurado para %',
      to_char(p_date, 'DD/MM/YYYY');
  end if;

  return v_day_price;
end;
$function$;

commit;