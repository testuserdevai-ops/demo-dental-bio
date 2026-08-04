import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const accountPages = [
  ["login", "/login"],
  ["admin login", "/admin-login"],
  ["password recovery", "/forgot-password"],
  ["registration claim", "/register"],
  ["registration", "/register?username=axe-account&domain=dental.bio"],
] as const;

for (const [name, path] of accountPages) {
  test(`${name} page has no automated accessibility violations`, async ({
    page,
  }) => {
    await page.goto(path);

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
}

test("registration calendar dialog has no automated accessibility violations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/register?username=axe-calendar&domain=dental.bio");
  await page
    .getByRole("button", { name: "Open date of birth calendar" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Choose date of birth" }),
  ).toBeVisible();

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
