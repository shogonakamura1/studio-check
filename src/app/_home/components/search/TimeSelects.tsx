"use client";

import type { Dispatch, SetStateAction } from "react";

import { TIME_OPTIONS } from "@/app/_home/constants";

type Props = {
  startTime: string;
  endTime: string;
  setStartTime: Dispatch<SetStateAction<string>>;
  setEndTime: Dispatch<SetStateAction<string>>;
  selectedLateNight: string | undefined;
  setSelectedLateNight: Dispatch<SetStateAction<string | undefined>>;
};

export function TimeSelects({
  startTime,
  endTime,
  setStartTime,
  setEndTime,
  selectedLateNight,
  setSelectedLateNight,
}: Props) {
  return (
    <>
      {/* 開始時間 */}
      <div>
        <label className="block text-sm text-muted mb-2">開始時間</label>
        <select
          value={startTime}
          onChange={(e) => {
            setStartTime(e.target.value);
            setSelectedLateNight(undefined);
          }}
          className={`w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer ${selectedLateNight ? "opacity-60" : ""}`}
        >
          {TIME_OPTIONS.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>
      </div>

      {/* 終了時間 */}
      <div>
        <label className="block text-sm text-muted mb-2">終了時間</label>
        <select
          value={endTime}
          onChange={(e) => {
            setEndTime(e.target.value);
            setSelectedLateNight(undefined);
          }}
          className={`w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer ${selectedLateNight ? "opacity-60" : ""}`}
        >
          {TIME_OPTIONS.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

