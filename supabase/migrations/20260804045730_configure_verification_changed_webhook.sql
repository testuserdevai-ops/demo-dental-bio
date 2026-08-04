drop trigger if exists "on_isverified_change" on public.users;

create or replace function public.notify_isverified_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  webhook_url text;
  webhook_secret text;
begin
  if not (
    old."isVerified" is distinct from true
    and new."isVerified" is true
  ) then
    return new;
  end if;

  if new.email is null or btrim(new.email) = ''
    or new.username is null or btrim(new.username) = ''
    or new.first_name is null or btrim(new.first_name) = '' then
    return new;
  end if;

  begin
    select decrypted_secret into webhook_url
    from vault.decrypted_secrets
    where name = 'verification_changed_webhook_url';

    select decrypted_secret into webhook_secret
    from vault.decrypted_secrets
    where name = 'verification_changed_webhook_secret';
  exception when others then
    return new;
  end;

  if webhook_url is null or btrim(webhook_url) = ''
    or webhook_secret is null or btrim(webhook_secret) = '' then
    return new;
  end if;

  perform net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || webhook_secret,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'id', new.id,
      'email', new.email,
      'username', new.username,
      'first_name', new.first_name,
      'isVerified', new."isVerified",
      'timestamp', clock_timestamp()
    )
  );

  return new;
end;
$$;

revoke all on function public.notify_isverified_change()
from public, anon, authenticated, service_role;

create trigger "on_isverified_change"
after update of "isVerified"
on public.users
for each row
execute function public.notify_isverified_change();

comment on function public.notify_isverified_change() is
  'Trigger-only producer. Provision verification_changed_webhook_url and verification_changed_webhook_secret as named Supabase Vault secrets.';
