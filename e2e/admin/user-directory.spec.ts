import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("admin user directory supports search, sorting, filters, and account investigation", async ({
  page,
}) => {
  const listRequests: Array<Record<string, unknown>> = [];
  let mutationAttempted = false;

  await page.route("**/api/user/list", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    listRequests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        count: 1,
        data: [
          {
            id: "00000000-0000-4000-8000-000000000111",
            title: "Dr",
            first_name: "Amelia",
            last_name: "Hart",
            email: "pro@dentalbio.local",
            username: "pro-user",
            position: "Cosmetic Dentist",
            country: "United Kingdom",
            created_at: "2026-07-01T00:00:00.000Z",
            subscription_status: "PRO",
            current_period_end: "2027-07-01T00:00:00.000Z",
            trial_end: null,
            isVerified: true,
            dentistries: { dentistry_id: "dentistry-1" },
          },
        ],
      }),
    });
  });
  await page.route("**/api/announcements", async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ title: "Notice", content: "Message" }),
      });
    }
    mutationAttempted = true;
    return route.abort();
  });
  for (const endpoint of ["**/api/user", "**/api/subscription"]) {
    await page.route(endpoint, (route) => {
      mutationAttempted = true;
      return route.abort();
    });
  }

  await page.goto("/admin-login");
  await page.getByLabel("Email").fill("admin@dentalbio.local");
  await page.getByLabel("Password").fill("DentalBioAdmin123!");
  await page.getByRole("button", { name: "Log In" }).click();
  await page.getByRole("link", { name: "Users", exact: true }).click();

  await expect(
    page.getByText("pro@dentalbio.local", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Admin user directory" }),
  ).toBeVisible();

  await page.getByLabel("Search users").fill(" Amelia ");
  await expect.poll(() => listRequests.at(-1)?.search).toBe("Amelia");
  await page.getByRole("button", { name: /Plan.*not sorted/ }).click();
  await expect.poll(() => listRequests.at(-1)?.sort).toBe("plan");
  expect(listRequests.at(-1)?.direction).toBe("asc");

  await page.getByRole("button", { name: "Filters" }).click();
  const filters = page.getByRole("dialog", { name: "Filter users" });
  await filters.getByLabel("Country").fill("United Kingdom");
  await filters.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("Country: United Kingdom")).toBeVisible();

  await page
    .getByRole("button", {
      name: "View account details for pro@dentalbio.local",
    })
    .click();
  const details = page.getByRole("dialog", { name: "Account details" });
  await expect(details.getByText("Dr Amelia Hart")).toBeVisible();
  await expect(details.getByText("Cosmetic Dentist")).toBeVisible();
  await expect(details.getByText("United Kingdom")).toBeVisible();
  await expect(
    details.getByRole("link", { name: "Open public profile" }),
  ).toHaveAttribute("href", "/pro-user");
  await details.getByRole("button", { name: "Close" }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", {
      name: "View account details for pro@dentalbio.local",
    }),
  ).toBeVisible();

  const scan = await new AxeBuilder({ page }).include("main").analyze();
  expect(scan.violations.filter(({ impact }) => impact === "critical")).toEqual(
    [],
  );
  expect(mutationAttempted).toBe(false);
});
