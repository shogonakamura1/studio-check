"use client";

import { useState, useEffect, useMemo } from "react";
import type {
  AvailabilityResponse,
  CivicHallResponse,
  CreaResponse,
} from "@/types";
import type { ApiResponse, AvailableStudioInfo } from "@/app/_home/types";
import {
  dateStringToLocalDate,
  getTodayDate,
  isTimeRangeOverlap,
  timeToBusinessMinutes,
  timeToMinutes,
} from "@/app/_home/utils";
import { BackToTopButton } from "@/app/_home/components/BackToTopButton";
import { SiteFooter } from "@/app/_components/SiteFooter";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { ResultsSection } from "@/app/_home/components/ResultsSection";
import { SearchControls } from "@/app/_home/components/SearchControls";

export default function Home() {
  const [selectedStudios, setSelectedStudios] = useState<string[]>([
    "fukuokahonten",
  ]);
  const [selectedDates, setSelectedDates] = useState<string[]>([
    getTodayDate(),
  ]);
  const [startTime, setStartTime] = useState<string>("19:00");
  const [endTime, setEndTime] = useState<string>("21:00");
  const [data, setData] = useState<ApiResponse | null>(null);
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
    const map = new Map<string, AvailableStudioInfo>();
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

    return {
      ...data,
      dates: data.dates.map((d) => ({
        ...d,
        studios: filterStudios(d.studios),
      })),
    };
  }, [data, startTime, endTime]);

  const dayResults = useMemo(() => filteredData?.dates ?? [], [filteredData]);

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
        // サーバー側の具体的なエラーメッセージ（400/429等）があれば表示する
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "データの取得に失敗しました");
      }

      const result = (await response.json()) as ApiResponse;
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
      <SiteHeader />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">
          福岡のレンタルスタジオ空き状況を一括検索
        </h1>

        {/* サイト紹介（検索エンジン・初訪問者向けの説明文） */}
        <p className="text-sm text-muted leading-relaxed mb-6 max-w-3xl">
          Studio Checkは、福岡のレンタルスタジオ・ダンススタジオ
          （BUZZ福岡本店・天神・博多、福岡市民会館、CREA、スタジオin and
          out）の空き状況をまとめて検索できる無料ツールです。
          日付と時間帯を選んで検索すると、各公式サイトの最新の空き枠を一括で確認し、そのまま予約ページへ進めます。
        </p>

        {/* コントロールパネル */}
        <SearchControls
          selectedStudios={selectedStudios}
          toggleStudio={toggleStudio}
          selectedDatesSet={selectedDatesSet}
          toggleDate={toggleDate}
          calendarYear={calendarYear}
          calendarMonthIndex={calendarMonthIndex}
          setCalendarYear={setCalendarYear}
          setCalendarMonthIndex={setCalendarMonthIndex}
          today={today}
          startTime={startTime}
          endTime={endTime}
          setStartTime={setStartTime}
          setEndTime={setEndTime}
          selectedLateNight={selectedLateNight}
          setSelectedLateNight={setSelectedLateNight}
          lateNightByStudioId={lateNightByStudioId}
          lateNightBackupTime={lateNightBackupTime}
          setLateNightBackupTime={setLateNightBackupTime}
          fetchData={fetchData}
          loading={loading}
        />

        {/* エラー表示 */}
        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 mb-8 animate-fade-in">
            <p className="text-danger text-sm">{error}</p>
          </div>
        )}

        {/* 結果表示 */}
        {filteredData && !loading && (
          <ResultsSection
            dayResults={dayResults}
            selectedLateNight={selectedLateNight}
            lateNightByStudioId={lateNightByStudioId}
            studioInfoById={studioInfoById}
          />
        )}

        {/* 上部（検索条件）へ戻るボタン（右下固定） */}
        <BackToTopButton />

        {/* ローディング表示 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-border border-t-accent rounded-full animate-spin mb-4" />
            <p className="text-muted">データを取得中...</p>
          </div>
        )}
      </main>

      {/* フッター */}
      <SiteFooter />
    </div>
  );
}
