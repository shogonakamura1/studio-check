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

// 福岡市民会館用の型
export interface CivicHallSlot {
  status: string; // "○", "×", "●", "-"
  date: string; // "2026/02/20"
  slotId: string; // "0", "1", "2", "3"
  timeRange: string; // "9:00-12:30"
}

export interface CivicHallRoomAvailability {
  roomName: string;
  slots: CivicHallSlot[];
}

export interface CivicHallResponse {
  studioId: string;
  studioName: string;
  date: string;
  dayOfWeek: string;
  rooms: CivicHallRoomAvailability[];
  error?: string;
}

// CREA用の型
export interface CreaTimeSlot {
  time: string; // "06:00", "07:00", etc.
  available: boolean;
}

export interface CreaSlotAvailability {
  slotType: string; // "morning", "weekdayDay", etc.
  slotName: string; // "朝活", "平日昼", etc.
  price: number;
  hours: string;
  timeSlots: CreaTimeSlot[];
}

export interface CreaStudioAvailability {
  studioId: string;
  studioName: string;
  floor: string;
  size: string;
  date: string;
  dayOfWeek: string;
  slots: CreaSlotAvailability[];
  error?: string;
}

export interface CreaResponse {
  studioId: string;
  studioName: string;
  date: string;
  dayOfWeek: string;
  studios: CreaStudioAvailability[];
  error?: string;
}
