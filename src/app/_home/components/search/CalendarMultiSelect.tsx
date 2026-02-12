"use client";

import type { Dispatch, SetStateAction } from "react";

import {
  daysInMonth,
  formatDateLabel,
  monthKey,
  toDateString,
} from "@/app/_home/utils";

type Props = {
  calendarYear: number;
  calendarMonthIndex: number;
  setCalendarYear: Dispatch<SetStateAction<number>>;
  setCalendarMonthIndex: Dispatch<SetStateAction<number>>;
  today: string;
  selectedDatesSet: Set<string>;
  toggleDate: (dateStr: string) => void;
};

export function CalendarMultiSelect({
  calendarYear,
  calendarMonthIndex,
  setCalendarYear,
  setCalendarMonthIndex,
  today,
  selectedDatesSet,
  toggleDate,
}: Props) {
  return (
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
            {calendarYear}/{String(calendarMonthIndex + 1).padStart(2, "0")}
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
            const dateStr = toDateString(calendarYear, calendarMonthIndex, day);
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
  );
}

