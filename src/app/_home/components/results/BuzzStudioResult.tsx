"use client";

import type { AvailableStudioInfo } from "@/app/_home/types";
import type { AvailabilityResponse } from "@/types";
import {
  buildBuzzBookingUrl,
  buildBuzzRoomDetailUrl,
  openInNewTab,
} from "@/app/_home/utils";

type Props = {
  studio: AvailabilityResponse;
  studioInfoById: Map<string, AvailableStudioInfo>;
};

export function BuzzStudioResult({ studio, studioInfoById }: Props) {
  // 深夜練の開始時刻はAPIの設定値（lateNight.start）から取得する
  const lateNightStart = studioInfoById.get(studio.studioId)?.lateNight?.start;

  return (
    <>
      {studio.timeSlots && studio.timeSlots.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-muted font-medium sticky left-0 bg-card">
                  時間
                </th>
                {studio.timeSlots[0]?.studios.map((_, idx) => (
                  <th
                    key={idx}
                    className="px-2 py-3 text-center text-muted font-medium min-w-[50px]"
                  >
                    {(() => {
                      const roomNumber = idx + 1;
                      const info = studioInfoById.get(studio.studioId);
                      // Instabase（studioCount=1想定）は「1st」見出しを出さない
                      if (
                        info?.type === "instabase-space" &&
                        studio.timeSlots?.[0]?.studios.length === 1
                      ) {
                        return "";
                      }
                      const roomHref = buildBuzzRoomDetailUrl(
                        studioInfoById.get(studio.studioId),
                        roomNumber,
                      );
                      const label = `${roomNumber}st`;
                      if (!roomHref) return label;
                      return (
                        <a
                          href={roomHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                          title={`${label}の詳細ページを開く`}
                        >
                          {label}
                        </a>
                      );
                    })()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studio.timeSlots.map((slot) => (
                <tr
                  key={slot.time}
                  className="border-b border-border/50 hover:bg-card-hover transition-colors"
                >
                  <td className="px-4 py-2 font-mono text-muted sticky left-0 bg-card">
                    {lateNightStart && slot.time === lateNightStart
                      ? "深夜練"
                      : slot.time}
                  </td>
                  {slot.studios.map((s, idx) => (
                    <td key={idx} className="px-2 py-2 text-center">
                      {(() => {
                        const studioNumber = idx + 1;
                        const bookingUrl = s.isAvailable
                          ? (s.bookingUrl ??
                            buildBuzzBookingUrl(
                              studioInfoById.get(studio.studioId),
                              studioNumber,
                              studio.date,
                            ))
                          : null;
                        const canBook = s.isAvailable && Boolean(bookingUrl);
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
                                          w-8 h-8 mx-auto rounded-md flex items-center justify-center transition-all
                                          ${
                                            s.isAvailable
                                              ? "bg-accent/20 border border-accent/40"
                                              : "bg-danger/20 border border-danger/40"
                                          }
                                          ${
                                            canBook
                                              ? "cursor-pointer hover:brightness-110"
                                              : "cursor-default"
                                          }
                                          disabled:opacity-100
                                        `}
                            title={
                              s.isAvailable
                                ? canBook
                                  ? "空き（予約ページを開く）"
                                  : "空き"
                                : "予約済み"
                            }
                          >
                            {s.isAvailable ? (
                              <span className="text-accent text-xs">○</span>
                            ) : (
                              <span className="text-danger/60 text-xs">×</span>
                            )}
                          </button>
                        );
                      })()}
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
  );
}

