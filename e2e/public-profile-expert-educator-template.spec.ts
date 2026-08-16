import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.setTimeout(60_000);

const MOBILE_VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 375, height: 812 },
];

for (const viewport of MOBILE_VIEWPORTS) {
  test(`Expert and Educator makes authority, learning, and consultation clear at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(viewport);
    await page.goto("/template-expert-educator");

    const template = page.locator('[data-profile-template="expert-educator"]');
    await expect(template).toBeVisible();
    await expect(
      page.locator('[data-profile-theme="editorial-expert"]'),
    ).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Dr Amina Shah", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("BDS, MSc, FHEA").first()).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Evidence made practical for healthier smiles",
        level: 2,
      }),
    ).toBeVisible();
    await expect(page.getByText("Dentist · Educator · Speaker")).toHaveCount(0);
    await expect(page.getByText("Connect with Dr Shah")).toHaveCount(0);

    const portrait = page
      .getByRole("img", {
        name: "Portrait of Dr Amina Shah",
      })
      .first();
    await expect(portrait).toHaveAttribute(
      "src",
      /profile-pics.*expert-educator-profile\.webp/,
    );
    await expect
      .poll(() =>
        portrait.evaluate((image) =>
          image instanceof HTMLImageElement ? image.naturalWidth : 0,
        ),
      )
      .toBeGreaterThanOrEqual(1_200);

    const consultation = page
      .getByRole("link", { name: /Request a consultation/ })
      .first();
    await expect(consultation).toBeVisible();
    await expect(consultation).toHaveAttribute(
      "href",
      "https://example.com/dr-amina-shah/consultation",
    );
    const professionalEnquiry = page.getByRole("link", {
      name: "Speaking & collaboration",
    });
    await expect(professionalEnquiry).toBeVisible();
    await expect(professionalEnquiry).toHaveAttribute(
      "href",
      "mailto:hello@aminashah.example?subject=Speaking%20or%20collaboration%20enquiry",
    );
    const initial = await page.evaluate(() => {
      const action = Array.from(document.querySelectorAll("a")).find((link) =>
        link.textContent?.includes("Request a consultation"),
      );
      if (!action) return null;
      const rect = action.getBoundingClientRect();
      return {
        actionBottom: rect.bottom,
        actionHeight: rect.height,
        bodyWidth: document.body.scrollWidth,
        documentWidth: document.documentElement.scrollWidth,
        socialSizes: Array.from(
          document.querySelectorAll('a[aria-label^="Open "]'),
        ).map((link) => {
          const control = link.getBoundingClientRect();
          const icon = link.querySelector("svg")?.getBoundingClientRect();
          return {
            height: control.height,
            width: control.width,
            centerDeltaX: icon
              ? Math.abs(
                  control.left +
                    control.width / 2 -
                    (icon.left + icon.width / 2),
                )
              : Infinity,
            centerDeltaY: icon
              ? Math.abs(
                  control.top +
                    control.height / 2 -
                    (icon.top + icon.height / 2),
                )
              : Infinity,
          };
        }),
      };
    });
    expect(initial).not.toBeNull();
    expect(initial!.actionBottom).toBeLessThan(viewport.height);
    expect(initial!.actionHeight).toBeGreaterThanOrEqual(48);
    expect(initial!.bodyWidth).toBeLessThanOrEqual(viewport.width);
    expect(initial!.documentWidth).toBeLessThanOrEqual(viewport.width);
    expect(initial!.socialSizes).toHaveLength(4);
    expect(
      initial!.socialSizes.every(
        ({ centerDeltaX, centerDeltaY, height, width }) =>
          height >= 44 && width >= 44 && centerDeltaX <= 1 && centerDeltaY <= 1,
      ),
    ).toBe(true);

    await expect(
      page.getByRole("link", {
        name: /Why teeth crack — and what happens next/,
      }),
    ).toHaveAttribute("data-link-image-variant", "large-image");
    const professionalPath = page.getByRole("link", {
      name: "For professionals",
      exact: true,
    });
    await expect(professionalPath).toHaveAttribute(
      "href",
      "#professional-resources",
    );
    const pathBox = await professionalPath.boundingBox();
    expect(pathBox).not.toBeNull();
    expect(pathBox!.height).toBeGreaterThanOrEqual(44);
    await professionalPath.click();
    await expect(
      page.getByRole("heading", { name: "Professional resources", level: 2 }),
    ).toBeInViewport();
    await expect(
      page.getByRole("link", {
        name: /Restorative decision-making masterclass/,
      }),
    ).toBeVisible();

    const blogGroups = template.locator("[data-blog-group-id]");
    await expect(blogGroups).toHaveCount(2);
    await expect(
      page.getByRole("heading", {
        name: "Patient evidence library",
        level: 2,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Professional teaching notes",
        level: 2,
      }),
    ).toBeVisible();
    const blogLinks = template.locator("a[data-blog-id]");
    await expect(blogLinks).toHaveCount(6);
    expect(
      await blogLinks.evaluateAll((links) =>
        links.map((link) => link.getAttribute("data-blog-id")),
      ),
    ).toEqual([
      "1651901",
      "1651902",
      "1651903",
      "1651904",
      "1651905",
      "1651906",
    ]);
    const blogHrefs = await blogLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    );
    for (const href of blogHrefs) {
      expect(href).not.toBeNull();
      const response = await page.request.get(href!);
      expect(response.ok()).toBe(true);
    }
    await expect(
      page.getByRole("link", {
        name: "From research paper to chairside explanation",
      }),
    ).toHaveAttribute(
      "href",
      "/template-expert-educator/blog/from-research-paper-to-chairside-explanation",
    );
    await expect(page.getByText("Unpublished professional draft")).toHaveCount(
      0,
    );
    await expect(page.getByText("Post inside a disabled group")).toHaveCount(0);
    const blogBounds = await blogLinks.evaluateAll((links) =>
      links.map((link) => {
        const bounds = link.getBoundingClientRect();
        return {
          height: bounds.height,
          left: bounds.left,
          right: bounds.right,
        };
      }),
    );
    expect(
      blogBounds.every(
        ({ height, left, right }) =>
          height >= 44 && left >= 0 && right <= viewport.width,
      ),
    ).toBe(true);

    const scan = await new AxeBuilder({ page })
      .include('[data-profile-template="expert-educator"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  });
}

test("Expert and Educator keeps map and consultation actions reachable", async ({
  page,
}) => {
  await page.route("https://maps.googleapis.com/**", (route) => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/template-expert-educator");

  const mapButton = page.getByRole("button", { name: "View map" });
  await mapButton.scrollIntoViewIfNeeded();
  await expect(mapButton).toBeVisible();
  await mapButton.click();

  const dialog = page.getByRole("dialog", {
    name: "Northbank Dental Education Centre",
  });
  await expect(dialog).toBeVisible();
  for (const action of [
    dialog.getByRole("link", { name: "Get directions" }),
    dialog.getByRole("link", { name: "Book appointment" }),
    dialog.getByRole("link", { name: "Call practice" }),
    dialog.getByRole("link", { name: "Email practice" }),
    dialog.getByRole("button", { name: "Done" }),
  ]) {
    await action.scrollIntoViewIfNeeded();
    const box = await action.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();
  await expect(mapButton).toBeFocused();

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.reload();
  const templateBox = await page
    .locator('[data-profile-template="expert-educator"]')
    .boundingBox();
  expect(templateBox).not.toBeNull();
  expect(templateBox!.width).toBeLessThanOrEqual(661);
});
