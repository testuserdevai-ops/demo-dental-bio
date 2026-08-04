do $$
declare
  duplicate_customer_ids text;
begin
  select string_agg(customer_id, ', ' order by customer_id)
  into duplicate_customer_ids
  from (
    select customer_id
    from public.users
    where customer_id is not null
    group by customer_id
    having count(*) > 1
  ) duplicates;

  if duplicate_customer_ids is not null then
    raise exception 'Cannot enforce unique Stripe customer ownership'
      using
        detail = format('Duplicate users.customer_id values: %s', duplicate_customer_ids),
        hint = 'Manually reconcile billing ownership before rerunning this migration; do not null or choose an owner automatically.';
  end if;
end
$$;

create unique index users_customer_id_unique
on public.users (customer_id)
where customer_id is not null;
