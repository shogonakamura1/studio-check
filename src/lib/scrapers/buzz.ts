/**
 * BUZZスタジオスクレイパー
 *
 * https://buzz-st.com/{store}/{YYYY-MM-DD} のHTMLをcheerioでパースする。
 * 空き判定: 各スタジオ列の button が reserve_modal_trigger クラスを持つか。
 */

import * as cheerio from "cheerio";
import type { AvailabilityResponse, StudioAvailability, TimeSlot } from "@/types";
import {
  addDaysToDateString,
  getDayOfWeekLabel,
  timeStringToMinutes,
} from "@/lib/date-jst";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { STUDIO_DATA } from "@/lib/studios";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const EARLY_MORNING_END_MINUTES = 6 * 60; // 06:00 より前は「翌日扱い」の深夜帯

/**
 * BUZZの日別ページHTMLから時間帯×部屋の空き状況を抽出する（純関数）
 */
export function parseBuzzTimeSlots(html: string): TimeSlot[] {
  const $ = cheerio.load(html);
  const timeSlots: TimeSlot[] = [];

  $("table tbody tr").each((_, row) => {
    const $row = $(row);
    const timeCell = $row.find("td:first-child").text().trim();

    if (timeCell && /^\d{2}:\d{2}$/.test(timeCell)) {
      const studios: StudioAvailability[] = [];

      $row.find("td").each((idx, cell) => {
        if (idx === 0) return;

        const $cell = $(cell);
        const button = $cell.find("button");
        const isAvailable = button.hasClass("reserve_modal_trigger");

        studios.push({
          studioNumber: idx,
          isAvailable,
        });
      });

      timeSlots.push({
        time: timeCell,
        studios,
      });
    }
  });

  return timeSlots;
}

export async function scrapeBuzzAvailability(
  studioId: string,
  date: string,
): Promise<AvailabilityResponse> {
  const studioInfo = STUDIO_DATA[studioId];

  if (!studioInfo) {
    return {
      studioId,
      studioName: "不明",
      date,
      dayOfWeek: getDayOfWeekLabel(date),
      timeSlots: [],
      error: "スタジオが見つかりません",
    };
  }

  const url = `${studioInfo.url}/${date}`;

  try {
    const response = await fetchWithTimeout(url, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const timeSlots = parseBuzzTimeSlots(html);

    // 予約表が1行も取れないのは「空きなし」ではなく取得失敗
    // （サイト構造変更等）なので、誤情報を出さずエラーとして返す
    if (timeSlots.length === 0) {
      return {
        studioId,
        studioName: studioInfo.name,
        date,
        dayOfWeek: getDayOfWeekLabel(date),
        timeSlots: [],
        error: "予約表を取得できませんでした（サイト構造変更の可能性）",
      };
    }

    return {
      studioId,
      studioName: studioInfo.name,
      date,
      dayOfWeek: getDayOfWeekLabel(date),
      timeSlots,
    };
  } catch (error) {
    console.error(`[BUZZ] スクレイピングエラー (${studioId}, ${date}):`, error);
    return {
      studioId,
      studioName: studioInfo.name,
      date,
      dayOfWeek: getDayOfWeekLabel(date),
      timeSlots: [],
      error: error instanceof Error ? error.message : "スクレイピングに失敗しました",
    };
  }
}

/**
 * 深夜練用: 当日分に翌日の早朝（00:00〜05:30）を合成する（純関数）
 *
 * 深夜練で表示する 00:00〜05:30 は「翌日の早朝」の空き状況。
 * 当日ページに同時刻の行があっても、それは前夜の深夜練枠なので採用しない。
 * 翌日分の取得に失敗した場合は error に含めてユーザーに伝える。
 */
export function mergeBuzzWithNextDayEarlyMorning(
  base: AvailabilityResponse,
  nextDay: AvailabilityResponse,
): AvailabilityResponse {
  const daySlots = base.timeSlots.filter(
    (ts) => timeStringToMinutes(ts.time) >= EARLY_MORNING_END_MINUTES,
  );
  const earlyMorningSlots = nextDay.timeSlots.filter(
    (ts) => timeStringToMinutes(ts.time) < EARLY_MORNING_END_MINUTES,
  );

  const merged = [...daySlots, ...earlyMorningSlots].sort((a, b) => {
    const am = timeStringToMinutes(a.time);
    const bm = timeStringToMinutes(b.time);
    const ak = am < EARLY_MORNING_END_MINUTES ? am + 24 * 60 : am;
    const bk = bm < EARLY_MORNING_END_MINUTES ? bm + 24 * 60 : bm;
    return ak - bk;
  });

  const errors = [
    base.error,
    nextDay.error ? `翌日分（深夜帯）の取得に失敗: ${nextDay.error}` : undefined,
  ].filter((e): e is string => Boolean(e));

  return {
    ...base,
    timeSlots: merged,
    ...(errors.length > 0 ? { error: errors.join(" / ") } : {}),
  };
}

/**
 * 深夜練モード: 当日と翌日を並列取得して合成する
 */
export async function scrapeBuzzWithLateNight(
  studioId: string,
  date: string,
): Promise<AvailabilityResponse> {
  const [base, next] = await Promise.all([
    scrapeBuzzAvailability(studioId, date),
    scrapeBuzzAvailability(studioId, addDaysToDateString(date, 1)),
  ]);
  return mergeBuzzWithNextDayEarlyMorning(base, next);
}
