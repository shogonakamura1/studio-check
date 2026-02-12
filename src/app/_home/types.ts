import type {
  AvailabilityResponse,
  CivicHallResponse,
  CreaResponse,
} from "@/types";

// APIレスポンスの型（Home画面でのみ利用）
export interface ApiResponse {
  date: string;
  dayOfWeek: string;
  studios: (AvailabilityResponse | CivicHallResponse | CreaResponse)[];
  availableStudios: {
    id: string;
    name: string;
    studioCount: number;
    lateNight?: { start: string; end: string };
    url: string;
    type?: string;
    buzzStudioIds?: number[];
  }[];
}

export interface ApiMultiResponse {
  dates: {
    date: string;
    dayOfWeek: string;
    studios: (AvailabilityResponse | CivicHallResponse | CreaResponse)[];
  }[];
  availableStudios: ApiResponse["availableStudios"];
}

export type AnyApiResponse = ApiResponse | ApiMultiResponse;

export function isMultiResponse(data: AnyApiResponse): data is ApiMultiResponse {
  return "dates" in data;
}

export type AvailableStudioInfo = ApiResponse["availableStudios"][number];

export type DayResult = {
  date: string;
  dayOfWeek: string;
  studios: (AvailabilityResponse | CivicHallResponse | CreaResponse)[];
};

