-- Preserve the public RPC's named arguments while accepting the two identifier
-- shapes used by the application: numeric blog IDs and UUID link IDs. A jsonb
-- boundary avoids unsupported PostgREST overloads and keeps casts inside the
-- fixed, whitelisted table branches.
drop function if exists public.increment_click_counter(text, bigint, text);

create function public.increment_click_counter(
  table_name text,
  row_id jsonb,
  id_column text default 'id'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_id_text text;
  target_blog_id bigint;
  target_link_id uuid;
  new_count integer;
begin
  -- id_column remains in the signature for backwards compatibility. It is
  -- deliberately never interpolated into SQL.
  perform id_column;

  if table_name is null or table_name not in ('blogs', 'links') then
    raise exception using
      errcode = '22023',
      message = 'Invalid click-counter table';
  end if;

  row_id_text := row_id #>> '{}';

  if table_name = 'blogs' then
    if row_id is null
      or jsonb_typeof(row_id) <> 'number'
      or row_id_text !~ '^[1-9][0-9]*$'
    then
      raise exception using
        errcode = '22023',
        message = 'Invalid blog identifier';
    end if;

    begin
      target_blog_id := row_id_text::bigint;
    exception
      when numeric_value_out_of_range then
        raise exception using
          errcode = '22023',
          message = 'Invalid blog identifier';
    end;

    update public.blogs as blog
    set click_counter = coalesce(blog.click_counter, 0) + 1
    where blog.id = target_blog_id
      and blog.enabled is true
      and exists (
        select 1
        from public.blog_groups as blog_group
        join public.public_profiles as public_profile
          on public_profile.profile_id = blog_group.user_id
        where blog_group.id = blog.group_id
          and blog_group.enabled is true
      )
    returning blog.click_counter into new_count;
  else
    if row_id is null or jsonb_typeof(row_id) <> 'string' then
      raise exception using
        errcode = '22023',
        message = 'Invalid link identifier';
    end if;

    begin
      target_link_id := row_id_text::uuid;
    exception
      when invalid_text_representation then
        raise exception using
          errcode = '22023',
          message = 'Invalid link identifier';
    end;

    update public.links as profile_link
    set click_counter = coalesce(profile_link.click_counter, 0) + 1
    where profile_link.link_id = target_link_id
      and profile_link.is_active is true
      and exists (
        select 1
        from public.dentistry_links as dentistry_link
        join public.link_groups as link_group
          on link_group.link_group_id = dentistry_link.link_group_id
        join public.dentistries as dentistry
          on dentistry.dentistry_id = link_group.dentistry_id
        join public.public_profiles as public_profile
          on public_profile.profile_id = dentistry.user_id
          and public_profile.dentistry_id = dentistry.dentistry_id
        where dentistry_link.link_id = profile_link.link_id
      )
    returning profile_link.click_counter into new_count;
  end if;

  return new_count;
end;
$$;

revoke execute on function public.increment_click_counter(text, jsonb, text)
  from public, anon, authenticated, service_role;
grant execute on function public.increment_click_counter(text, jsonb, text)
  to anon, authenticated;
