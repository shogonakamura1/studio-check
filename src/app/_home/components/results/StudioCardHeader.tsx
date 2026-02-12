"use client";

import type { AvailableStudioInfo } from "@/app/_home/types";
import type { CreaResponse } from "@/types";
import { buildCreaDetailUrl } from "@/app/_home/utils";

type BaseStudio = {
  studioId: string;
  studioName: string;
  date: string;
  dayOfWeek: string;
  error?: string;
};

type Props = {
  studio: BaseStudio;
  studioInfoById: Map<string, AvailableStudioInfo>;
  selectedLateNight: string | undefined;
  lateNightByStudioId: Map<string, { start: string; end: string }>;
  isCrea: boolean;
  creaStudio?: CreaResponse;
};

export function StudioCardHeader({
  studio,
  studioInfoById,
  selectedLateNight,
  lateNightByStudioId,
  isCrea,
  creaStudio,
}: Props) {
  return (
    <div className="border-b border-border px-6 py-4 flex items-center justify-between">
      <div>
        <h4 className="font-bold text-lg">
          {(() => {
            const info = studioInfoById.get(studio.studioId);
            const href =
              isCrea && creaStudio
                ? (buildCreaDetailUrl(creaStudio) ?? info?.url)
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
        {selectedLateNight && !lateNightByStudioId.get(studio.studioId) && (
          <p className="text-xs text-danger mt-1">深夜に予約はできません</p>
        )}
      </div>
      {studio.error && (
        <span className="text-danger text-sm">{studio.error}</span>
      )}
    </div>
  );
}

