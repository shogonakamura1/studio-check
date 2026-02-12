import type { CreaResponse } from "@/types";

// 今日の日付を取得
export function getTodayDate(): string {
  return toLocalDateString(new Date());
}

export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateStringToLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateLabel(dateStr: string): string {
  const d = dateStringToLocalDate(dateStr);
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  const dayName = dayNames[d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}（${dayName}）`;
}

// 時間を数値に変換（比較用）
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// 00:00〜05:30 は「翌日」として扱う（比較・フィルタ用）
export function timeToBusinessMinutes(time: string): number {
  const m = timeToMinutes(time);
  return m < 6 * 60 ? m + 24 * 60 : m;
}

export function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function parseBuzzStoreSlug(storeUrl: string): string | null {
  try {
    const u = new URL(storeUrl);
    const slug = u.pathname.split("/").filter(Boolean)[0];
    return slug || null;
  } catch {
    return null;
  }
}

export function buildBuzzBookingUrl(
  info: { url: string; buzzStudioIds?: number[] } | undefined,
  studioNumber: number,
  date: string,
): string | null {
  if (!info?.buzzStudioIds) return null;
  const buzzStudioId = info.buzzStudioIds[studioNumber - 1];
  if (!buzzStudioId) return null;
  const slug = parseBuzzStoreSlug(info.url);
  if (!slug) return null;
  return `https://buzz-st.com/${slug}/${buzzStudioId}/${date}#time_table`;
}

export function buildBuzzRoomDetailUrl(
  info: { url: string; buzzStudioIds?: number[] } | undefined,
  studioNumber: number,
): string | null {
  if (!info?.buzzStudioIds) return null;
  const buzzStudioId = info.buzzStudioIds[studioNumber - 1];
  if (!buzzStudioId) return null;
  const slug = parseBuzzStoreSlug(info.url);
  if (!slug) return null;
  return `https://buzz-st.com/${slug}/${buzzStudioId}`;
}

export function buildCivicHallDateUrl(date: string): string {
  const [year, month, day] = date.split("-");
  const useYM = `${year}${month}`;
  const useDay = String(parseInt(day, 10));
  const useDate = `${year}${month}${day}`;
  return `https://k3.p-kashikan.jp/fukuoka-kyotenbunka/index.php?op=srch_sst&UseYM=${useYM}&UseDay=${useDay}&UseDate=${useDate}&ShisetsuCode=001`;
}

export function buildCreaDetailUrl(studio: CreaResponse): string | null {
  // COUBICの詳細ページ: /rentalstudiocrea/{public_id}#pageContent
  // 表示中のスロット群から、まず「今表示されているもの」を優先して選ぶ。
  const preferredOrder = ["平日昼", "平日夜", "平日夜・土日", "土日", "朝活"];

  const allSlots = (studio.studios ?? []).flatMap((s) => s.slots ?? []);
  if (allSlots.length === 0) return null;

  const pick =
    preferredOrder
      .map((name) => allSlots.find((s) => s.slotName === name))
      .find(Boolean) ?? allSlots[0];

  const publicId = pick?.slotType;
  if (!publicId || !/^\d+$/.test(publicId)) return null;
  return `https://coubic.com/rentalstudiocrea/${publicId}#pageContent`;
}

// 時間範囲が重なるかチェック
export function isTimeRangeOverlap(
  range1Start: string,
  range1End: string,
  range2Start: string,
  range2End: string,
): boolean {
  const r1Start = timeToMinutes(range1Start);
  const r1End = timeToMinutes(range1End);
  const r2Start = timeToMinutes(range2Start);
  const r2End = timeToMinutes(range2End);

  // 重なりの判定: range1の終わりがrange2の始まりより後 かつ range1の始まりがrange2の終わりより前
  return r1End > r2Start && r1Start < r2End;
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function toDateString(
  year: number,
  monthIndex: number,
  day: number,
): string {
  const y = String(year);
  const m = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

