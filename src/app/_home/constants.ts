// 画面（Home）固有の定数。UIや検索条件で利用する。
//
// スタジオ名は src/lib/studios.ts のマスターデータから導出し、
// 表示用の付加情報（最寄り駅・フロア等）だけをここで持つ。

import { STUDIO_DATA } from "@/lib/studios";
import { CREA_STUDIOS as CREA_MASTER } from "@/lib/scrapers/crea";

function studioName(id: string): string {
  return STUDIO_DATA[id]?.name ?? id;
}

function civicHallRoomName(id: string): string {
  return STUDIO_DATA[id]?.civicHallRoomName ?? studioName(id);
}

// BUZZ系スタジオ情報（スクレイピング対応）
export const BUZZ_STUDIOS = [
  { id: "fukuokahonten", name: studioName("fukuokahonten"), location: "天神南駅徒歩3分" },
  { id: "fukuokatenjin", name: studioName("fukuokatenjin"), location: "天神駅徒歩5分" },
  { id: "fukuokahakata", name: studioName("fukuokahakata"), location: "中洲川端駅徒歩3分" },
];

// 市民会館・ホール系（部屋単位で選択可能）
export const CIVIC_HALL_ROOMS = [
  {
    id: "civichall-rehearsal",
    name: civicHallRoomName("civichall-rehearsal"),
    parent: "福岡市民会館",
    location: "天神駅徒歩10分",
  },
  {
    id: "civichall-practice1",
    name: civicHallRoomName("civichall-practice1"),
    parent: "福岡市民会館",
    location: "天神駅徒歩10分",
  },
  {
    id: "civichall-practice3",
    name: civicHallRoomName("civichall-practice3"),
    parent: "福岡市民会館",
    location: "天神駅徒歩10分",
  },
];

// CREAスタジオ（スタジオ単位で選択可能、musicは除外）
export const CREA_STUDIOS = (
  ["crea-daimyo", "crea-plus", "crea-daimyo2"] as const
).map((id) => ({
  id,
  name: studioName(id),
  floor: CREA_MASTER[id].floor,
  size: CREA_MASTER[id].size,
  location: "大名エリア",
}));

// Instabase（スペース単位）
export const INSTABASE_SPACES = [
  {
    id: "instabase-in-and-out",
    name: "スタジオ in and out",
    location: "天神駅徒歩8分（Instabase）",
  },
];

// 時間オプション（06:00〜23:30まで30分刻み）
// 「日付」を 06:00〜翌05:30（= 48コマ）として扱う（深夜練対応）
export const TIME_OPTIONS = [
  ...Array.from({ length: 36 }, (_, i) => {
    const hour = Math.floor(i / 2) + 6;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
  }),
  ...Array.from({ length: 12 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
  }),
];
