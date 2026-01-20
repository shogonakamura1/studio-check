import { launchBrowser, createPage, waitForNetworkIdle, clickByText, wait, type Browser, type Page } from "./browser";
import * as path from "path";
import * as fs from "fs";

// Types
export interface FukuokaSlot {
  status: string;
  date: string;
  slotId: string;
  timeRange: string;
}

export interface FukuokaRoom {
  roomName: string;
  slots: FukuokaSlot[];
}

export interface CreaTimeSlot {
  time: string;
  available: boolean;
}

export interface CreaSlotInfo {
  slotType: string;
  slotName: string;
  price: number;
  hours: string;
  timeSlots: CreaTimeSlot[];
}

export interface CreaStudio {
  studioId: string;
  studioName: string;
  floor: string;
  size: string;
  slots: CreaSlotInfo[];
}

export interface ParallelScrapingResult {
  fukuoka: FukuokaRoom[];
  crea: CreaStudio[];
  errors: string[];
}

// Constants
const TARGET_ROOMS = ["リハーサル室", "練習室①", "練習室③"];
const TIME_RANGES: Record<string, string> = {
  "0": "9:00-12:30",
  "1": "13:00-15:30",
  "2": "16:00-18:30",
  "3": "19:00-22:00",
};

const CREA_SERVICES = {
  "crea-daimyo": {
    name: "CREA大名",
    floor: "2F",
    size: "77㎡",
    slots: {
      morning: { name: "朝活", price: 500, hours: "6:00-9:00", url: "https://coubic.com/rentalstudiocrea/960818", days: "all" },
      weekdayDay: { name: "平日昼", price: 1980, hours: "9:00-17:00", url: "https://coubic.com/rentalstudiocrea/968953", days: "weekday" },
      weekdayNightWeekend: { name: "平日夜・土日", price: 2420, hours: "17:00-23:00", url: "https://coubic.com/rentalstudiocrea/506244", days: "weekdayNight_weekend" },
    },
  },
  "crea-plus": {
    name: "CREA+",
    floor: "4F",
    size: "100㎡",
    slots: {
      weekdayDay: { name: "平日 昼", price: 2530, hours: "6:00-17:00", url: "https://coubic.com/rentalstudiocrea/802390", days: "weekday" },
      weekdayNight: { name: "平日 夜", price: 2860, hours: "17:00-23:00", url: "https://coubic.com/rentalstudiocrea/592262", days: "weekday" },
      weekend: { name: "土日", price: 3410, hours: "6:00-23:00", url: "https://coubic.com/rentalstudiocrea/419056", days: "weekend" },
    },
  },
  "crea-daimyo2": {
    name: "CREA大名Ⅱ",
    floor: "3F",
    size: "49㎡",
    slots: {
      morning: { name: "朝活", price: 500, hours: "6:00-9:00", url: "https://coubic.com/rentalstudiocrea/563872", days: "all" },
      weekdayDay: { name: "平日昼", price: 1650, hours: "9:00-17:00", url: "https://coubic.com/rentalstudiocrea/519534", days: "weekday" },
      weekdayNightWeekend: { name: "平日夜・土日", price: 2200, hours: "17:00-23:00", url: "https://coubic.com/rentalstudiocrea/782437", days: "weekdayNight_weekend" },
    },
  },
  "crea-music": {
    name: "CREA music",
    floor: "3F",
    size: "28.6㎡",
    slots: {
      morning: { name: "朝活", price: 1000, hours: "6:00-9:00", url: "https://coubic.com/rentalstudiocrea/972917", days: "all" },
    },
  },
} as const;

// Helpers
function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isSlotApplicable(days: string, date: Date): boolean {
  switch (days) {
    case "all": return true;
    case "weekday": return isWeekday(date);
    case "weekend": return isWeekend(date);
    case "weekdayNight_weekend": return isWeekend(date) || isWeekday(date);
    default: return true;
  }
}

/**
 * 認証情報を取得
 */
function getAuthData(): object | null {
  // 環境変数から認証情報を取得（Vercel用）
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

// Fukuoka Civic Hall Scraper
async function scrapeFukuoka(page: Page, targetDate: string): Promise<FukuokaRoom[]> {
  const url = "https://k3.p-kashikan.jp/fukuoka-kyotenbunka/index.php";
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  
  // Navigate to facility view
  await clickByText(page, "施設毎の空き状況");
  await waitForNetworkIdle(page);

  // Format target date for comparison
  const formattedTargetDate = targetDate.replace(/-/g, "/");
  const targetDateObj = new Date(targetDate);

  // Navigate to target date
  const maxAttempts = 60;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Get current date from h3 heading
    const dateText = await page.$eval("h3", (el) => {
      const text = el.textContent || "";
      return text.includes("年") ? text : null;
    }).catch(() => null);

    if (!dateText) throw new Error("Could not find date heading");

    const dateMatch = dateText.match(/(\d{4}).*?年\s*(\d{1,2})月\s*(\d{1,2})日/);
    if (!dateMatch) throw new Error(`Could not parse date: ${dateText}`);

    const [, year, month, day] = dateMatch;
    const currentDate = `${year}/${month.padStart(2, "0")}/${day.padStart(2, "0")}`;

    if (currentDate === formattedTargetDate) break;

    const current = new Date(currentDate.replace(/\//g, "-"));
    const diffDays = Math.floor((targetDateObj.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));

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

  // Extract availability
  return await page.evaluate((args) => {
    const { targetRooms, timeRanges } = args;
    const results: FukuokaRoom[] = [];
    const tables = document.querySelectorAll("table.koma-table");

    tables.forEach((table) => {
      const nameCell = table.querySelector("td.name");
      if (!nameCell) return;

      const fullName = nameCell.textContent?.trim() || "";
      const roomName = fullName.split(/[\n<]/)[0].trim();

      if (!targetRooms.some((target: string) => roomName.includes(target))) return;

      const slots: FukuokaSlot[] = [];
      const cells = table.querySelectorAll("td:not(.name)");

      cells.forEach((cell) => {
        const status = cell.textContent?.trim() || "";
        if (!["○", "×", "●", "-"].includes(status)) return;

        const id = cell.getAttribute("id") || "";
        const idMatch = id.match(/#(\d{4}\/\d{2}\/\d{2})#(\d)/);

        if (idMatch) {
          slots.push({
            status,
            date: idMatch[1],
            slotId: idMatch[2],
            timeRange: timeRanges[idMatch[2]] || "",
          });
        }
      });

      if (slots.length > 0) {
        results.push({ roomName, slots });
      }
    });

    return results;
  }, { targetRooms: TARGET_ROOMS, timeRanges: TIME_RANGES });
}

// CREA Scraper
async function scrapeCreaSlot(
  page: Page,
  serviceUrl: string,
  targetDate: string
): Promise<CreaTimeSlot[]> {
  const bookingUrl = `${serviceUrl}/book/event_type`;
  await page.goto(bookingUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await wait(2000);

  const [year, month, day] = targetDate.split("-");
  const targetYearNum = parseInt(year);
  const targetMonthNum = parseInt(month);
  const targetDayNum = parseInt(day);

  // Navigate to correct month
  let monthAttempts = 0;
  while (monthAttempts < 6) {
    const monthButtonText = await page.evaluate(() => {
      const buttons = document.querySelectorAll("button[disabled]");
      for (const btn of buttons) {
        const text = btn.textContent || "";
        if (text.includes("年")) {
          return text;
        }
      }
      return "";
    });

    const yearMatch = monthButtonText?.match(/(\d{4})年/);
    const monthMatch = monthButtonText?.match(/(\d{1,2})月/);

    if (yearMatch && monthMatch) {
      const currYear = parseInt(yearMatch[1]);
      const currMonth = parseInt(monthMatch[1]);

      if (currYear === targetYearNum && currMonth === targetMonthNum) break;

      const diff = (targetYearNum - currYear) * 12 + (targetMonthNum - currMonth);
      if (diff > 0) {
        const clicked = await page.evaluate(() => {
          const buttons = document.querySelectorAll("button");
          const imgButtons = Array.from(buttons).filter(btn => btn.querySelector("img"));
          if (imgButtons.length > 0) {
            const lastBtn = imgButtons[imgButtons.length - 1] as HTMLButtonElement;
            if (!lastBtn.disabled) {
              lastBtn.click();
              return true;
            }
          }
          return false;
        });
        if (!clicked) return [];
        await wait(800);
      } else if (diff < 0) {
        await page.evaluate(() => {
          const buttons = document.querySelectorAll("button");
          const imgButtons = Array.from(buttons).filter(btn => btn.querySelector("img"));
          if (imgButtons.length > 0) {
            (imgButtons[0] as HTMLButtonElement).click();
          }
        });
        await wait(800);
      }
    }
    monthAttempts++;
  }

  // Click date
  const dateClicked = await page.evaluate((targetDay) => {
    const buttons = document.querySelectorAll("button");
    for (const btn of buttons) {
      const text = btn.textContent?.trim();
      if (text === String(targetDay) && !btn.disabled) {
        (btn as HTMLButtonElement).click();
        return true;
      }
    }
    return false;
  }, targetDayNum);

  if (!dateClicked) {
    return [];
  }

  await wait(1500);

  // Extract time slots
  return await page.evaluate(() => {
    const results: Array<{ time: string; available: boolean }> = [];
    const listItems = document.querySelectorAll('li, [role="listitem"]');

    listItems.forEach((item) => {
      const text = item.textContent?.trim() || "";
      const match = text.match(/(\d{1,2}):(\d{2})\s*-\s*\d{1,2}:\d{2}/);
      if (match) {
        results.push({
          time: `${match[1].padStart(2, "0")}:${match[2]}`,
          available: true,
        });
      }
    });

    results.sort((a, b) => a.time.localeCompare(b.time));
    return results;
  });
}

async function scrapeCrea(browser: Browser, targetDate: string, authData: object | null): Promise<CreaStudio[]> {
  const targetDateObj = new Date(targetDate);
  const results: CreaStudio[] = [];

  for (const [studioId, studio] of Object.entries(CREA_SERVICES)) {
    const studioResult: CreaStudio = {
      studioId,
      studioName: studio.name,
      floor: studio.floor,
      size: studio.size,
      slots: [],
    };

    // Process slots sequentially (to avoid overwhelming the server)
    for (const [slotType, slotInfo] of Object.entries(studio.slots)) {
      if (!isSlotApplicable(slotInfo.days, targetDateObj)) continue;

      const page = await createPage(browser);
      
      // Set cookies if auth data available
      if (authData) {
        const authDataTyped = authData as { cookies?: Array<{ name: string; value: string; domain: string; path?: string }> };
        if (authDataTyped.cookies) {
          const cookies = authDataTyped.cookies.map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path || "/",
          }));
          await page.setCookie(...cookies);
        }
      }

      try {
        const timeSlots = await scrapeCreaSlot(page, slotInfo.url, targetDate);
        studioResult.slots.push({
          slotType,
          slotName: slotInfo.name,
          price: slotInfo.price,
          hours: slotInfo.hours,
          timeSlots,
        });
      } finally {
        await page.close();
      }
    }

    results.push(studioResult);
  }

  return results;
}

// Main parallel scraper
export async function scrapeAllStudios(targetDate: string): Promise<ParallelScrapingResult> {
  const authData = getAuthData();
  
  let browser: Browser | null = null;
  const errors: string[] = [];

  try {
    browser = await launchBrowser();

    // Execute in parallel (Fukuoka and CREA)
    const [fukuokaResult, creaResult] = await Promise.all([
      (async () => {
        const page = await createPage(browser!);
        try {
          return await scrapeFukuoka(page, targetDate);
        } catch (e) {
          errors.push(`Fukuoka: ${e instanceof Error ? e.message : String(e)}`);
          return [];
        } finally {
          await page.close();
        }
      })(),
      (async () => {
        if (!authData) {
          errors.push("CREA: 認証情報が見つかりません");
          return [];
        }
        try {
          return await scrapeCrea(browser!, targetDate, authData);
        } catch (e) {
          errors.push(`CREA: ${e instanceof Error ? e.message : String(e)}`);
          return [];
        }
      })(),
    ]);

    return {
      fukuoka: fukuokaResult,
      crea: creaResult,
      errors,
    };
  } finally {
    if (browser) await browser.close();
  }
}

// Test function
export async function testParallelScraper(): Promise<void> {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 7);
  const dateStr = futureDate.toISOString().split("T")[0];

  console.log(`\n🚀 Parallel Scraper Test: ${dateStr}\n`);
  console.time("Total execution time");

  const result = await scrapeAllStudios(dateStr);

  console.timeEnd("Total execution time");
  console.log("\n📊 Results:");
  console.log(JSON.stringify(result, null, 2));
}
