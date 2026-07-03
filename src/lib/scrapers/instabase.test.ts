import { describe, expect, test } from "vitest";
import {
  buildInstabaseDayTimeSlots,
  type MonthlyCalResponse,
} from "./instabase";

function makeResponse(): MonthlyCalResponse {
  return {
    days: [
      {
        date: "2026-07-10",
        psi: [
          { "20": 5, planId: 1 }, // 10:00 はプランAで空き
          { "21": 3 }, // 10:30 はプランBのみ空き
        ],
        ppi: [],
        isAdvanceDiscount: false,
        isLastminuteDiscount: false,
        monthIndex: 0,
      },
    ],
    calendars: [],
  };
}

describe("buildInstabaseDayTimeSlots", () => {
  test("generates 48 slots (30-minute grid)", () => {
    const slots = buildInstabaseDayTimeSlots(makeResponse(), "2026-07-10", "123");
    expect(slots).toHaveLength(48);
    expect(slots[0].time).toBe("00:00");
    expect(slots[47].time).toBe("23:30");
  });

  test("marks a slot available when the first plan has capacity", () => {
    const slots = buildInstabaseDayTimeSlots(makeResponse(), "2026-07-10", "123");
    const ten = slots.find((s) => s.time === "10:00");
    expect(ten?.studios[0].isAvailable).toBe(true);
    expect(ten?.studios[0].bookingUrl).toContain("from=20");
  });

  test("merges availability across ALL plans, not just the first", () => {
    // psi[0] では 10:30 は 0（不可）だが psi[1] では空きがある
    const slots = buildInstabaseDayTimeSlots(makeResponse(), "2026-07-10", "123");
    const tenThirty = slots.find((s) => s.time === "10:30");
    expect(tenThirty?.studios[0].isAvailable).toBe(true);
  });

  test("marks slots without capacity as unavailable with no bookingUrl", () => {
    const slots = buildInstabaseDayTimeSlots(makeResponse(), "2026-07-10", "123");
    const nineThirty = slots.find((s) => s.time === "09:30");
    expect(nineThirty?.studios[0].isAvailable).toBe(false);
    expect(nineThirty?.studios[0].bookingUrl).toBeUndefined();
  });

  test("returns an empty array when the target date is missing", () => {
    const slots = buildInstabaseDayTimeSlots(makeResponse(), "2026-07-11", "123");
    expect(slots).toEqual([]);
  });
});
