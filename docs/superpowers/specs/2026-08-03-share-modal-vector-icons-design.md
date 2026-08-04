# Product icon system

## Goal

Standardize crisp, accessible interface and social icons across DentalBio and
every supported brand domain. Replace rasterized share icons, complete
LinkedIn support, and guarantee that metadata resolves each brand's own
favicon without cross-brand fallback.

## Architecture

Add a browser-neutral icon policy module under `lib` that maps every configured
brand domain to an explicit favicon asset and exposes a resolver for hostname
or registered-brand overrides. It is the sole source for root and public
profile metadata, so custom-domain profile pages use the stored registered
brand rather than the request host or DentalBio fallback.

Create one SVG favicon per configured brand in `app`'s static metadata asset
location, keeping the visual language consistent with the existing brand SVG
logos. The domain map covers DentalBio, CoachBio, DoctorsBio, InjectorBio,
PharmacistsBio, PodcastsBio, SpecialistBio, and TherapistsBio; an unsupported
host uses an explicit DentalBio default only at the domain-resolution boundary.

Use the existing `@phosphor-icons/react` dependency for interface and social
logos. The share modal uses six decorative, `aria-hidden` SVGs at 32px while
retaining all native controls, controlled analytics descriptors, destinations,
and copy behavior. Existing semantic social links retain accessible anchor
names while their child SVGs are decorative.

LinkedIn becomes a first-class social platform: database migration,
validation/normalization, dashboard form control, public profile rendering,
and controlled `social_click` analytics. No free-form analytics fields or new
transport are introduced.

## Verification

Add focused tests for the share modal's six SVG actions, LinkedIn URL
normalization and profile link behavior, and the complete supported-domain
favicon mapping. Metadata tests cover normal brand hosts and custom-domain
registered-brand overrides. Run formatting, typecheck, lint, unit tests,
production build with required local environment values, relevant Playwright
and axe checks when their existing setup is available.
