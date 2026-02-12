"use client";

import {
  BUZZ_STUDIOS,
  CIVIC_HALL_ROOMS,
  CREA_STUDIOS,
  INSTABASE_SPACES,
} from "@/app/_home/constants";

type Props = {
  selectedStudios: string[];
  toggleStudio: (studioId: string) => void;
};

export function StudioSelections({ selectedStudios, toggleStudio }: Props) {
  return (
    <>
      {/* BUZZスタジオ選択 */}
      <div className="mb-6">
        <label className="block text-sm text-muted mb-3">
          <span className="text-accent">●</span> BUZZスタジオ（空き状況を表示）
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BUZZ_STUDIOS.map((studio) => (
            <label
              key={studio.id}
              className={`
                    flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all
                    ${
                      selectedStudios.includes(studio.id)
                        ? "border-accent bg-accent/10"
                        : "border-border bg-card hover:border-muted"
                    }
                  `}
            >
              <input
                type="checkbox"
                checked={selectedStudios.includes(studio.id)}
                onChange={() => toggleStudio(studio.id)}
                className="sr-only"
              />
              <div
                className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                      ${
                        selectedStudios.includes(studio.id)
                          ? "border-accent bg-accent"
                          : "border-muted"
                      }
                    `}
              >
                {selectedStudios.includes(studio.id) && (
                  <svg
                    className="w-3 h-3 text-background"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <div>
                <div className="font-medium text-sm">{studio.name}</div>
                <div className="text-xs text-muted">{studio.location}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 市民会館・ホール系（部屋単位で選択） */}
      <div className="mb-6">
        <label className="block text-sm text-muted mb-3">
          <span className="text-blue-500">●</span>{" "}
          福岡市民会館（部屋を個別に選択）
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CIVIC_HALL_ROOMS.map((room) => (
            <label
              key={room.id}
              className={`
                    flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all
                    ${
                      selectedStudios.includes(room.id)
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-border bg-card hover:border-muted"
                    }
                  `}
            >
              <input
                type="checkbox"
                checked={selectedStudios.includes(room.id)}
                onChange={() => toggleStudio(room.id)}
                className="sr-only"
              />
              <div
                className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                      ${
                        selectedStudios.includes(room.id)
                          ? "border-blue-500 bg-blue-500"
                          : "border-muted"
                      }
                    `}
              >
                {selectedStudios.includes(room.id) && (
                  <svg
                    className="w-3 h-3 text-background"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <div>
                <div className="font-medium text-sm">{room.name}</div>
                <div className="text-xs text-muted">{room.parent}</div>
                <div className="text-xs text-blue-500/70 mt-0.5">
                  {room.location}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* CREAスタジオ選択（スタジオ単位） */}
      <div className="mb-6">
        <label className="block text-sm text-muted mb-3">
          <span className="text-purple-500">●</span>{" "}
          レンタルスタジオCREA（スタジオを個別に選択）
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CREA_STUDIOS.map((studio) => (
            <label
              key={studio.id}
              className={`
                    flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all
                    ${
                      selectedStudios.includes(studio.id)
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-border bg-card hover:border-muted"
                    }
                  `}
            >
              <input
                type="checkbox"
                checked={selectedStudios.includes(studio.id)}
                onChange={() => toggleStudio(studio.id)}
                className="sr-only"
              />
              <div
                className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                      ${
                        selectedStudios.includes(studio.id)
                          ? "border-purple-500 bg-purple-500"
                          : "border-muted"
                      }
                    `}
              >
                {selectedStudios.includes(studio.id) && (
                  <svg
                    className="w-3 h-3 text-background"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <div>
                <div className="font-medium text-sm">{studio.name}</div>
                <div className="text-xs text-muted">
                  {studio.floor} / {studio.size}
                </div>
                <div className="text-xs text-purple-500/70 mt-0.5">
                  {studio.location}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Instabase（スペース単位） */}
      <div className="mb-6">
        <label className="block text-sm text-muted mb-3">
          <span className="text-emerald-500">●</span>{" "}
          Instabase（スペースを個別に選択）
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {INSTABASE_SPACES.map((space) => (
            <label
              key={space.id}
              className={`
                    flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all
                    ${
                      selectedStudios.includes(space.id)
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-border bg-card hover:border-muted"
                    }
                  `}
            >
              <input
                type="checkbox"
                checked={selectedStudios.includes(space.id)}
                onChange={() => toggleStudio(space.id)}
                className="sr-only"
              />
              <div
                className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                      ${
                        selectedStudios.includes(space.id)
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-muted"
                      }
                    `}
              >
                {selectedStudios.includes(space.id) && (
                  <svg
                    className="w-3 h-3 text-background"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <div>
                <div className="font-medium text-sm">{space.name}</div>
                <div className="text-xs text-muted">{space.location}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

