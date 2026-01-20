// スタジオの空き状況を表す型
export interface TimeSlot {
  time: string; // "06:00", "06:30", etc.
  studios: StudioAvailability[];
}

export interface StudioAvailability {
  studioNumber: number; // 1, 2, 3, etc.
  isAvailable: boolean;
}

// スタジオ情報の型
export interface StudioInfo {
  id: string; // "fukuokahonten", "fukuokatenjin", etc.
  name: string; // "BUZZ福岡本店", etc.
  url: string; // "https://buzz-st.com/fukuokahonten"
  studioCount: number; // スタジオ数
}

// APIレスポンスの型
export interface AvailabilityResponse {
  studioId: string;
  studioName: string;
  date: string;
  dayOfWeek: string;
  timeSlots: TimeSlot[];
  error?: string;
}

// 検索条件の型
export interface SearchParams {
  studioIds: string[];
  date: string;
}
