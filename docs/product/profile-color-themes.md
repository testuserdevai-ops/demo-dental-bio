# Curated public-profile color themes

The profile theme layer changes approved appearance tokens only. It does not
change template module order, content, entity IDs, layout, typography, or
analytics descriptors. Persisted presentation configuration stores one stable
theme identifier; it never stores a color, font, URL, gradient, or CSS value.

## Catalog

| Stable ID           | Name              | Intended mood                            | Suitable use                                                        | Tier |
| ------------------- | ----------------- | ---------------------------------------- | ------------------------------------------------------------------- | ---- |
| `clinical-light`    | Clinical Light    | Clear, familiar, and quietly clinical    | Neutral default for every practice and the Basic compatibility path | Free |
| `warm-care`         | Warm Care         | Human, reassuring, and family friendly   | Family, anxious-patient, and relationship-led practices             | Free |
| `editorial-expert`  | Editorial Expert  | Authoritative, considered, and editorial | Educators, speakers, specialists, and credential-led profiles       | Free |
| `modern-specialist` | Modern Specialist | Technical, fresh, and specialist led     | Orthodontic, implant, assessment, and technology-led practices      | Free |
| `premium-contrast`  | Premium Contrast  | Confident, elevated, and high contrast   | Image-forward cosmetic or premium practices                         | Pro  |

The entitlement classification remains authoritative in
`lib/profile-presentation/catalog.ts`. This file does not duplicate or override
that policy.

## Controlled token contract

`lib/profile-presentation/themes.ts` owns the complete palette for each stable
ID. Every theme defines:

- page, surface, primary text, and secondary text;
- primary and secondary action foregrounds plus default, hover, and active
  backgrounds;
- subtle decorative and strong interactive borders;
- focus, link, link-hover, muted, disabled, and selected states; and
- success, warning, and destructive/error foreground/background pairs.

`ProfileThemeRoot` converts only a catalog definition into scoped CSS custom
properties. The public renderer should apply it at the template boundary:

```tsx
<ProfileThemeRoot themeId={presentation.configuration.themeId}>
  <PublicProfileTemplate presentation={presentation} profile={profile} />
</ProfileThemeRoot>
```

Passing an unknown, retired, object-shaped, or missing value deterministically
applies `clinical-light`. Call sites cannot pass a `style` prop through the
root, which keeps arbitrary profile CSS outside this boundary.

Clinical Light preserves the existing Basic page, surface, text, muted,
primary, secondary, focus, disabled, success, warning, destructive, and subtle
border **background values**. It does not claim byte-for-byte compatibility for
every new state pair. The new profile-scoped strong-border token and readable
state foregrounds intentionally differ where the legacy semantic foundation
had no foreground or used white below 4.5:1 (notably the destructive, success,
and warning fills). Those foreground changes are accessibility corrections and
must be included in main-agent visual review before the theme wrapper ships.

## Accessibility targets

- Normal text and every supplied state label pair meet WCAG AA 4.5:1.
- Strong interactive borders, focus rings, and primary action boundaries meet
  3:1 against both page and raised surfaces.
- Subtle borders are decorative only; they never communicate selection,
  focus, validation, or component boundaries without another cue.
- `ProfileThemeChoice` is a native radio. Its selected state is exposed by the
  checked property, a stronger outline, a check mark, and visible `Selected`
  text—not color alone.
- The choice card removes transitions under reduced motion and maps selection,
  focus, surfaces, and text to system colors in forced-colors mode.
- The browser `color-scheme` is scoped to the theme root, so native controls
  remain legible in the dark Premium Contrast theme.

## Review matrix

Before release, render every eligible theme with Basic and each registered
template. For every combination, review:

1. desktop and 320 px mobile widths at 100%, 200%, and 400% zoom;
2. keyboard focus and checked/selected/error/disabled states;
3. primary/secondary actions, links, cards, dialogs, inputs, and status
   feedback;
4. representative links, video, gallery, review, product, treatment, and
   location modules, including empty and long-content states;
5. light, dark, busy, and missing media so text is never dependent on an image;
6. reduced motion, forced colors, and system contrast preferences;
7. public and verified-preview parity; and
8. the automated contrast suite and focused axe helper in
   `e2e/support/profile-theme-accessibility.ts`.

Template branches must reuse the scoped semantic variables rather than adding
private colors. The integrated Wave 4 gate owns the full nine-template by
five-theme Playwright matrix because those renderers do not exist in this
story's branch yet.

## Versioning, change, and retirement

1. Never rename or silently reinterpret a released ID.
2. Add a new controlled ID to the shared presentation catalog and database
   allow-list first, with entitlement and migration fixtures.
3. Add the complete token definition, intended mood, chooser copy, contrast
   pairs, component coverage, and cross-template screenshots.
4. Review appearance on all registered templates before release. A token change
   to an existing ID is a user-visible migration and needs before/after visual
   evidence plus a rollback plan.
5. To retire a theme, stop offering it for new selection, keep rendering its
   last valid definition during the migration window, migrate persisted
   configurations explicitly, and only then direct unknown values to Clinical
   Light. Never remove an ID and silently reinterpret it as another branded
   palette.

## Analytics decision

Theme selection and preview are dashboard/editor controls. They are excluded
from public owner-profile conversion analytics. No click path in
`ProfileThemeChoice` emits a public analytics descriptor. If product-funnel
measurement is separately approved, it may contain only a controlled theme ID;
it must never contain token values or profile content.
