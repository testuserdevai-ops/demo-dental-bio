# Independent review: static contract fixes `2ce8f3c7`

Reviewed commit: `2ce8f3c7cc7ae6849b34db9b1ebea0130f586cb1`
Review scope: the four changed static contract tests only; implementation was not edited.

## Verdict

Approved. No Medium-or-higher findings.

The changes update source-level contracts to follow the actual shared-component
architecture without dropping the behavioral guarantees that the previous
assertions intended to protect.

## Contract audit

- **Treatment/service and preview anchors:** Direct Booking, Services Catalogue,
  and Clinic Commerce are still required to render
  `ProfileTreatmentServiceSections`; the shared component is independently
  required to own the dynamic `treatments`/`services` anchor selection. Direct
  Booking and Expert Educator are also tied to the shared `WorkLocation` and
  `ProfileLinksSection` owners of their anchors. This reflects the rendered
  component tree rather than requiring duplicated IDs in template parents.
- **Shared video/product reuse:** the foundation contract discovers every
  concrete `*ProfileTemplate.tsx` parent (excluding only the router/composition
  `PublicProfileTemplate.tsx`) and requires both shared imports. The current set
  is all nine templates. The pre-existing uncapped/selector-owned checks remain;
  no assertion was removed from that portion.
- **Location consumers:** all nine current location surfaces are covered: eight
  templates must use `WorkLocation`, whose source must use `LocationImage`, and
  Location Router must use `LocationImage` directly. Clinic Commerce is now
  explicitly required to use the shared section and forbidden from duplicating
  the lower-level image component.
- **Failure, draft, reload, and persistence evidence:** the static AST contract
  continues to require the complete video and shop mutation scenario lists,
  exactly one mutation call and exactly one preview reload on success, zero
  reload on returned failure, rejected edit-draft retention, validation and
  delete-cancel zero-reload evidence, full-page persistence reloads, exact
  reordered entity references, and retained enabled-state references. The E2E
  failure evidence now matches the real plan-revocation path through
  `createAdminClient`; both specs restore the plan in `finally`, retain the
  entered draft, show an explicit failure message, and compare the preview load
  count to `beforeRejectedSave`.
- **Duplicate reload guard:** each of `video.spec.ts` and `shop.spec.ts` contains
  exactly one `waitForTimeout` call, and the contract requires its sole argument
  to be exactly `150`. In both specs it follows the poll for the first reload and
  precedes the assertion that the count remains `before + 1`, so it detects a
  delayed duplicate rather than masking synchronization.
- **Overlay contract:** the three next-wave seed files remain required in exact
  deterministic application order and are now required to contain real
  location, product, and group inserts, accurately replacing the obsolete
  comment-only placeholder contract.

## Verification

- `bun test <4 changed contracts> <VideoManager.test.tsx> <ProductManager.test.tsx> --preload ./test/setup.ts --isolate` — **passed**, 51 tests, 278 expectations.
- `bunx eslint <4 changed contract files>` — **passed**.
- `bunx prettier --check <4 changed contract files>` — **passed**.
- `git diff --check 2ce8f3c7^ 2ce8f3c7` — **passed**.
- `git show --check --oneline --no-renames 2ce8f3c7` — **passed**.

An initial direct `bun test` invocation that also included the two React manager
tests omitted the repository's required DOM preloader and therefore produced
`document is not defined`; rerunning with the package-script-equivalent
`--preload ./test/setup.ts --isolate` passed all 51 tests. This was a review
command-environment error, not a product or commit failure.
