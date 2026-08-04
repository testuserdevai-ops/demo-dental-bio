import { afterEach, describe, expect, it, setSystemTime } from "bun:test";

import { birthdaySchema } from "./schemas";

afterEach(() => setSystemTime());

describe("birthday policy", () => {
  it("accepts 28 February but rejects 1 March at a leap-day adult cutoff", () => {
    setSystemTime(new Date(2028, 1, 29, 12));

    expect(birthdaySchema.safeParse("28/02/2010").success).toBe(true);
    expect(birthdaySchema.safeParse("01/03/2010").success).toBe(false);
  });
});
