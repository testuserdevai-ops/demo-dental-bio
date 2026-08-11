import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function assertMobileTaskFlow(
  page: Page,
  viewport: { width: number; height: number },
) {
  await page.setViewportSize(viewport);
  await page.goto("/template-specialist-assessment");

  const template = page.locator(
    '[data-profile-template="specialist-assessment"]',
  );
  await expect(template).toBeVisible();
  await expect(
    page.locator('[data-profile-theme="modern-specialist"]'),
  ).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Dr Amara Shah", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Portrait of Dr Amara Shah" }),
  ).toHaveAttribute("src", /specialist-assessment-profile\.webp/);

  const assessment = page.getByRole("link", {
    name: /Start your assessment/,
  });
  const consultation = page.getByRole("link", {
    name: /Book a specialist consultation/,
  });
  await expect(assessment.first()).toHaveAttribute(
    "href",
    "https://example.com/amara-shah-endodontics/assessment",
  );
  await expect(consultation).toHaveAttribute(
    "href",
    "https://example.com/amara-shah-endodontics/book",
  );
  await expect(page.getByText("A referral is needed")).toBeVisible();

  const initialGeometry = await page.evaluate(() => {
    const assessmentAction = document.querySelector<HTMLAnchorElement>(
      '[aria-label="Specialist assessment actions"] a:first-of-type',
    );
    const consultationAction = document.querySelector<HTMLAnchorElement>(
      '[aria-label="Specialist assessment actions"] a:nth-of-type(2)',
    );
    const referral = Array.from(document.querySelectorAll("p")).find(
      (node) => node.textContent?.trim() === "A referral is needed",
    );
    const primaryRect = assessmentAction?.getBoundingClientRect();
    const secondaryRect = consultationAction?.getBoundingClientRect();
    const referralRect = referral?.getBoundingClientRect();
    const hit = primaryRect
      ? document.elementFromPoint(
          primaryRect.left + primaryRect.width / 2,
          primaryRect.top + primaryRect.height / 2,
        )
      : null;

    return {
      bodyWidth: document.body.scrollWidth,
      documentWidth: document.documentElement.scrollWidth,
      primaryHeight: primaryRect?.height ?? 0,
      primaryBottom: primaryRect?.bottom ?? Infinity,
      secondaryHeight: secondaryRect?.height ?? 0,
      referralTop: referralRect?.top ?? Infinity,
      primaryUnobscured:
        Boolean(assessmentAction && hit) &&
        (hit === assessmentAction || assessmentAction!.contains(hit)),
    };
  });
  expect(initialGeometry.bodyWidth).toBeLessThanOrEqual(viewport.width);
  expect(initialGeometry.documentWidth).toBeLessThanOrEqual(viewport.width);
  expect(initialGeometry.primaryHeight).toBeGreaterThanOrEqual(48);
  expect(initialGeometry.secondaryHeight).toBeGreaterThanOrEqual(44);
  expect(initialGeometry.primaryBottom).toBeLessThan(viewport.height);
  expect(initialGeometry.referralTop).toBeLessThan(viewport.height);
  expect(initialGeometry.primaryUnobscured).toBe(true);

  const expectedSections = [
    "Reasons patients seek an assessment",
    "A clear route to specialist advice",
    "Clear explanations from the first step",
    "Urgent and aftercare guidance",
    "Referral, fees, and common questions",
    "Fitzrovia Endodontic Centre",
    "Still unsure where to start?",
  ];
  for (const name of expectedSections) {
    const heading = page.getByRole("heading", { name });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();
  }

  for (const control of [
    page.getByRole("link", { name: /Dentist referral guide/ }),
    page.getByRole("link", { name: /Insurance and fee information/ }),
    page.getByRole("link", { name: /Frequently asked questions/ }),
    page.getByRole("link", { name: "Call the specialist team" }),
    page.getByRole("link", { name: "Email the specialist team" }),
  ]) {
    await control.scrollIntoViewIfNeeded();
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  }

  await expect(
    page.getByRole("link", { name: "Call the specialist team" }),
  ).toHaveAttribute("href", "tel:+442071235680");
  await expect(
    page.getByRole("link", { name: "Email the specialist team" }),
  ).toHaveAttribute("href", "mailto:referrals@amarashah.example");

  const openMap = page.getByRole("button", { name: "View map" });
  await openMap.scrollIntoViewIfNeeded();
  const mapButtonBox = await openMap.boundingBox();
  expect(mapButtonBox).not.toBeNull();
  expect(mapButtonBox!.height).toBeGreaterThanOrEqual(44);
  await openMap.click();

  const dialog = page.getByRole("dialog", {
    name: "Fitzrovia Endodontic Centre",
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("24 Queen Anne Street", { exact: false }),
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
  }

  const modalGeometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const done = Array.from(element.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Done",
    );
    const doneRect = done?.getBoundingClientRect();
    return {
      width: rect.width,
      bottom: rect.bottom,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      doneInside:
        Boolean(doneRect) &&
        doneRect!.top >= rect.top &&
        doneRect!.bottom <= rect.bottom,
    };
  });
  expect(modalGeometry.width).toBeLessThanOrEqual(viewport.width);
  expect(Math.abs(modalGeometry.bottom - viewport.height)).toBeLessThanOrEqual(
    2,
  );
  expect(modalGeometry.scrollWidth).toBeLessThanOrEqual(
    modalGeometry.clientWidth,
  );
  expect(modalGeometry.doneInside).toBe(true);
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();
  await expect(openMap).toBeFocused();
}

test("Specialist Assessment makes assessment, referral, and contact tasks obvious on mobile", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://maps.googleapis.com/**", (route) => route.abort());

  await assertMobileTaskFlow(page, { width: 390, height: 844 });
  await assertMobileTaskFlow(page, { width: 375, height: 812 });

  const secondaryAxeRegression = await new AxeBuilder({ page })
    .include('[data-profile-template="specialist-assessment"]')
    .withTags(WCAG_TAGS)
    .analyze();
  expect(secondaryAxeRegression.violations).toEqual([]);
});

test("Specialist Assessment preserves its intended information order on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/template-specialist-assessment");

  const positions = await page.locator("main").evaluate((main) => {
    const selectors = [
      "#specialist-name",
      '[aria-label="Specialist assessment actions"]',
      "#specialist-treatments-title",
      "#specialist-process-title",
      "#specialist-reviews-title",
      "#specialist-urgent-title",
      "#specialist-resources-title",
      "#specialist-location-title",
      "#specialist-contact-title",
    ];
    return selectors.map((selector) => {
      const node = main.querySelector(selector);
      return node ? Array.from(main.querySelectorAll("*")).indexOf(node) : -1;
    });
  });
  expect(positions.every((position) => position >= 0)).toBe(true);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
});
