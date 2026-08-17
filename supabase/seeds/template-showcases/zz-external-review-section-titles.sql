-- Owner-authored headings used to prove the shared external-review surface in
-- every deterministic public-template showcase.

with owner_titles(username, external_review_section_title) as (
  values
    ('template-basic', 'More reviews from our patients'),
    ('template-direct-booking', 'More reviews before you book'),
    ('template-location-router', 'More reviews from every location'),
    ('template-services-catalogue', 'More reviews of our services'),
    ('template-cosmetic-results', 'More smile transformation reviews'),
    ('template-trust-first', 'More family dentistry reviews'),
    ('template-specialist-assessment', 'More specialist care reviews'),
    ('template-clinic-commerce', 'More reviews of our clinic'),
    ('template-expert-educator', 'More educational and clinical reviews')
)
update public.dentistries as dentistry
set external_review_section_title = owner_titles.external_review_section_title
from public.users as owner
join owner_titles on owner_titles.username = owner.username
where dentistry.user_id = owner.id;
