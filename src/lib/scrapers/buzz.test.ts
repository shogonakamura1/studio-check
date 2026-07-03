import { describe, expect, test } from "vitest";
import type { AvailabilityResponse, TimeSlot } from "@/types";
import { mergeBuzzWithNextDayEarlyMorning, parseBuzzTimeSlots } from "./buzz";

const SAMPLE_HTML = `
<html><body>
<table><tbody>
  <tr>
    <td>10:00</td>
    <td><button class="reserve_modal_trigger btn"></button></td>
    <td><button class="btn"></button></td>
  </tr>
  <tr>
    <td>10:30</td>
    <td><button class="btn"></button></td>
    <td><button class="reserve_modal_trigger btn"></button></td>
  </tr>
  <tr>
    <td>お知らせ</td>
    <td>時刻形式でない行は無視される</td>
  </tr>
</tbody></table>
</body></html>
`;

describe("parseBuzzTimeSlots", () => {
  test("extracts time rows and availability per room column", () => {
    const slots = parseBuzzTimeSlots(SAMPLE_HTML);

    expect(slots).toHaveLength(2);
    expect(slots[0].time).toBe("10:00");
    expect(slots[0].studios).toEqual([
      { studioNumber: 1, isAvailable: true },
      { studioNumber: 2, isAvailable: false },
    ]);
    expect(slots[1].time).toBe("10:30");
    expect(slots[1].studios).toEqual([
      { studioNumber: 1, isAvailable: false },
      { studioNumber: 2, isAvailable: true },
    ]);
  });

  test("returns an empty array when no reservation table exists", () => {
    expect(parseBuzzTimeSlots("<html><body>no table</body></html>")).toEqual([]);
  });
});

function slot(time: string, isAvailable: boolean): TimeSlot {
  return { time, studios: [{ studioNumber: 1, isAvailable }] };
}

function response(
  date: string,
  timeSlots: TimeSlot[],
  error?: string,
): AvailabilityResponse {
  return {
    studioId: "fukuokahonten",
    studioName: "BUZZ福岡本店",
    date,
    dayOfWeek: "金",
    timeSlots,
    ...(error ? { error } : {}),
  };
}

describe("mergeBuzzWithNextDayEarlyMorning", () => {
  test("takes early-morning slots from the NEXT day, not the base day", () => {
    // 当日ページの 00:00 は「前夜の深夜練枠」なので破棄され、
    // 翌日ページの 00:00 が採用されるべき
    const base = response("2026-07-10", [
      slot("00:00", true), // 当日の早朝（前夜分）→ 捨てる
      slot("06:00", true),
      slot("23:30", false),
    ]);
    const next = response("2026-07-11", [
      slot("00:00", false), // 翌日の早朝 → こちらを採用
      slot("05:30", true),
      slot("06:00", true), // 翌日の通常枠 → 除外
    ]);

    const merged = mergeBuzzWithNextDayEarlyMorning(base, next);

    expect(merged.timeSlots.map((ts) => ts.time)).toEqual([
      "06:00",
      "23:30",
      "00:00",
      "05:30",
    ]);
    const midnight = merged.timeSlots.find((ts) => ts.time === "00:00");
    expect(midnight?.studios[0].isAvailable).toBe(false);
    expect(merged.error).toBeUndefined();
    expect(merged.date).toBe("2026-07-10");
  });

  test("propagates next-day fetch errors instead of silently dropping slots", () => {
    const base = response("2026-07-10", [slot("23:30", true)]);
    const next = response("2026-07-11", [], "HTTP error! status: 500");

    const merged = mergeBuzzWithNextDayEarlyMorning(base, next);

    expect(merged.error).toContain("翌日分");
    expect(merged.error).toContain("HTTP error! status: 500");
    expect(merged.timeSlots.map((ts) => ts.time)).toEqual(["23:30"]);
  });

  test("keeps the base error when the base day failed", () => {
    const base = response("2026-07-10", [], "取得失敗");
    const next = response("2026-07-11", [slot("00:00", true)]);

    const merged = mergeBuzzWithNextDayEarlyMorning(base, next);

    expect(merged.error).toContain("取得失敗");
    expect(merged.timeSlots.map((ts) => ts.time)).toEqual(["00:00"]);
  });
});
