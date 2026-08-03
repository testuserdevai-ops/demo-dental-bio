import { describe, expect, test } from "bun:test";
import { buildRegistrationUrl } from "./registrationUrl";

describe("buildRegistrationUrl", () => {
  test("keeps localhost claims on the current origin", () => {
    expect(
      buildRegistrationUrl({
        currentOrigin: "http://localhost:3000",
        currentHostname: "localhost",
        selectedDomain: "dental.bio",
        username: "local-dentist",
      }),
    ).toBe(
      "http://localhost:3000/register/?username=local-dentist&domain=dental.bio",
    );
  });

  test("keeps 127.0.0.1 claims local and preserves the selected brand", () => {
    expect(
      buildRegistrationUrl({
        currentOrigin: "http://127.0.0.1:3000",
        currentHostname: "127.0.0.1",
        selectedDomain: "coach.bio",
        username: "local-coach",
        referral: "Jane Doe",
      }),
    ).toBe(
      "http://127.0.0.1:3000/register/?username=local-coach&domain=coach.bio&referral=Jane+Doe",
    );
  });

  test("uses the selected brand domain in production", () => {
    expect(
      buildRegistrationUrl({
        currentOrigin: "https://dental.bio",
        currentHostname: "dental.bio",
        selectedDomain: "coach.bio",
        username: "remote-coach",
      }),
    ).toBe(
      "https://coach.bio/register/?username=remote-coach&domain=coach.bio",
    );
  });
});
