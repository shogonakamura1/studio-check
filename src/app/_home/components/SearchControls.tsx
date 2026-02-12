"use client";

import type { Dispatch, SetStateAction } from "react";

import { CalendarMultiSelect } from "@/app/_home/components/search/CalendarMultiSelect";
import { LateNightToggle } from "@/app/_home/components/search/LateNightToggle";
import { QuickDateSelect } from "@/app/_home/components/search/QuickDateSelect";
import { SearchButton } from "@/app/_home/components/search/SearchButton";
import { StudioSelections } from "@/app/_home/components/search/StudioSelections";
import { TimeSelects } from "@/app/_home/components/search/TimeSelects";

type Props = {
  selectedStudios: string[];
  toggleStudio: (studioId: string) => void;

  selectedDatesSet: Set<string>;
  toggleDate: (dateStr: string) => void;

  calendarYear: number;
  calendarMonthIndex: number;
  setCalendarYear: Dispatch<SetStateAction<number>>;
  setCalendarMonthIndex: Dispatch<SetStateAction<number>>;
  today: string;

  startTime: string;
  endTime: string;
  setStartTime: Dispatch<SetStateAction<string>>;
  setEndTime: Dispatch<SetStateAction<string>>;

  selectedLateNight: string | undefined;
  setSelectedLateNight: Dispatch<SetStateAction<string | undefined>>;
  lateNightByStudioId: Map<string, { start: string; end: string }>;
  lateNightBackupTime: { start: string; end: string } | null;
  setLateNightBackupTime: Dispatch<
    SetStateAction<{ start: string; end: string } | null>
  >;

  fetchData: () => void;
  loading: boolean;
};

export function SearchControls({
  selectedStudios,
  toggleStudio,
  selectedDatesSet,
  toggleDate,
  calendarYear,
  calendarMonthIndex,
  setCalendarYear,
  setCalendarMonthIndex,
  today,
  startTime,
  endTime,
  setStartTime,
  setEndTime,
  selectedLateNight,
  setSelectedLateNight,
  lateNightByStudioId,
  lateNightBackupTime,
  setLateNightBackupTime,
  fetchData,
  loading,
}: Props) {
  return (
    <div
      id="search-controls"
      className="bg-card border border-border rounded-lg p-6 mb-8 animate-fade-in"
    >
      <h2 className="text-sm font-semibold text-muted mb-4 uppercase tracking-wider">
        検索条件
      </h2>

      <StudioSelections
        selectedStudios={selectedStudios}
        toggleStudio={toggleStudio}
      />

      <QuickDateSelect selectedDatesSet={selectedDatesSet} toggleDate={toggleDate} />

      {/* 日付・時間選択と検索ボタン */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <CalendarMultiSelect
          calendarYear={calendarYear}
          calendarMonthIndex={calendarMonthIndex}
          setCalendarYear={setCalendarYear}
          setCalendarMonthIndex={setCalendarMonthIndex}
          today={today}
          selectedDatesSet={selectedDatesSet}
          toggleDate={toggleDate}
        />

        <TimeSelects
          startTime={startTime}
          endTime={endTime}
          setStartTime={setStartTime}
          setEndTime={setEndTime}
          selectedLateNight={selectedLateNight}
          setSelectedLateNight={setSelectedLateNight}
        />

        <LateNightToggle
          selectedStudios={selectedStudios}
          selectedLateNight={selectedLateNight}
          setSelectedLateNight={setSelectedLateNight}
          lateNightByStudioId={lateNightByStudioId}
          lateNightBackupTime={lateNightBackupTime}
          setLateNightBackupTime={setLateNightBackupTime}
          startTime={startTime}
          endTime={endTime}
          setStartTime={setStartTime}
          setEndTime={setEndTime}
        />

        <SearchButton
          fetchData={fetchData}
          loading={loading}
          disabled={loading || selectedStudios.length === 0}
        />
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
  );
}

