/**
 * CREAスタジオスクレイパー（並列処理版）
 * 
 * Playwrightを使用して空き状況を取得
 * 複数ページを同時に開いて並列処理することで高速化
 */

import { chromium, type Browser, type Page, type BrowserContext } from "playwright";
import * as path from "path";
import * as fs from "fs";

// 並列処理の最大数（Render無料プランはメモリ512MBのため控えめに）
const MAX_CONCURRENT = 2;

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

// スクレイピングタスクの型
interface ScrapeTask {
  studioId: string;
  studioName: string;
  floor: string;
  size: string;
  slotType: string;
  slotName: string;
  price: number;
  hours: string;
  url: string;
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
  if (process.env.CREA_AUTH_JSON) {
    try {
      return JSON.parse(process.env.CREA_AUTH_JSON);
    } catch (e) {
      console.error("CREA_AUTH_JSON の解析に失敗しました:", e);
      return null;
    }
  }

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
 * 特定スロットの空き状況を取得（個別ページで実行）
 */
async function scrapeSlotAvailability(
  context: BrowserContext,
  slotUrl: string,
  targetDate: string
): Promise<CreaTimeSlot[]> {
  const page = await context.newPage();
  
  try {
    const bookingUrl = `${slotUrl}/book/event_type`;
    await page.goto(bookingUrl, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    // 待機時間を短縮
    await page.waitForTimeout(1500);

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
        await page.waitForTimeout(500);
      } else if (monthsDiff < 0) {
        const prevButton = page.locator('button').filter({ has: page.locator('img') }).first();
        await prevButton.click();
        await page.waitForTimeout(500);
      }

      attempts++;
    }

    // 日付ボタンをクリック
    const simpleDateButton = page.locator(`button >> text="${targetDayNum}"`).first();
    
    if (await simpleDateButton.count() === 0) return [];
    
    const isDateDisabled = await simpleDateButton.isDisabled().catch(() => true);
    if (isDateDisabled) return [];

    await simpleDateButton.click();
    await page.waitForTimeout(1000);

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

    return slots;
  } catch (error) {
    console.error(`Error scraping slot: ${slotUrl}`, error);
    return [];
  } finally {
    await page.close();
  }
}

/**
 * 並列実行ヘルパー（最大同時実行数を制限）
 */
async function runWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      const item = items[index];
      try {
        results[index] = await fn(item);
      } catch (error) {
        console.error(`Task ${index} failed:`, error);
        results[index] = null as unknown as R;
      }
    }
  }

  // limit個のワーカーを起動
  const workers = Array(Math.min(limit, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

/**
 * CREAの空き状況をスクレイピング（並列処理版）
 */
export async function scrapeCrea(
  targetDate: string,
  studioIds?: string[]
): Promise<CreaStudioAvailability[]> {
  const authData = getAuthData();
  let browser: Browser | null = null;
  const startTime = Date.now();

  try {
    browser = await chromium.launch({ headless: true });
    
    // コンテキスト作成
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
      console.warn("⚠️ 認証情報なしで実行");
    }

    const targetDateObj = new Date(targetDate);
    const dayOfWeek = getDayOfWeek(targetDateObj);
    const targetStudios = studioIds || Object.keys(CREA_STUDIOS);

    // 全タスクを収集
    const tasks: ScrapeTask[] = [];
    for (const studioId of targetStudios) {
      const studio = CREA_STUDIOS[studioId as keyof typeof CREA_STUDIOS];
      if (!studio) continue;

      for (const [slotType, slotInfo] of Object.entries(studio.slots)) {
        if (!isSlotApplicable(slotInfo.days, targetDateObj)) continue;

        tasks.push({
          studioId,
          studioName: studio.name,
          floor: studio.floor,
          size: studio.size,
          slotType,
          slotName: slotInfo.name,
          price: slotInfo.price,
          hours: slotInfo.hours,
          url: slotInfo.url,
        });
      }
    }

    console.log(`📋 ${tasks.length} 件のスロットを処理中...（最大${MAX_CONCURRENT}並列）`);

    // 並列数を制限してスクレイピング実行
    const taskResults = await runWithConcurrencyLimit(
      tasks,
      MAX_CONCURRENT,
      async (task) => {
        console.log(`  🔍 ${task.studioName} - ${task.slotName}`);
        const timeSlots = await scrapeSlotAvailability(context, task.url, targetDate);
        console.log(`  ✅ ${task.studioName} - ${task.slotName}: ${timeSlots.length}件`);
        return { task, timeSlots };
      }
    );

    // 結果をスタジオごとにグループ化
    const studioMap = new Map<string, CreaStudioAvailability>();
    
    for (const studioId of targetStudios) {
      const studio = CREA_STUDIOS[studioId as keyof typeof CREA_STUDIOS];
      if (!studio) continue;

      studioMap.set(studioId, {
        studioId,
        studioName: studio.name,
        floor: studio.floor,
        size: studio.size,
        date: targetDate,
        dayOfWeek,
        slots: [],
      });
    }

    for (const { task, timeSlots } of taskResults) {
      const studioResult = studioMap.get(task.studioId);
      if (studioResult) {
        studioResult.slots.push({
          slotType: task.slotType,
          slotName: task.slotName,
          price: task.price,
          hours: task.hours,
          timeSlots,
        });
      }
    }

    await context.close();
    await browser.close();

    const duration = Date.now() - startTime;
    console.log(`✨ 完了: ${duration}ms（${(duration / 1000).toFixed(1)}秒）`);

    return Array.from(studioMap.values());
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

  console.log(`\n🚀 CREAスクレイパーテスト（並列処理版）: ${dateStr}\n`);

  try {
    const results = await scrapeCrea(dateStr);
    console.log("\n📊 結果:");
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error("❌ エラー:", error);
  }
}
