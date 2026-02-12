"use client";

import type { AvailableStudioInfo, DayResult } from "@/app/_home/types";

import { StudioResultCard } from "@/app/_home/components/results/StudioResultCard";

type Props = {
  dayResults: DayResult[];
  selectedLateNight: string | undefined;
  lateNightByStudioId: Map<string, { start: string; end: string }>;
  studioInfoById: Map<string, AvailableStudioInfo>;
};

export function DayResults({
  dayResults,
  selectedLateNight,
  lateNightByStudioId,
  studioInfoById,
}: Props) {
  return (
    <>
      {dayResults.map((day) => (
        <div key={day.date} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">
              {day.date}（{day.dayOfWeek}）
            </h3>
          </div>

          {(day.studios ?? []).map((studio, studioIndex) => (
            <StudioResultCard
              key={`${day.date}-${studio.studioId}`}
              studio={studio}
              studioIndex={studioIndex}
              selectedLateNight={selectedLateNight}
              lateNightByStudioId={lateNightByStudioId}
              studioInfoById={studioInfoById}
            />
          ))}
        </div>
      ))}
    </>
  );
}

