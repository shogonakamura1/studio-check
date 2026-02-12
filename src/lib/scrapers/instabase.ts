/**
 * Instabase（インスタベース）スクレイパー（API版）
 *
 * Instabase の空室カレンダーは、フロントから以下のJSONを取得して描画している。
 * - /space/:spaceId/monthly_cal?month=:offset
 *
 * month は「現在月からのオフセット（0=今月, 1=翌月...）」。
 * 返ってくる days[].psi のうち、開始時刻判定には 0..47（30分刻み）を使う。
 * 値が 0 のときは予約不可、それ以外は予約可能として扱う。
 *
 * 注: ここでは UI/既存APIに合わせて「AvailabilityResponse（BUZZ互換）」へ変換できるように
 * 30分刻みの TimeSlot を生成する（studioCount=1扱い）。
 */

import type { TimeSlot } from "@/types";

type PsiMap = Record<string, number> & {
  planId?: number;
  date?: string;
  minBookingMinutes?: number;
  minNumOfPeople?: number;
};

interface MonthlyDay {
  date: string; // "2026-02-12"
  psi: PsiMap[];
  ppi: Array<Record<string, number>>; // 価格情報（今回は利用しない）
  isAdvanceDiscount: boolean;
  isLastminuteDiscount: boolean;
  monthIndex: number;
}

interface MonthlyCalResponse {
  days: MonthlyDay[];
  calendars: unknown[];
}

function toJstYearMonth(): { year: number; month: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  });
  // "YYYY-MM"
  const parts = fmt.format(new Date()).split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  return { year, month };
}

function parseYearMonth(dateStr: string): { year: number; month: number } {
  // YYYY-MM-DD
  const [y, m] = dateStr.split("-").map(Number);
  return { year: y, month: m };
}

function monthOffsetFromNowJst(targetDate: string): number {
  const now = toJstYearMonth();
  const target = parseYearMonth(targetDate);
  return (target.year - now.year) * 12 + (target.month - now.month);
}

function indexToTime30min(i: number): string {
  const minutes = i * 30;
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function minutesToTimeHHMM(totalMinutes: number): string {
  const minutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addDaysUtc(dateStr: string, daysToAdd: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + daysToAdd));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function buildInstabaseCalendarUrl(params: {
  spaceId: string | number;
  targetDate: string; // YYYY-MM-DD
  fromIndex: number; // 0..47（30分刻み）
  toIndex: number; // 0..47（30分刻み, inclusive）
}): string {
  const { spaceId, targetDate, fromIndex, toIndex } = params;
  const q = new URLSearchParams({
    planType: "hourly",
    date: targetDate,
    from: String(fromIndex),
    to: String(toIndex),
  });
  return `https://www.instabase.jp/space/${spaceId}/cal?${q.toString()}#bookingInfo`;
}

/**
 * Instabase は「日時選択→予約手続き」時に、まず POST `/rooms/:roomUid/orders`（フォーム）で
 * 予約ドラフトを作成し、302 で `/rooms/:roomUid/orders/option` に遷移する。
 *
 * URLクエリで `date/from/to` を渡しても日時が反映されない環境があるため、
 * 予約ドラフト作成（POST）に必要なパラメータを `bookingUrl` に埋め込み、
 * UI側でフォームPOSTとして送信できる形にする。
 */
function buildInstabaseRoomOrdersPostUrl(params: {
  spaceId: string | number;
  targetDate: string; // YYYY-MM-DD
  fromIndex: number; // 0..47（30分刻み）
  durationMinutes: number; // 最低利用時間を想定（例: 60）
  planId?: number;
}): string {
  const { spaceId, targetDate, fromIndex, durationMinutes, planId } = params;
  const startMinutes = fromIndex * 30;
  const endMinutes = startMinutes + durationMinutes;
  const endDayOffset = Math.floor(endMinutes / (24 * 60));
  const endMinutesInDay = endMinutes % (24 * 60);

  const startDate = targetDate;
  const endDate = endDayOffset === 0 ? targetDate : addDaysUtc(targetDate, endDayOffset);
  const startTime = minutesToTimeHHMM(startMinutes);
  const endTime = minutesToTimeHHMM(endMinutesInDay);

  const pairs: Array<[string, string]> = [
    ["order[room_uid]", String(spaceId)],
    ["order[bookings_attributes][0][start_at]", `${startDate} ${startTime}`],
    ["order[bookings_attributes][0][end_at]", `${endDate} ${endTime}`],
    ["order[num_of_people]", "1"],
  ];
  if (planId) {
    pairs.push(["order[bookings_attributes][0][plan_id]", String(planId)]);
  }

  const q = pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  // NOTE: 予約ドラフト作成は POST が必要だが、
  // 外部サイトからのPOSTはInstabase側のセキュリティ（WAF/Origin制限等）で失敗することがある。
  // その場合でも最低限ユーザーが予約に進めるよう、カレンダーページへのリンクは別途利用する。
  return `/instabase/orders?${q}`;
}

/**
 * Instabase 月間カレンダー（20分刻み）から、対象日の TimeSlot 一覧を生成する
 */
export async function scrapeInstabaseSpaceDayTimeSlots(params: {
  spaceId: string | number;
  targetDate: string; // "YYYY-MM-DD"
}): Promise<TimeSlot[]> {
  const { spaceId, targetDate } = params;
  const offset = monthOffsetFromNowJst(targetDate);

  // 予約受付は最大6ヶ月程度。過度なオフセットは弾く（サイト側でも弾かれる）
  if (offset < 0 || offset > 12) {
    return [];
  }

  const url = `https://www.instabase.jp/space/${spaceId}/monthly_cal?month=${offset}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    // Vercel/Next の fetch キャッシュを避ける（空き状況は変動するため）
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Instabase monthly_cal failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as MonthlyCalResponse;
  const day = data.days.find((d) => d.date === targetDate);
  if (!day) return [];

  // 複数 planId が来るケースも想定して、まずは先頭を採用
  const psi = day.psi?.[0];
  if (!psi) return [];

  const slots: TimeSlot[] = [];
  /**
   * Instabase の「開始時刻」選択肢は 30分刻み（0..47）で、
   * `psi[0..47]` が 0 の場合は「利用不可」として扱われる。
   *
   * ※ 48..71 は別用途（表示上の開始時刻の可否とは一致しない）なので、開始時刻判定には使わない。
   */
  for (let i = 0; i < 48; i++) {
    const v = psi[String(i)] ?? 0;
    const isAvailable = v !== 0;
    const startTime = indexToTime30min(i);
    const planId = psi.planId;
    // Instabase への直接POSTが失敗する環境があるため、まずは安定して開けるカレンダーページへ誘導する。
    // `date/from/to` は反映されない場合もあるが、ユーザーが手動で時間選択して予約を進められる。
    const toIndex = Math.min(i + 2, 47); // 1時間（30分×2）を目安に
    const bookingUrl = isAvailable
      ? buildInstabaseCalendarUrl({
          spaceId,
          targetDate,
          fromIndex: i,
          toIndex,
        })
      : undefined;
    slots.push({
      time: startTime,
      studios: [{ studioNumber: 1, isAvailable, bookingUrl }],
    });
  }

  return slots;
}

