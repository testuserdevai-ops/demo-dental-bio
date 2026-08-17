import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

describe("Clinic and Commerce gallery copy policy", () => {
  test("does not invent template-authored gallery headings or case labels", async () => {
    const source = await readFile(
      resolve(
        process.cwd(),
        "app/[username]/_components/ClinicCommerceGallerySection.tsx",
      ),
      "utf8",
    );
    expect(source).not.toMatch(
      />\s*(?:Clinic and results|Gallery|Before and after|General gallery)\s*</,
    );
    expect(source).not.toMatch(/\?\?\s*["'](?:Before|After|Gallery)["']/);
    expect(source).toContain("galleryCase.title");
    expect(source).toContain("galleryCase.beforeLabel");
    expect(source).toContain("galleryCase.afterLabel");
    expect(source).toContain("image.title");
  });
});
