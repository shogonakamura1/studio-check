import { beforeEach, describe, expect, test } from "vitest";
import { isRateLimited, resetRateLimit } from "./rate-limit";

describe("isRateLimited", () => {
  beforeEach(() => {
    resetRateLimit();
  });

  test("allows requests up to the limit and rejects the next one", () => {
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited("ip1", 5)).toBe(false);
    }
    expect(isRateLimited("ip1", 5)).toBe(true);
  });

  test("counts keys independently", () => {
    for (let i = 0; i < 5; i++) {
      isRateLimited("ip1", 5);
    }
    expect(isRateLimited("ip2", 5)).toBe(false);
  });
});
