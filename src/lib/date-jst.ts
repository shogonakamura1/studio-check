/**
 * タイムゾーン安全な日付・時刻ユーティリティ
 *
 * サーバーの実行環境タイムゾーン（Vercel=UTC、ローカル=JST等）に依存しない
 * 実装のみを置く。`new Date("YYYY-MM-DD")` のパース（UTC扱い）と
 * `getDay()` 等のローカルTZ取得を混在させるとタイムゾーンによって
 * 日付がずれるため、このモジュールの関数を必ず使うこと。
 *
 * 日付文字列は "YYYY-MM-DD" 形式を前提とする。
 */

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** "YYYY-MM-DD" から曜日ラベル（日〜土）を返す。実行環境のTZに依存しない */
export function getDayOfWeekLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return DAY_LABELS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** "YYYY-MM-DD" に日数を加算した "YYYY-MM-DD" を返す。実行環境のTZに依存しない */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** "HH:MM" を分に変換する */
export function timeStringToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Unixタイムスタンプ（秒）を日本時間の "HH:MM" に変換する */
export function formatUnixToJstTime(unixSeconds: number): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(unixSeconds * 1000));
}

/** Unixタイムスタンプ（秒）を日本時間の "YYYY-MM-DD" に変換する */
export function formatUnixToJstDate(unixSeconds: number): string {
  // en-CA ロケールは "YYYY-MM-DD" 形式を返す
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(unixSeconds * 1000));
}

/** 現在の日本時間の年月を返す */
export function getJstYearMonth(): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .split("-");
  return { year: Number(parts[0]), month: Number(parts[1]) };
}
