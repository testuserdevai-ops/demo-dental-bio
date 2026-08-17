import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

function summarizeViolations(
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"],
) {
  return violations.map(({ id, impact, nodes }) => ({
    id,
    impact,
    nodeCount: nodes.length,
  }));
}

test("Direct Booking keeps the booking journey compact and responsive", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://maps.googleapis.com/**", (route) => route.abort());
  await page.goto("/template-direct-booking");

  const template = page.locator('[data-profile-template="direct-booking"]');
  await expect(template).toBeVisible();
  await expect(page.locator("main")).toHaveCount(1);
  await expect(
    page.locator('[data-profile-theme="modern-specialist"]'),
  ).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Dr Maya Patel", level: 1 }),
  ).toBeVisible();
  await expect(
    template.getByRole("img", { name: "Portrait of Dr Maya Patel" }),
  ).toHaveAttribute("src", /profile-pics.*direct-booking-profile\.webp/);

  const booking = page.getByRole("link", { name: /Book an appointment/ });
  const website = page.getByRole("link", { name: /Visit website/ });
  await expect(booking).toHaveAttribute(
    "href",
    "https://example.com/maya-patel-dentistry/book",
  );
  await expect(booking).toHaveAttribute("target", "_blank");
  await expect(website).toHaveAttribute(
    "href",
    "https://example.com/maya-patel-dentistry",
  );
  await expect(website).toHaveAttribute("target", "_blank");

  const treatmentIds = await page
    .locator("[data-treatment-id]")
    .evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-treatment-id")),
    );
  expect(treatmentIds).toEqual([
    "db010000-0000-4000-8000-000000000007",
    "db010000-0000-4000-8000-000000000006",
    "db010000-0000-4000-8000-000000000008",
  ]);
  await expect(
    page.getByRole("heading", {
      name: "Treatments chosen for you",
      level: 2,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Maya Patel Dental Studio", level: 2 }),
  ).toBeVisible();
  const practiceImage = page.getByRole("img", {
    name: "Reception at Maya Patel Dental Studio in Marylebone",
  });
  await expect(practiceImage).toHaveAttribute(
    "src",
    /location-images.*marylebone-studio\.webp/,
  );
  await expect(page.locator("#location img")).not.toHaveAttribute(
    "src",
    /general-gallery-images/,
  );
  await practiceImage.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      practiceImage.evaluate(
        (image) => image instanceof HTMLImageElement && image.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await expect(page.getByLabel("5 out of 5 stars")).toBeVisible();

  const blogs = template.locator(
    '[data-profile-module="direct-booking-blogs"]',
  );
  await blogs.scrollIntoViewIfNeeded();
  await expect(blogs).toBeVisible();
  await expect(
    blogs.getByRole("heading", { name: "Before your appointment", level: 2 }),
  ).toBeVisible();
  await expect(
    blogs.getByRole("heading", { name: "After your visit", level: 2 }),
  ).toBeVisible();
  const blogLinks = blogs.getByRole("link");
  await expect(blogLinks).toHaveCount(6);
  expect(
    await blogLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute("data-blog-id")),
    ),
  ).toEqual(["1611901", "1611902", "1611903", "1611904", "1611905", "1611906"]);
  const blogImages = blogs.locator("img");
  await expect(blogImages).toHaveCount(2);
  await expect
    .poll(() =>
      blogImages.evaluateAll((images) =>
        images.every(
          (image) =>
            image instanceof HTMLImageElement &&
            image.complete &&
            image.naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);
  await expect(blogs.getByText("Unpublished booking draft")).toHaveCount(0);
  await expect(blogs.getByText("Invalid booking route")).toHaveCount(0);
  await expect(
    blogs.getByText("Article in a disabled booking group"),
  ).toHaveCount(0);
  await expect(blogs.getByText("Article in a blank booking group")).toHaveCount(
    0,
  );

  const moduleOrder = await page.locator("main").evaluate((main) => {
    const selectors = [
      "#direct-booking-name",
      '[aria-label="Appointment actions"]',
      "#direct-booking-treatments",
      '[data-profile-module="direct-booking-blogs"]',
      "#direct-booking-location",
      '[data-profile-module="direct-booking-reviews"]',
    ];
    return selectors.map((selector) => {
      const element = main.querySelector(selector);
      return element
        ? Array.from(main.querySelectorAll("*")).indexOf(element)
        : -1;
    });
  });
  expect(moduleOrder.every((position) => position >= 0)).toBe(true);
  expect(moduleOrder).toEqual([...moduleOrder].sort((a, b) => a - b));

  const desktopScan = await new AxeBuilder({ page })
    .include('[data-profile-template="direct-booking"]')
    .withTags(WCAG_TAGS)
    .analyze();

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(booking).toBeVisible();
    await expect(website).toBeVisible();

    const geometry = await page.evaluate(() => {
      const template = document.querySelector(
        '[data-profile-template="direct-booking"]',
      );
      const booking = document.querySelector<HTMLAnchorElement>(
        '[aria-label="Appointment actions"] a:first-of-type',
      );
      const website = document.querySelector<HTMLAnchorElement>(
        '[aria-label="Appointment actions"] a:nth-of-type(2)',
      );
      if (!template || !booking || !website) return null;

      const templateRect = template.getBoundingClientRect();
      const bookingRect = booking.getBoundingClientRect();
      const websiteRect = website.getBoundingClientRect();
      const unobscured = [booking, website].every((link) => {
        const rect = link.getBoundingClientRect();
        const hit = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
        return hit === link || Boolean(hit && link.contains(hit));
      });

      return {
        templateLeft: Math.floor(templateRect.left),
        templateRight: Math.ceil(templateRect.right),
        scrollWidth: document.documentElement.scrollWidth,
        bookingHeight: bookingRect.height,
        bookingBottom: bookingRect.bottom,
        websiteHeight: websiteRect.height,
        websiteBottom: websiteRect.bottom,
        actionsDoNotOverlap: bookingRect.bottom <= websiteRect.top,
        unobscured,
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry?.templateLeft).toBeGreaterThanOrEqual(0);
    expect(geometry?.templateRight).toBeLessThanOrEqual(viewport.width);
    expect(geometry?.scrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(geometry?.bookingHeight).toBeGreaterThanOrEqual(48);
    expect(geometry?.websiteHeight).toBeGreaterThanOrEqual(48);
    expect(geometry?.bookingBottom).toBeLessThan(viewport.height);
    expect(geometry?.websiteBottom).toBeLessThan(viewport.height);
    expect(geometry?.actionsDoNotOverlap).toBe(true);
    expect(geometry?.unobscured).toBe(true);

    await blogs.scrollIntoViewIfNeeded();
    await expect(blogs).toBeVisible();
    for (const link of await blogLinks.all()) {
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const openMap = page.getByRole("button", { name: "View map" });
  await expect(page.locator('script[src*="maps.googleapis.com"]')).toHaveCount(
    0,
  );
  await openMap.scrollIntoViewIfNeeded();
  await openMap.click();

  const dialog = page.getByRole("dialog", {
    name: "Maya Patel Dental Studio",
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("18 Harley Street", { exact: false }),
  ).toBeVisible();
  await expect(dialog.locator("[data-map-status]")).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: /Get directions/ }),
  ).toHaveAttribute(
    "href",
    /https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=51\.5186%2C-0\.1472/,
  );
  await expect(
    dialog.getByRole("link", { name: "Book appointment" }),
  ).toHaveAttribute("href", "https://example.com/maya-patel-dentistry/book");
  await expect(
    dialog.getByRole("link", { name: "Call practice" }),
  ).toHaveAttribute("href", /^tel:/);
  await expect(
    dialog.getByRole("link", { name: "Email practice" }),
  ).toHaveAttribute("href", /^mailto:/);

  const modalGeometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const done = Array.from(element.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Done",
    );
    const doneRect = done?.getBoundingClientRect();
    return {
      width: Math.ceil(rect.width),
      bottom: Math.round(rect.bottom),
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      doneVisible:
        Boolean(doneRect) &&
        doneRect!.top >= rect.top &&
        doneRect!.bottom <= rect.bottom,
    };
  });
  expect(modalGeometry.width).toBeLessThanOrEqual(390);
  expect(modalGeometry.bottom).toBe(844);
  expect(modalGeometry.scrollWidth).toBeLessThanOrEqual(
    modalGeometry.viewportWidth,
  );
  expect(modalGeometry.doneVisible).toBe(true);

  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();
  await expect(openMap).toBeFocused();

  await page.setViewportSize({ width: 375, height: 812 });

  const mobileScan = await new AxeBuilder({ page })
    .include('[data-profile-template="direct-booking"]')
    .withTags(WCAG_TAGS)
    .analyze();

  expect({
    desktop: summarizeViolations(desktopScan.violations),
    mobile375: summarizeViolations(mobileScan.violations),
  }).toEqual({ desktop: [], mobile375: [] });
});

test("every Direct Booking blog link resolves to its owner article", async ({
  page,
}) => {
  await page.goto("/template-direct-booking");
  const links = page
    .locator('[data-profile-module="direct-booking-blogs"]')
    .getByRole("link");
  await expect(links).toHaveCount(6);
  const articles = await links.evaluateAll((elements) =>
    elements.map((element) => ({
      href: element.getAttribute("href"),
      title: element.textContent?.trim(),
    })),
  );

  for (const article of articles) {
    expect(article.href).toMatch(
      /^\/template-direct-booking\/blog\/[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/,
    );
    expect(article.title).toBeTruthy();
    await page.goto(article.href!);
    await expect(
      page.getByRole("heading", { name: article.title!, level: 1 }),
    ).toBeVisible();
  }
});
