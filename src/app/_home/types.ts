import type {
  AvailabilityResponse,
  CivicHallResponse,
  CreaResponse,
} from "@/types";

export interface AvailableStudioInfo {
  id: string;
  name: string;
  studioCount: number;
  lateNight?: { start: string; end: string };
  url: string;
  type?: string;
  buzzStudioIds?: number[];
}

export type DayResult = {
  date: string;
  dayOfWeek: string;
  studios: (AvailabilityResponse | CivicHallResponse | CreaResponse)[];
};

// APIレスポンスの型（Home画面でのみ利用）。
// 日付数によらず常にこの形式で返る。
export interface ApiResponse {
  dates: DayResult[];
  availableStudios: AvailableStudioInfo[];
}
