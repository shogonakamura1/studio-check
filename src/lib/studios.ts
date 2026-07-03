/**
 * スタジオマスターデータ（単一の情報源）
 *
 * スタジオの定義はすべてここに集約する。
 * - API（route.ts）はここからスクレイパーを振り分ける
 * - フロントの選択肢（_home/constants.ts）も名前はここから導出する
 *
 * 新スタジオ追加時はここにエントリを足し、必要なら
 * src/lib/scrapers/ にスクレイパーを追加する。
 */

export type StudioType =
  | "buzz"
  | "civic-hall-room"
  | "crea-studio"
  | "instabase-space";

export type LateNightRange = { start: string; end: string };

export interface StudioInfo {
  name: string;
  url: string;
  studioCount: number;
  type: StudioType;
  /**
   * 福岡市民会館の部屋名（スクレイプ結果の roomName との部分一致に使う）。
   * type === "civic-hall-room" のエントリでは必須。
   */
  civicHallRoomName?: string;
  /** Instabase の spaceId（/space/{spaceId}/...） */
  instabaseSpaceId?: string;
  /**
   * BUZZの「部屋（1st,2st...）」に対応する数値ID（URLの /{store}/{id}/... の {id} 部分）
   * UI側で studioNumber(1-index) -> buzzStudioIds[studioNumber-1] に変換する。
   */
  buzzStudioIds?: number[];
}

export const STUDIO_DATA: Record<string, StudioInfo> = {
  fukuokahonten: {
    name: "BUZZ福岡本店",
    url: "https://buzz-st.com/fukuokahonten",
    studioCount: 12,
    type: "buzz",
    buzzStudioIds: [289, 290, 291, 292, 293, 294, 295, 296, 298, 299, 300, 301],
  },
  fukuokatenjin: {
    name: "BUZZ福岡天神",
    url: "https://buzz-st.com/fukuokatenjin",
    studioCount: 3,
    type: "buzz",
    buzzStudioIds: [166, 167, 168],
  },
  fukuokahakata: {
    name: "BUZZ福岡博多",
    url: "https://buzz-st.com/fukuokahakata",
    studioCount: 3,
    type: "buzz",
    buzzStudioIds: [195, 196, 197],
  },
  // 市民会館（部屋単位）
  "civichall-rehearsal": {
    name: "福岡市民会館 リハーサル室",
    url: "https://k3.p-kashikan.jp/fukuoka-kyotenbunka/index.php",
    studioCount: 1,
    type: "civic-hall-room",
    civicHallRoomName: "リハーサル室",
  },
  "civichall-practice1": {
    name: "福岡市民会館 練習室①",
    url: "https://k3.p-kashikan.jp/fukuoka-kyotenbunka/index.php",
    studioCount: 1,
    type: "civic-hall-room",
    civicHallRoomName: "練習室①",
  },
  "civichall-practice3": {
    name: "福岡市民会館 練習室③",
    url: "https://k3.p-kashikan.jp/fukuoka-kyotenbunka/index.php",
    studioCount: 1,
    type: "civic-hall-room",
    civicHallRoomName: "練習室③",
  },
  // CREA（スタジオ単位）
  "crea-daimyo": {
    name: "CREA大名",
    url: "https://coubic.com/rentalstudiocrea",
    studioCount: 1,
    type: "crea-studio",
  },
  "crea-plus": {
    name: "CREA+",
    url: "https://coubic.com/rentalstudiocrea",
    studioCount: 1,
    type: "crea-studio",
  },
  "crea-daimyo2": {
    name: "CREA大名Ⅱ",
    url: "https://coubic.com/rentalstudiocrea",
    studioCount: 1,
    type: "crea-studio",
  },
  // Instabase（スペース単位）
  "instabase-in-and-out": {
    name: "スタジオ in and out（Instabase）",
    url: "https://www.instabase.jp/space/3746057795/cal?planType=hourly",
    studioCount: 1,
    type: "instabase-space",
    instabaseSpaceId: "3746057795",
  },
};

/**
 * 深夜練の時間帯（スタジオ別）
 *
 * - DB等には保持せず、スクレイピング実装と同じ責務（このファイル/各スクレイパー）で定義する
 * - ここではまずBUZZ系のみ暫定対応（必要に応じてスタジオ別に調整）
 */
export const LATE_NIGHT_RANGES: Record<string, LateNightRange | undefined> = {
  // BUZZ系（例: 23:30開始）
  fukuokahonten: { start: "23:30", end: "06:00" },
  fukuokatenjin: { start: "23:30", end: "06:00" },
  fukuokahakata: { start: "23:30", end: "06:00" },
  // civic hall / CREA は深夜練対象外（必要なら追加）
};

/** 存在するスタジオIDかどうか（`__proto__` 等のオブジェクト固有キーを弾く） */
export function isKnownStudioId(studioId: string): boolean {
  return Object.prototype.hasOwnProperty.call(STUDIO_DATA, studioId);
}
