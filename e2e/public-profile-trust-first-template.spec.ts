import { expect, test } from "@playwright/test";

test("Trust-First keeps reassurance, booking, and practical tasks usable on mobile", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://maps.googleapis.com/**", (route) => route.abort());

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/template-trust-first");

    const template = page.locator(
      '[data-profile-template="trust-first-family-practice"]',
    );
    await expect(template).toBeVisible();
    await expect(page.locator('[data-profile-theme="warm-care"]')).toHaveCount(
      1,
    );
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Gentle dental visits for every generation",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", {
        name: "A calm conversation before treatment",
      }),
    ).toHaveAttribute("src", /hero-image-2\.webp/);

    const booking = page.getByRole("link", {
      name: /Book a family appointment/,
    });
    const call = page.getByRole("link", { name: "Call the team" });
    await expect(booking.first()).toHaveAttribute(
      "href",
      "https://example.com/willow-family-dental/book",
    );
    await expect(call.first()).toHaveAttribute("href", "tel:+442079460245");

    const initialGeometry = await page.evaluate(() => {
      const main = document.querySelector("main");
      const booking = Array.from(document.querySelectorAll("a")).find((link) =>
        link.textContent?.includes("Book a family appointment"),
      );
      const call = Array.from(document.querySelectorAll("a")).find(
        (link) => link.textContent?.trim() === "Call the team",
      );
      if (!main || !booking || !call) return null;
      const mainRect = main.getBoundingClientRect();
      const bookingRect = booking.getBoundingClientRect();
      const callRect = call.getBoundingClientRect();
      return {
        bodyWidth: document.body.scrollWidth,
        documentWidth: document.documentElement.scrollWidth,
        mainLeft: Math.floor(mainRect.left),
        mainRight: Math.ceil(mainRect.right),
        bookingBottom: bookingRect.bottom,
        bookingHeight: bookingRect.height,
        callBottom: callRect.bottom,
        callHeight: callRect.height,
        actionsDoNotOverlap: bookingRect.bottom <= callRect.top,
        maxWidth: Number.parseFloat(getComputedStyle(main).maxWidth),
      };
    });
    expect(initialGeometry).not.toBeNull();
    expect(initialGeometry?.bodyWidth).toBeLessThanOrEqual(viewport.width);
    expect(initialGeometry?.documentWidth).toBeLessThanOrEqual(viewport.width);
    expect(initialGeometry?.mainLeft).toBeGreaterThanOrEqual(0);
    expect(initialGeometry?.mainRight).toBeLessThanOrEqual(viewport.width);
    expect(initialGeometry?.bookingHeight).toBeGreaterThanOrEqual(48);
    expect(initialGeometry?.callHeight).toBeGreaterThanOrEqual(48);
    expect(initialGeometry?.bookingBottom).toBeLessThan(viewport.height);
    expect(initialGeometry?.callBottom).toBeLessThan(viewport.height);
    expect(initialGeometry?.actionsDoNotOverlap).toBe(true);
    expect(initialGeometry?.maxWidth).toBe(661);

    for (const social of await page.locator('a[aria-label^="Open "]').all()) {
      const box = await social.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    const reviewIds = await page
      .locator("[data-review-id]")
      .evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("data-review-id")),
      );
    expect(reviewIds).toEqual(["1637601", "1637602", "1637603", "1637604"]);

    const reviews = page.locator(
      '[data-profile-module="trust-first-family-practice-reviews"]',
    );
    await reviews.scrollIntoViewIfNeeded();
    await expect(reviews).toBeVisible();

    for (const heading of [
      "Treatments",
      "Practical information",
      "Patient resources",
    ]) {
      const element = page.getByRole("heading", { name: heading });
      await element.scrollIntoViewIfNeeded();
      await expect(element).toBeVisible();
      const box = await element.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    }

    await expect(page.getByText("Clear, unhurried care")).toHaveCount(0);
    await expect(page.getByText("A welcome for every age")).toHaveCount(0);

    await expect(
      page.locator('[data-link-image-variant="large-image"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('[data-link-image-variant="small-icon"]'),
    ).toHaveCount(1);

    const bottomBooking = booking.last();
    await bottomBooking.scrollIntoViewIfNeeded();
    await expect(bottomBooking).toBeVisible();
    const bottomBox = await bottomBooking.boundingBox();
    expect(bottomBox).not.toBeNull();
    expect(bottomBox!.height).toBeGreaterThanOrEqual(48);
    expect(bottomBox!.x).toBeGreaterThanOrEqual(0);
    expect(bottomBox!.x + bottomBox!.width).toBeLessThanOrEqual(viewport.width);
  }
});

test("Trust-First map sheet keeps directions and contact actions reachable", async ({
  page,
}) => {
  await page.route("https://maps.googleapis.com/**", (route) => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/template-trust-first");

  const openMap = page.getByRole("button", { name: "View map" });
  await openMap.scrollIntoViewIfNeeded();
  await openMap.click();

  const dialog = page.getByRole("dialog", { name: "Willow Family Dental" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("42 Willow Road, Richmond", { exact: false }),
  ).toBeVisible();
  for (const action of [
    dialog.getByRole("link", { name: /Get directions/ }),
    dialog.getByRole("link", { name: "Book appointment" }),
    dialog.getByRole("link", { name: "Call practice" }),
    dialog.getByRole("link", { name: "Email practice" }),
    dialog.getByRole("button", { name: "Done" }),
  ]) {
    await action.scrollIntoViewIfNeeded();
    await expect(action).toBeVisible();
    const box = await action.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }

  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      bottom: Math.round(rect.bottom),
      width: Math.ceil(rect.width),
      pageWidth: document.documentElement.scrollWidth,
    };
  });
  expect(geometry.bottom).toBe(844);
  expect(geometry.width).toBeLessThanOrEqual(390);
  expect(geometry.pageWidth).toBeLessThanOrEqual(390);

  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();
  await expect(openMap).toBeFocused();
});
