import { describe, expect, it } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const repositoryRoot = process.cwd();

async function sourceFilesContaining(
  needle: string,
  directory = repositoryRoot,
): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if ([".git", ".next", "node_modules"].includes(entry.name)) return [];
        return sourceFilesContaining(needle, path);
      }
      if (
        !/\.(?:ts|tsx)$/.test(entry.name) ||
        /\.test\.(?:ts|tsx)$/.test(entry.name)
      )
        return [];
      return (await readFile(path, "utf8")).includes(needle) ? [path] : [];
    }),
  );
  return files.flat();
}

describe("dashboard identity ownership", () => {
  it("has no duplicate dashboard user fetch or mutable user context", async () => {
    const dashboardSources = join(repositoryRoot, "app/dashboard");
    const contextSources = join(repositoryRoot, "app/contexts");
    expect(
      await Promise.all([
        sourceFilesContaining('fetch("/api/user"', dashboardSources),
        sourceFilesContaining('fetch("/api/user"', contextSources),
      ]).then((files) => files.flat()),
    ).toEqual([]);
    expect(
      await Promise.all([
        sourceFilesContaining("useDashboardUser", dashboardSources),
        sourceFilesContaining("useDashboardUser", contextSources),
      ]).then((files) => files.flat()),
    ).toEqual([]);
  });

  it("waits for the server-rendered dashboard shell instead of a POST user read", async () => {
    const fixture = await readFile(
      join(repositoryRoot, "e2e/fixtures/dashboard.ts"),
      "utf8",
    );

    expect(fixture).not.toContain('method() === "POST"');
    expect(fixture).toContain(
      'getByRole("link", { name: "Settings", exact: true })',
    );
  });

  it("keeps the generic user route to specialized writes only", async () => {
    const route = await readFile(
      join(repositoryRoot, "app/api/user/route.ts"),
      "utf8",
    );

    expect(route).not.toContain("export const POST");
    expect(route).toContain("export const PUT");
    expect(route).toContain("export const DELETE");
  });
});
