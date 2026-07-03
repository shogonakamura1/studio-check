// バックエンド（スクレイパー/API）とフロントエンドで共有する型定義。
// スクレイパー実装側はこのファイルの型を import して使う（型の二重管理をしない）。

// スタジオの空き状況を表す型
export interface TimeSlot {
  time: string; // "06:00", "06:30", etc.
  studios: StudioAvailability[];
}

export interface StudioAvailability {
  studioNumber: number; // 1, 2, 3, etc.
  isAvailable: boolean;
  /**
   * 予約ページURL（スタジオごとの取得方法に依存）
   * - BUZZ: UI側で組み立てるため基本 undefined
   * - Instabase: 時間枠ごとに組み立てて付与
   */
  bookingUrl?: string;
}

// APIレスポンスの型（BUZZ系スタジオ・Instabase用）
export interface AvailabilityResponse {
  studioId: string;
  studioName: string;
  date: string;
  dayOfWeek: string;
  timeSlots: TimeSlot[];
  error?: string;
}

// 福岡市民会館用の型
export interface RoomSlot {
  status: string; // "○", "×", "●", "-"
  date: string; // "2026/02/20"
  slotId: string; // "0", "1", "2", "3"
  timeRange: string; // "9:00-12:30"
}

export interface RoomAvailability {
  roomName: string;
  slots: RoomSlot[];
}

export interface CivicHallResponse {
  studioId: string;
  studioName: string;
  date: string;
  dayOfWeek: string;
  rooms: RoomAvailability[];
  error?: string;
}

// CREA用の型
export interface CreaTimeSlot {
  time: string;
  available: boolean;
  /**
   * 予約ページURL（COUBICの booking_url を絶対URL化したもの）
   * - 取得できない時間帯は undefined
   * - UI側では available === true のときのみ利用する想定
   */
  bookingUrl?: string;
}

export interface CreaSlotAvailability {
  slotType: string; // COUBICの public_id
  slotName: string; // "朝活", "平日昼" など
  price: number;
  /**
   * true の場合、価格はAPIから取得できず、ハードコードされた
   * フォールバック値（参考価格）であることを示す。
   */
  priceIsEstimate?: boolean;
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
