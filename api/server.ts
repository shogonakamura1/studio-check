/**
 * Render用スクレイピングAPIサーバー
 * 
 * Puppeteer/Playwrightを使用するスクレイピング処理を担当
 * - 福岡市民会館
 * - CREA
 */

import http from "http";
import { scrapeFukuokaCivicHall, type RoomAvailability } from "../src/lib/scrapers/fukuoka-civic-hall";
import { scrapeCrea, type CreaStudioAvailability } from "../src/lib/scrapers/crea";

const PORT = process.env.PORT || 3001;

// CORSヘッダーを設定
function setCorsHeaders(res: http.ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// JSONレスポンスを送信
function sendJson(res: http.ServerResponse, statusCode: number, data: unknown) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// 曜日を取得
function getDayOfWeek(dateStr: string): string {
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const date = new Date(dateStr);
  return days[date.getDay()];
}

// URLからクエリパラメータを取得
function getQueryParams(url: string): URLSearchParams {
  const queryString = url.split("?")[1] || "";
  return new URLSearchParams(queryString);
}

// 福岡市民会館のスクレイピング
async function handleCivicHall(
  res: http.ServerResponse,
  date: string
): Promise<void> {
  try {
    console.log(`[CivicHall] スクレイピング開始: ${date}`);
    const startTime = Date.now();
    
    const rooms: RoomAvailability[] = await scrapeFukuokaCivicHall(date);
    
    const duration = Date.now() - startTime;
    console.log(`[CivicHall] 完了: ${duration}ms`);

    sendJson(res, 200, {
      success: true,
      studioId: "fukuokacivichall",
      studioName: "福岡市民会館",
      date,
      dayOfWeek: getDayOfWeek(date),
      rooms,
    });
  } catch (error) {
    console.error("[CivicHall] エラー:", error);
    sendJson(res, 500, {
      success: false,
      error: error instanceof Error ? error.message : "スクレイピングに失敗しました",
    });
  }
}

// CREAのスクレイピング
async function handleCrea(
  res: http.ServerResponse,
  date: string
): Promise<void> {
  try {
    console.log(`[CREA] スクレイピング開始: ${date}`);
    const startTime = Date.now();
    
    const studios: CreaStudioAvailability[] = await scrapeCrea(date);
    
    const duration = Date.now() - startTime;
    console.log(`[CREA] 完了: ${duration}ms`);

    sendJson(res, 200, {
      success: true,
      studioId: "crea",
      studioName: "レンタルスタジオCREA",
      date,
      dayOfWeek: getDayOfWeek(date),
      studios,
    });
  } catch (error) {
    console.error("[CREA] エラー:", error);
    sendJson(res, 500, {
      success: false,
      error: error instanceof Error ? error.message : "スクレイピングに失敗しました",
    });
  }
}

// ヘルスチェック
function handleHealth(res: http.ServerResponse): void {
  sendJson(res, 200, {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "studio-check-scraper",
  });
}

// メインサーバー
const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  // OPTIONSリクエスト（CORS preflight）
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url || "/";
  const pathname = url.split("?")[0];
  const params = getQueryParams(url);

  console.log(`[${new Date().toISOString()}] ${req.method} ${url}`);

  try {
    // ヘルスチェック
    if (pathname === "/" || pathname === "/health") {
      handleHealth(res);
      return;
    }

    // 福岡市民会館
    if (pathname === "/api/scrape/civic-hall") {
      const date = params.get("date");
      if (!date) {
        sendJson(res, 400, { error: "date パラメータが必要です" });
        return;
      }
      await handleCivicHall(res, date);
      return;
    }

    // CREA
    if (pathname === "/api/scrape/crea") {
      const date = params.get("date");
      if (!date) {
        sendJson(res, 400, { error: "date パラメータが必要です" });
        return;
      }
      await handleCrea(res, date);
      return;
    }

    // 404
    sendJson(res, 404, { error: "Not Found" });
  } catch (error) {
    console.error("Server error:", error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Scraper API Server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   CivicHall: http://localhost:${PORT}/api/scrape/civic-hall?date=2026-01-20`);
  console.log(`   CREA: http://localhost:${PORT}/api/scrape/crea?date=2026-01-20`);
});
