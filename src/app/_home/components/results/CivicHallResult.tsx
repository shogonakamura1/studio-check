"use client";

import type { CivicHallResponse } from "@/types";
import { buildCivicHallDateUrl, openInNewTab } from "@/app/_home/utils";

type Props = {
  studio: CivicHallResponse;
};

export function CivicHallResult({ studio }: Props) {
  return (
    <div className="p-6">
      {studio.rooms && studio.rooms.length > 0 ? (
        <div className="space-y-6">
          {studio.rooms.map((room) => (
            <div
              key={room.roomName}
              className="border border-border rounded-lg overflow-hidden"
            >
              <div className="bg-card-hover px-4 py-2 border-b border-border">
                <h5 className="font-semibold text-sm">{room.roomName}</h5>
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
                          {(() => {
                            const canBook =
                              slot.status === "○" || slot.status === "●";
                            const bookingUrl =
                              canBook && buildCivicHallDateUrl(studio.date);
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  if (bookingUrl && canBook) {
                                    openInNewTab(bookingUrl);
                                  }
                                }}
                                disabled={!canBook}
                                className={`
                                              inline-flex items-center justify-center w-12 h-8 rounded-md transition-all
                                              ${
                                                slot.status === "○" ||
                                                slot.status === "●"
                                                  ? "bg-accent/20 border border-accent/40"
                                                  : slot.status === "×"
                                                    ? "bg-danger/20 border border-danger/40"
                                                    : "bg-muted/10 border border-muted/20"
                                              }
                                              ${
                                                canBook
                                                  ? "cursor-pointer hover:brightness-110"
                                                  : "cursor-default"
                                              }
                                              disabled:opacity-100
                                            `}
                                title={
                                  slot.status === "○" || slot.status === "●"
                                    ? "空き（予約サイトを開く）"
                                    : slot.status === "×"
                                      ? "予約済み"
                                      : "受付期間外"
                                }
                              >
                                <span
                                  className={`
                                                text-sm
                                                ${
                                                  slot.status === "○" ||
                                                  slot.status === "●"
                                                    ? "text-accent"
                                                    : slot.status === "×"
                                                      ? "text-danger/60"
                                                      : "text-muted"
                                                }
                                              `}
                                >
                                  {slot.status}
                                </span>
                              </button>
                            );
                          })()}
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
        <div className="p-8 text-center text-muted">データがありません</div>
      )}
    </div>
  );
}

