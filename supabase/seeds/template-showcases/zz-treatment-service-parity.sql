-- Cross-template treatment/service parity overlay.
-- This intentionally runs after the individual showcase fixtures and writes only
-- private source tables; public_profiles remains a trigger-maintained projection.
do $$
declare
  fixture record;
  item_index integer;
  treatment_uuid uuid;
  join_uuid uuid;
begin
  for fixture in
    select *
    from (values
      ('template-direct-booking', 'Direct Booking', 'Treatments chosen for you', 'Appointment services'),
      ('template-clinic-commerce', 'Clinic Commerce', 'Clinical treatments', 'Clinic services'),
      ('template-cosmetic-results', 'Cosmetic Transformation', 'Smile treatments', 'Planning services'),
      ('template-trust-first', 'Trust First', 'Family treatments', 'Family services'),
      ('template-specialist-assessment', 'Specialist Assessment', 'Specialist treatments chosen by the owner', 'Assessment services'),
      ('template-location-router', 'Location Router', 'Available treatments', 'Available services'),
      ('template-expert-educator', 'Expert Educator', 'Clinical treatments', 'Education and consultation services')
    ) as fixtures(username, label, treatment_title, service_title)
  loop
    update public.dentistries as dentistry
    set treatment_section_title = fixture.treatment_title,
        service_section_title = fixture.service_title
    from auth.users as owner
    where owner.id = dentistry.user_id
      and owner.raw_user_meta_data ->> 'username' = fixture.username;

    for item_index in 1..3 loop
      treatment_uuid := (
        substr(md5(fixture.username || ':treatment:' || item_index), 1, 8) || '-' ||
        substr(md5(fixture.username || ':treatment:' || item_index), 9, 4) || '-4' ||
        substr(md5(fixture.username || ':treatment:' || item_index), 14, 3) || '-8' ||
        substr(md5(fixture.username || ':treatment:' || item_index), 18, 3) || '-' ||
        substr(md5(fixture.username || ':treatment:' || item_index), 21, 12)
      )::uuid;
      join_uuid := (
        substr(md5(fixture.username || ':treatment-join:' || item_index), 1, 8) || '-' ||
        substr(md5(fixture.username || ':treatment-join:' || item_index), 9, 4) || '-4' ||
        substr(md5(fixture.username || ':treatment-join:' || item_index), 14, 3) || '-8' ||
        substr(md5(fixture.username || ':treatment-join:' || item_index), 18, 3) || '-' ||
        substr(md5(fixture.username || ':treatment-join:' || item_index), 21, 12)
      )::uuid;

      insert into public.treatments (treatment_id, title, description, "isService")
      values (
        treatment_uuid,
        fixture.label || ' treatment ' || item_index,
        'Complete owner-authored treatment detail ' || item_index || ' for the parity showcase.',
        false
      )
      on conflict (treatment_id) do update
      set title = excluded.title,
          description = excluded.description,
          "isService" = excluded."isService";

      insert into public.dentistry_treatments (
        dentistry_treatment_id, dentistry_id, treatment_id, rank
      )
      select join_uuid, dentistry.dentistry_id, treatment_uuid, 100 + item_index
      from public.dentistries as dentistry
      join auth.users as owner on owner.id = dentistry.user_id
      where owner.raw_user_meta_data ->> 'username' = fixture.username
      on conflict (dentistry_treatment_id) do update
      set dentistry_id = excluded.dentistry_id,
          treatment_id = excluded.treatment_id,
          rank = excluded.rank;
    end loop;

    for item_index in 1..2 loop
      treatment_uuid := (
        substr(md5(fixture.username || ':service:' || item_index), 1, 8) || '-' ||
        substr(md5(fixture.username || ':service:' || item_index), 9, 4) || '-4' ||
        substr(md5(fixture.username || ':service:' || item_index), 14, 3) || '-8' ||
        substr(md5(fixture.username || ':service:' || item_index), 18, 3) || '-' ||
        substr(md5(fixture.username || ':service:' || item_index), 21, 12)
      )::uuid;
      join_uuid := (
        substr(md5(fixture.username || ':service-join:' || item_index), 1, 8) || '-' ||
        substr(md5(fixture.username || ':service-join:' || item_index), 9, 4) || '-4' ||
        substr(md5(fixture.username || ':service-join:' || item_index), 14, 3) || '-8' ||
        substr(md5(fixture.username || ':service-join:' || item_index), 18, 3) || '-' ||
        substr(md5(fixture.username || ':service-join:' || item_index), 21, 12)
      )::uuid;

      insert into public.treatments (treatment_id, title, description, "isService")
      values (
        treatment_uuid,
        fixture.label || ' service ' || item_index,
        'Complete owner-authored service detail ' || item_index || ' for the parity showcase.',
        true
      )
      on conflict (treatment_id) do update
      set title = excluded.title,
          description = excluded.description,
          "isService" = excluded."isService";

      insert into public.dentistry_treatments (
        dentistry_treatment_id, dentistry_id, treatment_id, rank
      )
      select join_uuid, dentistry.dentistry_id, treatment_uuid, 200 + item_index
      from public.dentistries as dentistry
      join auth.users as owner on owner.id = dentistry.user_id
      where owner.raw_user_meta_data ->> 'username' = fixture.username
      on conflict (dentistry_treatment_id) do update
      set dentistry_id = excluded.dentistry_id,
          treatment_id = excluded.treatment_id,
          rank = excluded.rank;
    end loop;
  end loop;
end
$$;
