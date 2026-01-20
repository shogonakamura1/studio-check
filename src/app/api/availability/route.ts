/**
 * 空き状況APIエンドポイント
 * 
 * すべてのスクレイピングをVercel内で実行
 * - BUZZスタジオ: cheerioを使用してスクレイピング
 * - 福岡市民会館: POSTリクエスト + HTMLパース
 * - CREA: Coubic APIから直接取得
 */

import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import type { AvailabilityResponse, TimeSlot, StudioAvailability, CivicHallResponse, CreaResponse } from "@/types";
import { scrapeFukuokaCivicHall, type RoomAvailability } from "../../../../api/scrapers/fukuoka-civic-hall";
import { scrapeCrea, type CreaStudioAvailability, CREA_STUDIOS } from "../../../../api/scrapers/crea";

// スタジオ情報のマスターデータ
const STUDIO_DATA: Record<string, { name: string; url: string; studioCount: number; type?: string }> = {
  fukuokahonten: {
    name: "BUZZ福岡本店",
    url: "https://buzz-st.com/fukuokahonten",
    studioCount: 12,
  },
  fukuokatenjin: {
    name: "BUZZ福岡天神",
    url: "https://buzz-st.com/fukuokatenjin",
    studioCount: 6,
  },
  fukuokatenjin2nd: {
    name: "BUZZ福岡天神2nd",
    url: "https://buzz-st.com/fukuokatenjin2nd",
    studioCount: 4,
  },
  fukuokahakata: {
    name: "BUZZ福岡博多",
    url: "https://buzz-st.com/fukuokahakata",
    studioCount: 6,
  },
  fukuokahakataekimae: {
    name: "BUZZ福岡博多駅前",
    url: "https://buzz-st.com/fukuokahakataekimae",
    studioCount: 6,
  },
  // 市民会館（部屋単位）
  "civichall-rehearsal": {
    name: "福岡市民会館 リハーサル室",
    url: "https://k3.p-kashikan.jp/fukuoka-kyotenbunka/index.php",
    studioCount: 1,
    type: "civic-hall-room",
  },
  "civichall-practice1": {
    name: "福岡市民会館 練習室①",
    url: "https://k3.p-kashikan.jp/fukuoka-kyotenbunka/index.php",
    studioCount: 1,
    type: "civic-hall-room",
  },
  "civichall-practice3": {
    name: "福岡市民会館 練習室③",
    url: "https://k3.p-kashikan.jp/fukuoka-kyotenbunka/index.php",
    studioCount: 1,
    type: "civic-hall-room",
  },
  // CREA（スタジオ単位）
  "crea-daimyo": {
    name: "CREA大名",
    url: "https://coubic.com/rentalstudiocrea",
    studioCount: 1,
    type: "crea-studio",
  },
  "crea-plus": {
    name: "CREA+",
    url: "https://coubic.com/rentalstudiocrea",
    studioCount: 1,
    type: "crea-studio",
  },
  "crea-daimyo2": {
    name: "CREA大名Ⅱ",
    url: "https://coubic.com/rentalstudiocrea",
    studioCount: 1,
    type: "crea-studio",
  },
};

// 市民ホール部屋IDマッピング
const CIVIC_HALL_ROOM_MAP: Record<string, string> = {
  "civichall-rehearsal": "リハーサル室",
  "civichall-practice1": "練習室①",
  "civichall-practice3": "練習室③",
};

// 曜日を取得
function getDayOfWeek(dateStr: string): string {
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const date = new Date(dateStr);
  return days[date.getDay()];
}

// BUZZスタジオ用スクレイピング（Vercel内で実行）
async function scrapeBuzzAvailability(
  studioId: string,
  date: string
): Promise<AvailabilityResponse> {
  const studioInfo = STUDIO_DATA[studioId];

  if (!studioInfo) {
    return {
      studioId,
      studioName: "不明",
      date,
      dayOfWeek: getDayOfWeek(date),
      timeSlots: [],
      error: "スタジオが見つかりません",
    };
  }

  const url = `${studioInfo.url}/${date}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const timeSlots: TimeSlot[] = [];

    $("table tbody tr").each((_, row) => {
      const $row = $(row);
      const timeCell = $row.find("td:first-child").text().trim();

      if (timeCell && /^\d{2}:\d{2}$/.test(timeCell)) {
        const studios: StudioAvailability[] = [];

        $row.find("td").each((idx, cell) => {
          if (idx === 0) return;

          const $cell = $(cell);
          const button = $cell.find("button");
          const isAvailable = button.hasClass("reserve_modal_trigger");

          studios.push({
            studioNumber: idx,
            isAvailable,
          });
        });

        timeSlots.push({
          time: timeCell,
          studios,
        });
      }
    });

    return {
      studioId,
      studioName: studioInfo.name,
      date,
      dayOfWeek: getDayOfWeek(date),
      timeSlots,
    };
  } catch (error) {
    console.error(`Error scraping ${studioId}:`, error);
    return {
      studioId,
      studioName: studioInfo.name,
      date,
      dayOfWeek: getDayOfWeek(date),
      timeSlots: [],
      error: error instanceof Error ? error.message : "スクレイピングに失敗しました",
    };
  }
}

// 福岡市民会館用（部屋単位、直接スクレイピング）
async function scrapeCivicHallRoomAvailability(
  studioId: string,
  date: string
): Promise<CivicHallResponse> {
  const studioInfo = STUDIO_DATA[studioId];
  const targetRoomName = CIVIC_HALL_ROOM_MAP[studioId];

  try {
    console.log(`[CivicHall] スクレイピング開始: ${date}, room: ${targetRoomName}`);
    
    // スクレイパーを直接呼び出し
    const allRooms: RoomAvailability[] = await scrapeFukuokaCivicHall(date);
    
    // 対象の部屋のみフィルター
    const filteredRooms = allRooms.filter(room => 
      room.roomName.includes(targetRoomName)
    );

    return {
      studioId,
      studioName: studioInfo.name,
      date,
      dayOfWeek: getDayOfWeek(date),
      rooms: filteredRooms,
    };
  } catch (error) {
    console.error(`[CivicHall] エラー:`, error);
    return {
      studioId,
      studioName: studioInfo.name,
      date,
      dayOfWeek: getDayOfWeek(date),
      rooms: [],
      error: error instanceof Error ? error.message : "スクレイピングに失敗しました",
    };
  }
}

// CREA用（スタジオ単位、直接API呼び出し）
async function scrapeCreaStudioAvailability(
  studioId: string,
  date: string
): Promise<CreaResponse> {
  const studioInfo = STUDIO_DATA[studioId];

  try {
    console.log(`[CREA] スクレイピング開始: ${date}, studio: ${studioId}`);
    
    // スクレイパーを直接呼び出し（スタジオIDを指定）
    const allStudios: CreaStudioAvailability[] = await scrapeCrea(date, [studioId]);
    
    return {
      studioId,
      studioName: studioInfo.name,
      date,
      dayOfWeek: getDayOfWeek(date),
      studios: allStudios,
    };
  } catch (error) {
    console.error(`[CREA] エラー:`, error);
    return {
      studioId,
      studioName: studioInfo.name,
      date,
      dayOfWeek: getDayOfWeek(date),
      studios: [],
      error: error instanceof Error ? error.message : "スクレイピングに失敗しました",
    };
  }
}

// スクレイピング関数（タイプに応じて分岐）
async function scrapeAvailability(
  studioId: string,
  date: string
): Promise<AvailabilityResponse | CivicHallResponse | CreaResponse> {
  const studioInfo = STUDIO_DATA[studioId];

  if (!studioInfo) {
    return {
      studioId,
      studioName: "不明",
      date,
      dayOfWeek: getDayOfWeek(date),
      timeSlots: [],
      error: "スタジオが見つかりません",
    };
  }

  // 福岡市民会館（部屋単位）
  if (studioInfo.type === "civic-hall-room") {
    return scrapeCivicHallRoomAvailability(studioId, date);
  }

  // CREA（スタジオ単位）
  if (studioInfo.type === "crea-studio") {
    return scrapeCreaStudioAvailability(studioId, date);
  }

  // BUZZ系
  return scrapeBuzzAvailability(studioId, date);
}

// Vercel Serverless Functionsの設定
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// GET /api/availability?studios=fukuokahonten,crea-daimyo&date=2026-01-20
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const studiosParam = searchParams.get("studios");
  const date = searchParams.get("date");

  if (!studiosParam || !date) {
    return NextResponse.json(
      { error: "studios と date パラメータが必要です" },
      { status: 400 }
    );
  }

  const studioIds = studiosParam.split(",").filter(Boolean);

  if (studioIds.length === 0) {
    return NextResponse.json(
      { error: "少なくとも1つのスタジオを指定してください" },
      { status: 400 }
    );
  }

  try {
    // 並列でスクレイピング
    const results = await Promise.all(
      studioIds.map((studioId) => scrapeAvailability(studioId.trim(), date))
    );

    return NextResponse.json({
      date,
      dayOfWeek: getDayOfWeek(date),
      studios: results,
      availableStudios: Object.entries(STUDIO_DATA).map(([id, info]) => ({
        id,
        name: info.name,
        studioCount: info.studioCount,
      })),
    });
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'スクレイピングに失敗しました',
      },
      { status: 500 }
    );
  }
}
