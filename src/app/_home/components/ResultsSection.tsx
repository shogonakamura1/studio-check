"use client";

import type { AvailableStudioInfo, DayResult } from "@/app/_home/types";

import { DayResults } from "@/app/_home/components/results/DayResults";
import { ResultsLegend } from "@/app/_home/components/results/ResultsLegend";

type Props = {
  dayResults: DayResult[];
  selectedLateNight: string | undefined;
  lateNightByStudioId: Map<string, { start: string; end: string }>;
  studioInfoById: Map<string, AvailableStudioInfo>;
};

export function ResultsSection({
  dayResults,
  selectedLateNight,
  lateNightByStudioId,
  studioInfoById,
}: Props) {
  return (
    <div className="space-y-8">
      <ResultsLegend />

      <DayResults
        dayResults={dayResults}
        selectedLateNight={selectedLateNight}
        lateNightByStudioId={lateNightByStudioId}
        studioInfoById={studioInfoById}
      />
    </div>
  );
}

