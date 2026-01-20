/**
 * Render用スクレイピングAPIサーバー
 * 
 * Playwrightを使用するスクレイピング処理を担当
 * - 福岡市民会館（部屋単位で指定可能）
 * - CREA（スタジオ単位で指定可能）
 */

import http from "http";
import { scrapeFukuokaCivicHall, type RoomAvailability } from "./scrapers/fukuoka-civic-hall";
import { scrapeCrea, type CreaStudioAvailability, CREA_STUDIOS } from "./scrapers/crea";

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

// 福岡市民会館のスクレイピング（部屋フィルター対応）
async function handleCivicHall(
  res: http.ServerResponse,
  date: string,
  roomIds?: string[]
): Promise<void> {
  try {
    console.log(`[CivicHall] スクレイピング開始: ${date}, rooms: ${roomIds?.join(",") || "all"}`);
    const startTime = Date.now();
    
    let rooms: RoomAvailability[] = await scrapeFukuokaCivicHall(date);
    
    // 部屋をフィルター
    if (roomIds && roomIds.length > 0) {
      const roomNameMap: Record<string, string> = {
        "rehearsal": "リハーサル室",
        "practice1": "練習室①",
        "practice3": "練習室③",
      };
      const targetRoomNames = roomIds.map(id => roomNameMap[id]).filter(Boolean);
      rooms = rooms.filter(room => 
        targetRoomNames.some(name => room.roomName.includes(name))
      );
    }
    
    const duration = Date.now() - startTime;
    console.log(`[CivicHall] 完了: ${duration}ms, ${rooms.length}部屋`);

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

// CREAのスクレイピング（スタジオ単位で指定可能）
async function handleCrea(
  res: http.ServerResponse,
  date: string,
  studioIds?: string[]
): Promise<void> {
  try {
    // 有効なスタジオIDのみフィルター
    const validStudioIds = studioIds?.filter(id => id in CREA_STUDIOS);
    
    console.log(`[CREA] スクレイピング開始: ${date}, studios: ${validStudioIds?.join(",") || "all"}`);
    const startTime = Date.now();
    
    const studios: CreaStudioAvailability[] = await scrapeCrea(
      date, 
      validStudioIds && validStudioIds.length > 0 ? validStudioIds : undefined
    );
    
    const duration = Date.now() - startTime;
    console.log(`[CREA] 完了: ${duration}ms, ${studios.length}スタジオ`);

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
    availableCreaStudios: Object.keys(CREA_STUDIOS),
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
    // ?date=2026-01-20&rooms=rehearsal,practice1,practice3
    if (pathname === "/api/scrape/civic-hall") {
      const date = params.get("date");
      if (!date) {
        sendJson(res, 400, { error: "date パラメータが必要です" });
        return;
      }
      const roomsParam = params.get("rooms");
      const roomIds = roomsParam ? roomsParam.split(",").filter(Boolean) : undefined;
      await handleCivicHall(res, date, roomIds);
      return;
    }

    // CREA
    // ?date=2026-01-20&studios=crea-daimyo,crea-plus,crea-daimyo2
    if (pathname === "/api/scrape/crea") {
      const date = params.get("date");
      if (!date) {
        sendJson(res, 400, { error: "date パラメータが必要です" });
        return;
      }
      const studiosParam = params.get("studios");
      const studioIds = studiosParam ? studiosParam.split(",").filter(Boolean) : undefined;
      await handleCrea(res, date, studioIds);
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
  console.log(`   CivicHall: http://localhost:${PORT}/api/scrape/civic-hall?date=2026-01-20&rooms=rehearsal,practice1`);
  console.log(`   CREA: http://localhost:${PORT}/api/scrape/crea?date=2026-01-20&studios=crea-daimyo,crea-plus`);
  console.log(`   Available CREA studios: ${Object.keys(CREA_STUDIOS).join(", ")}`);
});
