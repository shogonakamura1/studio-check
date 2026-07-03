import { describe, expect, test } from "vitest";
import {
  addDaysToDateString,
  formatUnixToJstDate,
  formatUnixToJstTime,
  getDayOfWeekLabel,
  timeStringToMinutes,
} from "./date-jst";

describe("getDayOfWeekLabel", () => {
  test("returns 金 for 2026-07-03 (Friday)", () => {
    expect(getDayOfWeekLabel("2026-07-03")).toBe("金");
  });

  test("returns 木 for 2026-01-01 (Thursday)", () => {
    expect(getDayOfWeekLabel("2026-01-01")).toBe("木");
  });
});

describe("addDaysToDateString", () => {
  test("adds a day across a year boundary", () => {
    expect(addDaysToDateString("2026-12-31", 1)).toBe("2027-01-01");
  });

  test("adds a day across a month boundary (non-leap February)", () => {
    expect(addDaysToDateString("2026-02-28", 1)).toBe("2026-03-01");
  });

  test("handles leap years", () => {
    expect(addDaysToDateString("2028-02-28", 1)).toBe("2028-02-29");
  });

  test("keeps zero-padded formatting", () => {
    expect(addDaysToDateString("2026-07-08", 1)).toBe("2026-07-09");
  });
});

describe("timeStringToMinutes", () => {
  test("converts HH:MM to minutes", () => {
    expect(timeStringToMinutes("00:00")).toBe(0);
    expect(timeStringToMinutes("06:30")).toBe(390);
    expect(timeStringToMinutes("23:30")).toBe(1410);
  });
});

describe("formatUnixToJstTime", () => {
  test("converts UTC midnight to 09:00 JST", () => {
    const unix = Date.UTC(2026, 6, 10, 0, 0, 0) / 1000;
    expect(formatUnixToJstTime(unix)).toBe("09:00");
  });

  test("converts 15:30 UTC to 00:30 JST (next day)", () => {
    const unix = Date.UTC(2026, 6, 9, 15, 30, 0) / 1000;
    expect(formatUnixToJstTime(unix)).toBe("00:30");
  });
});

describe("formatUnixToJstDate", () => {
  test("returns the JST date even when the UTC date differs", () => {
    // 2026-07-09T21:00:00Z = 2026-07-10 06:00 JST
    const unix = Date.UTC(2026, 6, 9, 21, 0, 0) / 1000;
    expect(formatUnixToJstDate(unix)).toBe("2026-07-10");
  });
});
