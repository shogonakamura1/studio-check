import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import type { AvailabilityResponse, TimeSlot, StudioAvailability, CivicHallResponse, CreaResponse } from "@/types";
import { scrapeFukuokaCivicHall } from "@/lib/scrapers/fukuoka-civic-hall";
import { scrapeCrea, CREA_STUDIOS } from "@/lib/scrapers/crea";

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
    studioCount: 3, // リハーサル室、練習室①、練習室③
    type: "civic-hall",
  },
  // CREAスタジオ
  crea: {
    name: "レンタルスタジオCREA",
    url: "https://coubic.com/rentalstudiocrea",
    studioCount: 4, // CREA大名、CREA+、CREA大名Ⅱ、CREA music
    type: "crea",
  },
};

// 曜日を取得するヘルパー関数
function getDayOfWeek(dateStr: string): string {
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const date = new Date(dateStr);
  return days[date.getDay()];
}

// BUZZスタジオ用スクレイピング関数
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

    // テーブルの各行を処理
    $("table tbody tr").each((_, row) => {
      const $row = $(row);
      const timeCell = $row.find("td:first-child").text().trim();

      // 時間が含まれている行のみ処理
      if (timeCell && /^\d{2}:\d{2}$/.test(timeCell)) {
        const studios: StudioAvailability[] = [];

        // 各スタジオのセルを処理（最初のセルは時間なのでスキップ）
        $row.find("td").each((idx, cell) => {
          if (idx === 0) return; // 時間セルをスキップ

          const $cell = $(cell);
          const button = $cell.find("button");

          // ボタンのクラス名で空き状況を判定
          // reserve_modal_trigger = 空き
          // studio_reserve_time_table_close = 予約済み
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

// 福岡市民会館用スクレイピング関数
async function scrapeCivicHallAvailability(
  studioId: string,
  date: string
): Promise<CivicHallResponse> {
  const studioInfo = STUDIO_DATA[studioId];

  try {
    const rooms = await scrapeFukuokaCivicHall(date);

    return {
      studioId,
      studioName: studioInfo.name,
      date,
      dayOfWeek: getDayOfWeek(date),
      rooms,
    };
  } catch (error) {
    console.error(`Error scraping ${studioId}:`, error);
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

// CREA用スクレイピング関数
async function scrapeCreaAvailability(
  studioId: string,
  date: string
): Promise<CreaResponse> {
  const studioInfo = STUDIO_DATA[studioId];

  try {
    const studios = await scrapeCrea(date);

    return {
      studioId,
      studioName: studioInfo.name,
      date,
      dayOfWeek: getDayOfWeek(date),
      studios,
    };
  } catch (error) {
    console.error(`Error scraping ${studioId}:`, error);
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

  if (studioInfo.type === "civic-hall") {
    return scrapeCivicHallAvailability(studioId, date);
  }

  if (studioInfo.type === "crea") {
    return scrapeCreaAvailability(studioId, date);
  }

  return scrapeBuzzAvailability(studioId, date);
}

// Vercel Serverless Functionsのタイムアウト設定
export const maxDuration = 60; // Pro plan: 60s, Hobby: 10s
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

  // CREAが含まれている場合の警告（Playwright使用で時間がかかる）
  const hasCrea = studioIds.some(id => id.trim() === 'crea');
  if (hasCrea && studioIds.length > 2) {
    console.warn('⚠️ CREAを含む複数スタジオのリクエスト: タイムアウトの可能性あり');
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
        hint: 'Vercel Hobbyプランの場合、タイムアウト制限（10秒）により失敗する可能性があります。Proプランをご検討ください。'
      },
      { status: 500 }
    );
  }
}
