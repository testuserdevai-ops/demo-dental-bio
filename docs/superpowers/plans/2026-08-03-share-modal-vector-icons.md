# Share Modal Vector Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace pixelated raster share-action icons with crisp vector icons in the public profile share modal.

**Architecture:** Keep `ShareModal` as the single owner of modal presentation and its tracked share actions. Replace only its image nodes with Phosphor React SVG components from the existing dependency; routes, copy behaviour, link semantics, and controlled analytics descriptors remain unchanged.

**Tech Stack:** Next.js App Router, React 19, TypeScript, `@phosphor-icons/react`, Bun test, Testing Library.

## Global Constraints

- Preserve the current public share targets: copy, LinkedIn, Facebook, WhatsApp, Messenger, and email.
- Preserve native links/buttons, accessible names, URLs, and existing `TrackedLink`/`TrackedButton` analytics descriptors.
- Render all replacement icons at 32px and retain the existing `modal-icons` presentation class.
- Do not add dependencies or enable analytics transport.

---

### Task 1: Cover vector share icons

**Files:**

- Create: `app/[username]/components/ShareModal.test.tsx`
- Modify: none

**Interfaces:**

- Consumes: `ShareModal` with `{ username: string }`.
- Produces: test coverage proving visible share action names remain available and their icon containers are SVGs.

- [ ] **Step 1: Write the failing component test**

```tsx
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ShareModal from "./ShareModal";

afterEach(cleanup);

describe("ShareModal", () => {
  test("renders vector icons for every share action", () => {
    render(<ShareModal username="dr-smith" />);
    fireEvent.click(screen.getByRole("button", { name: "Share profile" }));

    for (const name of [
      "Copy dentalbio",
      "Share on LinkedIn",
      "Share on Facebook",
      "Share via Whatsapp",
      "Share via Messenger",
      "Share via Email",
    ]) {
      expect(
        screen.getByRole(name.startsWith("Copy") ? "button" : "link", { name }),
      ).toBeTruthy();
    }
    expect(document.querySelectorAll("svg.modal-icons")).toHaveLength(6);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test app/[username]/components/ShareModal.test.tsx --preload ./test/setup.ts`

Expected: FAIL because the six `.modal-icons` elements are currently `<img>` elements, not SVGs.

- [ ] **Step 3: Replace raster image imports with Phosphor icons**

In `app/[username]/components/ShareModal.tsx`, extend the existing Phosphor import with `Copy`, `EnvelopeSimple`, `FacebookLogo`, `LinkedinLogo`, `MessengerLogo`, and `WhatsappLogo`. Replace the six `<Image>` nodes in the share-action rows with their matching icon component:

```tsx
<LinkedinLogo
  aria-hidden="true"
  size={32}
  weight="fill"
  className="modal-icons"
/>
```

Apply this same structure using `Copy`, `FacebookLogo`, `WhatsappLogo`, `MessengerLogo`, and `EnvelopeSimple` in their respective rows. Remove the now-unused `SafeImage` import. Leave the `TrackedLink`/`TrackedButton`, `href`, `target`, `rel`, event descriptors, and visible headings unchanged.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `bun test app/[username]/components/ShareModal.test.tsx --preload ./test/setup.ts`

Expected: PASS, confirming all six action names remain present and all six icons render as SVGs.

- [ ] **Step 5: Commit the implementation**

```bash
git add app/[username]/components/ShareModal.tsx app/[username]/components/ShareModal.test.tsx
git commit -m "fix: use vector icons in share modal"
```

### Task 2: Verify the focused public interaction change

**Files:**

- Modify: none
- Test: `app/[username]/components/ShareModal.test.tsx`

**Interfaces:**

- Consumes: the six unchanged action controls supplied by `ShareModal`.
- Produces: verification evidence that the focused UI change formats, typechecks, lints, tests, and builds cleanly.

- [ ] **Step 1: Format edited files**

Run: `bunx prettier --write app/[username]/components/ShareModal.tsx app/[username]/components/ShareModal.test.tsx docs/superpowers/plans/2026-08-03-share-modal-vector-icons.md`

Expected: Prettier completes without errors.

- [ ] **Step 2: Run focused unit coverage**

Run: `bun test app/[username]/components/ShareModal.test.tsx --preload ./test/setup.ts`

Expected: PASS.

- [ ] **Step 3: Run static checks and production build**

Run: `bun run typecheck && bun run lint && bun run build`

Expected: each command exits 0.

- [ ] **Step 4: Verify diff scope**

Run: `git diff HEAD~1 -- app/[username]/components/ShareModal.tsx app/[username]/components/ShareModal.test.tsx`

Expected: only the raster-to-vector icon replacement and its focused test are present; analytics and link/button semantics are unchanged.
