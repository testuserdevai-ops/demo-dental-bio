-- Phase 6 blog/video authority, ordering, and tenant-scoped blog media.
-- Public reads remain unchanged; dashboard writes use the typed functions below.

insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do update set public = true;

alter table private.dashboard_media_cleanup_jobs
  drop constraint if exists dashboard_media_cleanup_jobs_bucket_check;
alter table private.dashboard_media_cleanup_jobs
  add constraint dashboard_media_cleanup_jobs_bucket_check
  check (bucket in ('gallery-images', 'review-images', 'blog-images'));

create or replace function private.enqueue_dashboard_media_cleanup(
  p_user_id uuid, p_bucket text, p_object_path text
)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_bucket not in ('gallery-images', 'review-images', 'blog-images')
    or p_object_path not like p_user_id::text || '/%'
  then raise exception 'Invalid cleanup target' using errcode = '22023'; end if;
  insert into private.dashboard_media_cleanup_jobs (user_id, bucket, object_path)
  values (p_user_id, p_bucket, p_object_path)
  on conflict (bucket, object_path) where completed_at is null do nothing;
end;
$$;

create or replace function public.claim_dashboard_media_cleanup(
  p_user_id uuid, p_bucket text
)
returns table (job_id uuid, bucket text, object_path text)
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Cleanup target is not authorized' using errcode = '42501'; end if;
  if p_bucket not in ('gallery-images', 'review-images', 'blog-images')
  then raise exception 'Cleanup bucket is invalid' using errcode = '22023'; end if;
  return query
  with claimed as (
    select jobs.id from private.dashboard_media_cleanup_jobs jobs
    where jobs.user_id = p_user_id and jobs.bucket = p_bucket
      and jobs.completed_at is null
    order by jobs.created_at
    limit 50 for update skip locked
  )
  update private.dashboard_media_cleanup_jobs jobs
  set attempts = attempts + 1
  from claimed where jobs.id = claimed.id
  returning jobs.id, jobs.bucket, jobs.object_path;
end;
$$;

create or replace function private.assert_dashboard_content_owner(p_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Content target is not authorized' using errcode = '42501'; end if;
  perform private.assert_dashboard_media_plan(p_user_id);
end;
$$;

create or replace function private.dashboard_unique_blog_slug(
  p_slug text, p_exclude_id bigint default null
)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_base text := lower(regexp_replace(btrim(coalesce(p_slug, '')), '[^a-zA-Z0-9]+', '-', 'g'));
  v_candidate text;
  v_suffix integer := 2;
begin
  v_base := trim(both '-' from v_base);
  if v_base = '' then v_base := 'post'; end if;
  v_base := left(v_base, 96);
  v_candidate := v_base;
  while exists (
    select 1 from public.blogs
    where slug = v_candidate and (p_exclude_id is null or id <> p_exclude_id)
  ) loop
    v_candidate := left(v_base, 96 - length(v_suffix::text)) || '-' || v_suffix::text;
    v_suffix := v_suffix + 1;
  end loop;
  return v_candidate;
end;
$$;

do $$
declare v_table text;
begin
  foreach v_table in array array['blog_groups', 'blogs', 'groups', 'videos'] loop
    execute format('drop policy if exists %I on public.%I', 'Enable insert for authenticated users only', v_table);
    execute format('drop policy if exists %I on public.%I', 'Enable update for users based on email', v_table);
    execute format('drop policy if exists %I on public.%I', 'Enable delete for users based on user_id', v_table);
  end loop;
end;
$$;

create policy "Dashboard owners can insert blog groups"
on public.blog_groups for insert to authenticated
with check (user_id = (select auth.uid()) or (select public.is_dashboard_admin()));
create policy "Dashboard owners can update blog groups"
on public.blog_groups for update to authenticated
using (user_id = (select auth.uid()) or (select public.is_dashboard_admin()))
with check (user_id = (select auth.uid()) or (select public.is_dashboard_admin()));
create policy "Dashboard owners can delete blog groups"
on public.blog_groups for delete to authenticated
using (user_id = (select auth.uid()) or (select public.is_dashboard_admin()));

create policy "Dashboard owners can insert blogs"
on public.blogs for insert to authenticated
with check (exists (
  select 1 from public.blog_groups where blog_groups.id = blogs.group_id
    and (blog_groups.user_id = (select auth.uid()) or (select public.is_dashboard_admin()))
));
create policy "Dashboard owners can update blogs"
on public.blogs for update to authenticated
using (exists (
  select 1 from public.blog_groups where blog_groups.id = blogs.group_id
    and (blog_groups.user_id = (select auth.uid()) or (select public.is_dashboard_admin()))
)) with check (exists (
  select 1 from public.blog_groups where blog_groups.id = blogs.group_id
    and (blog_groups.user_id = (select auth.uid()) or (select public.is_dashboard_admin()))
));
create policy "Dashboard owners can delete blogs"
on public.blogs for delete to authenticated
using (exists (
  select 1 from public.blog_groups where blog_groups.id = blogs.group_id
    and (blog_groups.user_id = (select auth.uid()) or (select public.is_dashboard_admin()))
));

create policy "Dashboard owners can insert product groups"
on public.groups for insert to authenticated
with check (
  type = 'products'
  and (user_id = (select auth.uid()) or (select public.is_dashboard_admin()))
);
create policy "Dashboard owners can update product groups"
on public.groups for update to authenticated
using (
  type = 'products'
  and (user_id = (select auth.uid()) or (select public.is_dashboard_admin()))
) with check (
  type = 'products'
  and (user_id = (select auth.uid()) or (select public.is_dashboard_admin()))
);
create policy "Dashboard owners can delete product groups"
on public.groups for delete to authenticated
using (
  type = 'products'
  and (user_id = (select auth.uid()) or (select public.is_dashboard_admin()))
);

create policy "Dashboard owners can insert videos"
on public.videos for insert to authenticated
with check (exists (
  select 1 from public.groups where groups.id = videos.group_id and groups.type = 'videos'
    and (groups.user_id = (select auth.uid()) or (select public.is_dashboard_admin()))
));
create policy "Dashboard owners can update videos"
on public.videos for update to authenticated
using (exists (
  select 1 from public.groups where groups.id = videos.group_id and groups.type = 'videos'
    and (groups.user_id = (select auth.uid()) or (select public.is_dashboard_admin()))
)) with check (exists (
  select 1 from public.groups where groups.id = videos.group_id and groups.type = 'videos'
    and (groups.user_id = (select auth.uid()) or (select public.is_dashboard_admin()))
));
create policy "Dashboard owners can delete videos"
on public.videos for delete to authenticated
using (exists (
  select 1 from public.groups where groups.id = videos.group_id and groups.type = 'videos'
    and (groups.user_id = (select auth.uid()) or (select public.is_dashboard_admin()))
));

revoke insert, update, delete on table public.blog_groups, public.blogs, public.videos
from anon, authenticated;
revoke insert, update, delete on table public.groups from anon;
grant insert, update, delete on table public.groups to authenticated;

drop policy if exists "Owners can insert blog images" on storage.objects;
drop policy if exists "Owners can update blog images" on storage.objects;
drop policy if exists "Owners can delete blog images" on storage.objects;
drop policy if exists "blog_authenticated_allow bjsgsj_0" on storage.objects;
drop policy if exists "blog_authenticated_allow bjsgsj_1" on storage.objects;
drop policy if exists "blog_authenticated_allow bjsgsj_2" on storage.objects;
drop policy if exists "blog_authenticated_allow bjsgsj_3" on storage.objects;
create policy "Owners can insert blog images" on storage.objects
for insert to authenticated with check (
  bucket_id = 'blog-images'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_dashboard_admin())
  )
  and (storage.foldername(name))[2] = 'blogs'
);
create policy "Owners can update blog images" on storage.objects
for update to authenticated using (
  bucket_id = 'blog-images'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_dashboard_admin())
  )
) with check (
  bucket_id = 'blog-images'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_dashboard_admin())
  )
);
create policy "Owners can delete blog images" on storage.objects
for delete to authenticated using (
  bucket_id = 'blog-images'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_dashboard_admin())
  )
);

create or replace function public.create_dashboard_blog_group(p_user_id uuid, p_name text)
returns setof public.blog_groups language plpgsql security definer set search_path = '' as $$
declare v_row public.blog_groups%rowtype;
begin
  perform private.assert_dashboard_content_owner(p_user_id);
  if nullif(btrim(p_name), '') is null or length(btrim(p_name)) > 100
  then raise exception 'Invalid group input' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('blog-groups:' || p_user_id::text, 0));
  insert into public.blog_groups(user_id, name, rank, enabled)
  values (p_user_id, btrim(p_name), coalesce((select max(rank) from public.blog_groups where user_id=p_user_id),0)+1, true)
  returning * into v_row; return next v_row;
end; $$;

create or replace function public.update_dashboard_blog_group(p_user_id uuid, p_group_id bigint, p_name text, p_enabled boolean)
returns setof public.blog_groups language plpgsql security definer set search_path = '' as $$
declare v_row public.blog_groups%rowtype;
begin
  perform private.assert_dashboard_content_owner(p_user_id);
  if nullif(btrim(p_name), '') is null or length(btrim(p_name)) > 100 or p_enabled is null
  then raise exception 'Invalid group input' using errcode = '22023'; end if;
  update public.blog_groups set name=btrim(p_name), enabled=p_enabled
  where id=p_group_id and user_id=p_user_id returning * into v_row;
  if not found then raise exception 'Blog group not found' using errcode = 'P0002'; end if;
  return next v_row;
end; $$;

create or replace function public.delete_dashboard_blog_group(p_user_id uuid, p_group_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_dashboard_content_owner(p_user_id);
  perform pg_advisory_xact_lock(hashtextextended('blog-groups:' || p_user_id::text, 0));
  if not exists(select 1 from public.blog_groups where id=p_group_id and user_id=p_user_id)
  then raise exception 'Blog group not found' using errcode = 'P0002'; end if;
  perform private.enqueue_dashboard_media_cleanup(p_user_id, 'blog-images', path)
  from (
    select private.dashboard_media_path(blogs.image_url, 'blog-images', p_user_id, 'blogs') path
    from public.blogs where group_id=p_group_id
  ) media where path is not null;
  delete from public.blog_groups where id=p_group_id and user_id=p_user_id;
  with ordered as (select id,row_number() over(order by rank nulls last,id) position from public.blog_groups where user_id=p_user_id)
  update public.blog_groups groups set rank=ordered.position from ordered where groups.id=ordered.id;
end; $$;

create or replace function public.reorder_dashboard_blog_groups(p_user_id uuid, p_group_ids bigint[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  perform private.assert_dashboard_content_owner(p_user_id);
  perform pg_advisory_xact_lock(hashtextextended('blog-groups:' || p_user_id::text, 0));
  select count(*) into v_count from public.blog_groups where user_id=p_user_id;
  if p_group_ids is null or cardinality(p_group_ids)<>v_count
    or cardinality(p_group_ids)<>(select count(distinct id) from unnest(p_group_ids) id)
    or exists(select 1 from unnest(p_group_ids) id where not exists(select 1 from public.blog_groups where blog_groups.id=id and user_id=p_user_id))
  then raise exception 'Blog group order is not exact' using errcode = '22023'; end if;
  update public.blog_groups groups set rank=ordered.position
  from unnest(p_group_ids) with ordinality ordered(id,position)
  where groups.id=ordered.id and groups.user_id=p_user_id;
end; $$;

create or replace function public.create_dashboard_blog(
  p_user_id uuid, p_group_id bigint, p_title text, p_content text,
  p_meta_title text, p_meta_description text, p_slug text,
  p_image_url text, p_enabled boolean
)
returns setof public.blogs language plpgsql security definer set search_path = '' as $$
declare v_row public.blogs%rowtype;
begin
  perform private.assert_dashboard_content_owner(p_user_id);
  if not exists(select 1 from public.blog_groups where id=p_group_id and user_id=p_user_id)
  then raise exception 'Blog group not found' using errcode='P0002'; end if;
  if nullif(btrim(p_title),'') is null or length(btrim(p_title))>150
    or nullif(btrim(p_content),'') is null or length(p_content)>50000
    or length(coalesce(p_meta_title,''))>160 or length(coalesce(p_meta_description,''))>320
    or p_enabled is null
    or (nullif(btrim(p_image_url),'') is not null and private.dashboard_media_path(btrim(p_image_url),'blog-images',p_user_id,'blogs') is null)
  then raise exception 'Invalid blog input' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('blogs:' || p_group_id::text,0));
  insert into public.blogs(group_id,title,content,meta_title,meta_description,slug,image_url,enabled,rank)
  values(p_group_id,btrim(p_title),p_content,btrim(coalesce(p_meta_title,'')),btrim(coalesce(p_meta_description,'')),
    private.dashboard_unique_blog_slug(coalesce(nullif(btrim(p_slug),''),p_title)),nullif(btrim(p_image_url),''),p_enabled,
    coalesce((select max(rank) from public.blogs where group_id=p_group_id),0)+1)
  returning * into v_row; return next v_row;
end; $$;

create or replace function public.update_dashboard_blog(
  p_user_id uuid, p_blog_id bigint, p_title text, p_content text,
  p_meta_title text, p_meta_description text, p_slug text,
  p_image_url text, p_enabled boolean
)
returns setof public.blogs language plpgsql security definer set search_path = '' as $$
declare v_row public.blogs%rowtype; v_existing public.blogs%rowtype; v_path text;
begin
  perform private.assert_dashboard_content_owner(p_user_id);
  select blogs.* into v_existing from public.blogs blogs join public.blog_groups groups on groups.id=blogs.group_id
  where blogs.id=p_blog_id and groups.user_id=p_user_id for update of blogs;
  if not found then raise exception 'Blog not found' using errcode='P0002'; end if;
  if nullif(btrim(p_title),'') is null or length(btrim(p_title))>150
    or nullif(btrim(p_content),'') is null or length(p_content)>50000
    or length(coalesce(p_meta_title,''))>160 or length(coalesce(p_meta_description,''))>320
    or p_enabled is null
    or (btrim(coalesce(p_image_url,'')) is distinct from coalesce(v_existing.image_url,'')
      and nullif(btrim(p_image_url),'') is not null
      and private.dashboard_media_path(btrim(p_image_url),'blog-images',p_user_id,'blogs') is null)
  then raise exception 'Invalid blog input' using errcode='22023'; end if;
  if btrim(coalesce(p_image_url,'')) is distinct from coalesce(v_existing.image_url,'') then
    v_path:=private.dashboard_media_path(v_existing.image_url,'blog-images',p_user_id,'blogs');
    if v_path is not null then perform private.enqueue_dashboard_media_cleanup(p_user_id,'blog-images',v_path); end if;
  end if;
  update public.blogs set title=btrim(p_title),content=p_content,meta_title=btrim(coalesce(p_meta_title,'')),
    meta_description=btrim(coalesce(p_meta_description,'')),slug=private.dashboard_unique_blog_slug(coalesce(nullif(btrim(p_slug),''),p_title),p_blog_id),
    image_url=nullif(btrim(p_image_url),''),enabled=p_enabled where id=p_blog_id returning * into v_row;
  return next v_row;
end; $$;

create or replace function public.delete_dashboard_blog(p_user_id uuid,p_blog_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare v_row public.blogs%rowtype; v_group_id bigint; v_path text;
begin
  perform private.assert_dashboard_content_owner(p_user_id);
  select blogs.* into v_row from public.blogs blogs join public.blog_groups groups on groups.id=blogs.group_id
  where blogs.id=p_blog_id and groups.user_id=p_user_id for update of blogs;
  if not found then raise exception 'Blog not found' using errcode='P0002'; end if;
  v_group_id:=v_row.group_id;
  perform pg_advisory_xact_lock(hashtextextended('blogs:' || v_group_id::text,0));
  v_path:=private.dashboard_media_path(v_row.image_url,'blog-images',p_user_id,'blogs');
  if v_path is not null then perform private.enqueue_dashboard_media_cleanup(p_user_id,'blog-images',v_path); end if;
  delete from public.blogs where id=p_blog_id;
  with ordered as (select id,row_number() over(order by rank nulls last,id) position from public.blogs where group_id=v_group_id)
  update public.blogs blogs set rank=ordered.position from ordered where blogs.id=ordered.id;
end; $$;

create or replace function public.reorder_dashboard_blogs(p_user_id uuid,p_group_id bigint,p_blog_ids bigint[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  perform private.assert_dashboard_content_owner(p_user_id);
  if not exists(select 1 from public.blog_groups where id=p_group_id and user_id=p_user_id)
  then raise exception 'Blog group not found' using errcode='P0002'; end if;
  perform pg_advisory_xact_lock(hashtextextended('blogs:' || p_group_id::text,0));
  select count(*) into v_count from public.blogs where group_id=p_group_id;
  if p_blog_ids is null or cardinality(p_blog_ids)<>v_count
    or cardinality(p_blog_ids)<>(select count(distinct id) from unnest(p_blog_ids) id)
    or exists(select 1 from unnest(p_blog_ids) id where not exists(select 1 from public.blogs where blogs.id=id and group_id=p_group_id))
  then raise exception 'Blog order is not exact' using errcode='22023'; end if;
  update public.blogs blogs set rank=ordered.position from unnest(p_blog_ids) with ordinality ordered(id,position)
  where blogs.id=ordered.id and blogs.group_id=p_group_id;
end; $$;

create or replace function public.create_dashboard_video_group(p_user_id uuid,p_name text)
returns setof public.groups language plpgsql security definer set search_path = '' as $$
declare v_row public.groups%rowtype;
begin perform private.assert_dashboard_content_owner(p_user_id);
  if nullif(btrim(p_name),'') is null or length(btrim(p_name))>100 then raise exception 'Invalid group input' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('video-groups:' || p_user_id::text,0));
  insert into public.groups(user_id,name,type,rank,enabled) values(p_user_id,btrim(p_name),'videos',
    coalesce((select max(rank) from public.groups where user_id=p_user_id and type='videos'),0)+1,true)
  returning * into v_row; return next v_row;
end; $$;

create or replace function public.update_dashboard_video_group(p_user_id uuid,p_group_id bigint,p_name text,p_enabled boolean)
returns setof public.groups language plpgsql security definer set search_path = '' as $$
declare v_row public.groups%rowtype;
begin perform private.assert_dashboard_content_owner(p_user_id);
  if nullif(btrim(p_name),'') is null or length(btrim(p_name))>100 or p_enabled is null then raise exception 'Invalid group input' using errcode='22023'; end if;
  update public.groups set name=btrim(p_name),enabled=p_enabled where id=p_group_id and user_id=p_user_id and type='videos' returning * into v_row;
  if not found then raise exception 'Video group not found' using errcode='P0002'; end if; return next v_row;
end; $$;

create or replace function public.delete_dashboard_video_group(p_user_id uuid,p_group_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin perform private.assert_dashboard_content_owner(p_user_id);
  perform pg_advisory_xact_lock(hashtextextended('video-groups:' || p_user_id::text,0));
  delete from public.groups where id=p_group_id and user_id=p_user_id and type='videos';
  if not found then raise exception 'Video group not found' using errcode='P0002'; end if;
  with ordered as (select id,row_number() over(order by rank nulls last,id) position from public.groups where user_id=p_user_id and type='videos')
  update public.groups groups set rank=ordered.position from ordered where groups.id=ordered.id;
end; $$;

create or replace function public.reorder_dashboard_video_groups(p_user_id uuid,p_group_ids bigint[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin perform private.assert_dashboard_content_owner(p_user_id);
  perform pg_advisory_xact_lock(hashtextextended('video-groups:' || p_user_id::text,0));
  select count(*) into v_count from public.groups where user_id=p_user_id and type='videos';
  if p_group_ids is null or cardinality(p_group_ids)<>v_count
    or cardinality(p_group_ids)<>(select count(distinct id) from unnest(p_group_ids) id)
    or exists(select 1 from unnest(p_group_ids) id where not exists(select 1 from public.groups where groups.id=id and user_id=p_user_id and type='videos'))
  then raise exception 'Video group order is not exact' using errcode='22023'; end if;
  update public.groups groups set rank=ordered.position from unnest(p_group_ids) with ordinality ordered(id,position)
  where groups.id=ordered.id and groups.user_id=p_user_id and groups.type='videos';
end; $$;

create or replace function public.create_dashboard_video(p_user_id uuid,p_group_id bigint,p_title text,p_url text,p_enabled boolean)
returns setof public.videos language plpgsql security definer set search_path = '' as $$
declare v_row public.videos%rowtype;
begin perform private.assert_dashboard_content_owner(p_user_id);
  if not exists(select 1 from public.groups where id=p_group_id and user_id=p_user_id and type='videos') then raise exception 'Video group not found' using errcode='P0002'; end if;
  if nullif(btrim(p_title),'') is null or length(btrim(p_title))>150 or nullif(btrim(p_url),'') is null or length(btrim(p_url))>2048 or p_enabled is null
  then raise exception 'Invalid video input' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('videos:' || p_group_id::text,0));
  insert into public.videos(group_id,title,link,enabled,rank) values(p_group_id,btrim(p_title),btrim(p_url),p_enabled,
    coalesce((select max(rank) from public.videos where group_id=p_group_id),0)+1) returning * into v_row; return next v_row;
end; $$;

create or replace function public.update_dashboard_video(p_user_id uuid,p_video_id bigint,p_title text,p_url text,p_enabled boolean)
returns setof public.videos language plpgsql security definer set search_path = '' as $$
declare v_row public.videos%rowtype;
begin perform private.assert_dashboard_content_owner(p_user_id);
  if nullif(btrim(p_title),'') is null or length(btrim(p_title))>150 or nullif(btrim(p_url),'') is null or length(btrim(p_url))>2048 or p_enabled is null
  then raise exception 'Invalid video input' using errcode='22023'; end if;
  update public.videos videos set title=btrim(p_title),link=btrim(p_url),enabled=p_enabled
  from public.groups groups where videos.id=p_video_id and groups.id=videos.group_id and groups.user_id=p_user_id and groups.type='videos'
  returning videos.* into v_row;
  if not found then raise exception 'Video not found' using errcode='P0002'; end if; return next v_row;
end; $$;

create or replace function public.delete_dashboard_video(p_user_id uuid,p_video_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare v_group_id bigint;
begin perform private.assert_dashboard_content_owner(p_user_id);
  select videos.group_id into v_group_id from public.videos videos join public.groups groups on groups.id=videos.group_id
  where videos.id=p_video_id and groups.user_id=p_user_id and groups.type='videos';
  if not found then raise exception 'Video not found' using errcode='P0002'; end if;
  perform pg_advisory_xact_lock(hashtextextended('videos:' || v_group_id::text,0));
  delete from public.videos where id=p_video_id;
  with ordered as (select id,row_number() over(order by rank nulls last,id) position from public.videos where group_id=v_group_id)
  update public.videos videos set rank=ordered.position from ordered where videos.id=ordered.id;
end; $$;

create or replace function public.reorder_dashboard_videos(p_user_id uuid,p_group_id bigint,p_video_ids bigint[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin perform private.assert_dashboard_content_owner(p_user_id);
  if not exists(select 1 from public.groups where id=p_group_id and user_id=p_user_id and type='videos') then raise exception 'Video group not found' using errcode='P0002'; end if;
  perform pg_advisory_xact_lock(hashtextextended('videos:' || p_group_id::text,0));
  select count(*) into v_count from public.videos where group_id=p_group_id;
  if p_video_ids is null or cardinality(p_video_ids)<>v_count
    or cardinality(p_video_ids)<>(select count(distinct id) from unnest(p_video_ids) id)
    or exists(select 1 from unnest(p_video_ids) id where not exists(select 1 from public.videos where videos.id=id and group_id=p_group_id))
  then raise exception 'Video order is not exact' using errcode='22023'; end if;
  update public.videos videos set rank=ordered.position from unnest(p_video_ids) with ordinality ordered(id,position)
  where videos.id=ordered.id and videos.group_id=p_group_id;
end; $$;

revoke all on function public.create_dashboard_blog_group(uuid,text) from public,anon;
revoke all on function public.update_dashboard_blog_group(uuid,bigint,text,boolean) from public,anon;
revoke all on function public.delete_dashboard_blog_group(uuid,bigint) from public,anon;
revoke all on function public.reorder_dashboard_blog_groups(uuid,bigint[]) from public,anon;
revoke all on function public.create_dashboard_blog(uuid,bigint,text,text,text,text,text,text,boolean) from public,anon;
revoke all on function public.update_dashboard_blog(uuid,bigint,text,text,text,text,text,text,boolean) from public,anon;
revoke all on function public.delete_dashboard_blog(uuid,bigint) from public,anon;
revoke all on function public.reorder_dashboard_blogs(uuid,bigint,bigint[]) from public,anon;
revoke all on function public.create_dashboard_video_group(uuid,text) from public,anon;
revoke all on function public.update_dashboard_video_group(uuid,bigint,text,boolean) from public,anon;
revoke all on function public.delete_dashboard_video_group(uuid,bigint) from public,anon;
revoke all on function public.reorder_dashboard_video_groups(uuid,bigint[]) from public,anon;
revoke all on function public.create_dashboard_video(uuid,bigint,text,text,boolean) from public,anon;
revoke all on function public.update_dashboard_video(uuid,bigint,text,text,boolean) from public,anon;
revoke all on function public.delete_dashboard_video(uuid,bigint) from public,anon;
revoke all on function public.reorder_dashboard_videos(uuid,bigint,bigint[]) from public,anon;

grant execute on function public.create_dashboard_blog_group(uuid,text) to authenticated;
grant execute on function public.update_dashboard_blog_group(uuid,bigint,text,boolean) to authenticated;
grant execute on function public.delete_dashboard_blog_group(uuid,bigint) to authenticated;
grant execute on function public.reorder_dashboard_blog_groups(uuid,bigint[]) to authenticated;
grant execute on function public.create_dashboard_blog(uuid,bigint,text,text,text,text,text,text,boolean) to authenticated;
grant execute on function public.update_dashboard_blog(uuid,bigint,text,text,text,text,text,text,boolean) to authenticated;
grant execute on function public.delete_dashboard_blog(uuid,bigint) to authenticated;
grant execute on function public.reorder_dashboard_blogs(uuid,bigint,bigint[]) to authenticated;
grant execute on function public.create_dashboard_video_group(uuid,text) to authenticated;
grant execute on function public.update_dashboard_video_group(uuid,bigint,text,boolean) to authenticated;
grant execute on function public.delete_dashboard_video_group(uuid,bigint) to authenticated;
grant execute on function public.reorder_dashboard_video_groups(uuid,bigint[]) to authenticated;
grant execute on function public.create_dashboard_video(uuid,bigint,text,text,boolean) to authenticated;
grant execute on function public.update_dashboard_video(uuid,bigint,text,text,boolean) to authenticated;
grant execute on function public.delete_dashboard_video(uuid,bigint) to authenticated;
grant execute on function public.reorder_dashboard_videos(uuid,bigint,bigint[]) to authenticated;
