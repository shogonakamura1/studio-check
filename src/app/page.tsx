"use client";

import { useState, useEffect, useMemo } from "react";
import type {
  AvailabilityResponse,
  CivicHallResponse,
  CreaResponse,
} from "@/types";

// BUZZ系スタジオ情報（スクレイピング対応）
const BUZZ_STUDIOS = [
  { id: "fukuokahonten", name: "BUZZ福岡本店", location: "天神南駅徒歩3分" },
  { id: "fukuokatenjin", name: "BUZZ福岡天神", location: "天神駅徒歩5分" },
  { id: "fukuokahakata", name: "BUZZ福岡博多", location: "中洲川端駅徒歩3分" },
];

// 市民会館・ホール系（部屋単位で選択可能）
const CIVIC_HALL_ROOMS = [
  {
    id: "civichall-rehearsal",
    name: "リハーサル室",
    parent: "福岡市民会館",
    location: "天神駅徒歩10分",
  },
  {
    id: "civichall-practice1",
    name: "練習室①",
    parent: "福岡市民会館",
    location: "天神駅徒歩10分",
  },
  {
    id: "civichall-practice3",
    name: "練習室③",
    parent: "福岡市民会館",
    location: "天神駅徒歩10分",
  },
];

// CREAスタジオ（スタジオ単位で選択可能、musicは除外）
const CREA_STUDIOS = [
  {
    id: "crea-daimyo",
    name: "CREA大名",
    floor: "2F",
    size: "77㎡",
    location: "大名エリア",
  },
  {
    id: "crea-plus",
    name: "CREA+",
    floor: "4F",
    size: "100㎡",
    location: "大名エリア",
  },
  {
    id: "crea-daimyo2",
    name: "CREA大名Ⅱ",
    floor: "3F",
    size: "49㎡",
    location: "大名エリア",
  },
];

// Instabase（スペース単位）
const INSTABASE_SPACES = [
  {
    id: "instabase-in-and-out",
    name: "スタジオ in and out",
    location: "天神駅徒歩8分（Instabase）",
  },
];

// 時間オプション（06:00〜23:30まで30分刻み）
// 「日付」を 06:00〜翌05:30（= 48コマ）として扱う（深夜練対応）
const TIME_OPTIONS = [
  ...Array.from({ length: 36 }, (_, i) => {
    const hour = Math.floor(i / 2) + 6;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
  }),
  ...Array.from({ length: 12 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
  }),
];

// 今日の日付を取得
function getTodayDate(): string {
  return toLocalDateString(new Date());
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateStringToLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLabel(dateStr: string): string {
  const d = dateStringToLocalDate(dateStr);
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  const dayName = dayNames[d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}（${dayName}）`;
}

// 時間を数値に変換（比較用）
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// 00:00〜05:30 は「翌日」として扱う（比較・フィルタ用）
function timeToBusinessMinutes(time: string): number {
  const m = timeToMinutes(time);
  return m < 6 * 60 ? m + 24 * 60 : m;
}

function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

// Instabase の予約遷移は `/instabase/orders`（中継HTML）に集約したため、
// ここでの直接クロスオリジンPOSTユーティリティは不要。

function parseBuzzStoreSlug(storeUrl: string): string | null {
  try {
    const u = new URL(storeUrl);
    const slug = u.pathname.split("/").filter(Boolean)[0];
    return slug || null;
  } catch {
    return null;
  }
}

function buildBuzzBookingUrl(
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

function buildBuzzRoomDetailUrl(
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

function buildCivicHallDateUrl(date: string): string {
  const [year, month, day] = date.split("-");
  const useYM = `${year}${month}`;
  const useDay = String(parseInt(day, 10));
  const useDate = `${year}${month}${day}`;
  return `https://k3.p-kashikan.jp/fukuoka-kyotenbunka/index.php?op=srch_sst&UseYM=${useYM}&UseDay=${useDay}&UseDate=${useDate}&ShisetsuCode=001`;
}

function buildCreaDetailUrl(studio: CreaResponse): string | null {
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
function isTimeRangeOverlap(
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

// APIレスポンスの型
interface ApiResponse {
  date: string;
  dayOfWeek: string;
  studios: (AvailabilityResponse | CivicHallResponse | CreaResponse)[];
  availableStudios: {
    id: string;
    name: string;
    studioCount: number;
    lateNight?: { start: string; end: string };
    url: string;
    type?: string;
    buzzStudioIds?: number[];
  }[];
}

interface ApiMultiResponse {
  dates: {
    date: string;
    dayOfWeek: string;
    studios: (AvailabilityResponse | CivicHallResponse | CreaResponse)[];
  }[];
  availableStudios: ApiResponse["availableStudios"];
}

type AnyApiResponse = ApiResponse | ApiMultiResponse;

function isMultiResponse(data: AnyApiResponse): data is ApiMultiResponse {
  return "dates" in data;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function toDateString(year: number, monthIndex: number, day: number): string {
  const y = String(year);
  const m = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function Home() {
  const [selectedStudios, setSelectedStudios] = useState<string[]>([
    "fukuokahonten",
  ]);
  const [selectedDates, setSelectedDates] = useState<string[]>([
    getTodayDate(),
  ]);
  const [startTime, setStartTime] = useState<string>("19:00");
  const [endTime, setEndTime] = useState<string>("21:00");
  const [data, setData] = useState<AnyApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLateNight, setSelectedLateNight] = useState<string>();
  const [lateNightBackupTime, setLateNightBackupTime] = useState<{
    start: string;
    end: string;
  } | null>(null);

  // スタジオ選択の切り替え
  const toggleStudio = (studioId: string) => {
    setSelectedStudios((prev) => {
      const next = prev.includes(studioId)
        ? prev.filter((id) => id !== studioId)
        : [...prev, studioId];
      return next;
    });
    setSelectedLateNight((prev) => (prev === studioId ? undefined : prev));
  };

  const lateNightByStudioId = useMemo(() => {
    const map = new Map<string, { start: string; end: string }>();
    for (const s of data?.availableStudios ?? []) {
      if (s.lateNight) map.set(s.id, s.lateNight);
    }
    return map;
  }, [data]);

  const studioInfoById = useMemo(() => {
    const map = new Map<string, ApiResponse["availableStudios"][number]>();
    for (const s of data?.availableStudios ?? []) {
      map.set(s.id, s);
    }
    return map;
  }, [data]);

  // 時間でフィルタリングされたデータ
  const filteredData = useMemo(() => {
    if (!data) return null;

    const startMinutes = timeToBusinessMinutes(startTime);
    let endMinutes = timeToBusinessMinutes(endTime);
    // 深夜帯（翌日跨ぎ）の場合、06:00など境界時刻で end が start より小さくなるので補正
    if (endMinutes < startMinutes) endMinutes += 24 * 60;
    const selectedRangeCrossesMidnight =
      timeToMinutes(endTime) < timeToMinutes(startTime) &&
      timeToMinutes(endTime) <= 6 * 60;

    const filterStudios = (
      studios: (AvailabilityResponse | CivicHallResponse | CreaResponse)[],
    ) => {
      return studios.map((studio) => {
        // CREAの場合は studios プロパティでフィルタリング
        if ("studios" in studio && Array.isArray(studio.studios)) {
          return {
            ...studio,
            studios: studio.studios.map((creaStudio) => ({
              ...creaStudio,
              slots: creaStudio.slots
                .map((slot) => ({
                  ...slot,
                  timeSlots: slot.timeSlots.filter((ts) => {
                    const slotMinutes = timeToBusinessMinutes(ts.time);
                    return (
                      slotMinutes >= startMinutes && slotMinutes < endMinutes
                    );
                  }),
                }))
                // 指定時間帯に該当する枠がないスロット（朝活/平日昼など）は表示しない
                .filter((slot) => slot.timeSlots.length > 0),
            })),
          };
        }

        // 市民会館の場合は時間範囲の重なりでフィルタリング
        if ("rooms" in studio) {
          const civicHallStudio = studio as CivicHallResponse;
          return {
            ...civicHallStudio,
            rooms: civicHallStudio.rooms.map((room) => ({
              ...room,
              slots: room.slots.filter((slot) => {
                // 市民会館は深夜帯が存在しないため、深夜練レンジ（翌日跨ぎ）の場合は表示しない
                if (selectedRangeCrossesMidnight) return false;
                // timeRange "9:00-12:30" を "9:00" と "12:30" に分割
                const [slotStart, slotEnd] = slot.timeRange.split("-");
                // 指定時間範囲と重なりをチェック
                return isTimeRangeOverlap(
                  startTime,
                  endTime,
                  slotStart,
                  slotEnd,
                );
              }),
            })),
          };
        }

        // BUZZスタジオの場合は時間フィルタリング
        const buzzStudio = studio as AvailabilityResponse;
        return {
          ...buzzStudio,
          timeSlots: buzzStudio.timeSlots.filter((slot) => {
            const slotMinutes = timeToBusinessMinutes(slot.time);
            return slotMinutes >= startMinutes && slotMinutes < endMinutes;
          }),
        };
      });
    };
    if (isMultiResponse(data)) {
      return {
        ...data,
        dates: data.dates.map((d) => ({
          ...d,
          studios: filterStudios(d.studios),
        })),
      };
    }
    return {
      ...data,
      studios: filterStudios(data.studios),
    };
  }, [data, startTime, endTime]);

  const dayResults = useMemo(() => {
    if (!filteredData) return [];
    if (isMultiResponse(filteredData)) return filteredData.dates;
    return [
      {
        date: filteredData.date,
        dayOfWeek: filteredData.dayOfWeek,
        studios: filteredData.studios,
      },
    ];
  }, [filteredData]);

  // データ取得
  const fetchData = async () => {
    if (selectedStudios.length === 0) {
      setError("スタジオを選択してください");
      return;
    }
    if (selectedDates.length === 0) {
      setError("日付を選択してください");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const includeLateNight =
        Boolean(selectedLateNight) ||
        timeToMinutes(startTime) < 6 * 60 ||
        timeToMinutes(endTime) < 6 * 60;

      const datesParam = selectedDates
        .slice()
        .sort()
        .map(encodeURIComponent)
        .join(",");

      const response = await fetch(
        `/api/availability?studios=${encodeURIComponent(selectedStudios.join(","))}&dates=${datesParam}${includeLateNight ? "&include-late-night=1" : ""}`,
      );

      if (!response.ok) {
        throw new Error("データの取得に失敗しました");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // 初回読み込み
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedDatesSet = useMemo(
    () => new Set(selectedDates),
    [selectedDates],
  );

  const toggleDate = (dateStr: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return Array.from(next).sort();
    });
  };

  const today = useMemo(() => getTodayDate(), []);
  const [calendarYear, setCalendarYear] = useState<number>(
    dateStringToLocalDate(today).getFullYear(),
  );
  const [calendarMonthIndex, setCalendarMonthIndex] = useState<number>(
    dateStringToLocalDate(today).getMonth(),
  );

  return (
    <div className="min-h-screen bg-background grid-pattern">
      {/* ヘッダー */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-accent animate-pulse-glow" />
            <h1 className="text-xl font-bold tracking-tight">
              STUDIO<span className="text-accent">_</span>CHECK
            </h1>
            <span className="text-muted text-sm ml-auto">
              スタジオ空き状況チェッカー
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* コントロールパネル */}
        <div
          id="search-controls"
          className="bg-card border border-border rounded-lg p-6 mb-8 animate-fade-in"
        >
          <h2 className="text-sm font-semibold text-muted mb-4 uppercase tracking-wider">
            検索条件
          </h2>

          {/* BUZZスタジオ選択 */}
          <div className="mb-6">
            <label className="block text-sm text-muted mb-3">
              <span className="text-accent">●</span>{" "}
              BUZZスタジオ（空き状況を表示）
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {BUZZ_STUDIOS.map((studio) => (
                <label
                  key={studio.id}
                  className={`
                    flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all
                    ${
                      selectedStudios.includes(studio.id)
                        ? "border-accent bg-accent/10"
                        : "border-border bg-card hover:border-muted"
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedStudios.includes(studio.id)}
                    onChange={() => toggleStudio(studio.id)}
                    className="sr-only"
                  />
                  <div
                    className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                      ${
                        selectedStudios.includes(studio.id)
                          ? "border-accent bg-accent"
                          : "border-muted"
                      }
                    `}
                  >
                    {selectedStudios.includes(studio.id) && (
                      <svg
                        className="w-3 h-3 text-background"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{studio.name}</div>
                    <div className="text-xs text-muted">{studio.location}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 市民会館・ホール系（部屋単位で選択） */}
          <div className="mb-6">
            <label className="block text-sm text-muted mb-3">
              <span className="text-blue-500">●</span>{" "}
              福岡市民会館（部屋を個別に選択）
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CIVIC_HALL_ROOMS.map((room) => (
                <label
                  key={room.id}
                  className={`
                    flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all
                    ${
                      selectedStudios.includes(room.id)
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-border bg-card hover:border-muted"
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedStudios.includes(room.id)}
                    onChange={() => toggleStudio(room.id)}
                    className="sr-only"
                  />
                  <div
                    className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                      ${
                        selectedStudios.includes(room.id)
                          ? "border-blue-500 bg-blue-500"
                          : "border-muted"
                      }
                    `}
                  >
                    {selectedStudios.includes(room.id) && (
                      <svg
                        className="w-3 h-3 text-background"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{room.name}</div>
                    <div className="text-xs text-muted">{room.parent}</div>
                    <div className="text-xs text-blue-500/70 mt-0.5">
                      {room.location}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* CREAスタジオ選択（スタジオ単位） */}
          <div className="mb-6">
            <label className="block text-sm text-muted mb-3">
              <span className="text-purple-500">●</span>{" "}
              レンタルスタジオCREA（スタジオを個別に選択）
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CREA_STUDIOS.map((studio) => (
                <label
                  key={studio.id}
                  className={`
                    flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all
                    ${
                      selectedStudios.includes(studio.id)
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-border bg-card hover:border-muted"
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedStudios.includes(studio.id)}
                    onChange={() => toggleStudio(studio.id)}
                    className="sr-only"
                  />
                  <div
                    className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                      ${
                        selectedStudios.includes(studio.id)
                          ? "border-purple-500 bg-purple-500"
                          : "border-muted"
                      }
                    `}
                  >
                    {selectedStudios.includes(studio.id) && (
                      <svg
                        className="w-3 h-3 text-background"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{studio.name}</div>
                    <div className="text-xs text-muted">
                      {studio.floor} / {studio.size}
                    </div>
                    <div className="text-xs text-purple-500/70 mt-0.5">
                      {studio.location}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Instabase（スペース単位） */}
          <div className="mb-6">
            <label className="block text-sm text-muted mb-3">
              <span className="text-emerald-500">●</span>{" "}
              Instabase（スペースを個別に選択）
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {INSTABASE_SPACES.map((space) => (
                <label
                  key={space.id}
                  className={`
                    flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all
                    ${
                      selectedStudios.includes(space.id)
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-border bg-card hover:border-muted"
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedStudios.includes(space.id)}
                    onChange={() => toggleStudio(space.id)}
                    className="sr-only"
                  />
                  <div
                    className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                      ${
                        selectedStudios.includes(space.id)
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-muted"
                      }
                    `}
                  >
                    {selectedStudios.includes(space.id) && (
                      <svg
                        className="w-3 h-3 text-background"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{space.name}</div>
                    <div className="text-xs text-muted">{space.location}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 日付クイック選択 */}
          <div className="mb-4">
            <label className="block text-sm text-muted mb-2">
              日付をクイック選択（複数選択可）
            </label>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((daysFromToday) => {
                const date = new Date();
                date.setDate(date.getDate() + daysFromToday);
                const dateStr = toLocalDateString(date);
                const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
                const dayName = dayNames[date.getDay()];
                const label =
                  daysFromToday === 0
                    ? "今日"
                    : daysFromToday === 1
                      ? "明日"
                      : `${date.getMonth() + 1}/${date.getDate()}`;

                return (
                  <button
                    key={dateStr}
                    onClick={() => toggleDate(dateStr)}
                    className={`
                      px-3 py-2 rounded-lg text-sm font-medium transition-all
                      ${
                        selectedDatesSet.has(dateStr)
                          ? "bg-accent text-background"
                          : "bg-background border border-border hover:border-accent"
                      }
                    `}
                  >
                    {label}（{dayName}）
                  </button>
                );
              })}
            </div>
          </div>

          {/* 日付・時間選択と検索ボタン */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 日付選択（カレンダー） */}
            <div className="lg:col-span-1">
              <label className="block text-sm text-muted mb-2">
                日付（カレンダー / 複数選択）
              </label>
              <div className="bg-background border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <button
                    className="px-2 py-1 rounded border border-border hover:border-accent transition-colors text-sm"
                    onClick={() => {
                      const prevMonth = calendarMonthIndex - 1;
                      if (prevMonth < 0) {
                        setCalendarMonthIndex(11);
                        setCalendarYear((y) => y - 1);
                      } else {
                        setCalendarMonthIndex(prevMonth);
                      }
                    }}
                    aria-label="前の月"
                  >
                    ←
                  </button>
                  <div className="text-sm text-muted">
                    {calendarYear}/
                    {String(calendarMonthIndex + 1).padStart(2, "0")}
                  </div>
                  <button
                    className="px-2 py-1 rounded border border-border hover:border-accent transition-colors text-sm"
                    onClick={() => {
                      const nextMonth = calendarMonthIndex + 1;
                      if (nextMonth > 11) {
                        setCalendarMonthIndex(0);
                        setCalendarYear((y) => y + 1);
                      } else {
                        setCalendarMonthIndex(nextMonth);
                      }
                    }}
                    aria-label="次の月"
                  >
                    →
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-xs text-muted mb-1">
                  {["日", "月", "火", "水", "木", "金", "土"].map((w) => (
                    <div key={w} className="text-center py-1">
                      {w}
                    </div>
                  ))}
                </div>

                {(() => {
                  const first = new Date(calendarYear, calendarMonthIndex, 1);
                  const startWeekday = first.getDay(); // 0..6
                  const total = daysInMonth(calendarYear, calendarMonthIndex);
                  const cells: Array<{
                    key: string;
                    dateStr?: string;
                    day?: number;
                  }> = [];

                  for (let i = 0; i < startWeekday; i++) {
                    cells.push({
                      key: `empty-${i}-${monthKey(calendarYear, calendarMonthIndex)}`,
                    });
                  }
                  for (let day = 1; day <= total; day++) {
                    const dateStr = toDateString(
                      calendarYear,
                      calendarMonthIndex,
                      day,
                    );
                    cells.push({ key: dateStr, dateStr, day });
                  }

                  return (
                    <div className="grid grid-cols-7 gap-1">
                      {cells.map((c) => {
                        if (!c.dateStr || !c.day) {
                          return <div key={c.key} className="h-8" />;
                        }
                        const selected = selectedDatesSet.has(c.dateStr);
                        const isToday = c.dateStr === today;
                        return (
                          <button
                            key={c.key}
                            onClick={() => toggleDate(c.dateStr!)}
                            className={`
                              h-8 rounded-md text-sm transition-all border
                              ${
                                selected
                                  ? "bg-accent text-background border-accent"
                                  : "bg-background text-foreground border-border hover:border-accent"
                              }
                              ${isToday && !selected ? "border-accent/60" : ""}
                            `}
                            title={formatDateLabel(c.dateStr)}
                          >
                            {c.day}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 開始時間 */}
            <div>
              <label className="block text-sm text-muted mb-2">開始時間</label>
              <select
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setSelectedLateNight(undefined);
                }}
                className={`w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer ${selectedLateNight ? "opacity-60" : ""}`}
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            {/* 終了時間 */}
            <div>
              <label className="block text-sm text-muted mb-2">終了時間</label>
              <select
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setSelectedLateNight(undefined);
                }}
                className={`w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer ${selectedLateNight ? "opacity-60" : ""}`}
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-muted mb-2">深夜練</label>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const eligible = selectedStudios.filter((id) =>
                    lateNightByStudioId.has(id),
                  );
                  const canUse = eligible.length > 0;
                  const active = Boolean(selectedLateNight);

                  return (
                    <button
                      onClick={() => {
                        if (!canUse) return;

                        // 2回目押下: 深夜練を解除して、押す前の時間に戻す
                        if (active) {
                          if (lateNightBackupTime) {
                            setStartTime(lateNightBackupTime.start);
                            setEndTime(lateNightBackupTime.end);
                          }
                          setSelectedLateNight(undefined);
                          setLateNightBackupTime(null);
                          return;
                        }

                        // 1回目押下: 現在の時間を退避してから深夜練時間に切り替える
                        setLateNightBackupTime({
                          start: startTime,
                          end: endTime,
                        });

                        const idToUse =
                          (selectedLateNight &&
                          eligible.includes(selectedLateNight)
                            ? selectedLateNight
                            : eligible[0]) ?? eligible[0];
                        const range = idToUse
                          ? lateNightByStudioId.get(idToUse)
                          : undefined;
                        if (!idToUse || !range) return;

                        setSelectedLateNight(idToUse);
                        setStartTime(range.start);
                        setEndTime(range.end);
                      }}
                      disabled={!canUse}
                      className={`
                        px-4 py-3 rounded-lg font-medium transition-all
                        ${
                          !canUse
                            ? "bg-muted/20 text-muted cursor-not-allowed"
                            : active
                              ? "bg-accent text-background"
                              : "bg-background border border-border text-foreground hover:border-accent focus:outline-none focus:border-accent"
                        }
                      `}
                    >
                      深夜練
                    </button>
                  );
                })()}
                {selectedStudios.filter((id) => lateNightByStudioId.has(id))
                  .length === 0 && (
                  <span className="text-xs text-muted">
                    （深夜に予約できません）
                  </span>
                )}
              </div>
              {selectedLateNight &&
                lateNightByStudioId.get(selectedLateNight) && (
                  <div className="mt-2 text-xs text-muted">
                    深夜練:{" "}
                    <span className="text-accent font-mono">
                      {lateNightByStudioId.get(selectedLateNight)!.start}
                    </span>
                    {" 〜 "}
                    <span className="text-accent font-mono">
                      {lateNightByStudioId.get(selectedLateNight)!.end}
                    </span>
                  </div>
                )}
            </div>

            {/* 検索ボタン */}
            <div className="lg:col-span-2 flex items-end">
              <button
                onClick={fetchData}
                disabled={loading || selectedStudios.length === 0}
                className={`
                  w-full px-8 py-3 rounded-lg font-semibold transition-all
                  ${
                    loading || selectedStudios.length === 0
                      ? "bg-muted/20 text-muted cursor-not-allowed"
                      : "bg-accent text-background hover:bg-accent/90"
                  }
                `}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    検索中...
                  </span>
                ) : (
                  "検索"
                )}
              </button>
            </div>
          </div>

          {/* 時間範囲の表示 */}
          {startTime && endTime && (
            <div className="mt-4 text-sm text-muted">
              表示時間帯:{" "}
              <span className="text-accent font-mono">{startTime}</span>
              {" 〜 "}
              <span className="text-accent font-mono">{endTime}</span>
            </div>
          )}
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 mb-8 animate-fade-in">
            <p className="text-danger text-sm">{error}</p>
          </div>
        )}

        {/* 結果表示 */}
        {filteredData && !loading && (
          <div className="space-y-8">
            {/* 凡例 */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-accent" />
                <span className="text-muted">空き</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-danger/60" />
                <span className="text-muted">予約済み</span>
              </div>
            </div>
            <div className="mt-2 text-sm text-danger">
              <li>○ボタンを押すと直接予約ページに飛びます。</li>
              <li>
                各スタジオや部屋の名前を押すと、その詳細ページに移動します。
              </li>
            </div>

            {/* 各スタジオの結果 */}
            {dayResults.map((day) => (
              <div key={day.date} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">
                    {day.date}（{day.dayOfWeek}）
                  </h3>
                </div>

                {(day.studios ?? []).map((studio, studioIndex) => {
                  // 型ガード
                  const isCivicHall = "rooms" in studio;
                  const isCrea =
                    "studios" in studio &&
                    Array.isArray((studio as CreaResponse).studios);

                  return (
                    <div
                      key={`${day.date}-${studio.studioId}`}
                      className="bg-card border border-border rounded-lg overflow-hidden animate-fade-in"
                      style={{ animationDelay: `${studioIndex * 60}ms` }}
                    >
                      {/* スタジオヘッダー */}
                      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-lg">
                            {(() => {
                              const info = studioInfoById.get(studio.studioId);
                              const href =
                                info?.type === "crea-studio" &&
                                "studios" in studio
                                  ? (buildCreaDetailUrl(
                                      studio as CreaResponse,
                                    ) ?? info?.url)
                                  : info?.url;
                              if (!href) return studio.studioName;
                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                  title="スタジオ詳細ページを開く"
                                >
                                  {studio.studioName}
                                </a>
                              );
                            })()}
                          </h4>
                          <p className="text-sm text-muted">
                            {studio.date}（{studio.dayOfWeek}）
                          </p>
                          {selectedLateNight &&
                            !lateNightByStudioId.get(studio.studioId) && (
                              <p className="text-xs text-danger mt-1">
                                深夜に予約はできません
                              </p>
                            )}
                        </div>
                        {studio.error && (
                          <span className="text-danger text-sm">
                            {studio.error}
                          </span>
                        )}
                      </div>

                      {/* CREAスタジオ系の表示 */}
                      {isCrea ? (
                        <div className="p-6">
                          {(studio as CreaResponse).studios &&
                          (studio as CreaResponse).studios.length > 0 ? (
                            <div className="space-y-6">
                              {(studio as CreaResponse).studios.map(
                                (creaStudio) => (
                                  <div
                                    key={creaStudio.studioId}
                                    className="border border-border rounded-lg overflow-hidden"
                                  >
                                    <div className="bg-purple-500/10 px-4 py-3 border-b border-border">
                                      <h5 className="font-semibold text-sm text-purple-400">
                                        {creaStudio.studioName}
                                        <span className="text-muted font-normal ml-2">
                                          {creaStudio.floor} / {creaStudio.size}
                                        </span>
                                      </h5>
                                    </div>
                                    {creaStudio.slots.map((slot) => (
                                      <div
                                        key={slot.slotType}
                                        className="border-b border-border last:border-b-0"
                                      >
                                        <div className="bg-card-hover px-4 py-2 border-b border-border flex items-center justify-between">
                                          <h6 className="font-medium text-sm">
                                            {slot.slotName}
                                            <span className="text-muted font-normal ml-2 text-xs">
                                              ({slot.hours})
                                            </span>
                                          </h6>
                                          <span className="text-purple-400 text-sm font-mono">
                                            ¥{slot.price.toLocaleString()}
                                          </span>
                                        </div>
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-sm">
                                            <thead>
                                              <tr className="border-b border-border">
                                                <th className="px-4 py-3 text-left text-muted font-medium">
                                                  時間帯
                                                </th>
                                                <th className="px-4 py-3 text-center text-muted font-medium">
                                                  状況
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {slot.timeSlots.length > 0 ? (
                                                slot.timeSlots.map((ts) => (
                                                  <tr
                                                    key={ts.time}
                                                    className="border-b border-border/50 hover:bg-card-hover transition-colors"
                                                  >
                                                    <td className="px-4 py-3 font-mono text-muted">
                                                      {ts.time}〜
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                      {(() => {
                                                        const canBook =
                                                          ts.available &&
                                                          Boolean(
                                                            ts.bookingUrl,
                                                          );
                                                        const bookingUrl =
                                                          ts.bookingUrl;
                                                        return (
                                                          <button
                                                            type="button"
                                                            onClick={() => {
                                                              if (
                                                                bookingUrl &&
                                                                canBook
                                                              ) {
                                                                openInNewTab(
                                                                  bookingUrl,
                                                                );
                                                              }
                                                            }}
                                                            disabled={!canBook}
                                                            className={`
                                                    inline-flex items-center justify-center w-12 h-8 rounded-md transition-all
                                                    ${
                                                      ts.available
                                                        ? "bg-accent/20 border border-accent/40"
                                                        : "bg-danger/20 border border-danger/40"
                                                    }
                                                    ${
                                                      canBook
                                                        ? "cursor-pointer hover:brightness-110"
                                                        : "cursor-default"
                                                    }
                                                    disabled:opacity-100
                                                  `}
                                                            title={
                                                              ts.available
                                                                ? canBook
                                                                  ? "空き（予約ページを開く）"
                                                                  : "空き"
                                                                : "予約済み"
                                                            }
                                                          >
                                                            <span
                                                              className={`
                                                      text-sm
                                                      ${
                                                        ts.available
                                                          ? "text-accent"
                                                          : "text-danger/60"
                                                      }
                                                    `}
                                                            >
                                                              {ts.available
                                                                ? "○"
                                                                : "×"}
                                                            </span>
                                                          </button>
                                                        );
                                                      })()}
                                                    </td>
                                                  </tr>
                                                ))
                                              ) : (
                                                <tr>
                                                  <td
                                                    colSpan={2}
                                                    className="px-4 py-4 text-center text-muted"
                                                  >
                                                    この時間帯のデータがありません
                                                  </td>
                                                </tr>
                                              )}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    ))}
                                    {creaStudio.slots.length === 0 && (
                                      <div className="text-center text-muted text-sm py-4">
                                        指定した時間帯に空きがありません
                                      </div>
                                    )}
                                  </div>
                                ),
                              )}
                            </div>
                          ) : (
                            <div className="p-8 text-center text-muted">
                              データがありません
                            </div>
                          )}
                        </div>
                      ) : isCivicHall ? (
                        /* 市民会館系の表示 */
                        <div className="p-6">
                          {(studio as CivicHallResponse).rooms &&
                          (studio as CivicHallResponse).rooms.length > 0 ? (
                            <div className="space-y-6">
                              {(studio as CivicHallResponse).rooms.map(
                                (room) => (
                                  <div
                                    key={room.roomName}
                                    className="border border-border rounded-lg overflow-hidden"
                                  >
                                    <div className="bg-card-hover px-4 py-2 border-b border-border">
                                      <h5 className="font-semibold text-sm">
                                        {room.roomName}
                                      </h5>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr className="border-b border-border">
                                            <th className="px-4 py-3 text-left text-muted font-medium">
                                              時間帯
                                            </th>
                                            <th className="px-4 py-3 text-center text-muted font-medium">
                                              状況
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {room.slots.map((slot) => (
                                            <tr
                                              key={`${slot.slotId}-${slot.timeRange}`}
                                              className="border-b border-border/50 hover:bg-card-hover transition-colors"
                                            >
                                              <td className="px-4 py-3 font-mono text-muted">
                                                {slot.timeRange}
                                              </td>
                                              <td className="px-4 py-3 text-center">
                                                {(() => {
                                                  const canBook =
                                                    slot.status === "○" ||
                                                    slot.status === "●";
                                                  const bookingUrl =
                                                    canBook &&
                                                    buildCivicHallDateUrl(
                                                      studio.date,
                                                    );
                                                  return (
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        if (
                                                          bookingUrl &&
                                                          canBook
                                                        ) {
                                                          openInNewTab(
                                                            bookingUrl,
                                                          );
                                                        }
                                                      }}
                                                      disabled={!canBook}
                                                      className={`
                                              inline-flex items-center justify-center w-12 h-8 rounded-md transition-all
                                              ${
                                                slot.status === "○" ||
                                                slot.status === "●"
                                                  ? "bg-accent/20 border border-accent/40"
                                                  : slot.status === "×"
                                                    ? "bg-danger/20 border border-danger/40"
                                                    : "bg-muted/10 border border-muted/20"
                                              }
                                              ${
                                                canBook
                                                  ? "cursor-pointer hover:brightness-110"
                                                  : "cursor-default"
                                              }
                                              disabled:opacity-100
                                            `}
                                                      title={
                                                        slot.status === "○" ||
                                                        slot.status === "●"
                                                          ? "空き（予約サイトを開く）"
                                                          : slot.status === "×"
                                                            ? "予約済み"
                                                            : "受付期間外"
                                                      }
                                                    >
                                                      <span
                                                        className={`
                                                text-sm
                                                ${
                                                  slot.status === "○" ||
                                                  slot.status === "●"
                                                    ? "text-accent"
                                                    : slot.status === "×"
                                                      ? "text-danger/60"
                                                      : "text-muted"
                                                }
                                              `}
                                                      >
                                                        {slot.status}
                                                      </span>
                                                    </button>
                                                  );
                                                })()}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          ) : (
                            <div className="p-8 text-center text-muted">
                              データがありません
                            </div>
                          )}
                        </div>
                      ) : (
                        /* BUZZスタジオ系の表示 */
                        <>
                          {(studio as AvailabilityResponse).timeSlots &&
                          (studio as AvailabilityResponse).timeSlots.length >
                            0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-border">
                                    <th className="px-4 py-3 text-left text-muted font-medium sticky left-0 bg-card">
                                      時間
                                    </th>
                                    {(
                                      studio as AvailabilityResponse
                                    ).timeSlots[0]?.studios.map((_, idx) => (
                                      <th
                                        key={idx}
                                        className="px-2 py-3 text-center text-muted font-medium min-w-[50px]"
                                      >
                                        {(() => {
                                          const roomNumber = idx + 1;
                                          const info = studioInfoById.get(
                                            studio.studioId,
                                          );
                                          // Instabase（studioCount=1想定）は「1st」見出しを出さない
                                          if (
                                            info?.type === "instabase-space" &&
                                            (studio as AvailabilityResponse)
                                              .timeSlots?.[0]?.studios
                                              .length === 1
                                          ) {
                                            return "";
                                          }
                                          const roomHref =
                                            buildBuzzRoomDetailUrl(
                                              studioInfoById.get(
                                                studio.studioId,
                                              ),
                                              roomNumber,
                                            );
                                          const label = `${roomNumber}st`;
                                          if (!roomHref) return label;
                                          return (
                                            <a
                                              href={roomHref}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="hover:underline"
                                              title={`${label}の詳細ページを開く`}
                                            >
                                              {label}
                                            </a>
                                          );
                                        })()}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(
                                    studio as AvailabilityResponse
                                  ).timeSlots.map((slot) => (
                                    <tr
                                      key={slot.time}
                                      className="border-b border-border/50 hover:bg-card-hover transition-colors"
                                    >
                                      <td className="px-4 py-2 font-mono text-muted sticky left-0 bg-card">
                                        {slot.time === "23:30"
                                          ? "深夜練"
                                          : slot.time}
                                      </td>
                                      {slot.studios.map((s, idx) => (
                                        <td
                                          key={idx}
                                          className="px-2 py-2 text-center"
                                        >
                                          {(() => {
                                            const studioNumber = idx + 1;
                                            const info = studioInfoById.get(
                                              studio.studioId,
                                            );
                                            const isInstabase =
                                              info?.type === "instabase-space";
                                            const bookingUrl = s.isAvailable
                                              ? (s.bookingUrl ??
                                                buildBuzzBookingUrl(
                                                  studioInfoById.get(
                                                    studio.studioId,
                                                  ),
                                                  studioNumber,
                                                  studio.date,
                                                ))
                                              : null;
                                            const canBook =
                                              s.isAvailable &&
                                              Boolean(bookingUrl);
                                            return (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (bookingUrl && canBook) {
                                                    if (
                                                      isInstabase &&
                                                      bookingUrl.startsWith(
                                                        "/instabase/orders?",
                                                      )
                                                    ) {
                                                      openInNewTab(bookingUrl);
                                                    } else {
                                                      openInNewTab(bookingUrl);
                                                    }
                                                  }
                                                }}
                                                disabled={!canBook}
                                                className={`
                                          w-8 h-8 mx-auto rounded-md flex items-center justify-center transition-all
                                          ${
                                            s.isAvailable
                                              ? "bg-accent/20 border border-accent/40"
                                              : "bg-danger/20 border border-danger/40"
                                          }
                                          ${
                                            canBook
                                              ? "cursor-pointer hover:brightness-110"
                                              : "cursor-default"
                                          }
                                          disabled:opacity-100
                                        `}
                                                title={
                                                  s.isAvailable
                                                    ? canBook
                                                      ? "空き（予約ページを開く）"
                                                      : "空き"
                                                    : "予約済み"
                                                }
                                              >
                                                {s.isAvailable ? (
                                                  <span className="text-accent text-xs">
                                                    ○
                                                  </span>
                                                ) : (
                                                  <span className="text-danger/60 text-xs">
                                                    ×
                                                  </span>
                                                )}
                                              </button>
                                            );
                                          })()}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="p-8 text-center text-muted">
                              指定した時間帯にデータがありません
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* 上部（検索条件）へ戻るボタン（右下固定） */}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("search-controls");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            } else {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-full border border-border bg-card/90 backdrop-blur-sm text-foreground shadow-lg hover:border-accent transition-colors"
          title="検索条件へ戻る"
        >
          上部に戻る
        </button>

        {/* ローディング表示 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-border border-t-accent rounded-full animate-spin mb-4" />
            <p className="text-muted">データを取得中...</p>
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <p className="text-center text-muted text-sm">
            STUDIO_CHECK - スタジオ空き状況チェッカー
          </p>
        </div>
      </footer>
    </div>
  );
}
