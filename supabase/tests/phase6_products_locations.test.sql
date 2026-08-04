begin;
select no_plan();

select
  '00000000-0000-4000-8000-000000001301'::uuid owner_id,
  '00000000-0000-4000-8000-000000001302'::uuid other_id,
  '00000000-0000-4000-8000-000000001303'::uuid free_id,
  '00000000-0000-4000-8000-000000001304'::uuid admin_id,
  '00000000-0000-4000-8000-000000001311'::uuid owner_dentistry,
  '00000000-0000-4000-8000-000000001312'::uuid other_dentistry,
  '00000000-0000-4000-8000-000000001313'::uuid free_dentistry
\gset

insert into public.users(id,email,username,role,subscription_status) values
(:'owner_id','product-owner@example.test','product-owner','user','PRO'),
(:'other_id','product-other@example.test','product-other','user','PRO'),
(:'free_id','location-free@example.test','location-free','user','FREE'),
(:'admin_id','product-admin@example.test','product-admin','admin','PRO');
insert into public.dentistries(dentistry_id,user_id,location_title) values
(:'owner_dentistry',:'owner_id','Locations'),
(:'other_dentistry',:'other_id','Locations'),
(:'free_dentistry',:'free_id','Locations');

insert into public.locations(location_id,business_name,full_address,country,city,area,latitude,longitude)
values('00000000-0000-4000-8000-000000001321','Legacy shared clinic','4 Shared Street','UK','London','Central',51.5,-0.1);
insert into public.dentistry_locations(dentistry_id,location_id) values
(:'owner_dentistry','00000000-0000-4000-8000-000000001321'),
(:'other_dentistry','00000000-0000-4000-8000-000000001321');

select ok(exists(select 1 from information_schema.columns where table_schema='public' and table_name='locations' and column_name='updated_at'),'Locations have an authoritative revision');
select has_function('public','create_individual_product',array['uuid','text','text','text','text','double precision','text','boolean']);
select has_function('public','update_dentistry_location',array['uuid','uuid','timestamp with time zone','text','text','text','text','text','numeric','numeric']);
select ok(not has_function_privilege('anon','public.create_individual_product(uuid,text,text,text,text,double precision,text,boolean)','execute'),'Anonymous product writes are denied');

set local role authenticated;
select set_config('request.jwt.claim.sub',:'owner_id',true);
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claims',json_build_object('sub',:'owner_id','role','authenticated','iss','http://127.0.0.1:54321/auth/v1')::text,true);

select throws_ok(format($$select * from public.create_individual_product('%s','Forged','https://example.com','Shop','https://example.com/image.webp',1,'GBP',true)$$,:'other_id'),'42501',null,'Owners cannot create another account product');
select throws_ok(format($$select * from public.create_individual_product('%s','No image','https://example.com','Shop','https://example.com/image.webp',1,'GBP',true)$$,:'owner_id'),'22023',null,'Products require a verified owned image');

insert into storage.objects(bucket_id,name,owner_id) values
('product-images',:'owner_id'||'/products/one.webp',:'owner_id'),
('product-images',:'owner_id'||'/products/two.webp',:'owner_id');
select lives_ok(format($$select * from public.create_individual_product('%s','One','https://example.com/one','Shop','http://127.0.0.1:54321/storage/v1/object/public/product-images/%s/products/one.webp',1,'GBP',true)$$,:'owner_id',:'owner_id'),'Owner creates first product');
select lives_ok(format($$select * from public.create_individual_product('%s','Two','https://example.com/two','Shop','http://127.0.0.1:54321/storage/v1/object/public/product-images/%s/products/two.webp',2,'GBP',true)$$,:'owner_id',:'owner_id'),'Owner creates second product');
select results_eq(format($$select rank::integer from public.products where user_id='%s' order by rank$$,:'owner_id'),$$select * from (values(1),(2)) expected(rank)$$,'Product ranks are distinct');
select throws_ok(format($$select public.reorder_individual_products('%s',array[(select min(id) from public.products where user_id='%s')]::bigint[])$$,:'owner_id',:'owner_id'),'22023',null,'Product reorder requires exact set');
select lives_ok(format($$select public.reorder_individual_products('%s',array[(select max(id) from public.products where user_id='%s'),(select min(id) from public.products where user_id='%s')]::bigint[])$$,:'owner_id',:'owner_id',:'owner_id'),'Exact product reorder succeeds');
select results_eq(format($$select rank::integer from public.products where user_id='%s' order by id desc$$,:'owner_id'),$$select * from (values(1),(2)) expected(rank)$$,'Product order follows requested IDs');
select lives_ok(format($$select public.delete_individual_product('%s',(select min(id) from public.products where user_id='%s'))$$,:'owner_id',:'owner_id'),'Product delete succeeds');
select is((select count(*)::integer from public.claim_dashboard_media_cleanup(:'owner_id','product-images')),1,'Product delete queues cleanup');

select lives_ok(format($$select public.save_dentistry_location_title('%s','Where to find us')$$,:'owner_dentistry'),'Owner updates location title');
select throws_ok(format($$select public.save_dentistry_location_title('%s','Forged')$$,:'other_dentistry'),'42501',null,'Owner cannot update another dentistry title');
select lives_ok(format($$select * from public.create_dentistry_location('%s','Main clinic','1 High Street','UK','London','Central',51.5,-0.1)$$,:'owner_dentistry'),'Paid owner creates location');
select set_config('request.jwt.claim.sub',:'free_id',true);
select set_config('request.jwt.claims',json_build_object('sub',:'free_id','role','authenticated','iss','http://127.0.0.1:54321/auth/v1')::text,true);
select lives_ok(format($$select * from public.create_dentistry_location('%s','Free clinic','2 High Street','UK','London','Central',51.5,-0.1)$$,:'free_dentistry'),'Free owner creates first location');
select throws_ok(format($$select * from public.create_dentistry_location('%s','Second','3 High Street','UK','London','Central',51.5,-0.1)$$,:'free_dentistry'),'23514',null,'Free plan is limited to one location');

select set_config('request.jwt.claim.sub',:'owner_id',true);
select set_config('request.jwt.claims',json_build_object('sub',:'owner_id','role','authenticated','iss','http://127.0.0.1:54321/auth/v1')::text,true);
select updated_at shared_revision from public.locations where location_id='00000000-0000-4000-8000-000000001321' \gset
select throws_ok(format($$select * from public.update_dentistry_location('%s','00000000-0000-4000-8000-000000001321','%s','Forged shared update','4 Shared Street','UK','London','Central',51.5,-0.1)$$,:'owner_dentistry',:'shared_revision'),'42501',null,'Shared legacy locations cannot be updated by one linked owner');
select throws_ok(format($$select public.delete_dentistry_location('%s','00000000-0000-4000-8000-000000001321')$$,:'owner_dentistry'),'42501',null,'Shared legacy locations cannot be deleted by one linked owner');
select is((select count(*)::integer from public.dentistry_locations where location_id='00000000-0000-4000-8000-000000001321'),2,'Rejected shared delete preserves every link');
select updated_at old_revision from public.locations where business_name='Main clinic' \gset
select lives_ok(format($$select * from public.update_dentistry_location('%s',(select location_id from public.locations where business_name='Main clinic'),'%s','Main clinic updated','1 New Street','UK','London','Central',51.51,-0.11)$$,:'owner_dentistry',:'old_revision'),'First versioned update succeeds');
select throws_ok(format($$select * from public.update_dentistry_location('%s',(select location_id from public.locations where business_name='Main clinic updated'),'%s','Stale overwrite','Old Street','UK','London','Central',51.52,-0.12)$$,:'owner_dentistry',:'old_revision'),'40001',null,'Stale location update is rejected');
select results_eq($$select business_name::text from public.locations where business_name='Main clinic updated'$$,$$values('Main clinic updated'::text)$$,'Stale write cannot overwrite location');
select lives_ok(format($$select public.delete_dentistry_location('%s',(select location_id from public.locations where business_name='Main clinic updated'))$$,:'owner_dentistry'),'Owner deletes location atomically');
select is((select count(*)::integer from public.locations where business_name='Main clinic updated'),0,'Location entity is removed');

reset role;
select * from finish();
rollback;
