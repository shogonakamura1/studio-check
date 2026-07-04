/**
 * スタジオ別ページ（/studios/[studioId]）の静的コンテンツ。
 *
 * 注意: ここに書く事実情報（部屋数・時間帯・最寄り駅・予約方式）は
 * すべてコードベースのマスターデータ（src/lib/studios.ts, スクレイパー実装,
 * _home/constants.ts）と整合させること。住所・料金など未確認の情報は書かない。
 * 料金は変動するため「検索結果に現在の価格が表示される」という案内に留める。
 */

export type StudioCategory = "BUZZ" | "福岡市民会館" | "CREA" | "Instabase";

export interface StudioPageContent {
  /** <title> 用（テンプレートで「｜Studio Check」が後置される） */
  title: string;
  /** h1 */
  heading: string;
  /** 導入文（meta description 兼用） */
  lead: string;
  category: StudioCategory;
  /** 最寄り駅など（_home/constants.ts と整合させる） */
  access: string;
  /** 基本情報テーブル */
  facts: Array<{ label: string; value: string }>;
  /** 本文段落 */
  paragraphs: string[];
  /** 時間帯・枠の説明（箇条書き） */
  timeSlotNotes: string[];
  /** 予約までの流れ */
  bookingSteps: string[];
  /** 公式予約ページの表示名 */
  officialLabel: string;
}

const BUZZ_COMMON_STEPS = [
  "Studio Checkで日付・時間帯を選んで検索する",
  "空いている枠（○）をクリックすると、BUZZ公式サイトの該当部屋・該当日の予約ページが開く",
  "公式サイト上で時間枠を選択し、予約を確定する",
];

const CIVIC_COMMON_STEPS = [
  "Studio Checkで日付を選んで検索する",
  "予約可能な枠（○・●）をクリックすると、福岡市の施設予約システムの該当日ページが開く",
  "施設予約システム上で申込手続きを行う（利用者登録が必要な場合があります）",
];

const CREA_COMMON_STEPS = [
  "Studio Checkで日付・時間帯を選んで検索する",
  "空いている枠（○）をクリックすると、Coubic（クービック）の該当予約ページが開く",
  "Coubic上で予約を確定する（現在の料金は検索結果および予約ページに表示されます）",
];

const INSTABASE_COMMON_STEPS = [
  "Studio Checkで日付・時間帯を選んで検索する",
  "空いている枠（○）をクリックすると、Instabaseのカレンダーページが開く",
  "Instabase上で開始時刻と利用時間を選択し、予約を確定する",
];

export const STUDIO_PAGE_CONTENT: Record<string, StudioPageContent> = {
  fukuokahonten: {
    title: "BUZZ福岡本店の空き状況・予約方法",
    heading: "BUZZ福岡本店の空き状況を検索",
    lead: "BUZZ福岡本店（天神南駅徒歩3分・全12部屋）の空き状況をリアルタイムで一括確認。日付と時間帯を選ぶだけで、12部屋すべての空き枠がひと目でわかります。",
    category: "BUZZ",
    access: "天神南駅徒歩3分",
    facts: [
      { label: "部屋数", value: "12部屋（1st〜12st）" },
      { label: "最寄り", value: "天神南駅徒歩3分" },
      { label: "深夜練", value: "対応（23:30〜翌6:00の深夜パック）" },
      { label: "予約方法", value: "BUZZ公式サイト" },
    ],
    paragraphs: [
      "BUZZ福岡本店は、福岡エリアのBUZZ3店舗の中で最も部屋数が多い店舗です。Studio Checkでは、12部屋すべての空き状況を1つの表にまとめて表示するため、公式サイトで部屋ごとにページを行き来する必要がありません。",
      "空き枠は30分刻み（06:00〜23:30開始）で表示され、○をクリックするとそのまま該当部屋の公式予約ページに移動できます。",
    ],
    timeSlotNotes: [
      "空き枠は06:00〜23:30の30分刻みで表示",
      "23:30の枠は深夜パック（23:30〜翌6:00）。検索条件で深夜帯を含めると表示されます",
      "複数日をまとめて検索可能（最大7日分）",
    ],
    bookingSteps: BUZZ_COMMON_STEPS,
    officialLabel: "BUZZ福岡本店 公式サイト",
  },
  fukuokatenjin: {
    title: "BUZZ福岡天神の空き状況・予約方法",
    heading: "BUZZ福岡天神の空き状況を検索",
    lead: "BUZZ福岡天神（天神駅徒歩5分・全3部屋）の空き状況をリアルタイムで一括確認。日付と時間帯を選ぶだけで、3部屋の空き枠がひと目でわかります。",
    category: "BUZZ",
    access: "天神駅徒歩5分",
    facts: [
      { label: "部屋数", value: "3部屋（1st〜3st）" },
      { label: "最寄り", value: "天神駅徒歩5分" },
      { label: "深夜練", value: "対応（23:30〜翌6:00の深夜パック）" },
      { label: "予約方法", value: "BUZZ公式サイト" },
    ],
    paragraphs: [
      "BUZZ福岡天神は天神駅から徒歩5分とアクセスしやすい立地の店舗です。Studio Checkでは3部屋の空き状況を1つの表で確認でき、○をクリックするとそのまま該当部屋の公式予約ページに移動できます。",
      "本店・博多店と同時に検索すれば、福岡のBUZZ3店舗を横断して空いている部屋を探せます。",
    ],
    timeSlotNotes: [
      "空き枠は06:00〜23:30の30分刻みで表示",
      "23:30の枠は深夜パック（23:30〜翌6:00）。検索条件で深夜帯を含めると表示されます",
      "複数日をまとめて検索可能（最大7日分）",
    ],
    bookingSteps: BUZZ_COMMON_STEPS,
    officialLabel: "BUZZ福岡天神 公式サイト",
  },
  fukuokahakata: {
    title: "BUZZ福岡博多の空き状況・予約方法",
    heading: "BUZZ福岡博多の空き状況を検索",
    lead: "BUZZ福岡博多（中洲川端駅徒歩3分・全3部屋）の空き状況をリアルタイムで一括確認。日付と時間帯を選ぶだけで、3部屋の空き枠がひと目でわかります。",
    category: "BUZZ",
    access: "中洲川端駅徒歩3分",
    facts: [
      { label: "部屋数", value: "3部屋（1st〜3st）" },
      { label: "最寄り", value: "中洲川端駅徒歩3分" },
      { label: "深夜練", value: "対応（23:30〜翌6:00の深夜パック）" },
      { label: "予約方法", value: "BUZZ公式サイト" },
    ],
    paragraphs: [
      "BUZZ福岡博多は中洲川端駅から徒歩3分の店舗です。Studio Checkでは3部屋の空き状況を1つの表で確認でき、○をクリックするとそのまま該当部屋の公式予約ページに移動できます。",
      "本店・天神店と同時に検索すれば、福岡のBUZZ3店舗を横断して空いている部屋を探せます。",
    ],
    timeSlotNotes: [
      "空き枠は06:00〜23:30の30分刻みで表示",
      "23:30の枠は深夜パック（23:30〜翌6:00）。検索条件で深夜帯を含めると表示されます",
      "複数日をまとめて検索可能（最大7日分）",
    ],
    bookingSteps: BUZZ_COMMON_STEPS,
    officialLabel: "BUZZ福岡博多 公式サイト",
  },
  "civichall-rehearsal": {
    title: "福岡市民会館 リハーサル室の空き状況・予約方法",
    heading: "福岡市民会館 リハーサル室の空き状況を検索",
    lead: "福岡市民会館のリハーサル室（天神駅徒歩10分）の空き状況を一括確認。4つの時間帯区分の空きをまとめてチェックし、そのまま施設予約システムへ進めます。",
    category: "福岡市民会館",
    access: "天神駅徒歩10分",
    facts: [
      { label: "施設", value: "福岡市民会館（公共施設）" },
      { label: "最寄り", value: "天神駅徒歩10分" },
      { label: "時間帯区分", value: "9:00-12:30 / 13:00-15:30 / 16:00-18:30 / 19:00-22:00 の4枠" },
      { label: "予約方法", value: "福岡市の施設予約システム" },
    ],
    paragraphs: [
      "福岡市民会館のリハーサル室は、公共施設ならではの区分制（1日4枠）で利用できる練習スペースです。Studio Checkでは、施設予約システムを開かなくても各時間帯の空き状況を確認できます。",
      "練習室①・練習室③と同時に検索すれば、市民会館内の3部屋をまとめて比較できます。",
    ],
    timeSlotNotes: [
      "1日4枠の区分制（9:00-12:30 / 13:00-15:30 / 16:00-18:30 / 19:00-22:00）",
      "検索結果の記号: ○・●=予約サイトで申込可能な枠 / ×=予約済み / −=受付期間外",
      "深夜帯の利用はありません",
    ],
    bookingSteps: CIVIC_COMMON_STEPS,
    officialLabel: "福岡市 施設予約システム",
  },
  "civichall-practice1": {
    title: "福岡市民会館 練習室①の空き状況・予約方法",
    heading: "福岡市民会館 練習室①の空き状況を検索",
    lead: "福岡市民会館の練習室①（天神駅徒歩10分）の空き状況を一括確認。4つの時間帯区分の空きをまとめてチェックし、そのまま施設予約システムへ進めます。",
    category: "福岡市民会館",
    access: "天神駅徒歩10分",
    facts: [
      { label: "施設", value: "福岡市民会館（公共施設）" },
      { label: "最寄り", value: "天神駅徒歩10分" },
      { label: "時間帯区分", value: "9:00-12:30 / 13:00-15:30 / 16:00-18:30 / 19:00-22:00 の4枠" },
      { label: "予約方法", value: "福岡市の施設予約システム" },
    ],
    paragraphs: [
      "福岡市民会館の練習室①は、区分制（1日4枠）で利用できる練習スペースです。Studio Checkでは、施設予約システムを開かなくても各時間帯の空き状況を確認できます。",
      "リハーサル室・練習室③と同時に検索すれば、市民会館内の3部屋をまとめて比較できます。",
    ],
    timeSlotNotes: [
      "1日4枠の区分制（9:00-12:30 / 13:00-15:30 / 16:00-18:30 / 19:00-22:00）",
      "検索結果の記号: ○・●=予約サイトで申込可能な枠 / ×=予約済み / −=受付期間外",
      "深夜帯の利用はありません",
    ],
    bookingSteps: CIVIC_COMMON_STEPS,
    officialLabel: "福岡市 施設予約システム",
  },
  "civichall-practice3": {
    title: "福岡市民会館 練習室③の空き状況・予約方法",
    heading: "福岡市民会館 練習室③の空き状況を検索",
    lead: "福岡市民会館の練習室③（天神駅徒歩10分）の空き状況を一括確認。4つの時間帯区分の空きをまとめてチェックし、そのまま施設予約システムへ進めます。",
    category: "福岡市民会館",
    access: "天神駅徒歩10分",
    facts: [
      { label: "施設", value: "福岡市民会館（公共施設）" },
      { label: "最寄り", value: "天神駅徒歩10分" },
      { label: "時間帯区分", value: "9:00-12:30 / 13:00-15:30 / 16:00-18:30 / 19:00-22:00 の4枠" },
      { label: "予約方法", value: "福岡市の施設予約システム" },
    ],
    paragraphs: [
      "福岡市民会館の練習室③は、区分制（1日4枠）で利用できる練習スペースです。Studio Checkでは、施設予約システムを開かなくても各時間帯の空き状況を確認できます。",
      "リハーサル室・練習室①と同時に検索すれば、市民会館内の3部屋をまとめて比較できます。",
    ],
    timeSlotNotes: [
      "1日4枠の区分制（9:00-12:30 / 13:00-15:30 / 16:00-18:30 / 19:00-22:00）",
      "検索結果の記号: ○・●=予約サイトで申込可能な枠 / ×=予約済み / −=受付期間外",
      "深夜帯の利用はありません",
    ],
    bookingSteps: CIVIC_COMMON_STEPS,
    officialLabel: "福岡市 施設予約システム",
  },
  "crea-daimyo": {
    title: "CREA大名の空き状況・予約方法",
    heading: "レンタルスタジオCREA大名の空き状況を検索",
    lead: "レンタルスタジオCREA大名（2F・77㎡、大名エリア）の空き状況を一括確認。朝活・平日昼・平日夜/土日の各枠の空きを1時間刻みでチェックできます。",
    category: "CREA",
    access: "大名エリア",
    facts: [
      { label: "フロア / 広さ", value: "2F / 77㎡" },
      { label: "エリア", value: "大名エリア" },
      { label: "予約枠", value: "朝活（6:00-9:00）/ 平日昼（9:00-17:00）/ 平日夜・土日" },
      { label: "予約方法", value: "Coubic（クービック）" },
    ],
    paragraphs: [
      "CREA大名は、大名エリアにある77㎡のレンタルスタジオです。時間帯ごとに「朝活」「平日昼」「平日夜・土日」の予約枠が用意されており、Studio Checkではすべての枠の空き状況を1時間刻みでまとめて確認できます。",
      "各枠の現在の料金は、検索結果とCoubicの予約ページに表示されます。",
    ],
    timeSlotNotes: [
      "朝活: 6:00-9:00 / 平日昼: 9:00-17:00 / 平日夜・土日: 17:00-23:00（平日）・9:00-23:00（土日）",
      "空き枠は1時間刻みで表示",
      "料金は枠ごとに異なり、検索結果に現在の価格が表示されます",
    ],
    bookingSteps: CREA_COMMON_STEPS,
    officialLabel: "CREA（Coubic予約ページ）",
  },
  "crea-plus": {
    title: "CREA+の空き状況・予約方法",
    heading: "レンタルスタジオCREA+の空き状況を検索",
    lead: "レンタルスタジオCREA+（4F・100㎡、大名エリア）の空き状況を一括確認。平日昼・平日夜・土日の各枠の空きを1時間刻みでチェックできます。",
    category: "CREA",
    access: "大名エリア",
    facts: [
      { label: "フロア / 広さ", value: "4F / 100㎡" },
      { label: "エリア", value: "大名エリア" },
      { label: "予約枠", value: "平日昼（9:00-17:00）/ 平日夜（17:00-23:00）/ 土日（6:00-23:00）" },
      { label: "予約方法", value: "Coubic（クービック）" },
    ],
    paragraphs: [
      "CREA+は、CREA系列で最も広い100㎡のスタジオです。グループでの練習にも使いやすい広さで、Studio Checkでは平日昼・平日夜・土日の各枠の空き状況を1時間刻みでまとめて確認できます。",
      "各枠の現在の料金は、検索結果とCoubicの予約ページに表示されます。",
    ],
    timeSlotNotes: [
      "平日昼: 9:00-17:00 / 平日夜: 17:00-23:00 / 土日: 6:00-23:00",
      "空き枠は1時間刻みで表示",
      "料金は枠ごとに異なり、検索結果に現在の価格が表示されます",
    ],
    bookingSteps: CREA_COMMON_STEPS,
    officialLabel: "CREA（Coubic予約ページ）",
  },
  "crea-daimyo2": {
    title: "CREA大名Ⅱの空き状況・予約方法",
    heading: "レンタルスタジオCREA大名Ⅱの空き状況を検索",
    lead: "レンタルスタジオCREA大名Ⅱ（3F・49㎡、大名エリア）の空き状況を一括確認。朝活・平日昼・平日夜/土日の各枠の空きを1時間刻みでチェックできます。",
    category: "CREA",
    access: "大名エリア",
    facts: [
      { label: "フロア / 広さ", value: "3F / 49㎡" },
      { label: "エリア", value: "大名エリア" },
      { label: "予約枠", value: "朝活（6:00-9:00）/ 平日昼（9:00-17:00）/ 平日夜・土日" },
      { label: "予約方法", value: "Coubic（クービック）" },
    ],
    paragraphs: [
      "CREA大名Ⅱは、少人数・ソロ練習に使いやすい49㎡のスタジオです。「朝活」「平日昼」「平日夜・土日」の予約枠があり、Studio Checkではすべての枠の空き状況を1時間刻みでまとめて確認できます。",
      "各枠の現在の料金は、検索結果とCoubicの予約ページに表示されます。",
    ],
    timeSlotNotes: [
      "朝活: 6:00-9:00 / 平日昼: 9:00-17:00 / 平日夜・土日: 17:00-23:00（平日）・9:00-23:00（土日）",
      "空き枠は1時間刻みで表示",
      "料金は枠ごとに異なり、検索結果に現在の価格が表示されます",
    ],
    bookingSteps: CREA_COMMON_STEPS,
    officialLabel: "CREA（Coubic予約ページ）",
  },
  "instabase-in-and-out": {
    title: "スタジオ in and out（Instabase）の空き状況・予約方法",
    heading: "スタジオ in and out の空き状況を検索",
    lead: "スタジオ in and out（天神駅徒歩8分・Instabase掲載）の空き状況を一括確認。30分刻みの開始時刻ごとに空きをチェックし、そのままInstabaseの予約ページへ進めます。",
    category: "Instabase",
    access: "天神駅徒歩8分",
    facts: [
      { label: "掲載サイト", value: "Instabase（インスタベース）" },
      { label: "最寄り", value: "天神駅徒歩8分" },
      { label: "時間単位", value: "30分刻みで開始時刻を選択" },
      { label: "予約方法", value: "Instabase" },
    ],
    paragraphs: [
      "スタジオ in and out は、レンタルスペース予約サービスInstabaseに掲載されているスタジオです。Studio Checkでは、Instabaseのカレンダーを開かなくても30分刻みの空き状況を確認できます。",
      "空き枠をクリックするとInstabaseのカレンダーページが開き、開始時刻と利用時間を選んでそのまま予約できます。",
    ],
    timeSlotNotes: [
      "空き枠は30分刻み（00:00〜23:30開始）で表示",
      "利用時間はInstabaseの予約画面で選択します",
    ],
    bookingSteps: INSTABASE_COMMON_STEPS,
    officialLabel: "Instabase 予約ページ",
  },
};

/** カテゴリごとの表示順（一覧ページ・関連リンク用） */
export const STUDIO_CATEGORIES: Array<{
  category: StudioCategory;
  ids: string[];
}> = [
  {
    category: "BUZZ",
    ids: ["fukuokahonten", "fukuokatenjin", "fukuokahakata"],
  },
  {
    category: "福岡市民会館",
    ids: ["civichall-rehearsal", "civichall-practice1", "civichall-practice3"],
  },
  {
    category: "CREA",
    ids: ["crea-daimyo", "crea-plus", "crea-daimyo2"],
  },
  {
    category: "Instabase",
    ids: ["instabase-in-and-out"],
  },
];

export const STUDIO_PAGE_IDS = Object.keys(STUDIO_PAGE_CONTENT);
