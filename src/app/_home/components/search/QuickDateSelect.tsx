"use client";

import { toLocalDateString } from "@/app/_home/utils";

type Props = {
  selectedDatesSet: Set<string>;
  toggleDate: (dateStr: string) => void;
};

export function QuickDateSelect({ selectedDatesSet, toggleDate }: Props) {
  return (
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
  );
}

