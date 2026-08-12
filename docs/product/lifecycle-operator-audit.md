# Lifecycle operator audit

`/admin/lifecycle` is a read-only, full-admin operator surface for inspecting one
owner's lifecycle delivery policy and recent audit history.

## Authoritative boundary

The page requires `console:admin` before reading data. It uses only the existing
authenticated RPCs:

- `get_lifecycle_preferences(owner UUID)` for the current delivery preference,
  unsubscribe, support-pause, permanent-failure, revision, and update state;
- `get_lifecycle_audit(owner UUID, 100)` for the latest controlled campaign,
  outcome, reason code, and UTC occurrence time.

It does not read lifecycle tables directly, claim or complete messages, edit
preferences, send email, or alter lifecycle migrations. Local campaign,
outcome, and display-limit filters operate only inside that latest 100-event
window. An empty filtered list therefore means “no match in the fetched
window,” not “this never happened.” A rejected or unavailable RPC is shown as
unavailable and is never converted to an empty history.

## Privacy and analytics

Lookup accepts an internal owner UUID only. The UI deliberately has no owner
search and does not display or place email addresses, profile names, message
content, clinical values, or destination URLs in query parameters. Audit reason
codes are rendered only after the controlled server row passes the strict
lifecycle contract.

The owner UUID is still privileged operational data: access remains admin-only,
and operators should not share bookmarked audit URLs outside approved support
workflows.

This admin form, filters, navigation, and read-only audit inspection are excluded
from public owner-profile conversion analytics. No analytics adapter or
production emission is added.
