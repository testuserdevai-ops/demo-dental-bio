import { expect, test } from "bun:test";

import { buildOwnerShareUrls } from "./share";

test("encodes the public URL into controlled native share destinations", () => {
  const profileUrl = "https://dental.bio/dr-alex";
  const urls = buildOwnerShareUrls(profileUrl);
  expect(new URL(urls.whatsapp).searchParams.get("text")).toBe(profileUrl);
  expect(new URL(urls.linkedIn).searchParams.get("url")).toBe(profileUrl);
  expect(urls.email).toContain(encodeURIComponent(profileUrl));
});
