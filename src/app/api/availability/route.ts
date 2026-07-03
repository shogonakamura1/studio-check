/**
 * 空き状況APIエンドポイント
 *
 * すべてのスクレイピングをVercel内で実行
 * - BUZZスタジオ: src/lib/scrapers/buzz.ts（cheerio）
 * - 福岡市民会館: src/lib/scrapers/fukuoka-civic-hall.ts（POST + HTMLパース）
 * - CREA: src/lib/scrapers/crea.ts（Coubic API）
 * - Instabase: src/lib/scrapers/instabase.ts（monthly_cal API）
 *
 * 同一日付の市民会館・CREAは1回の取得結果を部屋/スタジオ間で共有する
 * （重複した外部リクエストを発生させない）。
 */

import { NextRequest, NextResponse } from "next/server";
import type {
  AvailabilityResponse,
  CivicHallResponse,
  CreaResponse,
  CreaStudioAvailability,
  RoomAvailability,
} from "@/types";
import { scrapeFukuokaCivicHall } from "@/lib/scrapers/fukuoka-civic-hall";
import { scrapeCrea } from "@/lib/scrapers/crea";
import { scrapeInstabaseSpaceDayTimeSlots } from "@/lib/scrapers/instabase";
import {
  scrapeBuzzAvailability,
  scrapeBuzzWithLateNight,
} from "@/lib/scrapers/buzz";
import { LATE_NIGHT_RANGES, STUDIO_DATA, isKnownStudioId } from "@/lib/studios";
import { getDayOfWeekLabel } from "@/lib/date-jst";
import { isRateLimited } from "@/lib/rate-limit";

// Vercel Serverless Functionsの設定
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_DATES = 7;
// 1リクエストで最大 スタジオ数×7日分 の外部取得が走るため、IPごとに抑える
const MAX_REQUESTS_PER_MINUTE = 20;

type StudioResult = AvailabilityResponse | CivicHallResponse | CreaResponse;

/**
 * 同一リクエスト内で共有するスクレイプ結果のキャッシュ。
 * 市民会館は1回のスクレイプで全部屋分、CREAは1回のAPIで全スタジオ分が
 * 取れるため、日付ごとに1回だけ取得して振り分ける。
 */
type ScrapeContext = {
  getCivicHallRooms: (date: string) => Promise<RoomAvailability[]>;
  getCreaStudios: (date: string) => Promise<CreaStudioAvailability[]>;
};

function createScrapeContext(): ScrapeContext {
  const civicHallCache = new Map<string, Promise<RoomAvailability[]>>();
  const creaCache = new Map<string, Promise<CreaStudioAvailability[]>>();

  return {
    getCivicHallRooms(date: string) {
      let promise = civicHallCache.get(date);
      if (!promise) {
        promise = scrapeFukuokaCivicHall(date);
        civicHallCache.set(date, promise);
      }
      return promise;
    },
    getCreaStudios(date: string) {
      let promise = creaCache.get(date);
      if (!promise) {
        promise = scrapeCrea(date);
        creaCache.set(date, promise);
      }
      return promise;
    },
  };
}

// 福岡市民会館用（部屋単位）
async function scrapeCivicHallRoomAvailability(
  studioId: string,
  date: string,
  ctx: ScrapeContext,
): Promise<CivicHallResponse> {
  const studioInfo = STUDIO_DATA[studioId];
  const targetRoomName = studioInfo.civicHallRoomName;

  const baseResponse = {
    studioId,
    studioName: studioInfo.name,
    date,
    dayOfWeek: getDayOfWeekLabel(date),
  };

  if (!targetRoomName) {
    return {
      ...baseResponse,
      rooms: [],
      error: "civicHallRoomName が設定されていません",
    };
  }

  try {
    const allRooms = await ctx.getCivicHallRooms(date);
    const filteredRooms = allRooms.filter((room) =>
      room.roomName.includes(targetRoomName),
    );
    return { ...baseResponse, rooms: filteredRooms };
  } catch (error) {
    console.error(`[CivicHall] エラー (${studioId}, ${date}):`, error);
    return {
      ...baseResponse,
      rooms: [],
      error:
        error instanceof Error ? error.message : "スクレイピングに失敗しました",
    };
  }
}

// CREA用（スタジオ単位）
async function scrapeCreaStudioAvailability(
  studioId: string,
  date: string,
  ctx: ScrapeContext,
): Promise<CreaResponse> {
  const studioInfo = STUDIO_DATA[studioId];

  const baseResponse = {
    studioId,
    studioName: studioInfo.name,
    date,
    dayOfWeek: getDayOfWeekLabel(date),
  };

  try {
    const allStudios = await ctx.getCreaStudios(date);
    const matched = allStudios.filter((s) => s.studioId === studioId);
    return { ...baseResponse, studios: matched };
  } catch (error) {
    console.error(`[CREA] エラー (${studioId}, ${date}):`, error);
    return {
      ...baseResponse,
      studios: [],
      error:
        error instanceof Error ? error.message : "スクレイピングに失敗しました",
    };
  }
}

// Instabase用（スペース単位、JSON API呼び出し）
async function scrapeInstabaseSpaceAvailability(
  studioId: string,
  date: string,
): Promise<AvailabilityResponse> {
  const studioInfo = STUDIO_DATA[studioId];
  const spaceId = studioInfo.instabaseSpaceId;

  const baseResponse = {
    studioId,
    studioName: studioInfo.name,
    date,
    dayOfWeek: getDayOfWeekLabel(date),
  };

  if (!spaceId) {
    return {
      ...baseResponse,
      timeSlots: [],
      error: "Instabase spaceId が設定されていません",
    };
  }

  try {
    const timeSlots = await scrapeInstabaseSpaceDayTimeSlots({
      spaceId,
      targetDate: date,
    });
    return { ...baseResponse, timeSlots };
  } catch (error) {
    console.error(`[Instabase] エラー (${studioId}, ${date}):`, error);
    return {
      ...baseResponse,
      timeSlots: [],
      error:
        error instanceof Error ? error.message : "スクレイピングに失敗しました",
    };
  }
}

// スクレイピング関数（タイプに応じて分岐）
async function scrapeAvailability(
  studioId: string,
  date: string,
  includeLateNight: boolean,
  ctx: ScrapeContext,
): Promise<StudioResult> {
  const studioInfo = STUDIO_DATA[studioId];

  switch (studioInfo.type) {
    case "civic-hall-room":
      return scrapeCivicHallRoomAvailability(studioId, date, ctx);
    case "crea-studio":
      return scrapeCreaStudioAvailability(studioId, date, ctx);
    case "instabase-space":
      return scrapeInstabaseSpaceAvailability(studioId, date);
    case "buzz":
      return includeLateNight
        ? scrapeBuzzWithLateNight(studioId, date)
        : scrapeBuzzAvailability(studioId, date);
  }
}

function isValidDateString(dateStr: string): boolean {
  // YYYY-MM-DD のみ許可（toISOStringのslice(0,10)互換）
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateStr;
}

function getClientIp(request: NextRequest): string {
  // x-forwarded-for の先頭値はクライアントが自由に付与でき、
  // 毎回変えるとレート制限のバケットを増殖させて回避できてしまう。
  // Vercel が上書きして設定する x-real-ip を優先する
  // （クライアントが送っても Vercel 側で実IPに置き換わる）。
  // ローカル開発など x-real-ip が無い場合のみ x-forwarded-for にフォールバックする。
  // 注: インメモリ＋ヘッダ由来のキーは best-effort。厳密な保証には
  // 共有ストア（Upstash 等）＋信頼できるIPが必要。
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

// GET /api/availability?studios=fukuokahonten,crea-daimyo&date=2026-01-20
// GET /api/availability?studios=fukuokahonten,crea-daimyo&dates=2026-01-20,2026-01-21
// レスポンスは日付数によらず常に { dates: [...], availableStudios: [...] } 形式
export async function GET(request: NextRequest) {
  if (isRateLimited(getClientIp(request), MAX_REQUESTS_PER_MINUTE)) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらく待ってから再試行してください" },
      { status: 429 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const studiosParam = searchParams.get("studios");
  const date = searchParams.get("date");
  const datesParam = searchParams.get("dates");
  const includeLateNight = searchParams.get("include-late-night") === "1";

  if (!studiosParam || (!date && !datesParam)) {
    return NextResponse.json(
      { error: "studios と date（または dates）パラメータが必要です" },
      { status: 400 },
    );
  }

  // 重複を除去し、既知のスタジオIDのみ許可する
  // （無制限に受け付けると外部サイトへのリクエスト増幅に悪用できるため）
  const studioIds = Array.from(
    new Set(
      studiosParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );

  if (studioIds.length === 0) {
    return NextResponse.json(
      { error: "少なくとも1つのスタジオを指定してください" },
      { status: 400 },
    );
  }

  const unknownStudioIds = studioIds.filter((id) => !isKnownStudioId(id));
  if (unknownStudioIds.length > 0) {
    return NextResponse.json(
      { error: `不明なスタジオIDです: ${unknownStudioIds.join(", ")}` },
      { status: 400 },
    );
  }

  let dates: string[] = [];
  if (datesParam) {
    dates = Array.from(
      new Set(
        datesParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    );
  } else if (date) {
    dates = [date.trim()];
  }

  const invalid = dates.filter((d) => !isValidDateString(d));
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: `日付形式が不正です: ${invalid.join(", ")}` },
      { status: 400 },
    );
  }
  if (dates.length === 0) {
    return NextResponse.json(
      { error: "少なくとも1つの日付を指定してください" },
      { status: 400 },
    );
  }
  if (dates.length > MAX_DATES) {
    return NextResponse.json(
      { error: `日付は最大${MAX_DATES}件まで指定できます` },
      { status: 400 },
    );
  }

  try {
    const availableStudios = Object.entries(STUDIO_DATA).map(([id, info]) => ({
      id,
      name: info.name,
      studioCount: info.studioCount,
      lateNight: LATE_NIGHT_RANGES[id],
      url: info.url,
      type: info.type,
      buzzStudioIds: info.buzzStudioIds,
    }));

    const ctx = createScrapeContext();

    // 複数日付は「日付ごとに」スタジオを並列、日付自体は直列（過負荷回避）
    const perDateResults: Array<{
      date: string;
      dayOfWeek: string;
      studios: StudioResult[];
    }> = [];

    for (const d of dates) {
      const studios = await Promise.all(
        studioIds.map((studioId) =>
          scrapeAvailability(studioId, d, includeLateNight, ctx),
        ),
      );
      perDateResults.push({
        date: d,
        dayOfWeek: getDayOfWeekLabel(d),
        studios,
      });
    }

    return NextResponse.json({
      dates: perDateResults,
      availableStudios,
    });
  } catch (error) {
    console.error("Scraping error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "スクレイピングに失敗しました",
      },
      { status: 500 },
    );
  }
}
