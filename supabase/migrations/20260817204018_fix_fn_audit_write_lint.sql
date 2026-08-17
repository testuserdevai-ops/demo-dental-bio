-- Keep the established audit writer behavior while giving plpgsql_check an
-- explicitly typed empty array for its local changed-key accumulator.
create or replace function public.fn_audit_write(
  p_user_id uuid,
  p_table_name text,
  p_record_id text,
  p_operation text,
  p_old jsonb,
  p_new jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_keys text[] := array[]::text[];
  v_headers jsonb;
  v_ip text;
  v_ua text;
  v_subject_email text;
  v_subject_username text;
  v_actor_email text;
  v_ignored text[] := array['updated_at', 'click_counter'];
begin
  if p_user_id is null then
    return;
  end if;

  select email, username
  into v_subject_email, v_subject_username
  from public.users
  where id = p_user_id;

  if v_actor is not null and v_actor <> p_user_id then
    select email
    into v_actor_email
    from public.users
    where id = v_actor;
  else
    v_actor_email := v_subject_email;
  end if;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
    v_ip := coalesce(
      v_headers ->> 'x-client-ip',
      v_headers ->> 'cf-connecting-ip',
      nullif(split_part(v_headers ->> 'x-forwarded-for', ',', 1), ''),
      v_headers ->> 'x-real-ip'
    );
    v_ua := coalesce(
      v_headers ->> 'x-client-ua',
      v_headers ->> 'user-agent'
    );
  exception when others then
    v_ip := null;
    v_ua := null;
  end;

  if p_operation = 'UPDATE' then
    select coalesce(array_agg(key), '{}')
    into v_keys
    from jsonb_each(p_new) as e(key, value)
    where p_new -> key is distinct from p_old -> key
      and key <> all (v_ignored);

    if array_length(v_keys, 1) is null then
      return;
    end if;
  end if;

  insert into public.profile_audit_log
    (
      user_id,
      actor_id,
      actor_role,
      subject_email,
      subject_username,
      actor_email,
      table_name,
      record_id,
      operation,
      changed_keys,
      old_values,
      new_values,
      ip_address,
      user_agent
    )
  values
    (
      p_user_id,
      v_actor,
      case
        when v_actor is null then 'system'
        when v_actor = p_user_id then 'self'
        else 'admin'
      end,
      v_subject_email,
      v_subject_username,
      v_actor_email,
      p_table_name,
      p_record_id,
      p_operation,
      coalesce(v_keys, '{}'),
      p_old,
      p_new,
      v_ip,
      v_ua
    );
end;
$$;
