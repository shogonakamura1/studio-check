import { describe, expect, test } from "vitest";
import {
  STUDIO_CATEGORIES,
  STUDIO_PAGE_CONTENT,
  STUDIO_PAGE_IDS,
} from "./studio-content";
import { STUDIO_DATA } from "./studios";

describe("STUDIO_PAGE_CONTENT", () => {
  test("covers every studio in STUDIO_DATA (no missing pages)", () => {
    const dataIds = Object.keys(STUDIO_DATA).sort();
    const contentIds = [...STUDIO_PAGE_IDS].sort();
    expect(contentIds).toEqual(dataIds);
  });

  test("STUDIO_CATEGORIES lists every content id exactly once", () => {
    const categoryIds = STUDIO_CATEGORIES.flatMap((c) => c.ids).sort();
    expect(categoryIds).toEqual([...STUDIO_PAGE_IDS].sort());
  });

  test("every entry has non-empty required fields", () => {
    for (const [id, content] of Object.entries(STUDIO_PAGE_CONTENT)) {
      expect(content.title, `${id}: title`).toBeTruthy();
      expect(content.heading, `${id}: heading`).toBeTruthy();
      expect(content.lead.length, `${id}: lead`).toBeGreaterThan(30);
      expect(content.facts.length, `${id}: facts`).toBeGreaterThan(0);
      expect(content.paragraphs.length, `${id}: paragraphs`).toBeGreaterThan(0);
      expect(content.bookingSteps.length, `${id}: bookingSteps`).toBeGreaterThan(0);
      expect(content.officialLabel, `${id}: officialLabel`).toBeTruthy();
    }
  });

  test("titles are unique across pages (no duplicate <title>)", () => {
    const titles = STUDIO_PAGE_IDS.map((id) => STUDIO_PAGE_CONTENT[id].title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  test("leads are unique across pages (no duplicate meta description)", () => {
    const leads = STUDIO_PAGE_IDS.map((id) => STUDIO_PAGE_CONTENT[id].lead);
    expect(new Set(leads).size).toBe(leads.length);
  });
});
