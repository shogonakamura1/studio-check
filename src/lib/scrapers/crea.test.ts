import { describe, expect, test } from "vitest";
import {
  buildCreaAvailability,
  hasKnownPublicIdEvents,
  type BookingEventsResponse,
} from "./crea";

type BookingEvent = BookingEventsResponse["data"][number];

// 2026-07-09T21:00:00Z = 2026-07-10 06:00 JST（朝活の開始時刻）
const ASAKATSU_START_UNIX = Date.UTC(2026, 6, 9, 21, 0, 0) / 1000;

function makeEvent(overrides: Partial<BookingEvent> = {}): BookingEvent {
  return {
    digest: "digest",
    title: "〇 大名朝活　¥500",
    public_id: "960818", // crea-daimyo の朝活
    model_type: "booking",
    color: "#fff",
    start: ASAKATSU_START_UNIX,
    end: ASAKATSU_START_UNIX + 3600,
    all_day: false,
    booking_url: "/rentalstudiocrea/960818?selected_slot=1",
    capacity: 1,
    vacancy: 1,
    reservable: true,
    waiting_list_provided: false,
    submit: true,
    metadata: { merchant: { id: "m" }, resource: { id: "r" } },
    full: false,
    is_registered_waiting_list: false,
    ...overrides,
  };
}

function makeResponse(events: BookingEvent[]): BookingEventsResponse {
  return {
    meta: { business_hours: [], time_zone: "Asia/Tokyo" },
    data: events,
  };
}

describe("buildCreaAvailability", () => {
  test("marks the event's JST time slot as available with the API price", () => {
    const data = makeResponse([makeEvent()]);
    const [daimyo] = buildCreaAvailability(data, "2026-07-10", ["crea-daimyo"]);

    const asakatsu = daimyo.slots.find((s) => s.slotName === "朝活");
    expect(asakatsu).toBeDefined();
    expect(asakatsu?.price).toBe(500);
    expect(asakatsu?.priceIsEstimate).toBe(false);

    const sixOclock = asakatsu?.timeSlots.find((ts) => ts.time === "06:00");
    expect(sixOclock?.available).toBe(true);
    expect(sixOclock?.bookingUrl).toBe(
      "https://coubic.com/rentalstudiocrea/960818?selected_slot=1",
    );
  });

  test("slots without events stay unavailable and use fallback prices", () => {
    const data = makeResponse([makeEvent()]);
    const [daimyo] = buildCreaAvailability(data, "2026-07-10", ["crea-daimyo"]);

    const hiruma = daimyo.slots.find((s) => s.slotName === "平日昼");
    expect(hiruma?.priceIsEstimate).toBe(true);
    expect(hiruma?.timeSlots.every((ts) => !ts.available)).toBe(true);
  });

  test("ignores events whose JST date differs from the target date", () => {
    const data = makeResponse([makeEvent()]);
    const [daimyo] = buildCreaAvailability(data, "2026-07-11", ["crea-daimyo"]);

    const asakatsu = daimyo.slots.find((s) => s.slotName === "朝活");
    expect(asakatsu?.timeSlots.every((ts) => !ts.available)).toBe(true);
  });

  test("marks full or non-reservable events as unavailable", () => {
    const data = makeResponse([makeEvent({ full: true })]);
    const [daimyo] = buildCreaAvailability(data, "2026-07-10", ["crea-daimyo"]);

    const sixOclock = daimyo.slots
      .find((s) => s.slotName === "朝活")
      ?.timeSlots.find((ts) => ts.time === "06:00");
    expect(sixOclock?.available).toBe(false);
  });

  test("returns only the requested studios", () => {
    const data = makeResponse([makeEvent()]);
    const results = buildCreaAvailability(data, "2026-07-10", ["crea-plus"]);

    expect(results).toHaveLength(1);
    expect(results[0].studioId).toBe("crea-plus");
  });
});

describe("hasKnownPublicIdEvents", () => {
  test("returns true when at least one event has a known public_id", () => {
    expect(hasKnownPublicIdEvents(makeResponse([makeEvent()]))).toBe(true);
  });

  test("returns false when no events match known public_ids (config drift)", () => {
    const drifted = makeResponse([makeEvent({ public_id: "999999" })]);
    expect(hasKnownPublicIdEvents(drifted)).toBe(false);
  });
});
