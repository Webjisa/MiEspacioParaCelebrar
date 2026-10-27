begin;

-- These RPCs are legacy endpoints no longer called by the current website.
-- The active frontend uses get_booking_quote, get_space_unavailable_ranges,
-- get_public_space_holidays and get_public_space_day_prices instead.
-- get_booking_quote can still call get_space_price_for_date as its owner;
-- browser clients must not invoke the lower-level helper directly.
revoke execute on function public.check_space_availability(uuid, date, date)
  from public, anon, authenticated;

revoke execute on function public.get_booking_pricing(uuid, date, date, boolean)
  from public, anon, authenticated;

revoke execute on function public.get_public_space_special_dates(uuid, integer)
  from public, anon, authenticated;

revoke execute on function public.get_space_price_for_date(uuid, date)
  from public, anon, authenticated;

commit;