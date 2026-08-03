# Share modal vector icons

## Goal

Replace the low-resolution raster icons in the public profile share modal with
crisp vector icons, without changing the available share actions or their
analytics behavior.

## Design

`app/[username]/components/ShareModal.tsx` will import the matching icons from
the existing `@phosphor-icons/react` dependency and render them at 32px with
the existing `modal-icons` class. The affected actions are copy, LinkedIn,
Facebook, WhatsApp, Messenger, and email.

The modal layout, accessible labels, share URLs, external-link attributes,
clipboard behavior, and controlled analytics descriptors remain unchanged.

## Verification

Add focused component coverage that opens the modal and confirms each action
keeps its accessible name and uses an SVG icon rather than an image asset.
Run formatting, the relevant unit tests, lint/typecheck, and production build
where the project scripts support them.
