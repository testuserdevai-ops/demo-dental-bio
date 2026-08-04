# Dashboard E2E coverage

All mutation tests use a unique `e2e-<timestamp>-<worker>-<uuid>` tenant. The service-role key is read only by Node-side fixtures. Remote projects are rejected unless explicitly opted in, and browser code receives only the normal anonymous key. The `dashboard-setup` Playwright project proves the local authenticated lifecycle before Chromium specs run; feature workers still log in as separate tenants so no storage state or database rows are shared. Cleanup removes child rows, profile rows, the public user, and the exact Auth user.

## Phase 6 foundation checkpoint

Navigation readiness now waits for the server-rendered Settings landmark rather
than a duplicate `POST /api/user` request. The focused Chromium command ran on
2026-08-04 from the fresh foundation gate at `6540e13`, with Bun exposed to
Playwright and an isolated test-server port. Dashboard setup, keyboard
navigation for every sidebar destination, account-page axe scans, and the
registration calendar-dialog contrast scan pass 21/21. A separate safe
`env -i`, local-only production build used local Supabase and non-secret
placeholders only, generated 87/87 entries, and did not contact production or
mutate external providers.

The same fresh gate replayed 24 synced local migrations through
`20260804024001` and passed 89/89 pgTAP assertions across two files. Generated
database types matched exactly at 1,646 lines and SHA-256
`d90c727f5eed4bc0b486e55d2e8e948e31080c994786d224df511e0061322ca5`.
Bun passed 362/362 tests with 1,201 assertions across 67 files;
non-incremental TypeScript passed; ESLint reported 0 errors and 85 warnings
against the Phase 5 baseline of 87; tracked Prettier passed 552/552; and
`git diff --check` was clean. The two unchanged pre-Phase6 database-lint
diagnostics were not introduced by this branch. Ignored SDD working briefs are
not included in tracked-format verification.

| Page                  | Route                     | Navigation/load | Empty/populated     | Validation/failure preservation                          | CRUD/persistence                                   | Safe external boundary                     |
| --------------------- | ------------------------- | --------------- | ------------------- | -------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------ |
| Bio                   | `/dashboard`              | Covered         | Seeded profile      | Required, format, controlled 500                         | Profile + social save/reload                       | Preview only                               |
| Locations             | `/dashboard/location`     | Covered         | Seeded baseline     | Required heading                                         | Heading save/reload                                | No map provider mutation                   |
| Treatments / Services | `/dashboard/treatments`   | Covered         | Empty + populated   | Required, 200-char edge, controlled POST/DELETE failures | Create, reset, edit, cancel, delete, reload        | N/A                                        |
| Links                 | `/dashboard/links`        | Covered         | Empty + populated   | Required title and URL format                            | Group/link create + reload                         | N/A                                        |
| Blogs                 | `/dashboard/blog`         | Covered         | Empty + populated   | Required group/post title                                | Group/post create + reload                         | Editor payload kept minimal                |
| Gallery               | `/dashboard/gallery`      | Covered         | Empty + populated   | Required text and both images                            | Real local uploads, create, cancel, delete, reload | Local Storage only                         |
| Reviews               | `/dashboard/review`       | Covered         | Empty + populated   | Required fields                                          | Create, cancel, reload                             | External review import untouched           |
| Videos                | `/dashboard/video`        | Covered         | Empty + populated   | Required and provider URL format                         | Group/video create + reload                        | No provider API call                       |
| Shop                  | `/dashboard/shop`         | Covered         | Empty + populated   | Required product fields                                  | Create, cancel, reload                             | No checkout or Stripe write                |
| Verification          | `/dashboard/verification` | Covered         | Not-started state   | Controlled 503                                           | Safe rendering only                                | Veriff intercepted; no redirect            |
| Referral              | `/dashboard/referral`     | Covered         | N/A                 | Invalid email/no transmission                            | Clipboard copy only                                | Email/share not sent                       |
| Custom Domain         | `/dashboard/domain`       | Covered         | Detached state      | Required + controlled 422 preservation                   | No attachment                                      | DNS/Vercel intercepted                     |
| Subscription          | `/dashboard/subscription` | Covered         | Plan, card, invoice | Cancel confirmation/dismissal                            | Rendering only                                     | Stripe details mocked; no billing mutation |
| Settings              | `/dashboard/settings`     | Covered         | Seeded account      | Required and character validation                        | Safe name save + DB/reload verification            | Password/email/delete never confirmed      |

Every sidebar entry is also exercised independently with keyboard activation and an exact route assertion. Dialog coverage includes cancel/close behavior; Radix and confirmation dialogs additionally assert Escape and focus restoration. Destructive account, billing, DNS, email, and identity-verification actions intentionally stop at the confirmation or intercepted network boundary.
