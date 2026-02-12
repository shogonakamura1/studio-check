// 画面（Home）固有の定数。UIや検索条件で利用する。

// BUZZ系スタジオ情報（スクレイピング対応）
export const BUZZ_STUDIOS = [
  { id: "fukuokahonten", name: "BUZZ福岡本店", location: "天神南駅徒歩3分" },
  { id: "fukuokatenjin", name: "BUZZ福岡天神", location: "天神駅徒歩5分" },
  { id: "fukuokahakata", name: "BUZZ福岡博多", location: "中洲川端駅徒歩3分" },
];

// 市民会館・ホール系（部屋単位で選択可能）
export const CIVIC_HALL_ROOMS = [
  {
    id: "civichall-rehearsal",
    name: "リハーサル室",
    parent: "福岡市民会館",
    location: "天神駅徒歩10分",
  },
  {
    id: "civichall-practice1",
    name: "練習室①",
    parent: "福岡市民会館",
    location: "天神駅徒歩10分",
  },
  {
    id: "civichall-practice3",
    name: "練習室③",
    parent: "福岡市民会館",
    location: "天神駅徒歩10分",
  },
];

// CREAスタジオ（スタジオ単位で選択可能、musicは除外）
export const CREA_STUDIOS = [
  {
    id: "crea-daimyo",
    name: "CREA大名",
    floor: "2F",
    size: "77㎡",
    location: "大名エリア",
  },
  {
    id: "crea-plus",
    name: "CREA+",
    floor: "4F",
    size: "100㎡",
    location: "大名エリア",
  },
  {
    id: "crea-daimyo2",
    name: "CREA大名Ⅱ",
    floor: "3F",
    size: "49㎡",
    location: "大名エリア",
  },
];

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

