/**
 * CREAスタジオスクレイパー
 * 
 * Playwrightを使用して空き状況を取得
 * Render APIサーバーから呼び出される
 */

import { chromium, type Browser, type Page, type BrowserContext } from "playwright";
import * as path from "path";
import * as fs from "fs";

// CREAスタジオの定義
export const CREA_STUDIOS = {
  "crea-daimyo": {
    name: "CREA大名",
    floor: "2F",
    size: "77㎡",
    slots: {
      morning: {
        name: "朝活",
        price: 500,
        hours: "6:00-9:00",
        url: "https://coubic.com/rentalstudiocrea/960818",
        days: "all",
      },
      weekdayDay: {
        name: "平日昼",
        price: 1980,
        hours: "9:00-17:00",
        url: "https://coubic.com/rentalstudiocrea/968953",
        days: "weekday",
      },
      weekdayNightWeekend: {
        name: "平日夜・土日",
        price: 2420,
        hours: "17:00-23:00 (平日) / 9:00-23:00 (土日)",
        url: "https://coubic.com/rentalstudiocrea/506244",
        days: "weekdayNight_weekend",
      },
    },
  },
  "crea-plus": {
    name: "CREA+",
    floor: "4F",
    size: "100㎡",
    slots: {
      weekdayDay: {
        name: "平日 昼",
        price: 2530,
        hours: "6:00-17:00",
        url: "https://coubic.com/rentalstudiocrea/802390",
        days: "weekday",
      },
      weekdayNight: {
        name: "平日 夜",
        price: 2860,
        hours: "17:00-23:00",
        url: "https://coubic.com/rentalstudiocrea/592262",
        days: "weekday",
      },
      weekend: {
        name: "土日",
        price: 3410,
        hours: "6:00-23:00",
        url: "https://coubic.com/rentalstudiocrea/419056",
        days: "weekend",
      },
    },
  },
  "crea-daimyo2": {
    name: "CREA大名Ⅱ",
    floor: "3F",
    size: "49㎡",
    slots: {
      morning: {
        name: "朝活",
        price: 500,
        hours: "6:00-9:00",
        url: "https://coubic.com/rentalstudiocrea/563872",
        days: "all",
      },
      weekdayDay: {
        name: "平日昼",
        price: 1650,
        hours: "9:00-17:00",
        url: "https://coubic.com/rentalstudiocrea/519534",
        days: "weekday",
      },
      weekdayNightWeekend: {
        name: "平日夜・土日",
        price: 2200,
        hours: "17:00-23:00 (平日) / 9:00-23:00 (土日)",
        url: "https://coubic.com/rentalstudiocrea/782437",
        days: "weekdayNight_weekend",
      },
    },
  },
  "crea-music": {
    name: "CREA music",
    floor: "3F",
    size: "28.6㎡",
    slots: {
      morning: {
        name: "朝活",
        price: 1000,
        hours: "6:00-9:00",
        url: "https://coubic.com/rentalstudiocrea/972917",
        days: "all",
      },
    },
  },
} as const;

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

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getDayOfWeek(date: Date): string {
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return days[date.getDay()];
}

function isSlotApplicable(slotDays: string, date: Date): boolean {
  const weekday = isWeekday(date);
  const weekend = isWeekend(date);

  switch (slotDays) {
    case "all":
      return true;
    case "weekday":
      return weekday;
    case "weekend":
      return weekend;
    case "weekdayNight_weekend":
      return weekend || weekday;
    default:
      return true;
  }
}

/**
 * 認証情報を取得
 */
function getAuthData(): object | null {
  // 環境変数から認証情報を取得
  if (process.env.CREA_AUTH_JSON) {
    try {
      return JSON.parse(process.env.CREA_AUTH_JSON);
    } catch (e) {
      console.error("CREA_AUTH_JSON の解析に失敗しました:", e);
      return null;
    }
  }

  // ローカルファイルから認証情報を取得
  const authPath = path.join(process.cwd(), "auth-crea.json");
  if (fs.existsSync(authPath)) {
    try {
      const content = fs.readFileSync(authPath, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.error("auth-crea.json の読み込みに失敗しました:", e);
      return null;
    }
  }

  return null;
}

/**
 * 特定スロットの空き状況を取得
 */
async function scrapeSlotAvailability(
  page: Page,
  slotUrl: string,
  targetDate: string
): Promise<CreaTimeSlot[]> {
  try {
    const bookingUrl = `${slotUrl}/book/event_type`;
    await page.goto(bookingUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await page.waitForTimeout(3000);

    const [year, month, day] = targetDate.split("-");
    const targetYearNum = parseInt(year);
    const targetMonthNum = parseInt(month);
    const targetDayNum = parseInt(day);

    // 月をナビゲート
    let attempts = 0;
    const maxAttempts = 6;

    while (attempts < maxAttempts) {
      const monthButtonText = await page.locator('button[disabled]:has-text("年")').textContent().catch(() => "");
      
      if (!monthButtonText) break;

      const currentYearMatch = monthButtonText.match(/(\d{4})年/);
      const currentMonthMatch = monthButtonText.match(/(\d{1,2})月/);
      
      if (!currentYearMatch || !currentMonthMatch) break;

      const currentYear = parseInt(currentYearMatch[1]);
      const currentMonth = parseInt(currentMonthMatch[1]);

      if (currentYear === targetYearNum && currentMonth === targetMonthNum) break;

      const monthsDiff = (targetYearNum - currentYear) * 12 + (targetMonthNum - currentMonth);

      if (monthsDiff > 0) {
        const nextButton = page.locator('button').filter({ has: page.locator('img') }).last();
        const isNextDisabled = await nextButton.isDisabled().catch(() => true);
        
        if (isNextDisabled) return [];

        await nextButton.click();
        await page.waitForTimeout(1000);
      } else if (monthsDiff < 0) {
        const prevButton = page.locator('button').filter({ has: page.locator('img') }).first();
        await prevButton.click();
        await page.waitForTimeout(1000);
      }

      attempts++;
    }

    // 日付ボタンをクリック
    const simpleDateButton = page.locator(`button >> text="${targetDayNum}"`).first();
    
    if (await simpleDateButton.count() === 0) return [];
    
    const isDateDisabled = await simpleDateButton.isDisabled().catch(() => true);
    if (isDateDisabled) return [];

    await simpleDateButton.click();
    await page.waitForTimeout(1500);

    // 時間スロットを取得
    const slots = await page.evaluate(() => {
      const results: Array<{ time: string; available: boolean }> = [];
      const listItems = document.querySelectorAll('li, [role="listitem"]');
      
      listItems.forEach((item) => {
        const text = item.textContent?.trim() || "";
        const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*-\s*\d{1,2}:\d{2}/);
        if (timeMatch) {
          const hour = timeMatch[1].padStart(2, "0");
          const minute = timeMatch[2];
          results.push({
            time: `${hour}:${minute}`,
            available: true,
          });
        }
      });

      if (results.length === 0) {
        const allText = document.body.innerText;
        const timeMatches = allText.matchAll(/(\d{1,2}):(\d{2})\s*-\s*\d{1,2}:\d{2}/g);
        for (const match of timeMatches) {
          const hour = match[1].padStart(2, "0");
          const minute = match[2];
          if (!results.find(r => r.time === `${hour}:${minute}`) && 
              parseInt(hour) >= 6 && parseInt(hour) <= 23) {
            results.push({
              time: `${hour}:${minute}`,
              available: true,
            });
          }
        }
      }

      results.sort((a, b) => a.time.localeCompare(b.time));
      return results;
    });

    console.log(`    ✅ ${slots.length} 件の空き枠を取得`);
    return slots;
  } catch (error) {
    console.error(`Error scraping slot: ${slotUrl}`, error);
    return [];
  }
}

/**
 * CREAの空き状況をスクレイピング
 */
export async function scrapeCrea(
  targetDate: string,
  studioIds?: string[]
): Promise<CreaStudioAvailability[]> {
  const authData = getAuthData();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    
    // コンテキスト作成（認証情報あれば使用）
    let context: BrowserContext;
    if (authData) {
      context = await browser.newContext({
        storageState: authData as { cookies: Array<{ name: string; value: string; domain: string; path: string; expires: number; httpOnly: boolean; secure: boolean; sameSite: "Strict" | "Lax" | "None" }>; origins: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }> },
        viewport: { width: 1280, height: 720 },
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      });
    } else {
      context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      });
      console.warn("⚠️ 認証情報なしで実行（一部機能が制限される可能性があります）");
    }

    const page = await context.newPage();
    const results: CreaStudioAvailability[] = [];

    const targetDateObj = new Date(targetDate);
    const dayOfWeek = getDayOfWeek(targetDateObj);

    const targetStudios = studioIds || Object.keys(CREA_STUDIOS);

    for (const studioId of targetStudios) {
      const studio = CREA_STUDIOS[studioId as keyof typeof CREA_STUDIOS];
      if (!studio) continue;

      const studioResult: CreaStudioAvailability = {
        studioId,
        studioName: studio.name,
        floor: studio.floor,
        size: studio.size,
        date: targetDate,
        dayOfWeek,
        slots: [],
      };

      for (const [slotType, slotInfo] of Object.entries(studio.slots)) {
        if (!isSlotApplicable(slotInfo.days, targetDateObj)) continue;

        console.log(`  📅 ${studio.name} - ${slotInfo.name} を取得中...`);

        const timeSlots = await scrapeSlotAvailability(page, slotInfo.url, targetDate);

        studioResult.slots.push({
          slotType,
          slotName: slotInfo.name,
          price: slotInfo.price,
          hours: slotInfo.hours,
          timeSlots,
        });
      }

      results.push(studioResult);
    }

    await context.close();
    await browser.close();
    return results;
  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}

// テスト用
export async function testCreaScaper(): Promise<void> {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 7);
  const dateStr = futureDate.toISOString().split("T")[0];

  console.log(`\n🚀 CREAスクレイパーテスト: ${dateStr}\n`);

  try {
    const results = await scrapeCrea(dateStr);
    console.log("\n📊 結果:");
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error("❌ エラー:", error);
  }
}
