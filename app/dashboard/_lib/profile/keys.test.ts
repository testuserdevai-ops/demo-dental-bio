import { expect, it } from "bun:test";
import { profileKeys } from "./keys";

it("keys profile state by immutable effective user ID", () => {
  expect(profileKeys.detail("scope-id")).toEqual([
    "dashboard",
    "profile",
    "scope-id",
  ]);
});
