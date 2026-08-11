# DentalBio template-system delivery plan

Parent epic: [Add theme and premium layout customization](https://trello.com/c/gnTNTcDF/54-add-theme-and-premium-layout-customization)  
Research: [`linktree-dentist-profile-research.md`](../research/linktree-dentist-profile-research.md)  
Template designs: [`dentalbio-profile-template-designs.md`](./dentalbio-profile-template-designs.md)

## Product decisions

1. The current DentalBio public-profile layout becomes the **Basic** template. Existing profiles remain on Basic after migration and must not change visually or behaviorally.
2. A content template controls module defaults, order, emphasis, and template-specific onboarding questions.
3. A color theme controls only approved appearance tokens.
4. A layout variant controls a tested composition such as classic stack or hero overlap.
5. Applying a template never deletes existing owner content or changes stable entity IDs.
6. Existing Bio, links, treatments, videos, galleries, reviews, products, and locations remain the builder's content sources. Templates render those entities differently rather than creating parallel content systems.

## Onboarding journey

The initial profile-creation journey follows this order:

1. **Choose a color theme.** Show curated, WCAG-tested presets with meaningful names and a preview.
2. **Choose a content template.** Include Basic plus the eight research-derived templates. Explain the intended practice type and show a representative structure rather than only a thumbnail.
3. **Answer template-specific questions.** Ask only for configuration and content needed by the selected template; reuse existing content DTOs and actions.
4. **Review the composed profile.** Preview the exact public rendering, identify missing optional content, and allow back navigation without data loss.
5. **Publish.** Persist one versioned template/theme/layout configuration through an authorized server boundary and invalidate the correct public-profile identity.

Owners can later switch theme without reordering content. Switching template requires a preview of the proposed order and confirmation when populated modules would become hidden.

## Planned stories and implementation ownership

Each row is an independent subagent workstream and verified Trello story. Branch names are proposed and may receive a numeric suffix when parallel work begins.

| Workstream                  | Trello story                                                 | Proposed branch                          | Primary responsibility                                                                           |
| --------------------------- | ------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Basic template migration    | [Basic template](https://trello.com/c/iOcok0Vh)              | `codex/templates-basic`                  | Version the current layout as Basic with zero regression for existing profiles                   |
| Configuration contract      | [Configuration](https://trello.com/c/jza7Adut)               | `codex/templates-config`                 | Server-authorized template/theme/layout schema, persistence, migration, and entitlement boundary |
| Theme/template chooser      | [Chooser](https://trello.com/c/9FgcuzMp)                     | `codex/templates-chooser`                | First two onboarding steps, selection semantics, descriptions, thumbnails/previews               |
| Question engine             | [Questions](https://trello.com/c/W5UKvZCB)                   | `codex/templates-questions`              | Template-specific question registry, resumable state, validation, and content reuse              |
| Safe switching/preview      | [Preview and switching](https://trello.com/c/P9iL9tAQ)       | `codex/templates-preview`                | Exact preview, reordering diff, no-delete switching, missing-content states                      |
| Curated themes              | [Accessible themes](https://trello.com/c/AnCQMIKp)           | `codex/templates-themes`                 | Controlled tokens, approved fonts/colors, contrast matrix, responsive parity                     |
| Link presentation           | [Link media variants](https://trello.com/c/SSwAyK0l)         | `codex/templates-link-media`             | Small leading icon and large image-above-text variants in builder and public render              |
| Location map modal          | [Map modal](https://trello.com/c/dBm2P8vz)                   | `codex/templates-map-modal`              | Accessible location-triggered map/details modal with booking/contact context                     |
| Direct Booking              | [Direct Booking](https://trello.com/c/VbpqjxnF)              | `codex/template-direct-booking`          | Minimal one-goal solo-practitioner template                                                      |
| Location/Provider Router    | [Location Router](https://trello.com/c/ILBuK8x8)             | `codex/template-location-router`         | Intent selector plus location/provider-specific detail and actions                               |
| Services Catalogue          | [Services Catalogue](https://trello.com/c/cLfaiq0Y)          | `codex/template-services-catalogue`      | Featured services, grouped categories, and progressive disclosure                                |
| Cosmetic Transformation     | [Cosmetic Transformation](https://trello.com/c/qFnV6I6Y)     | `codex/template-cosmetic-transformation` | Hero, consultation, signature treatment, results, proof, and financing                           |
| Trust-First Family Practice | [Trust-First Family Practice](https://trello.com/c/FJYngKlu) | `codex/template-trust-family`            | Reassurance, reviews, team, services, payment, and practical details                             |
| Specialist Assessment       | [Specialist Assessment](https://trello.com/c/2vdssI92)       | `codex/template-specialist-assessment`   | Assessment/consultation, eligibility, results, emergency, and education                          |
| Expert and Educator         | [Expert and Educator](https://trello.com/c/rRqitZfX)         | `codex/template-expert-educator`         | Patient/professional audience paths, credentials, press, resources, and events                   |
| Clinic and Commerce         | [Clinic and Commerce](https://trello.com/c/wgAMPmL3)         | `codex/template-clinic-commerce`         | Patient-first clinical funnel plus distinctly presented shop/course content                      |

## Dependency and merge sequence

### Wave 0 — contract and compatibility

- Configuration contract.
- Basic template migration.

These establish the serialized configuration and prove that existing profiles remain unchanged. Both must merge into the feature branch before template renderers depend on persisted selections.

### Wave 1 — onboarding shell and shared appearance

- Curated themes.
- Theme/template chooser.
- Template-specific question engine.
- Safe switching and live preview.

These can be developed in parallel after the configuration contract is stable. The chooser and question engine share types through the contract, never by importing another worktree's unmerged client implementation.

### Wave 2 — shared public presentation

- Link icon/featured-image variants.
- Accessible location map modal.

These are template-independent capabilities. They merge before templates that reference them so templates do not create private competing link or map components.

### Wave 3 — template renderers

Develop the eight templates in parallel worktrees after Basic, contract, and the shared capability they require are merged:

- Direct Booking.
- Location or Provider Router.
- Services Catalogue.
- Cosmetic Transformation.
- Trust-First Family Practice.
- Specialist Assessment.
- Expert and Educator.
- Clinic and Commerce.

Each renderer consumes one shared normalized public-profile view model and project-owned analytics adapters. It may compose new route-private presentation components but cannot introduce parallel mutation routes or public data reads.

### Wave 4 — integrated onboarding and release gate

- Exercise theme → template → questions → preview → publish for all nine templates, including Basic.
- Verify switching theme preserves order and switching template preserves content/entity IDs.
- Verify Free/Pro gating at UI and server boundaries.
- Run production build, complete Playwright flows, axe, mobile/desktop visual review, and public/custom-domain checks.

## Worktree and subagent protocol

1. The main agent creates the feature branch, proposed as `codex/profile-template-system`, from the approved `develop` baseline.
2. Every story receives a dedicated worktree and `codex/` story branch. A subagent owns only that story's declared files and coordinates shared-file edits before changing them.
3. Every subagent begins by reading its Trello story, repository instructions, relevant skills, the configuration contract, and this plan.
4. Commits stay small and responsibility-focused: contract/data, UI, analytics, tests, and documentation should be separate when independently reviewable.
5. A subagent rebases onto the latest feature branch and runs its focused nonvisual verification before requesting review.
6. The main agent runs each candidate branch locally on **port 3000** and inspects the relevant onboarding and public-profile flows. Port-3000 UI approval is serialized even when code work occurs in parallel.
7. Visual findings return to the same story worktree as explicit follow-up tasks. The branch is reverified after changes.
8. The main agent merges the story branch into the feature branch only after code review, local visual approval, analytics/a11y review, and focused tests pass.
9. Trello moves to Dev done only after the merged feature-branch state is read back and the story's evidence is recorded.

## Global story contract

Every implementation story must satisfy these conditions in addition to its template-specific criteria:

- Reuse `public.public_profiles` for anonymous reads and existing authorized builder actions for owner writes.
- Keep Server Components as the default and client boundaries small.
- Use project-owned shadcn primitives and preserve native link/button semantics.
- Use controlled analytics descriptors, immutable profile/entity IDs, and one-based visible positions after template ordering/filtering.
- Keep preview/test context explicit and production analytics transport disabled.
- Never send free-form labels, destinations, contact details, clinical content, or onboarding answers in analytics.
- Support loading, missing optional content, validation failure, persistence failure, and entitlement denial explicitly.
- Preserve content and stable IDs across theme/template changes; no silent deletion or reset.
- Maintain one logical `main` landmark, heading order, keyboard access, reduced motion, text zoom, focus visibility, and WCAG AA contrast.
- Prove published/preview parity on mobile and desktop.

## UI approval checklist

For every story's port-3000 review, the main agent checks:

1. The first viewport communicates identity, positioning, and one primary action without crowding.
2. Section order matches the Trello story and template design.
3. Long names, missing optional sections, many list items, and realistic seeded content remain coherent.
4. Mobile layout has no horizontal page overflow or obscured sticky actions.
5. Keyboard order follows semantic reading order and dialogs restore focus.
6. Color, typography, media crops, and button emphasis match the selected theme without changing content semantics.
7. Dashboard preview matches the published profile for the same saved configuration.
8. Relevant actions emit the expected controlled analytics descriptors without delaying navigation.

## Verification proportion

- **Contract/data stories:** schema/unit tests, migration tests, permission/entitlement checks, generated types, typecheck, lint, build.
- **Onboarding stories:** component tests, validation/resume/failure coverage, Playwright theme/template/question flows, axe, mobile/desktop review.
- **Shared presentation stories:** semantic interaction tests, upload/media validation where applicable, public/preview Playwright, analytics descriptors, axe.
- **Template stories:** exact module-order tests, missing/hidden/list-position fixtures, public/preview parity, analytics, mobile/desktop Playwright, axe.
- **Final feature branch:** Prettier, full unit suite, typecheck, lint, production build, complete relevant Playwright suite, axe, and manual visual review.

## Explicit exclusions from individual template stories

- A template story does not create its own content database, mutation API, analytics vocabulary, theme engine, link card system, or map dialog.
- Arbitrary drag-anywhere page builders are not part of the first release.
- Owners cannot upload fonts or bypass the controlled contrast matrix.
- Production analytics ingestion, conversion dashboards, and unrelated entitlement redesign remain separate epics.
