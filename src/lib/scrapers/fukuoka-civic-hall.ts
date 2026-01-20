/**
 * 福岡市民会館スクレイパー（API版）
 * 
 * POSTリクエストでHTMLを直接取得し、パースして空き状況を取得
 * Playwrightは不要で、高速にデータを取得可能
 */

// 時間スロットの定義
export const TIME_SLOTS = {
  0: "9:00-12:30",
  1: "13:00-15:30",
  2: "16:00-18:30",
  3: "19:00-22:00",
} as const;

// 対象部屋
const TARGET_ROOMS = ["リハーサル室", "練習室①", "練習室③"];

// 出力型
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

/**
 * HTMLからテーブルデータを抽出する正規表現ベースのパーサー
 */
function parseAvailabilityFromHtml(html: string, targetDate: string): RoomAvailability[] {
  const results: RoomAvailability[] = [];
  const timeSlots = ["9:00-12:30", "13:00-15:30", "16:00-18:30", "19:00-22:00"];

  // koma-table クラスを持つテーブルを抽出
  const tableRegex = /<table[^>]*class="[^"]*koma-table[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;

  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableContent = tableMatch[1];

    // テーブル内のセルを抽出
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let cellMatch;
    
    while ((cellMatch = cellRegex.exec(tableContent)) !== null) {
      // HTMLタグを除去してテキストを取得
      const text = cellMatch[1]
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      cells.push(text);
    }

    if (cells.length === 0) continue;

    // 最初のセルが部屋名
    const rawRoomName = cells[0];
    const roomName = rawRoomName
      .replace(/（[^）]*）/g, "")
      .replace(/\([^)]*\)/g, "")
      .trim();

    // 対象部屋かどうかチェック
    let isTargetRoom = false;
    for (const target of TARGET_ROOMS) {
      if (roomName.includes(target)) {
        isTargetRoom = true;
        break;
      }
    }
    if (!isTargetRoom) continue;

    // スロットのステータスを抽出（セルインデックス 1, 3, 5, 7）
    const slots: RoomSlot[] = [];
    const slotIndices = [1, 3, 5, 7];
    
    for (let slotIdx = 0; slotIdx < slotIndices.length; slotIdx++) {
      const cellIndex = slotIndices[slotIdx];
      if (cellIndex >= cells.length) continue;

      const status = cells[cellIndex] || "-";

      slots.push({
        status,
        date: targetDate,
        slotId: String(slotIdx),
        timeRange: timeSlots[slotIdx],
      });
    }

    results.push({ roomName, slots });
  }

  return results;
}

/**
 * 福岡市民会館の空き状況を取得（API版）
 */
export async function scrapeFukuokaCivicHall(
  targetDate: string // "2026-01-20" format
): Promise<RoomAvailability[]> {
  const startTime = Date.now();

  try {
    // 日付をパース（2026-01-20 → UseYM: 202601, UseDay: 20, UseDate: 20260120）
    const [year, month, day] = targetDate.split("-");
    const useYM = `${year}${month}`;
    const useDay = String(parseInt(day)); // "20" → "20" (先頭の0を除去)
    const useDate = `${year}${month}${day}`;
    const formattedDate = targetDate.replace(/-/g, "/");

    console.log(`📡 福岡市民会館 API呼び出し: ${targetDate}`);

    // POSTリクエストでHTMLを取得
    const formData = new URLSearchParams({
      op: "srch_sst",
      UseYM: useYM,
      UseDay: useDay,
      UseDate: useDate,
      ShisetsuCode: "001",
    });

    const response = await fetch("https://k3.p-kashikan.jp/fukuoka-kyotenbunka/index.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // HTMLから空き状況を抽出
    const result = parseAvailabilityFromHtml(html, formattedDate);

    const duration = Date.now() - startTime;
    console.log(`✨ 福岡市民会館 完了: ${duration}ms（${(duration / 1000).toFixed(1)}秒）`);

    return result;
  } catch (error) {
    console.error("❌ 福岡市民会館 エラー:", error);
    throw error;
  }
}

// 単体テスト用
export async function testScraper(): Promise<void> {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 30);
  const dateStr = futureDate.toISOString().split("T")[0];

  console.log(`Testing scraper for date: ${dateStr}`);
  const result = await scrapeFukuokaCivicHall(dateStr);
  console.log(JSON.stringify(result, null, 2));
}
