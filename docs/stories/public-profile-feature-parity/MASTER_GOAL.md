# Master goal prompt: public-profile feature parity

Copy the prompt below into a new Codex goal.

---

You are the master integration agent for DentalBio public-profile feature parity.

## Objective

Deliver every story indexed in
`docs/stories/public-profile-feature-parity/README.md` so every public
template supports every owner-managed feature when eligible dashboard content
exists:

- treatments;
- services;
- links;
- blogs;
- videos;
- reviews and external review pages;
- shop products;
- before/after and general galleries; and
- locations, including owner-managed per-location images.

Templates may keep distinct UI, grouping, emphasis, treatment/service ordering,
and responsive layouts. Those presentation choices must not cap, consume, hide,
or silently invalidate eligible content. Treatment and Service primary section
titles come from the two owner inputs on `/dashboard/treatments`; template copy
may supplement them. Every location image is managed on that location's
dashboard create/edit form and belongs to that location.

Template content must be owner-managed rather than embedded as static product
copy. If a feature story introduces template-specific copy or imagery, add the
corresponding dashboard input and show that input only when the selected
template uses it. Include the dashboard state in the story's before/after
evidence. Layout-only labels may remain controlled UI vocabulary, but they must
not replace owner content or silently become the public primary heading.

Completion means all 67 feature/template stories and both shared prerequisite
stories are implemented, reviewed, visually evidenced, merged into the master
integration branch, and represented by a final ready-for-review PR to canonical
`develop`.

## Authoritative inputs

Read completely before implementation:

1. repository `AGENTS.md`;
2. `docs/product/public-profile-template-feature-matrix.md`;
3. `docs/stories/public-profile-feature-parity/README.md`;
4. both files under
   `docs/stories/public-profile-feature-parity/shared/`; and
5. the individual story file before dispatching its implementation.

Use the story files as acceptance contracts. Do not narrow their scope to make
existing tests pass.

## Git and branch topology

1. Fetch remotes and verify that `digimaxhub/dentalbio:develop` is canonical.
2. Create or reuse a master integration branch named
   `codex/public-profile-feature-parity` from canonical `develop`.
3. Push the integration branch and keep it as the base for every story PR.
4. Create one isolated branch and worktree per story:
   `codex/<story-id-lowercase>`.
5. One story file equals one subagent implementation and one focused PR. Do not
   combine feature/template combinations.
6. Every story PR targets `codex/public-profile-feature-parity`, never
   `develop`.
7. Only the master agent may merge story PRs. Subagents commit, push, open the
   PR, report results, and stop.
8. After all stories are merged and the completion audit passes, open one final
   ready-for-review PR from the integration branch to canonical `develop`.
   Do not merge that final PR, update the fork's `develop`, deploy, or touch
   production data without separate authorization.

Never use destructive git commands. Preserve unrelated user changes.

## Agent and concurrency model

- The master agent owns planning, integration, the review environment,
  screenshots, merge decisions, and the final completion audit.
- Run no more than three implementation subagents concurrently, leaving the
  fourth slot for the master.
- Give every subagent one concrete story, its absolute isolated-worktree path,
  the integration base SHA, required skills, and explicit ownership boundaries.
- A subagent may edit only its assigned worktree and story scope.
- Reuse an implementer for review fixes until its PR passes; do not merge code
  that the master had to silently repair.
- Maintain a durable tracker containing story ID, branch, worktree, agent, base
  SHA, PR URL, CI state, screenshot state, Trello URL, review result, and merge
  SHA.
- If two stories touch the same template renderer, selector, test, seed, or
  shared primitive, do not implement them concurrently. Queue them and rebase
  the later story after the earlier merge.
- Independent templates/features may run in parallel.

## Dependency waves

### Wave 0: baseline and visual fixture

- Start from the canonical integration branch.
- Verify the rich local profile has eligible data for every feature, adding
  deterministic local-only fixture data if necessary.
- Record the nine public routes/usernames, selected templates, desktop/mobile
  viewports, themes, and per-feature scroll targets.
- Start the master-owned dev environment on port 3001 and verify dashboard and
  public routes.
- Capture baseline screenshots on demand immediately before reviewing each
  story, using the current integration branch.

### Wave 1: shared prerequisites

Implement and merge in this order:

1. `shared/treatment-service-section-titles.md`;
2. `shared/location-images.md`.

Run Supabase migrations, generated types, security checks, public data-boundary
tests, dashboard tests, preview-refresh tests, Playwright, and axe required by
those stories before dependent work begins.

### Wave 2: feature/template stories

- Treatments and Services stories depend on the section-title PR.
- Locations stories depend on the location-image PR.
- Links, Blogs, Videos, Reviews, Shop, and Gallery stories may begin when their
  touched files do not collide with an active story.
- Prefer vertical slices: selector/view-model adaptation, template renderer,
  controlled analytics, focused tests, seed coverage, Playwright, and docs in
  the same story PR.
- Preserve special template UI while proving complete inventory visibility.

### Wave 3: cross-template regression

After every story PR is merged:

- run the full feature/template matrix against all nine templates;
- prove counts beyond former caps;
- prove reload persistence and immediate dashboard preview refresh;
- run desktop and mobile Playwright flows;
- run axe across every public template;
- run Prettier, typecheck, lint, unit tests, production build, and the complete
  relevant Playwright suite;
- inspect Supabase security/advisor output for introduced schema, RPC, storage,
  RLS, view, or trigger issues; and
- update the feature matrix from current gaps to the verified final state.

## Subagent dispatch prompt

For each story, send the implementer a prompt containing all of the following:

> Implement exactly story `<story-path>` in worktree `<absolute-path>`,
> based on integration SHA `<sha>`. Read AGENTS.md, the feature-parity README,
> both applicable shared contracts, and the complete story. Preserve the
> public/private Supabase boundary and analytics contract. Add proportional
> unit, component, Playwright, mobile, accessibility, seed, and database
> coverage. Run the story's verification gates. Create or update exactly one
> prioritized Trello story using the classification required by the story file,
> and verify it after adding commit/PR references.
> Commit, push branch `<branch>`, and open a focused PR targeting
> `codex/public-profile-feature-parity`. Do not merge. Return the PR URL,
> commit SHA, changed files, test results, known risks, Trello URL, public route,
> and exact screenshot scroll target.

When a story does not touch Supabase, omit database mutation work but still
verify the existing public query contains the required data.

## Master review gate for every PR

Do not merge until all checks below pass.

### Scope and code review

- Diff matches exactly one story and does not hide content elsewhere.
- Server Components remain the default and client boundaries stay small.
- Shared components are reused where appropriate without flattening the
  template's intended visual identity.
- No fixed cap, featured selector, title classification, first-item shortcut,
  or hero consumption remains as an eligibility gate for the story feature.
- Empty and invalid records follow public data policy.
- Native semantics, accessibility, and tracking-failure independence hold.
- Controlled analytics use immutable IDs and one-based visible positions.
- Production analytics emission remains disabled.
- Public reads do not expose `public.users`; no code writes directly to
  `public_profiles`.

### Automated verification

- Inspect the tests to prove they cover the story rather than trusting a green
  command alone.
- Run focused tests and all proportional gates declared in the story.
- Require CI to be green against the current integration base.
- Rebase and rerun when an earlier merge changes shared files.

### Visual review and PR screenshots

The master agent, not the subagent, owns final screenshots:

1. Stop any process using port 3001.
2. In the master review worktree, run the current integration branch on port
   3001 with the deterministic local seed.
3. Open the target public route and capture the **Before** screenshot at the
   recorded viewport and scroll target.
4. Stop the server, check out the PR head in the review worktree, apply the same
   database state/migrations needed by the PR, and restart on port 3001.
5. Capture the **After** screenshot with the identical route, seed profile,
   theme, viewport, and scroll target.
6. Capture both desktop and mobile when responsive layout changes.
7. Visually inspect overflow, truncation, spacing, ordering, headings, images,
   empty states, focus behavior, and nearby sections.
8. Upload the images to the PR body or a PR comment through the authenticated
   GitHub UI/connector and add captions containing story ID, route, username,
   viewport, theme, and the acceptance criterion demonstrated. Local file paths
   are not acceptable.
9. If direct PR attachment is temporarily unavailable, do not merge; use the
   authenticated in-app GitHub web UI to upload the files rather than replacing
   them with prose.
10. Return the review worktree and database to the integration branch before
    reviewing the next PR.

### Trello and merge

- Read back the story's Trello card and verify unique title, Done 🎉 list,
  exactly one priority label and the required Bug classification,
  plain-language description, commit SHA, and PR URL.
- Post the master review result on the PR.
- Merge only after code, CI, screenshots, accessibility, and Trello all pass.
- Record the merge SHA and remove the finished worktree safely.
- Update the durable tracker before dispatching the next conflicting story.

## Completion audit

Before opening the final integration PR, derive a checklist from all 69 story
files and prove each item with current evidence.

At minimum, verify for every template and every feature:

- eligible inventory count in the database;
- rendered public count and stable IDs;
- no fixed cap or silent classification loss;
- template-specific ordering is deterministic;
- owner treatment/service titles are shown as accessible primary headings;
- all locations are reachable and use their own optional images;
- all reviews and all external review pages are represented;
- general-gallery hero reuse does not consume the gallery inventory;
- dashboard mutations persist after reload and refresh the preview once;
- desktop/mobile visual evidence exists on its story PR;
- automated coverage and axe pass; and
- the associated Trello story and merge SHA are recorded.

Treat missing, indirect, stale, or partial evidence as incomplete. Continue
working until every story is merged and the full matrix passes.

## Final deliverables

Return:

1. integration branch name and head SHA;
2. final PR URL targeting canonical `develop`;
3. tracker summary with all story PRs and merge SHAs;
4. screenshot evidence index;
5. Trello story index;
6. database migrations and security verification summary;
7. complete test/build/Playwright/axe results;
8. updated final feature matrix; and
9. any explicitly deferred work—expected to be empty.

Do not claim completion merely because all PRs were opened. Completion requires
all story PRs merged into the integration branch, the cross-template matrix
verified, and the final integration PR ready for review.

---
