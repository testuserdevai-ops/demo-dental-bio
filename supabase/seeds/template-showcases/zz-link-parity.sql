-- Late, additive saved-link parity fixtures for the seven reusable-template
-- batch. Source tables remain authoritative; public_profiles is trigger-owned.
do $template_link_parity_seed$
declare
  fixture record;
  link_index integer;
  group_id uuid;
  seed_link_id uuid;
  join_id uuid;
begin
  for fixture in
    select *
    from (
      values
        ('db010000', 'db010000-0000-4000-8000-000000000002'::uuid, 'template-direct-booking'),
        ('10ca7100', '10ca7100-0000-4000-8000-000000000002'::uuid, 'template-location-provider-router'),
        ('5e010000', '5e010000-0000-4000-8000-000000000002'::uuid, 'template-services-catalogue'),
        ('7f570000', '7f570000-0000-4000-8000-000000000002'::uuid, 'template-trust-first'),
        ('5a5e5500', '5a5e5500-0000-4000-8000-000000000002'::uuid, 'template-specialist-assessment'),
        ('c11c0000', 'c11c0000-0000-4000-8000-000000000002'::uuid, 'template-clinic-commerce'),
        ('ed0ca700', 'ed0ca700-0000-4000-8000-000000000002'::uuid, 'template-expert-educator')
    ) as fixtures(id_prefix, dentistry_id, slug)
  loop
    group_id := format('%s-0000-4000-8000-000000000090', fixture.id_prefix)::uuid;

    insert into public.link_groups (link_group_id, dentistry_id, heading, rank)
    values (group_id, fixture.dentistry_id, 'Owner saved resources', 900)
    on conflict (link_group_id) do update
    set dentistry_id = excluded.dentistry_id,
        heading = excluded.heading,
        rank = excluded.rank;

    for link_index in 1..7 loop
      seed_link_id := format(
        '%s-0000-4000-8000-00000000009%s',
        fixture.id_prefix,
        link_index
      )::uuid;
      join_id := format(
        '%s-0000-4000-8000-00000000019%s',
        fixture.id_prefix,
        link_index
      )::uuid;

      insert into public.links (
        link_id,
        title,
        link,
        is_active,
        rank,
        click_counter,
        image_url,
        image_variant,
        image_alt,
        image_decorative,
        is_featured
      )
      values (
        seed_link_id,
        case when link_index = 7 then '' else format('Owner resource %s', link_index) end,
        case
          when link_index = 6 then format('http://example.com/%s/http-resource', fixture.slug)
          else format('https://example.com/%s/resource-%s', fixture.slug, link_index)
        end,
        link_index <> 5,
        link_index,
        0,
        null,
        'none',
        null,
        true,
        false
      )
      on conflict (link_id) do update
      set title = excluded.title,
          link = excluded.link,
          is_active = excluded.is_active,
          rank = excluded.rank,
          image_url = excluded.image_url,
          image_variant = excluded.image_variant,
          image_alt = excluded.image_alt,
          image_decorative = excluded.image_decorative,
          is_featured = excluded.is_featured;

      insert into public.dentistry_links (
        dentistry_links_id,
        link_group_id,
        link_id
      )
      values (join_id, group_id, seed_link_id)
      on conflict (dentistry_links_id) do update
      set link_group_id = excluded.link_group_id,
          link_id = excluded.link_id;
    end loop;
  end loop;
end
$template_link_parity_seed$;
