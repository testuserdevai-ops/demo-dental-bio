create or replace function public.notify_user_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  webhook_url text;
  webhook_secret text;
begin
  if new.subscription_status is distinct from 'PREMIUM PRO'
    and new.use_dental_brand is distinct from true then
    new.use_dental_brand := true;
  end if;

  if new.subscription_status is not distinct from old.subscription_status
    and new.billing_cycle is not distinct from old.billing_cycle then
    return new;
  end if;

  begin
    select decrypted_secret into webhook_url
    from vault.decrypted_secrets
    where name = 'user_changed_webhook_url';

    select decrypted_secret into webhook_secret
    from vault.decrypted_secrets
    where name = 'user_changed_webhook_secret';
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
      'record', jsonb_build_object(
        'id', new.id,
        'email', new.email,
        'registered_domain', new.registered_domain,
        'subscription_status', coalesce(new.subscription_status, 'FREE'),
        'billing_cycle', new.billing_cycle,
        'use_dental_brand', new.use_dental_brand
      ),
      'old_record', jsonb_build_object(
        'subscription_status', coalesce(old.subscription_status, 'FREE'),
        'billing_cycle', old.billing_cycle
      )
    )
  );

  return new;
end;
$$;

revoke all on function public.notify_user_changed()
from public, anon, authenticated, service_role;
