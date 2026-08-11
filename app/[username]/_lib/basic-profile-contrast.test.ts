import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  getContrastRatio,
  PROFILE_THEMES,
} from "@/lib/profile-presentation/themes";

const AA_NORMAL_TEXT_CONTRAST = 4.5;

async function read(relativePath: string) {
  return readFile(join(process.cwd(), relativePath), "utf8");
}

describe("Basic public-profile secondary text contrast", () => {
  test("routes legacy Basic secondary selectors through the controlled theme token", async () => {
    const css = await read("app/[username]/link-page.css");

    expect(css).toContain(
      "--gray-primary: var(--profile-text-muted, var(--muted-foreground));",
    );
    expect(css).toContain(
      "--lighter-gray: var(--profile-text-muted, var(--muted-foreground));",
    );
    expect(css).not.toContain("#989898");
    expect(css).not.toContain("#9d9d9d");
  });

  test("uses semantic theme tokens for gallery and review copy and actions", async () => {
    const [gallery, reviewItem, reviewContent] = await Promise.all([
      read("app/[username]/components/GalleryImage.tsx"),
      read("app/[username]/components/ReviewItem.tsx"),
      read("app/[username]/components/Basic/ReviewContent.tsx"),
    ]);

    expect(gallery).toContain("text-[var(--profile-text-muted)]");
    expect(gallery).not.toContain("text-gray-input");
    expect(
      reviewItem.match(/text-\[var\(--profile-text-muted\)\]/g),
    ).toHaveLength(2);
    expect(reviewItem).not.toContain("text-gray-text");
    expect(reviewContent).toContain("text-[var(--profile-text-muted)]");
    expect(reviewContent.match(/text-\[var\(--profile-link\)\]/g)).toHaveLength(
      2,
    );
    expect(reviewContent).not.toContain("text-gray-text");
    expect(reviewContent).not.toContain("text-blue-500");
  });

  test("keeps secondary text and links readable on every controlled profile surface", () => {
    for (const theme of Object.values(PROFILE_THEMES)) {
      for (const background of [
        theme.tokens.pageBackground,
        theme.tokens.surface,
      ]) {
        expect(
          getContrastRatio(theme.tokens.textMuted, background),
          `${theme.id} secondary text`,
        ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT_CONTRAST);
        expect(
          getContrastRatio(theme.tokens.link, background),
          `${theme.id} review action`,
        ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT_CONTRAST);
      }
    }
  });
});
