// スタジオの空き状況を表す型
export interface TimeSlot {
  time: string; // "06:00", "06:30", etc.
  studios: StudioAvailability[];
}

export interface StudioAvailability {
  studioNumber: number; // 1, 2, 3, etc.
  isAvailable: boolean;
}

// APIレスポンスの型（BUZZ系スタジオ用）
export interface AvailabilityResponse {
  studioId: string;
  studioName: string;
  date: string;
  dayOfWeek: string;
  timeSlots: TimeSlot[];
  error?: string;
}

// 福岡市民会館用の型
// 注: 実際の実装は src/lib/scrapers/fukuoka-civic-hall.ts を参照
export interface CivicHallResponse {
  studioId: string;
  studioName: string;
  date: string;
  dayOfWeek: string;
  rooms: Array<{
    roomName: string;
    slots: Array<{
      status: string;
      date: string;
      slotId: string;
      timeRange: string;
    }>;
  }>;
  error?: string;
}

// CREA用の型
// 注: 実際の実装は src/lib/scrapers/crea.ts を参照
export interface CreaResponse {
  studioId: string;
  studioName: string;
  date: string;
  dayOfWeek: string;
  studios: Array<{
    studioId: string;
    studioName: string;
    floor: string;
    size: string;
    date: string;
    dayOfWeek: string;
    slots: Array<{
      slotType: string;
      slotName: string;
      price: number;
      hours: string;
      timeSlots: Array<{
        time: string;
        available: boolean;
      }>;
    }>;
    error?: string;
  }>;
  error?: string;
}
