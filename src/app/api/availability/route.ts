/**
 * 空き状況APIエンドポイント
 * 
 * - BUZZスタジオ: Vercel内でcheerioを使用してスクレイピング
 * - 福岡市民会館/CREA: Render APIに委譲（Playwright使用）
 */

import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import type { AvailabilityResponse, TimeSlot, StudioAvailability, CivicHallResponse, CreaResponse } from "@/types";

// Render APIのベースURL（環境変数で設定）
const RENDER_API_URL = process.env.RENDER_API_URL || "https://studio-check-api.onrender.com";

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
  fukuokacivichall: {
    name: "福岡市民会館",
    url: "https://k3.p-kashikan.jp/fukuoka-kyotenbunka/index.php",
    studioCount: 3,
    type: "civic-hall",
  },
  crea: {
    name: "レンタルスタジオCREA",
    url: "https://coubic.com/rentalstudiocrea",
    studioCount: 4,
    type: "crea",
  },
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

// 福岡市民会館用（Render APIに委譲）
async function scrapeCivicHallAvailability(
  studioId: string,
  date: string
): Promise<CivicHallResponse> {
  const studioInfo = STUDIO_DATA[studioId];

  try {
    console.log(`[CivicHall] Render APIにリクエスト: ${RENDER_API_URL}/api/scrape/civic-hall?date=${date}`);
    
    const response = await fetch(`${RENDER_API_URL}/api/scrape/civic-hall?date=${date}`, {
      headers: {
        "Content-Type": "application/json",
      },
      // Render無料プランはスリープするため、長めのタイムアウト
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || "Render APIからエラーが返されました");
    }

    return {
      studioId,
      studioName: studioInfo.name,
      date,
      dayOfWeek: getDayOfWeek(date),
      rooms: data.rooms || [],
    };
  } catch (error) {
    console.error(`Error fetching civic-hall from Render:`, error);
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

// CREA用（Render APIに委譲）
async function scrapeCreaAvailability(
  studioId: string,
  date: string
): Promise<CreaResponse> {
  const studioInfo = STUDIO_DATA[studioId];

  try {
    console.log(`[CREA] Render APIにリクエスト: ${RENDER_API_URL}/api/scrape/crea?date=${date}`);
    
    const response = await fetch(`${RENDER_API_URL}/api/scrape/crea?date=${date}`, {
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || "Render APIからエラーが返されました");
    }

    return {
      studioId,
      studioName: studioInfo.name,
      date,
      dayOfWeek: getDayOfWeek(date),
      studios: data.studios || [],
    };
  } catch (error) {
    console.error(`Error fetching crea from Render:`, error);
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

  // 福岡市民会館 → Render API
  if (studioInfo.type === "civic-hall") {
    return scrapeCivicHallAvailability(studioId, date);
  }

  // CREA → Render API
  if (studioInfo.type === "crea") {
    return scrapeCreaAvailability(studioId, date);
  }

  // BUZZ系 → Vercel内で実行
  return scrapeBuzzAvailability(studioId, date);
}

// Vercel Serverless Functionsの設定
export const maxDuration = 120; // 長めに設定（Render APIの応答待ち）
export const dynamic = 'force-dynamic';

// GET /api/availability?studios=fukuokahonten,fukuokatenjin&date=2026-01-20
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
