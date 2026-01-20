import { launchBrowser, createPage, wait, type Browser, type Page } from "./browser";
import * as path from "path";
import * as fs from "fs";

// CREAスタジオの定義（正しいサービスID）
export const CREA_STUDIOS = {
  // CREA大名スタジオ (2F, 77㎡)
  "crea-daimyo": {
    name: "CREA大名",
    floor: "2F",
    size: "77㎡",
    slots: {
      morning: {
        name: "朝活",
        price: 500,
        hours: "6:00-9:00",
        url: "https://coubic.com/rentalstudiocrea/960818", // 大名朝活
        days: "all", // 毎日
      },
      weekdayDay: {
        name: "平日昼",
        price: 1980,
        hours: "9:00-17:00",
        url: "https://coubic.com/rentalstudiocrea/968953", // 大名 平日昼
        days: "weekday", // 月〜金（祝日含む）
      },
      weekdayNightWeekend: {
        name: "平日夜・土日",
        price: 2420,
        hours: "17:00-23:00 (平日) / 9:00-23:00 (土日)",
        url: "https://coubic.com/rentalstudiocrea/506244", // 大名 平日夜・土日
        days: "weekdayNight_weekend",
      },
    },
  },
  // CREA+ (4F, 100㎡)
  "crea-plus": {
    name: "CREA+",
    floor: "4F",
    size: "100㎡",
    slots: {
      weekdayDay: {
        name: "平日 昼",
        price: 2530,
        hours: "6:00-17:00",
        url: "https://coubic.com/rentalstudiocrea/802390", // CREA+ 平日 昼
        days: "weekday",
      },
      weekdayNight: {
        name: "平日 夜",
        price: 2860,
        hours: "17:00-23:00",
        url: "https://coubic.com/rentalstudiocrea/592262", // CREA+ 平日 夜
        days: "weekday",
      },
      weekend: {
        name: "土日",
        price: 3410,
        hours: "6:00-23:00",
        url: "https://coubic.com/rentalstudiocrea/419056", // CREA+ 土日
        days: "weekend",
      },
    },
  },
  // CREA大名Ⅱ (3F, 49㎡)
  "crea-daimyo2": {
    name: "CREA大名Ⅱ",
    floor: "3F",
    size: "49㎡",
    slots: {
      morning: {
        name: "朝活",
        price: 500,
        hours: "6:00-9:00",
        url: "https://coubic.com/rentalstudiocrea/563872", // 大名Ⅱ 朝活
        days: "all",
      },
      weekdayDay: {
        name: "平日昼",
        price: 1650,
        hours: "9:00-17:00",
        url: "https://coubic.com/rentalstudiocrea/519534", // 大名Ⅱ 平日昼
        days: "weekday",
      },
      weekdayNightWeekend: {
        name: "平日夜・土日",
        price: 2200,
        hours: "17:00-23:00 (平日) / 9:00-23:00 (土日)",
        url: "https://coubic.com/rentalstudiocrea/782437", // 大名Ⅱ 平日夜・土日
        days: "weekdayNight_weekend",
      },
    },
  },
  // CREA music -daimyo- (3F, 28.6㎡)
  "crea-music": {
    name: "CREA music",
    floor: "3F",
    size: "28.6㎡",
    slots: {
      morning: {
        name: "朝活",
        price: 1000,
        hours: "6:00-9:00",
        url: "https://coubic.com/rentalstudiocrea/972917", // CREA music 朝活
        days: "all",
      },
    },
  },
} as const;

// 出力型
export interface CreaTimeSlot {
  time: string; // "06:00", "07:00", etc.
  available: boolean;
}

export interface CreaSlotAvailability {
  slotType: string; // "morning", "weekdayDay", etc.
  slotName: string; // "朝活", "平日昼", etc.
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

/**
 * 指定日が平日かどうかを判定
 */
function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5; // 月曜(1)〜金曜(5)
}

/**
 * 指定日が週末かどうかを判定
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 日曜(0)または土曜(6)
}

/**
 * 曜日を取得
 */
function getDayOfWeek(date: Date): string {
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return days[date.getDay()];
}

/**
 * 指定日・時間帯に対して該当するスロットかどうかを判定
 */
function isSlotApplicable(
  slotDays: string,
  date: Date,
  targetHour?: number
): boolean {
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
      // 平日の夜（17時以降）または土日
      if (weekend) return true;
      if (weekday && targetHour !== undefined && targetHour >= 17) return true;
      if (weekday && targetHour === undefined) return true; // 時間指定なしの場合は含める
      return false;
    default:
      return true;
  }
}

/**
 * auth-crea.json が存在するか確認
 * 環境変数 CREA_AUTH_JSON が設定されている場合はそちらを使用
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

/**
 * CREAの特定スタジオ・スロットの空き状況を取得
 */
async function scrapeSlotAvailability(
  page: Page,
  slotUrl: string,
  targetDate: string
): Promise<CreaTimeSlot[]> {
  const timeSlots: CreaTimeSlot[] = [];

  try {
    // 予約ページへ移動（/book/event_type を追加）
    const bookingUrl = `${slotUrl}/book/event_type`;
    await page.goto(bookingUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // ページ読み込み待機
    await wait(3000);

    // 対象日付を解析
    const [year, month, day] = targetDate.split("-");
    const targetYearNum = parseInt(year);
    const targetMonthNum = parseInt(month);
    const targetDayNum = parseInt(day);

    // まず、月をナビゲート
    let attempts = 0;
    const maxAttempts = 6; // 最大6ヶ月先まで

    while (attempts < maxAttempts) {
      // 現在の月を確認（disabled属性のボタンを探す）
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
      
      if (!monthButtonText) {
        console.log("    ⚠️  月ボタンが見つかりません");
        break;
      }

      const currentYearMatch = monthButtonText.match(/(\d{4})年/);
      const currentMonthMatch = monthButtonText.match(/(\d{1,2})月/);
      
      if (!currentYearMatch || !currentMonthMatch) {
        console.log(`    ⚠️  月の解析に失敗: ${monthButtonText}`);
        break;
      }

      const currentYear = parseInt(currentYearMatch[1]);
      const currentMonth = parseInt(currentMonthMatch[1]);

      // 目標の月と一致するか確認
      if (currentYear === targetYearNum && currentMonth === targetMonthNum) {
        // 目標の月に到達
        break;
      }

      // 次の月へ進む必要があるか確認
      const monthsDiff = (targetYearNum - currentYear) * 12 + (targetMonthNum - currentMonth);

      if (monthsDiff > 0) {
        // 次の月へ進む（img要素を含むボタンの最後のもの）
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
        
        if (!clicked) {
          console.log(`    ⚠️  これ以上先の月には進めません`);
          return [];
        }

        await wait(1000);
      } else if (monthsDiff < 0) {
        // 前の月へ戻る
        await page.evaluate(() => {
          const buttons = document.querySelectorAll("button");
          const imgButtons = Array.from(buttons).filter(btn => btn.querySelector("img"));
          if (imgButtons.length > 0) {
            (imgButtons[0] as HTMLButtonElement).click();
          }
        });
        await wait(1000);
      }

      attempts++;
    }

    // 日付ボタンをクリック
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
      console.log(`    ⚠️  ${targetYearNum}年${targetMonthNum}月${targetDayNum}日 は選択不可です`);
      return [];
    }

    await wait(1500);

    // 利用可能な時間スロットを取得
    const slots = await page.evaluate(() => {
      const results: Array<{ time: string; available: boolean }> = [];
      
      // リスト内の時間スロットを探す（ラジオボタンのラベル）
      const listItems = document.querySelectorAll('li, [role="listitem"]');
      
      listItems.forEach((item) => {
        const text = item.textContent?.trim() || "";
        // "17:00 - 18:00" 形式を抽出
        const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*-\s*\d{1,2}:\d{2}/);
        if (timeMatch) {
          const hour = timeMatch[1].padStart(2, "0");
          const minute = timeMatch[2];
          results.push({
            time: `${hour}:${minute}`,
            available: true, // リストに表示されている = 空いている
          });
        }
      });

      // 直接テキストノードからも探す
      if (results.length === 0) {
        const allText = document.body.innerText;
        const timeMatches = allText.matchAll(/(\d{1,2}):(\d{2})\s*-\s*\d{1,2}:\d{2}/g);
        for (const match of timeMatches) {
          const hour = match[1].padStart(2, "0");
          const minute = match[2];
          // 重複チェック、営業時間などの表示を除外
          if (!results.find(r => r.time === `${hour}:${minute}`) && 
              parseInt(hour) >= 6 && parseInt(hour) <= 23) {
            results.push({
              time: `${hour}:${minute}`,
              available: true,
            });
          }
        }
      }

      // 結果をソート
      results.sort((a, b) => a.time.localeCompare(b.time));

      return results;
    });

    console.log(`    ✅ ${slots.length} 件の空き枠を取得`);
    return slots;
  } catch (error) {
    console.error(`Error scraping slot: ${slotUrl}`, error);
    return timeSlots;
  }
}

/**
 * CREAの空き状況をスクレイピング
 */
export async function scrapeCrea(
  targetDate: string, // "2026-01-20" format
  studioIds?: string[] // 省略時は全スタジオ
): Promise<CreaStudioAvailability[]> {
  const authData = getAuthData();
  if (!authData) {
    throw new Error(
      "認証情報が見つかりません。CREA_AUTH_JSON環境変数を設定するか、npm run auth:crea でログインセッションを保存してください。"
    );
  }

  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await createPage(browser);

    // Cookieを設定（認証情報から）
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

    const results: CreaStudioAvailability[] = [];

    const targetDateObj = new Date(targetDate);
    const dayOfWeek = getDayOfWeek(targetDateObj);

    // 対象スタジオを決定
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

      // 各スロット（時間帯）をスクレイピング
      for (const [slotType, slotInfo] of Object.entries(studio.slots)) {
        // この日に適用されるスロットかチェック
        if (!isSlotApplicable(slotInfo.days, targetDateObj)) {
          continue;
        }

        console.log(`  📅 ${studio.name} - ${slotInfo.name} を取得中...`);

        const timeSlots = await scrapeSlotAvailability(
          page,
          slotInfo.url,
          targetDate
        );

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

    await browser.close();
    return results;
  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}

/**
 * テスト用関数
 */
export async function testCreaScaper(): Promise<void> {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 7); // 1週間後
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
