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
import { scrapeFukuokaCivicHall, type RoomAvailability } from "@/lib/scrapers/fukuoka-civic-hall";
import { scrapeCrea, type CreaStudioAvailability } from "@/lib/scrapers/crea";

type LateNightRange = { start: string; end: string };

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
  fukuokahakata: {
    name: "BUZZ福岡博多",
    url: "https://buzz-st.com/fukuokahakata",
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

/**
 * 深夜練の時間帯（スタジオ別）
 *
 * - DB等には保持せず、スクレイピング実装と同じ責務（このファイル/各スクレイパー）で定義する
 * - ここではまずBUZZ系のみ暫定対応（必要に応じてスタジオ別に調整）
 */
const LATE_NIGHT_RANGES: Record<string, LateNightRange | undefined> = {
  // BUZZ系（例: 23:30開始）
  fukuokahonten: { start: "23:30", end: "06:00" },
  fukuokatenjin: { start: "23:30", end: "06:00" },
  fukuokahakata: { start: "23:30", end: "06:00" },
  // civic hall / CREA は深夜練対象外（必要なら追加）
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

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function mergeBuzzWithNextDayEarlyMorning(
  base: AvailabilityResponse,
  nextDay: AvailabilityResponse
): AvailabilityResponse {
  const baseMap = new Map(base.timeSlots.map((ts) => [ts.time, ts]));
  for (const ts of nextDay.timeSlots) {
    const minutes = timeToMinutes(ts.time);
    if (minutes >= 6 * 60) continue; // 06:00以降は翌日の通常枠なので除外
    if (!baseMap.has(ts.time)) {
      baseMap.set(ts.time, ts);
    }
  }

  const merged = Array.from(baseMap.values());
  merged.sort((a, b) => {
    const am = timeToMinutes(a.time);
    const bm = timeToMinutes(b.time);
    const ak = am < 6 * 60 ? am + 24 * 60 : am;
    const bk = bm < 6 * 60 ? bm + 24 * 60 : bm;
    return ak - bk;
  });

  return { ...base, timeSlots: merged };
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
  date: string,
  includeLateNight: boolean
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
  if (!includeLateNight) {
    return scrapeBuzzAvailability(studioId, date);
  }

  // 深夜練のため、翌日早朝（00:00〜05:30）を前日分に合成する
  const base = await scrapeBuzzAvailability(studioId, date);
  const nextDate = addDays(date, 1);
  const next = await scrapeBuzzAvailability(studioId, nextDate);
  return mergeBuzzWithNextDayEarlyMorning(base, next);
}

// Vercel Serverless Functionsの設定
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX_DATES = 7;

function isValidDateString(dateStr: string): boolean {
  // YYYY-MM-DD のみ許可（toISOStringのslice(0,10)互換）
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateStr;
}

// GET /api/availability?studios=fukuokahonten,crea-daimyo&date=2026-01-20
// GET /api/availability?studios=fukuokahonten,crea-daimyo&dates=2026-01-20,2026-01-21
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const studiosParam = searchParams.get("studios");
  const date = searchParams.get("date");
  const datesParam = searchParams.get("dates");
  const includeLateNight = searchParams.get("include-late-night") === "1";

  if (!studiosParam || (!date && !datesParam)) {
    return NextResponse.json(
      { error: "studios と date（または dates）パラメータが必要です" },
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

  let dates: string[] = [];
  if (datesParam) {
    dates = Array.from(
      new Set(
        datesParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
  } else if (date) {
    dates = [date.trim()];
  }

  const invalid = dates.filter((d) => !isValidDateString(d));
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: `日付形式が不正です: ${invalid.join(", ")}` },
      { status: 400 }
    );
  }
  if (dates.length === 0) {
    return NextResponse.json(
      { error: "少なくとも1つの日付を指定してください" },
      { status: 400 }
    );
  }
  if (dates.length > MAX_DATES) {
    return NextResponse.json(
      { error: `日付は最大${MAX_DATES}件まで指定できます` },
      { status: 400 }
    );
  }

  try {
    const availableStudios = Object.entries(STUDIO_DATA).map(([id, info]) => ({
      id,
      name: info.name,
      studioCount: info.studioCount,
      lateNight: LATE_NIGHT_RANGES[id],
    }));

    // 複数日付は「日付ごとに」スタジオを並列、日付自体は直列（過負荷回避）
    const perDateResults: Array<{
      date: string;
      dayOfWeek: string;
      studios: Array<AvailabilityResponse | CivicHallResponse | CreaResponse>;
    }> = [];

    for (const d of dates) {
      const studios = await Promise.all(
        studioIds.map((studioId) =>
          scrapeAvailability(studioId.trim(), d, includeLateNight)
        )
      );
      perDateResults.push({
        date: d,
        dayOfWeek: getDayOfWeek(d),
        studios,
      });
    }

    // 後方互換: 日付が1つなら従来形も返す（UI側が古い場合でも動く）
    if (perDateResults.length === 1) {
      const only = perDateResults[0]!;
      return NextResponse.json({
        date: only.date,
        dayOfWeek: only.dayOfWeek,
        studios: only.studios,
        availableStudios,
      });
    }

    return NextResponse.json({
      dates: perDateResults,
      availableStudios,
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
