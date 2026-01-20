/**
 * CREAスタジオスクレイパー（API版）
 * 
 * Coubic APIから直接空き状況を取得
 * Playwrightは不要で、高速にデータを取得可能
 */

// CREAスタジオの定義（public_idでマッピング）
export const CREA_STUDIOS = {
  "crea-daimyo": {
    name: "CREA大名",
    floor: "2F",
    size: "77㎡",
    publicIds: ["960818", "968953", "506244"], // 朝活, 平日昼, 平日夜・土日
  },
  "crea-plus": {
    name: "CREA+",
    floor: "4F",
    size: "100㎡",
    publicIds: ["802390", "592262", "419056"], // 平日昼, 平日夜, 土日
  },
  "crea-daimyo2": {
    name: "CREA大名Ⅱ",
    floor: "3F",
    size: "49㎡",
    publicIds: ["563872", "519534", "782437"], // 朝活, 平日昼, 平日夜・土日
  },
} as const;

// public_idからスタジオIDへの逆引きマップ
const PUBLIC_ID_TO_STUDIO: Record<string, keyof typeof CREA_STUDIOS> = {};
for (const [studioId, studio] of Object.entries(CREA_STUDIOS)) {
  for (const publicId of studio.publicIds) {
    PUBLIC_ID_TO_STUDIO[publicId] = studioId as keyof typeof CREA_STUDIOS;
  }
}

// 出力型
export interface CreaTimeSlot {
  time: string;
  available: boolean;
}

export interface CreaSlotAvailability {
  slotType: string;
  slotName: string;
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
}

// APIレスポンスの型
interface BookingEvent {
  digest: string;
  title: string;
  public_id: string;
  model_type: string;
  color: string;
  start: number; // Unixタイムスタンプ（秒）
  end: number;
  all_day: boolean;
  booking_url: string;
  capacity: number;
  vacancy: number | null;
  reservable: boolean;
  waiting_list_provided: boolean;
  submit: boolean;
  metadata: {
    merchant: { id: string };
    resource: { id: string };
  };
  full: boolean;
  is_registered_waiting_list: boolean;
}

interface BookingEventsResponse {
  meta: {
    business_hours: Array<{
      weekday: number;
      is_open: boolean;
      opening_hour: string;
      closing_hour: string;
    }>;
    time_zone: string;
  };
  data: BookingEvent[];
}

function getDayOfWeek(date: Date): string {
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return days[date.getDay()];
}

/**
 * タイトルからスロット名と価格を抽出
 */
function parseSlotTitle(title: string): { slotName: string; price: number } {
  // 例: "CREA大名 平日昼 ¥1,980 " -> slotName: "平日昼", price: 1980
  // 例: "〇  大名朝活　¥500" -> slotName: "朝活", price: 500
  
  const priceMatch = title.match(/[¥￥]([0-9,]+)/);
  const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, "")) : 0;
  
  // スロット名を抽出
  let slotName = "";
  if (title.includes("朝活")) {
    slotName = "朝活";
  } else if (title.includes("平日昼") || title.includes("平日 昼")) {
    slotName = "平日昼";
  } else if (title.includes("平日夜・土日")) {
    slotName = "平日夜・土日";
  } else if (title.includes("平日夜") || title.includes("平日 夜")) {
    slotName = "平日夜";
  } else if (title.includes("土日")) {
    slotName = "土日";
  } else {
    // フォールバック: タイトルから価格部分を除去
    slotName = title.replace(/[¥￥][0-9,]+\s*/g, "").trim();
  }
  
  return { slotName, price };
}

/**
 * スロット名から時間帯を推定
 */
function getHoursFromSlotName(slotName: string): string {
  switch (slotName) {
    case "朝活":
      return "6:00-9:00";
    case "平日昼":
      return "9:00-17:00";
    case "平日夜・土日":
      return "17:00-23:00 (平日) / 9:00-23:00 (土日)";
    case "平日夜":
      return "17:00-23:00";
    case "土日":
      return "6:00-23:00";
    default:
      return "";
  }
}

/**
 * Unixタイムスタンプを日本時間の時刻文字列に変換
 */
function formatTime(unixTimestamp: number): string {
  const date = new Date(unixTimestamp * 1000);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Unixタイムスタンプを日本時間の日付文字列に変換
 */
function formatDate(unixTimestamp: number): string {
  const date = new Date(unixTimestamp * 1000);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * CREAの空き状況をAPIから取得
 */
export async function scrapeCrea(
  targetDate: string,
  studioIds?: string[]
): Promise<CreaStudioAvailability[]> {
  const startTime = Date.now();
  
  try {
    // 日付の範囲を設定（対象日の0:00から23:59:59まで）
    const startDate = new Date(`${targetDate}T00:00:00.000+09:00`);
    const endDate = new Date(`${targetDate}T23:59:59.999+09:00`);
    
    const apiUrl = `https://coubic.com/api/v2/merchants/rentalstudiocrea/booking_events?start=${encodeURIComponent(startDate.toISOString())}&end=${encodeURIComponent(endDate.toISOString())}`;
    
    console.log(`📡 API呼び出し: ${targetDate}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data: BookingEventsResponse = await response.json();
    
    const targetDateObj = new Date(targetDate);
    const dayOfWeek = getDayOfWeek(targetDateObj);
    const targetStudios = studioIds || Object.keys(CREA_STUDIOS);
    
    // スタジオごとの結果を初期化
    const studioResults = new Map<string, CreaStudioAvailability>();
    
    for (const studioId of targetStudios) {
      const studio = CREA_STUDIOS[studioId as keyof typeof CREA_STUDIOS];
      if (!studio) continue;
      
      studioResults.set(studioId, {
        studioId,
        studioName: studio.name,
        floor: studio.floor,
        size: studio.size,
        date: targetDate,
        dayOfWeek,
        slots: [],
      });
    }
    
    // イベントをスロットタイプごとにグループ化
    const slotGroups = new Map<string, { slotName: string; price: number; hours: string; times: CreaTimeSlot[] }>();
    
    for (const event of data.data) {
      const studioId = PUBLIC_ID_TO_STUDIO[event.public_id];
      if (!studioId || !targetStudios.includes(studioId)) continue;
      
      // イベントの日付が対象日かチェック
      const eventDate = formatDate(event.start);
      if (eventDate !== targetDate) continue;
      
      const { slotName, price } = parseSlotTitle(event.title);
      const slotKey = `${studioId}:${event.public_id}`;
      
      if (!slotGroups.has(slotKey)) {
        slotGroups.set(slotKey, {
          slotName,
          price,
          hours: getHoursFromSlotName(slotName),
          times: [],
        });
      }
      
      const group = slotGroups.get(slotKey)!;
      const time = formatTime(event.start);
      
      // 予約可能かどうか
      const available = event.reservable && !event.full;
      
      group.times.push({
        time,
        available,
      });
    }
    
    // スロットグループをスタジオ結果に追加
    for (const [slotKey, group] of slotGroups) {
      const [studioId, publicId] = slotKey.split(":");
      const studioResult = studioResults.get(studioId);
      
      if (studioResult) {
        // 時間順にソート
        group.times.sort((a, b) => a.time.localeCompare(b.time));
        
        studioResult.slots.push({
          slotType: publicId,
          slotName: group.slotName,
          price: group.price,
          hours: group.hours,
          timeSlots: group.times,
        });
      }
    }
    
    // スロットを名前順にソート
    for (const studioResult of studioResults.values()) {
      studioResult.slots.sort((a, b) => {
        const order = ["朝活", "平日昼", "平日夜", "平日夜・土日", "土日"];
        return order.indexOf(a.slotName) - order.indexOf(b.slotName);
      });
    }
    
    const duration = Date.now() - startTime;
    console.log(`✨ 完了: ${duration}ms（${(duration / 1000).toFixed(1)}秒）`);
    
    return Array.from(studioResults.values());
  } catch (error) {
    console.error("❌ CREA API エラー:", error);
    throw error;
  }
}

// テスト用
export async function testCreaScaper(): Promise<void> {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 1);
  const dateStr = futureDate.toISOString().split("T")[0];

  console.log(`\n🚀 CREAスクレイパーテスト（API版）: ${dateStr}\n`);

  try {
    const results = await scrapeCrea(dateStr);
    console.log("\n📊 結果:");
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error("❌ エラー:", error);
  }
}
