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
import { getJstYearMonth } from "@/lib/date-jst";
import { fetchWithTimeout } from "@/lib/fetch-timeout";

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

export interface MonthlyCalResponse {
  days: MonthlyDay[];
  calendars: unknown[];
}

function parseYearMonth(dateStr: string): { year: number; month: number } {
  // YYYY-MM-DD
  const [y, m] = dateStr.split("-").map(Number);
  return { year: y, month: m };
}

function monthOffsetFromNowJst(targetDate: string): number {
  const now = getJstYearMonth();
  const target = parseYearMonth(targetDate);
  return (target.year - now.year) * 12 + (target.month - now.month);
}

function indexToTime30min(i: number): string {
  const minutes = i * 30;
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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
 * 外部APIレスポンスの構造検証（信頼しない）。
 */
function assertMonthlyCalResponse(
  value: unknown,
): asserts value is MonthlyCalResponse {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray((value as { days?: unknown }).days)
  ) {
    throw new Error("Instabase APIのレスポンス形式が想定と異なります");
  }
}

/**
 * 月間カレンダーのレスポンスから、対象日の TimeSlot 一覧を生成する（純関数）
 *
 * Instabase の「開始時刻」選択肢は 30分刻み（0..47）で、
 * `psi[0..47]` が 0 の場合は「利用不可」として扱われる。
 * ※ 48..71 は別用途（表示上の開始時刻の可否とは一致しない）なので、開始時刻判定には使わない。
 *
 * psi は複数プラン分の配列で返ることがあるため、
 * いずれかのプランで予約可能なら「空きあり」として扱う。
 */
export function buildInstabaseDayTimeSlots(
  data: MonthlyCalResponse,
  targetDate: string,
  spaceId: string | number,
): TimeSlot[] {
  const day = data.days.find((d) => d.date === targetDate);
  if (!day) return [];

  const psiList = Array.isArray(day.psi) ? day.psi : [];
  if (psiList.length === 0) return [];

  const slots: TimeSlot[] = [];
  for (let i = 0; i < 48; i++) {
    const isAvailable = psiList.some((psi) => (psi[String(i)] ?? 0) !== 0);
    const startTime = indexToTime30min(i);
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

/**
 * Instabase 月間カレンダー（30分刻み）から、対象日の TimeSlot 一覧を生成する
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
  const res = await fetchWithTimeout(url, {
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

  const data: unknown = await res.json();
  assertMonthlyCalResponse(data);

  return buildInstabaseDayTimeSlots(data, targetDate, spaceId);
}
