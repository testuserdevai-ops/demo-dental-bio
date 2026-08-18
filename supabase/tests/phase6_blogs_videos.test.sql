begin;
select no_plan();

select
  '00000000-0000-4000-8000-000000001201'::uuid as owner_id,
  '00000000-0000-4000-8000-000000001202'::uuid as other_id,
  '00000000-0000-4000-8000-000000001203'::uuid as free_id,
  '00000000-0000-4000-8000-000000001204'::uuid as admin_id
\gset

insert into public.users (id,email,username,role,subscription_status)
values
  (:'owner_id','blog-owner@example.test','blog-owner','user','PRO'),
  (:'other_id','blog-other@example.test','blog-other','user','PRO'),
  (:'free_id','blog-free@example.test','blog-free','user','FREE'),
  (:'admin_id','blog-admin@example.test','blog-admin','admin','PRO');

select has_function('public','create_dashboard_blog_group',array['uuid','text']);
select has_function('public','create_dashboard_blog',array['uuid','bigint','text','text','text','text','text','text','boolean']);
select has_function('public','reorder_dashboard_blogs',array['uuid','bigint','bigint[]']);
select has_function('public','create_dashboard_video_group',array['uuid','text']);
select has_function('public','create_dashboard_video',array['uuid','bigint','text','text','boolean']);
select has_function('public','reorder_dashboard_videos',array['uuid','bigint','bigint[]']);
select ok(
  not has_function_privilege('anon','public.create_dashboard_blog_group(uuid,text)','execute')
  and not has_function_privilege('anon','public.create_dashboard_video_group(uuid,text)','execute'),
  'Anonymous callers cannot execute content writes'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', json_build_object(
  'sub', :'owner_id', 'role', 'authenticated',
  'iss', 'http://127.0.0.1:54321/auth/v1'
)::text, true);

select throws_ok(
  format($$select * from public.create_dashboard_blog_group('%s','forged')$$, :'other_id'),
  '42501', null, 'An owner cannot create another account blog group'
);
select throws_ok(
  format($$select * from public.create_dashboard_blog_group('%s','free')$$, :'free_id'),
  '42501', null, 'Inactive plans cannot create blog groups'
);
select lives_ok(
  format($$insert into public.groups (user_id,name,type,enabled) values ('%s','Products','products',true)$$, :'owner_id'),
  'Existing product group writes remain available'
);
select throws_ok(
  format($$insert into public.groups (user_id,name,type,enabled) values ('%s','Forged products','products',true)$$, :'other_id'),
  '42501', null, 'Product group writes remain owner-scoped'
);
select throws_ok(
  format($$insert into public.groups (user_id,name,type,enabled) values ('%s','Direct videos','videos',true)$$, :'owner_id'),
  '42501', null, 'Video group writes must use the atomic authority function'
);
select throws_ok(
  format($$insert into storage.objects (bucket_id,name,owner_id) values ('blog-images','%s/blogs/forged.webp','%s')$$, :'other_id', :'owner_id'),
  '42501', null, 'Owners cannot upload into another account blog folder'
);

select lives_ok(
  format($$select * from public.create_dashboard_blog_group('%s','Guides')$$, :'owner_id'),
  'An owner creates a blog group'
);
select lives_ok(
  format($$select * from public.create_dashboard_blog_group('%s','News')$$, :'owner_id'),
  'An owner creates a second blog group'
);
select is((select count(*)::integer from public.blog_groups where user_id=:'owner_id'),2,'Two blog groups exist');

select lives_ok(
  format($$select * from public.create_dashboard_blog('%s',%s,'First post','Useful content','','','first-post','',true)$$,
    :'owner_id',(select min(id) from public.blog_groups where user_id=:'owner_id')),
  'An owner creates a blog in an owned group'
);
select lives_ok(
  format($$select * from public.create_dashboard_blog('%s',%s,'Second post','More content','','','first-post','',true)$$,
    :'owner_id',(select min(id) from public.blog_groups where user_id=:'owner_id')),
  'A duplicate requested slug receives a unique suffix'
);
select results_eq(
  $$select blogs.slug
    from public.blogs
    join public.blog_groups on blog_groups.id = blogs.group_id
    where blog_groups.user_id = '00000000-0000-4000-8000-000000001201'
    order by blogs.id$$,
  $$values ('first-post'::text),('first-post-2'::text)$$,
  'A duplicate requested slug receives a globally unique suffix'
);
select throws_ok(
  format($$select public.reorder_dashboard_blogs('%s',%s,array[%s]::bigint[])$$,
    :'owner_id',(select min(id) from public.blog_groups where user_id=:'owner_id'),
    (select min(blogs.id) from public.blogs join public.blog_groups on blog_groups.id=blogs.group_id where blog_groups.user_id=:'owner_id')),
  '22023', null, 'Blog reorder requires the exact child set'
);
select lives_ok(
  format($$select public.reorder_dashboard_blogs('%s',%s,array[%s,%s]::bigint[])$$,
    :'owner_id',(select min(id) from public.blog_groups where user_id=:'owner_id'),
    (select max(blogs.id) from public.blogs join public.blog_groups on blog_groups.id=blogs.group_id where blog_groups.user_id=:'owner_id'),
    (select min(blogs.id) from public.blogs join public.blog_groups on blog_groups.id=blogs.group_id where blog_groups.user_id=:'owner_id')),
  'Blog reorder accepts the exact child set'
);
select results_eq(
  $$select blogs.rank::bigint
    from public.blogs
    join public.blog_groups on blog_groups.id = blogs.group_id
    where blog_groups.user_id = '00000000-0000-4000-8000-000000001201'
    order by blogs.id desc$$,
  $$values (1::bigint),(2::bigint)$$,
  'Blog ranks follow the requested order'
);

select lives_ok(
  format($$select * from public.create_dashboard_video_group('%s','Explainers')$$, :'owner_id'),
  'An owner creates a video group'
);
select lives_ok(
  format($$select * from public.create_dashboard_video('%s',%s,'Welcome','https://www.youtube.com/watch?v=abcdefghijk',true)$$,
    :'owner_id',(select min(id) from public.groups where user_id=:'owner_id' and type='videos')),
  'An owner creates a video in the controlled group type'
);
select throws_ok(
  format($$select * from public.create_dashboard_video('%s',%s,'Forged','https://youtu.be/abcdefghijk',true)$$,
    :'other_id',(select min(id) from public.groups where user_id=:'owner_id' and type='videos')),
  '42501', null, 'Another owner cannot create inside the video group'
);
select lives_ok(
  format($$select * from public.update_dashboard_video('%s',%s,'Updated','https://vimeo.com/123456789',false)$$,
    :'owner_id',(select min(videos.id) from public.videos join public.groups on groups.id=videos.group_id where groups.user_id=:'owner_id')),
  'An owner updates controlled video fields'
);
select results_eq(
  format($$select videos.title::text,videos.enabled from public.videos join public.groups on groups.id=videos.group_id where groups.user_id='%s'$$, :'owner_id'),
  $$values ('Updated'::text,false)$$,
  'Video update preserves ownership and enabled state'
);

select set_config('request.jwt.claim.sub', :'admin_id', true);
select set_config('request.jwt.claims', json_build_object(
  'sub', :'admin_id', 'role', 'authenticated',
  'iss', 'http://127.0.0.1:54321/auth/v1'
)::text, true);
select lives_ok(
  format($$insert into storage.objects (bucket_id,name,owner_id) values ('blog-images','%s/blogs/admin.webp','%s')$$, :'owner_id', :'admin_id'),
  'Verified admins can upload a target account blog cover'
);

reset role;
select * from finish();
rollback;
