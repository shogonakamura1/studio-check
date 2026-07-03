"use client";

import type { CreaResponse } from "@/types";
import { openInNewTab } from "@/app/_home/utils";

type Props = {
  studio: CreaResponse;
};

export function CreaStudioResult({ studio }: Props) {
  return (
    <div className="p-6">
      {studio.studios && studio.studios.length > 0 ? (
        <div className="space-y-6">
          {studio.studios.map((creaStudio) => (
            <div
              key={creaStudio.studioId}
              className="border border-border rounded-lg overflow-hidden"
            >
              <div className="bg-purple-500/10 px-4 py-3 border-b border-border">
                <h5 className="font-semibold text-sm text-purple-400">
                  {creaStudio.studioName}
                  <span className="text-muted font-normal ml-2">
                    {creaStudio.floor} / {creaStudio.size}
                  </span>
                </h5>
              </div>
              {creaStudio.slots.map((slot) => (
                <div
                  key={slot.slotType}
                  className="border-b border-border last:border-b-0"
                >
                  <div className="bg-card-hover px-4 py-2 border-b border-border flex items-center justify-between">
                    <h6 className="font-medium text-sm">
                      {slot.slotName}
                      <span className="text-muted font-normal ml-2 text-xs">
                        ({slot.hours})
                      </span>
                    </h6>
                    <span className="text-purple-400 text-sm font-mono">
                      ¥{slot.price.toLocaleString()}
                      {slot.priceIsEstimate && (
                        <span
                          className="text-muted text-xs ml-1"
                          title="APIから価格を取得できなかったため参考価格を表示しています"
                        >
                          （参考）
                        </span>
                      )}
                    </span>
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
                        {slot.timeSlots.length > 0 ? (
                          slot.timeSlots.map((ts) => (
                            <tr
                              key={ts.time}
                              className="border-b border-border/50 hover:bg-card-hover transition-colors"
                            >
                              <td className="px-4 py-3 font-mono text-muted">
                                {ts.time}〜
                              </td>
                              <td className="px-4 py-3 text-center">
                                {(() => {
                                  const canBook =
                                    ts.available && Boolean(ts.bookingUrl);
                                  const bookingUrl = ts.bookingUrl;
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
                                                      ts.available
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
                                        ts.available
                                          ? canBook
                                            ? "空き（予約ページを開く）"
                                            : "空き"
                                          : "予約済み"
                                      }
                                    >
                                      <span
                                        className={`
                                                      text-sm
                                                      ${
                                                        ts.available
                                                          ? "text-accent"
                                                          : "text-danger/60"
                                                      }
                                                    `}
                                      >
                                        {ts.available ? "○" : "×"}
                                      </span>
                                    </button>
                                  );
                                })()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={2}
                              className="px-4 py-4 text-center text-muted"
                            >
                              この時間帯のデータがありません
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {creaStudio.slots.length === 0 && (
                <div className="text-center text-muted text-sm py-4">
                  指定した時間帯に空きがありません
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-muted">データがありません</div>
      )}
    </div>
  );
}

