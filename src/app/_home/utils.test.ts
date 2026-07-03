import { describe, expect, test } from "vitest";
import {
  buildBuzzBookingUrl,
  isTimeRangeOverlap,
  parseBuzzStoreSlug,
  timeToBusinessMinutes,
  timeToMinutes,
} from "./utils";

describe("timeToMinutes", () => {
  test("converts HH:MM to minutes", () => {
    expect(timeToMinutes("19:00")).toBe(1140);
  });
});

describe("timeToBusinessMinutes", () => {
  test("treats 00:00-05:59 as the next day", () => {
    expect(timeToBusinessMinutes("00:00")).toBe(24 * 60);
    expect(timeToBusinessMinutes("05:30")).toBe(24 * 60 + 330);
  });

  test("keeps 06:00 and later as the same day", () => {
    expect(timeToBusinessMinutes("06:00")).toBe(360);
    expect(timeToBusinessMinutes("23:30")).toBe(1410);
  });
});

describe("isTimeRangeOverlap", () => {
  test("detects overlapping ranges", () => {
    expect(isTimeRangeOverlap("10:00", "12:00", "11:00", "13:00")).toBe(true);
  });

  test("treats touching ranges as non-overlapping", () => {
    expect(isTimeRangeOverlap("10:00", "12:00", "12:00", "13:00")).toBe(false);
  });

  test("detects containment", () => {
    expect(isTimeRangeOverlap("9:00", "22:00", "13:00", "15:30")).toBe(true);
  });
});

describe("parseBuzzStoreSlug", () => {
  test("extracts the store slug from a BUZZ URL", () => {
    expect(parseBuzzStoreSlug("https://buzz-st.com/fukuokahonten")).toBe(
      "fukuokahonten",
    );
  });

  test("returns null for invalid URLs", () => {
    expect(parseBuzzStoreSlug("not-a-url")).toBeNull();
  });
});

describe("buildBuzzBookingUrl", () => {
  const info = {
    url: "https://buzz-st.com/fukuokahonten",
    buzzStudioIds: [289, 290, 291],
  };

  test("maps studioNumber (1-indexed) to the BUZZ room id", () => {
    expect(buildBuzzBookingUrl(info, 2, "2026-07-10")).toBe(
      "https://buzz-st.com/fukuokahonten/290/2026-07-10#time_table",
    );
  });

  test("returns null when the room id is missing", () => {
    expect(buildBuzzBookingUrl(info, 4, "2026-07-10")).toBeNull();
    expect(buildBuzzBookingUrl(undefined, 1, "2026-07-10")).toBeNull();
  });
});
