"use client";

import { useState, useEffect, useMemo } from "react";
import type { AvailabilityResponse, CivicHallResponse, CreaResponse } from "@/types";

// BUZZ系スタジオ情報（スクレイピング対応）
const BUZZ_STUDIOS = [
  { id: "fukuokahonten", name: "BUZZ福岡本店", location: "天神南駅徒歩3分" },
  { id: "fukuokatenjin", name: "BUZZ福岡天神", location: "天神駅徒歩5分" },
  { id: "fukuokatenjin2nd", name: "BUZZ福岡天神2nd", location: "天神駅徒歩5分" },
  { id: "fukuokahakata", name: "BUZZ福岡博多", location: "中洲川端駅徒歩3分" },
  { id: "fukuokahakataekimae", name: "BUZZ福岡博多駅前", location: "博多駅徒歩2分" },
];

// 市民会館・ホール系（部屋単位で選択可能）
const CIVIC_HALL_ROOMS = [
  { id: "civichall-rehearsal", name: "リハーサル室", parent: "福岡市民会館", location: "天神駅徒歩10分" },
  { id: "civichall-practice1", name: "練習室①", parent: "福岡市民会館", location: "天神駅徒歩10分" },
  { id: "civichall-practice3", name: "練習室③", parent: "福岡市民会館", location: "天神駅徒歩10分" },
];

// CREAスタジオ（スタジオ単位で選択可能、musicは除外）
const CREA_STUDIOS = [
  { id: "crea-daimyo", name: "CREA大名", floor: "2F", size: "77㎡", location: "大名エリア" },
  { id: "crea-plus", name: "CREA+", floor: "4F", size: "100㎡", location: "大名エリア" },
  { id: "crea-daimyo2", name: "CREA大名Ⅱ", floor: "3F", size: "49㎡", location: "大名エリア" },
];

// 外部スタジオ情報（リンクのみ）
const EXTERNAL_STUDIOS: Array<{
  id: string;
  name: string;
  location: string;
  url: string;
  rooms: string[];
  description: string;
}> = [];

// 時間オプション（06:00〜23:30まで30分刻み）
const TIME_OPTIONS = Array.from({ length: 36 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6;
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
});

// 今日の日付を取得
function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

// 時間を数値に変換（比較用）
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// 時間範囲が重なるかチェック
function isTimeRangeOverlap(
  range1Start: string,
  range1End: string,
  range2Start: string,
  range2End: string
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
  availableStudios: { id: string; name: string; studioCount: number }[];
}

export default function Home() {
  const [selectedStudios, setSelectedStudios] = useState<string[]>(["fukuokahonten"]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [startTime, setStartTime] = useState<string>("10:00");
  const [endTime, setEndTime] = useState<string>("22:00");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // スタジオ選択の切り替え
  const toggleStudio = (studioId: string) => {
    setSelectedStudios((prev) =>
      prev.includes(studioId)
        ? prev.filter((id) => id !== studioId)
        : [...prev, studioId]
    );
  };

  // 時間でフィルタリングされたデータ
  const filteredData = useMemo(() => {
    if (!data) return null;

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    return {
      ...data,
      studios: data.studios.map((studio) => {
        // CREAの場合は studios プロパティでフィルタリング
        if ("studios" in studio && Array.isArray(studio.studios)) {
          return {
            ...studio,
            studios: studio.studios.map((creaStudio) => ({
              ...creaStudio,
              slots: creaStudio.slots.map((slot) => ({
                ...slot,
                timeSlots: slot.timeSlots.filter((ts) => {
                  const slotMinutes = timeToMinutes(ts.time);
                  return slotMinutes >= startMinutes && slotMinutes < endMinutes;
                }),
              })),
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
                // timeRange "9:00-12:30" を "9:00" と "12:30" に分割
                const [slotStart, slotEnd] = slot.timeRange.split("-");
                // 指定時間範囲と重なりをチェック
                return isTimeRangeOverlap(startTime, endTime, slotStart, slotEnd);
              }),
            })),
          };
        }
        
        // BUZZスタジオの場合は時間フィルタリング
        const buzzStudio = studio as AvailabilityResponse;
        return {
          ...buzzStudio,
          timeSlots: buzzStudio.timeSlots.filter((slot) => {
            const slotMinutes = timeToMinutes(slot.time);
            return slotMinutes >= startMinutes && slotMinutes < endMinutes;
          }),
        };
      }),
    };
  }, [data, startTime, endTime]);

  // データ取得
  const fetchData = async () => {
    if (selectedStudios.length === 0) {
      setError("スタジオを選択してください");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/availability?studios=${selectedStudios.join(",")}&date=${selectedDate}`
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
        <div className="bg-card border border-border rounded-lg p-6 mb-8 animate-fade-in">
          <h2 className="text-sm font-semibold text-muted mb-4 uppercase tracking-wider">
            {"//"} 検索条件
          </h2>

          {/* BUZZスタジオ選択 */}
          <div className="mb-6">
            <label className="block text-sm text-muted mb-3">
              <span className="text-accent">●</span> BUZZスタジオ（空き状況を表示）
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
              <span className="text-blue-500">●</span> 福岡市民会館（部屋を個別に選択）
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
              <span className="text-purple-500">●</span> レンタルスタジオCREA（スタジオを個別に選択）
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
                    <div className="text-xs text-muted">{studio.floor} / {studio.size}</div>
                    <div className="text-xs text-purple-500/70 mt-0.5">
                      {studio.location}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 日付クイック選択 */}
          <div className="mb-4">
            <label className="block text-sm text-muted mb-2">日付をクイック選択</label>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((daysFromToday) => {
                const date = new Date();
                date.setDate(date.getDate() + daysFromToday);
                const dateStr = date.toISOString().split("T")[0];
                const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
                const dayName = dayNames[date.getDay()];
                const label = daysFromToday === 0 ? "今日" : daysFromToday === 1 ? "明日" : `${date.getMonth() + 1}/${date.getDate()}`;
                
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`
                      px-3 py-2 rounded-lg text-sm font-medium transition-all
                      ${selectedDate === dateStr
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
              <label className="block text-sm text-muted mb-2">日付（カレンダー）</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* 開始時間 */}
            <div>
              <label className="block text-sm text-muted mb-2">開始時間</label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
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
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
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
              表示時間帯: <span className="text-accent font-mono">{startTime}</span>
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

            {/* 各スタジオの結果 */}
            {filteredData.studios.map((studio, studioIndex) => {
              // 型ガード
              const isCivicHall = "rooms" in studio;
              const isCrea = "studios" in studio && Array.isArray((studio as CreaResponse).studios);

              return (
                <div
                  key={studio.studioId}
                  className="bg-card border border-border rounded-lg overflow-hidden animate-fade-in"
                  style={{ animationDelay: `${studioIndex * 100}ms` }}
                >
                  {/* スタジオヘッダー */}
                  <div className="border-b border-border px-6 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg">{studio.studioName}</h3>
                      <p className="text-sm text-muted">
                        {studio.date}（{studio.dayOfWeek}）
                      </p>
                    </div>
                    {studio.error && (
                      <span className="text-danger text-sm">{studio.error}</span>
                    )}
                  </div>

                  {/* CREAスタジオ系の表示 */}
                  {isCrea ? (
                    <div className="p-6">
                      {(studio as CreaResponse).studios && (studio as CreaResponse).studios.length > 0 ? (
                        <div className="space-y-6">
                          {(studio as CreaResponse).studios.map((creaStudio) => (
                            <div key={creaStudio.studioId} className="border border-border rounded-lg overflow-hidden">
                              <div className="bg-purple-500/10 px-4 py-3 border-b border-border">
                                <h4 className="font-semibold text-sm text-purple-400">
                                  {creaStudio.studioName}
                                  <span className="text-muted font-normal ml-2">
                                    {creaStudio.floor} / {creaStudio.size}
                                  </span>
                                </h4>
                              </div>
                              <div className="p-4 space-y-4">
                                {creaStudio.slots.map((slot) => {
                                  const availableSlots = slot.timeSlots.filter(ts => ts.available);
                                  if (availableSlots.length === 0) return null;
                                  
                                  return (
                                    <div key={slot.slotType} className="bg-card-hover rounded-lg p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium">
                                          {slot.slotName}
                                          <span className="text-muted font-normal ml-2 text-xs">
                                            ({slot.hours})
                                          </span>
                                        </span>
                                        <span className="text-purple-400 text-sm font-mono">
                                          ¥{slot.price.toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {availableSlots.map((ts) => (
                                          <div
                                            key={ts.time}
                                            className="px-3 py-1.5 rounded-md bg-accent/20 border border-accent/40 text-xs font-mono"
                                          >
                                            {ts.time}〜
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                                {creaStudio.slots.every(s => s.timeSlots.filter(ts => ts.available).length === 0) && (
                                  <div className="text-center text-muted text-sm py-4">
                                    指定した時間帯に空きがありません
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
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
                      {(studio as CivicHallResponse).rooms && (studio as CivicHallResponse).rooms.length > 0 ? (
                        <div className="space-y-6">
                          {(studio as CivicHallResponse).rooms.map((room) => (
                            <div key={room.roomName} className="border border-border rounded-lg overflow-hidden">
                              <div className="bg-card-hover px-4 py-2 border-b border-border">
                                <h4 className="font-semibold text-sm">{room.roomName}</h4>
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
                                          <div
                                            className={`
                                              inline-flex items-center justify-center w-12 h-8 rounded-md transition-all
                                              ${
                                                slot.status === "○"
                                                  ? "bg-accent/20 border border-accent/40"
                                                  : slot.status === "●"
                                                  ? "bg-accent/20 border border-accent/40"
                                                  : slot.status === "×"
                                                  ? "bg-danger/20 border border-danger/40"
                                                  : "bg-muted/10 border border-muted/20"
                                              }
                                            `}
                                            title={
                                              slot.status === "○" || slot.status === "●"
                                                ? "空き"
                                                : slot.status === "×"
                                                ? "予約済み"
                                                : "受付期間外"
                                            }
                                          >
                                            <span
                                              className={`
                                                text-sm
                                                ${
                                                  slot.status === "○" || slot.status === "●"
                                                    ? "text-accent"
                                                    : slot.status === "×"
                                                    ? "text-danger/60"
                                                    : "text-muted"
                                                }
                                              `}
                                            >
                                              {slot.status}
                                            </span>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
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
                      {(studio as AvailabilityResponse).timeSlots && (studio as AvailabilityResponse).timeSlots.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="px-4 py-3 text-left text-muted font-medium sticky left-0 bg-card">
                                  時間
                                </th>
                                {(studio as AvailabilityResponse).timeSlots[0]?.studios.map((_, idx) => (
                                  <th
                                    key={idx}
                                    className="px-2 py-3 text-center text-muted font-medium min-w-[50px]"
                                  >
                                    {idx + 1}st
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(studio as AvailabilityResponse).timeSlots.map((slot) => (
                                <tr
                                  key={slot.time}
                                  className="border-b border-border/50 hover:bg-card-hover transition-colors"
                                >
                                  <td className="px-4 py-2 font-mono text-muted sticky left-0 bg-card">
                                    {slot.time}
                                  </td>
                                  {slot.studios.map((s, idx) => (
                                    <td key={idx} className="px-2 py-2 text-center">
                                      <div
                                        className={`
                                          w-8 h-8 mx-auto rounded-md flex items-center justify-center transition-all
                                          ${
                                            s.isAvailable
                                              ? "bg-accent/20 border border-accent/40"
                                              : "bg-danger/20 border border-danger/40"
                                          }
                                        `}
                                        title={s.isAvailable ? "空き" : "予約済み"}
                                      >
                                        {s.isAvailable ? (
                                          <span className="text-accent text-xs">○</span>
                                        ) : (
                                          <span className="text-danger/60 text-xs">×</span>
                                        )}
                                      </div>
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
        )}

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
