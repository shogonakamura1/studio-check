"use client";

import type { AvailableStudioInfo } from "@/app/_home/types";
import type {
  AvailabilityResponse,
  CivicHallResponse,
  CreaResponse,
} from "@/types";

import { BuzzStudioResult } from "@/app/_home/components/results/BuzzStudioResult";
import { CivicHallResult } from "@/app/_home/components/results/CivicHallResult";
import { CreaStudioResult } from "@/app/_home/components/results/CreaStudioResult";
import { StudioCardHeader } from "@/app/_home/components/results/StudioCardHeader";

type AnyStudio = AvailabilityResponse | CivicHallResponse | CreaResponse;

type Props = {
  studio: AnyStudio;
  studioIndex: number;
  selectedLateNight: string | undefined;
  lateNightByStudioId: Map<string, { start: string; end: string }>;
  studioInfoById: Map<string, AvailableStudioInfo>;
};

export function StudioResultCard({
  studio,
  studioIndex,
  selectedLateNight,
  lateNightByStudioId,
  studioInfoById,
}: Props) {
  const isCivicHall = "rooms" in studio;
  const isCrea = "studios" in studio && Array.isArray((studio as CreaResponse).studios);

  return (
    <div
      className="bg-card border border-border rounded-lg overflow-hidden animate-fade-in"
      style={{ animationDelay: `${studioIndex * 60}ms` }}
    >
      <StudioCardHeader
        studio={studio}
        studioInfoById={studioInfoById}
        selectedLateNight={selectedLateNight}
        lateNightByStudioId={lateNightByStudioId}
        isCrea={isCrea}
        creaStudio={isCrea ? (studio as CreaResponse) : undefined}
      />

      {isCrea ? (
        <CreaStudioResult studio={studio as CreaResponse} />
      ) : isCivicHall ? (
        <CivicHallResult studio={studio as CivicHallResponse} />
      ) : (
        <BuzzStudioResult
          studio={studio as AvailabilityResponse}
          studioInfoById={studioInfoById}
        />
      )}
    </div>
  );
}

