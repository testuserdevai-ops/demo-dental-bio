import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("admin server component boundaries", () => {
  it("keeps the overview link styling independent of the client button module", () => {
    const overview = read("./AdminOverview.tsx");
    const variants = read("../../components/ui/button-variants.ts");

    expect(overview).toContain('from "@/app/components/ui/button-variants"');
    expect(overview).not.toContain('from "@/app/components/ui/button"');
    expect(variants).not.toContain("@phosphor-icons/react");
    expect(variants).not.toContain('from "react"');
  });

  it("uses the server icon entry point in the overview", () => {
    const overview = read("./AdminOverview.tsx");

    expect(overview).toContain('from "@phosphor-icons/react/dist/ssr"');
    expect(overview).not.toContain('from "@phosphor-icons/react"');
  });
});
