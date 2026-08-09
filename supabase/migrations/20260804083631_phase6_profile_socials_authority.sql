-- Profile/social form authority and the established dentistry-scoped profile
-- picture path. Public reads remain unchanged.
insert into storage.buckets (id, name, public)
values ('profile-pics', 'profile-pics', true)
on conflict (id) do update set public = true;

with ranked as (
  select dentistry_socials_id,
         row_number() over (
           partition by dentistry_id
           order by dentistry_socials_id
         ) as occurrence
  from public.socials
)
delete from public.socials socials
using ranked
where socials.dentistry_socials_id = ranked.dentistry_socials_id
  and ranked.occurrence > 1;

alter table public.socials
  add constraint socials_dentistry_id_unique unique (dentistry_id);

drop policy if exists "Enable insert for authenticated users only"
  on public.socials;
drop policy if exists "Enable update for users based on email"
  on public.socials;
drop policy if exists "Enable delete for users based on user_id"
  on public.socials;

create policy "Dashboard owners can insert socials"
on public.socials for insert to authenticated
with check (
  exists (
    select 1 from public.dentistries
    where dentistries.dentistry_id = socials.dentistry_id
      and (
        dentistries.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
);

create policy "Dashboard owners can update socials"
on public.socials for update to authenticated
using (
  exists (
    select 1 from public.dentistries
    where dentistries.dentistry_id = socials.dentistry_id
      and (
        dentistries.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
)
with check (
  exists (
    select 1 from public.dentistries
    where dentistries.dentistry_id = socials.dentistry_id
      and (
        dentistries.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
);

create policy "Dashboard owners can delete socials"
on public.socials for delete to authenticated
using (
  exists (
    select 1 from public.dentistries
    where dentistries.dentistry_id = socials.dentistry_id
      and (
        dentistries.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
);

revoke insert, update, delete on table public.socials
  from anon, authenticated;

create or replace function public.save_dashboard_profile(
  p_user_id uuid,
  p_dentistry_id uuid,
  p_title text,
  p_position text,
  p_gdc_no text,
  p_qualification text,
  p_about_title text,
  p_about_text text,
  p_phone text,
  p_contact_email text,
  p_website text,
  p_booking_link text,
  p_booking_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then
    raise exception 'Profile target is not authorized' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.dentistries
    where dentistry_id = p_dentistry_id and user_id = p_user_id
  ) then
    raise exception 'Dentistry not found' using errcode = 'P0002';
  end if;
  if length(btrim(coalesce(p_title, ''))) > 100
    or length(btrim(coalesce(p_position, ''))) > 100
    or length(btrim(coalesce(p_gdc_no, ''))) > 20
    or length(btrim(coalesce(p_qualification, ''))) > 100
    or nullif(btrim(p_about_title), '') is null
    or length(btrim(p_about_title)) > 100
    or length(btrim(coalesce(p_about_text, ''))) > 500
    or length(btrim(coalesce(p_phone, ''))) > 20
    or length(btrim(coalesce(p_contact_email, ''))) > 254
    or length(btrim(coalesce(p_website, ''))) > 2048
    or length(btrim(coalesce(p_booking_link, ''))) > 2048
    or p_booking_enabled is null
  then raise exception 'Invalid profile input' using errcode = '22023'; end if;

  update public.users set
    title = btrim(coalesce(p_title, '')),
    position = btrim(coalesce(p_position, '')),
    gdc_no = btrim(coalesce(p_gdc_no, '')),
    qualification = btrim(coalesce(p_qualification, ''))
  where id = p_user_id;
  if not found then raise exception 'User not found' using errcode = 'P0002'; end if;

  update public.dentistries set
    about_title = btrim(p_about_title),
    about_text = btrim(coalesce(p_about_text, '')),
    phone = btrim(coalesce(p_phone, '')),
    contact_email = btrim(coalesce(p_contact_email, '')),
    website = btrim(coalesce(p_website, '')),
    booking_link = btrim(coalesce(p_booking_link, '')),
    booking_link_enabled = p_booking_enabled
  where dentistry_id = p_dentistry_id and user_id = p_user_id;
  if not found then raise exception 'Dentistry not found' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.save_dashboard_socials(
  p_dentistry_id uuid,
  p_linkedin text,
  p_twitter text,
  p_instagram text,
  p_facebook text,
  p_tiktok text,
  p_other text
)
returns setof public.socials
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_socials public.socials%rowtype;
begin
  select user_id into v_owner_id
  from public.dentistries
  where dentistry_id = p_dentistry_id
  for update;
  if not found then raise exception 'Dentistry not found' using errcode = 'P0002'; end if;
  if (select auth.uid()) is null or (
    v_owner_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then
    raise exception 'Social target is not authorized' using errcode = '42501';
  end if;
  if greatest(
    length(coalesce(p_linkedin, '')),
    length(coalesce(p_twitter, '')),
    length(coalesce(p_instagram, '')),
    length(coalesce(p_facebook, '')),
    length(coalesce(p_tiktok, '')),
    length(coalesce(p_other, ''))
  ) > 2048 then raise exception 'Invalid social input' using errcode = '22023'; end if;

  insert into public.socials (
    dentistry_id, linkedin_link, twitter_link, instagram_link, facebook_link,
    tiktok_link, other_link
  ) values (
    p_dentistry_id, coalesce(p_linkedin, ''), coalesce(p_twitter, ''), coalesce(p_instagram, ''),
    coalesce(p_facebook, ''), coalesce(p_tiktok, ''), coalesce(p_other, '')
  )
  on conflict (dentistry_id) do update set
    linkedin_link = excluded.linkedin_link,
    twitter_link = excluded.twitter_link,
    instagram_link = excluded.instagram_link,
    facebook_link = excluded.facebook_link,
    tiktok_link = excluded.tiktok_link,
    other_link = excluded.other_link
  returning * into v_socials;
  return next v_socials;
end;
$$;

revoke all on function public.save_dashboard_profile(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text, boolean
) from public, anon;
grant execute on function public.save_dashboard_profile(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text, boolean
) to authenticated;
revoke all on function public.save_dashboard_socials(
  uuid, text, text, text, text, text, text
) from public, anon;
grant execute on function public.save_dashboard_socials(
  uuid, text, text, text, text, text, text
) to authenticated;

drop policy if exists "Authenticated users can upload files"
  on storage.objects;
drop policy if exists "rls jh40r1_1" on storage.objects;
drop policy if exists "rls jh40r1_2" on storage.objects;
drop policy if exists "rls jh40r1_3" on storage.objects;

create policy "Owners can insert profile pictures"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-pics'
  and exists (
    select 1 from public.dentistries
    where dentistries.dentistry_id::text = (storage.foldername(name))[1]
      and (
        dentistries.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
);

create policy "Owners can update profile pictures"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-pics'
  and exists (
    select 1 from public.dentistries
    where dentistries.dentistry_id::text = (storage.foldername(name))[1]
      and (
        dentistries.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
)
with check (
  bucket_id = 'profile-pics'
  and exists (
    select 1 from public.dentistries
    where dentistries.dentistry_id::text = (storage.foldername(name))[1]
      and (
        dentistries.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
);

create policy "Owners can delete profile pictures"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-pics'
  and exists (
    select 1 from public.dentistries
    where dentistries.dentistry_id::text = (storage.foldername(name))[1]
      and (
        dentistries.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
);
