import { describe, expect, test } from "vitest";
import { parseAvailabilityFromHtml } from "./fukuoka-civic-hall";

const SAMPLE_HTML = `
<html><body>
<table class="koma-table"><tbody>
  <tr>
    <td>リハーサル室（定員100名）</td>
    <td>○</td><td>区切り</td><td>×</td><td>区切り</td><td>●</td><td>区切り</td><td>-</td>
  </tr>
</tbody></table>
<table class="koma-table"><tbody>
  <tr>
    <td>大ホール</td>
    <td>○</td><td>区切り</td><td>○</td><td>区切り</td><td>○</td><td>区切り</td><td>○</td>
  </tr>
</tbody></table>
</body></html>
`;

describe("parseAvailabilityFromHtml", () => {
  test("extracts target rooms with statuses mapped to time ranges", () => {
    const rooms = parseAvailabilityFromHtml(SAMPLE_HTML, "2026/07/10");

    expect(rooms).toHaveLength(1);
    expect(rooms[0].roomName).toBe("リハーサル室");
    expect(rooms[0].slots).toEqual([
      { status: "○", date: "2026/07/10", slotId: "0", timeRange: "9:00-12:30" },
      { status: "×", date: "2026/07/10", slotId: "1", timeRange: "13:00-15:30" },
      { status: "●", date: "2026/07/10", slotId: "2", timeRange: "16:00-18:30" },
      { status: "-", date: "2026/07/10", slotId: "3", timeRange: "19:00-22:00" },
    ]);
  });

  test("excludes rooms that are not scrape targets", () => {
    const rooms = parseAvailabilityFromHtml(SAMPLE_HTML, "2026/07/10");
    expect(rooms.some((r) => r.roomName.includes("大ホール"))).toBe(false);
  });

  test("returns an empty array when the layout changed (caller must treat as error)", () => {
    const rooms = parseAvailabilityFromHtml(
      "<html><body><table><tr><td>リハーサル室</td></tr></table></body></html>",
      "2026/07/10",
    );
    expect(rooms).toEqual([]);
  });
});
