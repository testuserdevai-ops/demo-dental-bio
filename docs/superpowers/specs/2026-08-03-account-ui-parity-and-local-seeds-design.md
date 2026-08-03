# Account UI Parity and Local Seeds Design

## Context

Phase 5 modernized account-entry forms but removed two user-visible behaviors:
the registration birthday calendar and the username-availability celebration.
The login and admin-login pages also disable submission for 60 seconds after
three failures without replacing the previous error or exposing the remaining
wait. Local Supabase is configured to run `supabase/seed.sql` after migrations,
but that file does not exist, so a reset creates no stable login fixtures.

This follow-up restores parity without reverting to the legacy component
system, weakening authentication, or contacting production services.

## Decisions

### Registration availability header

For a valid `username` query parameter, render this semantic sequence above
the form:

- Eyebrow: `Congratulations!`
- Branded profile address: `<registered domain>/<username>`
- Supporting text: `is available, make it yours:`
- Page heading: `Almost there`

The address uses the already resolved brand domain, not a hardcoded
`dental.bio`, so white-label registration remains correct. Use a compact
responsive stack with deliberate spacing: small supporting copy, a
line-wrapping `text-2xl`/`sm:text-3xl` address, and a `text-3xl`/`sm:text-4xl`
heading. The form remains `max-w-xl`; no negative margins are used. The OTP
step retains `Verify your email` as its page heading and does not repeat the
availability celebration.

### Date of birth calendar

Keep the current text input and `DD/MM/YYYY` normalization so keyboard entry,
paste, password managers, and the shared Zod contract continue to work. Add a
separately named `Open date of birth calendar` button beside the input. Build
an owned shadcn-style `Calendar` primitive in `app/components/ui/calendar.tsx`,
backed by the already installed `react-day-picker`, and render it in the
existing owned Radix/shadcn Dialog. Registration-specific date limits stay in
the route component rather than the shared primitive. This avoids restoring
the legacy 500-line `CustomInput`, embedding raw third-party markup in a form,
or adding a second overlay system.

The dialog has a title and description, traps/restores focus through the
owned Dialog primitive, closes on Escape/cancel/selection, and returns focus to
the calendar button. Dates after the latest valid adult birthday are disabled.
The selectable range starts 100 years before that cutoff. Selecting a day
writes the same `DD/MM/YYYY` string expected by the form and closes the dialog.
Manual input remains editable when the dialog is closed.

### Login lockout feedback

Preserve the existing client-side policy: the third unsuccessful submission
starts a 60-second local lockout. This UI safeguard does not replace Supabase
rate limits or server-side abuse controls.

Normal and admin login share one focused lockout hook/component contract so
their behavior cannot drift. While locked:

- show a focused form Alert titled `Please wait before trying again`;
- announce `Too many unsuccessful attempts. Try again in N seconds.` through
  an assertive live region when the lock begins, then update the visible
  countdown without repeatedly stealing focus;
- label the disabled submit button `Try again in N seconds`;
- restore the lock and its visible countdown after reload;
- at zero, clear persisted state, remove the lockout Alert, and restore
  `Log In` without clearing the entered email or password.

The two login routes retain their existing local-storage keys and therefore
their current shared lockout behavior. Authentication failures remain generic;
no Supabase error details are exposed.

### Local Supabase accounts

Add the missing committed `supabase/seed.sql`. It is data-only and runs after
all migrations during local `supabase db reset`. It creates fixed, confirmed
Auth users and matching email identities with bcrypt hashes, allowing the
normal Supabase password endpoint to authenticate them. The existing auth
trigger creates their public profiles; the seed then assigns only the intended
local roles/entitlements.

Credentials are intentionally public development fixtures:

| Account | Email                   | Password             | Username     | Public role/status |
| ------- | ----------------------- | -------------------- | ------------ | ------------------ |
| Pro     | `pro@dentalbio.local`   | `DentalBioPro123!`   | `pro-user`   | `user` / `PRO`     |
| Admin   | `admin@dentalbio.local` | `DentalBioAdmin123!` | `admin-user` | `admin` / null     |

Use fixed UUIDs, `ON CONFLICT` guards, `raw_app_meta_data` containing only the
email provider, and non-authorizing profile metadata. Do not seed Stripe IDs,
subscription IDs, customer IDs, tokens, or production-looking data. Add a
short local-development section to the repository documentation listing the
credentials and warning never to use `--include-seed` on production.

Verification must reset only the local database, authenticate both accounts
through local Supabase Auth, and assert the Pro status and admin role from
`public.users`.

### Agent and Trello workflow

Add a concise rule to `AGENTS.md`: every bug fix must create or update exactly
one plain-language Trello Bug story through `$trello-api`, assign exactly one
priority, place it in `Done 🎉` only after verification, include the fixing
commit and PR links, and read the card back to verify title uniqueness, list,
priority, Bug label, description, and references.

This follow-up creates three separate stories after their commits exist:

1. Missing registration calendar and availability message — Medium, Bug.
2. Login could become disabled without explaining the wait — Medium, Bug.
3. Local database resets did not create usable test accounts — Low, Bug.

Each description explains impact and resolution for nontechnical readers. All
three reference the current Phase 5 PR and their exact fixing commits.

## Alternatives considered

1. **Recommended: enhance the modern components.** Keeps RHF/Zod, owned
   shadcn overlays, accessibility, and current server contracts while restoring
   only lost behavior.
2. **Restore the old registration input wholesale.** Fast visual parity, but
   reintroduces dense bespoke state, negative positioning, legacy styling, and
   duplicate validation. Rejected.
3. **Use a native `input[type=date]`.** Minimal code, but browser presentation
   and value formatting vary and conflict with the product's `DD/MM/YYYY`
   contract. Rejected.

## Testing

Follow strict red-green TDD:

- Registration component tests first fail for missing celebration copy,
  brand-aware address, calendar dialog semantics, cutoff, selection, Escape,
  focus restoration, and preserved manual entry.
- Login/admin-login component tests first fail for the initial lockout Alert,
  countdown button/notice, reload restoration, expiry, and value preservation.
- A seed verification script or SQL assertion first fails because
  `supabase/seed.sql` is missing, then a clean local reset proves both password
  logins and public role/status values.
- Extend Playwright account-entry coverage for the registration header,
  keyboard calendar selection, and visible lockout countdown.
- Run touched Prettier, diff checks, focused tests, full unit tests,
  non-incremental typecheck, lint, production build, full Playwright/axe, and a
  clean local Supabase reset.

Account/editor interactions remain excluded from public-profile conversion
analytics under the existing analytics contract; no tracking adapter is added.

## Rollback

The UI changes are additive and can be reverted without schema changes. The
seed file affects local resets only; removing it returns local reset behavior
to an empty database. Trello stories remain as historical delivery records.
