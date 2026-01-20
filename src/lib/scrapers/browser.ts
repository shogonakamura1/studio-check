import puppeteer, { type Browser, type Page } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

/**
 * Vercel環境かどうかを判定
 */
function isVercel(): boolean {
  return !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
}

/**
 * ブラウザを起動する
 * - ローカル: システムのChrome/Chromiumを使用
 * - Vercel: @sparticuz/chromiumを使用
 */
export async function launchBrowser(): Promise<Browser> {
  if (isVercel()) {
    // Vercel/Lambda環境
    // @sparticuz/chromiumの設定
    chromium.setHeadlessMode = true;
    chromium.setGraphicsMode = false;

    const executablePath = await chromium.executablePath();

    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });
  } else {
    // ローカル開発環境
    // macOSのChromeパスを優先、なければ一般的なパスを試す
    const possiblePaths = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      process.env.CHROME_PATH,
    ].filter(Boolean) as string[];

    let executablePath: string | undefined;
    
    for (const chromePath of possiblePaths) {
      try {
        const fs = await import("fs");
        if (fs.existsSync(chromePath)) {
          executablePath = chromePath;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!executablePath) {
      throw new Error(
        "Chrome/Chromiumが見つかりません。CHROME_PATH環境変数を設定するか、Chromeをインストールしてください。"
      );
    }

    return puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  }
}

/**
 * ページを作成する（共通設定付き）
 */
export async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 720 });
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );
  
  return page;
}

/**
 * ネットワークアイドル状態まで待機
 */
export async function waitForNetworkIdle(page: Page, timeout = 30000): Promise<void> {
  try {
    await page.waitForNetworkIdle({ timeout, idleTime: 500 });
  } catch {
    // タイムアウトしても続行
  }
}

/**
 * 要素をクリック（セレクタ指定）
 */
export async function clickElement(page: Page, selector: string): Promise<void> {
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.click(selector);
}

/**
 * テキストを含む要素をクリック
 */
export async function clickByText(page: Page, text: string): Promise<void> {
  const escapedText = text.replace(/"/g, '\\"');
  await page.evaluate((searchText) => {
    const elements = Array.from(document.querySelectorAll("a, button, span, div, li"));
    const element = elements.find((el) => el.textContent?.includes(searchText));
    if (element) {
      (element as HTMLElement).click();
    } else {
      throw new Error(`Element with text "${searchText}" not found`);
    }
  }, escapedText);
}

/**
 * 指定ミリ秒待機
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type { Browser, Page };
