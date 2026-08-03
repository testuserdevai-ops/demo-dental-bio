import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("login page has no automated accessibility violations", async ({
  page,
}) => {
  await page.goto("/login");

  const { violations } = await new AxeBuilder({ page }).analyze();
  const violationSummary = violations
    .map(
      ({ id, impact, help, nodes }) =>
        `${id} (${impact ?? "unknown"}): ${help}\n${nodes
          .map(({ target }) => `  - ${target.join(", ")}`)
          .join("\n")}`,
    )
    .join("\n\n");

  expect(violations, violationSummary).toEqual([]);
});
