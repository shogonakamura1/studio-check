import { launchBrowser, createPage, waitForNetworkIdle, clickByText, type Browser, type Page } from "./browser";

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
 * 福岡市民会館の空き状況をスクレイピング
 */
export async function scrapeFukuokaCivicHall(
  targetDate: string // "2026-01-20" format
): Promise<RoomAvailability[]> {
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await createPage(browser);

    // サイトにアクセス
    await page.goto("https://k3.p-kashikan.jp/fukuoka-kyotenbunka/index.php", {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // 「施設毎の空き状況」をクリック
    await clickByText(page, "施設毎の空き状況");
    await waitForNetworkIdle(page);

    // 日付を変換（2026-01-20 → 2026/01/20）
    const formattedDate = targetDate.replace(/-/g, "/");

    // 目標の日付まで移動
    await navigateToDate(page, formattedDate);

    // データを抽出
    const result = await extractAvailability(page, formattedDate);

    return result;
  } catch (error) {
    console.error("Scraping error:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * 指定した日付までナビゲート
 */
async function navigateToDate(page: Page, targetDate: string): Promise<void> {
  const maxAttempts = 60; // 最大60日分の移動

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 現在表示されている日付を取得
    const currentDateText = await page.$eval("h3", (el) => {
      const text = el.textContent || "";
      return text.includes("年") ? text : null;
    }).catch(() => null);

    if (!currentDateText) {
      throw new Error("Could not find date heading");
    }

    // "2026(令和 8)年 2月20日 (金)" または "2026(令和 8)年 2月 3日 (火)" から日付を抽出
    const match = currentDateText.match(/(\d{4}).*?年\s*(\d{1,2})月\s*(\d{1,2})日/);
    if (!match) {
      throw new Error(`Could not parse date: ${currentDateText}`);
    }

    const [, year, month, day] = match;
    const currentDate = `${year}/${month.padStart(2, "0")}/${day.padStart(2, "0")}`;

    if (currentDate === targetDate) {
      return; // 目標日付に到達
    }

    // 日付を比較して進む方向を決定
    const current = new Date(currentDate.replace(/\//g, "-"));
    const target = new Date(targetDate.replace(/\//g, "-"));
    const diffDays = Math.floor((target.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 30) {
      await clickByText(page, "1ヶ月後");
    } else if (diffDays > 7) {
      await clickByText(page, "1週間後");
    } else if (diffDays > 0) {
      await clickByText(page, "1日後");
    } else if (diffDays < -30) {
      await clickByText(page, "1ヶ月前");
    } else if (diffDays < -7) {
      await clickByText(page, "1週間前");
    } else {
      await clickByText(page, "1日前");
    }

    await waitForNetworkIdle(page);
  }

  throw new Error(`Could not navigate to date: ${targetDate}`);
}

/**
 * ページから空き状況を抽出
 */
async function extractAvailability(page: Page, targetDate: string): Promise<RoomAvailability[]> {
  const timeSlotArray = [
    "9:00-12:30",
    "13:00-15:30",
    "16:00-18:30",
    "19:00-22:00",
  ];

  return await page.evaluate(
    (args) => {
      const { targetRooms, targetDate, timeSlots } = args;

      const results: Array<{ roomName: string; slots: Array<{ status: string; date: string; slotId: string; timeRange: string }> }> = [];
      const tables = document.querySelectorAll("table.koma-table");

      tables.forEach((table) => {
        const cells = table.querySelectorAll("td");
        if (cells.length === 0) return;

        const firstCell = cells[0];
        const rawRoomName = firstCell.textContent?.trim() || "";
        // 部屋名をクリーンアップ
        const roomName = rawRoomName
          .replace(/（[^）]*）/g, "")
          .replace(/\([^)]*\)/g, "")
          .trim();

        // 対象部屋かチェック
        let isTargetRoom = false;
        for (let i = 0; i < targetRooms.length; i++) {
          if (roomName.includes(targetRooms[i])) {
            isTargetRoom = true;
            break;
          }
        }
        if (!isTargetRoom) return;

        const slots: Array<{ status: string; date: string; slotId: string; timeRange: string }> = [];

        // セル位置: 1, 3, 5, 7 がスロット 0, 1, 2, 3
        const slotIndices = [1, 3, 5, 7];
        for (let slotIdx = 0; slotIdx < slotIndices.length; slotIdx++) {
          const cellIndex = slotIndices[slotIdx];
          if (cellIndex >= cells.length) continue;

          const cell = cells[cellIndex];
          const status = cell.textContent?.trim() || "";
          const id = cell.id || null;

          // id属性から日付とスロットIDを抽出
          let parsedDate = targetDate;
          let parsedSlotId = String(slotIdx);
          if (id) {
            const match = id.match(/#(\d{4}\/\d{2}\/\d{2})#(\d+)$/);
            if (match) {
              parsedDate = match[1];
              parsedSlotId = match[2];
            }
          }

          slots.push({
            status,
            date: parsedDate,
            slotId: parsedSlotId,
            timeRange: timeSlots[slotIdx],
          });
        }

        results.push({ roomName, slots });
      });

      return results;
    },
    { 
      targetRooms: TARGET_ROOMS, 
      targetDate, 
      timeSlots: timeSlotArray 
    }
  );
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
