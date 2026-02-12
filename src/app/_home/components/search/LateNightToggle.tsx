"use client";

import type { Dispatch, SetStateAction } from "react";

type Props = {
  selectedStudios: string[];
  selectedLateNight: string | undefined;
  setSelectedLateNight: Dispatch<SetStateAction<string | undefined>>;
  lateNightByStudioId: Map<string, { start: string; end: string }>;
  lateNightBackupTime: { start: string; end: string } | null;
  setLateNightBackupTime: Dispatch<
    SetStateAction<{ start: string; end: string } | null>
  >;
  startTime: string;
  endTime: string;
  setStartTime: Dispatch<SetStateAction<string>>;
  setEndTime: Dispatch<SetStateAction<string>>;
};

export function LateNightToggle({
  selectedStudios,
  selectedLateNight,
  setSelectedLateNight,
  lateNightByStudioId,
  lateNightBackupTime,
  setLateNightBackupTime,
  startTime,
  endTime,
  setStartTime,
  setEndTime,
}: Props) {
  return (
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
                  (selectedLateNight && eligible.includes(selectedLateNight)
                    ? selectedLateNight
                    : eligible[0]) ?? eligible[0];
                const range = idToUse ? lateNightByStudioId.get(idToUse) : undefined;
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
        {selectedStudios.filter((id) => lateNightByStudioId.has(id)).length ===
          0 && <span className="text-xs text-muted">（深夜に予約できません）</span>}
      </div>
      {selectedLateNight && lateNightByStudioId.get(selectedLateNight) && (
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
  );
}

