import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Instabase 予約ドラフト作成（POST）用の中継ページ。
 *
 * 目的:
 * - 当アプリ（localhost 等）から Instabase へ直接クロスオリジンPOSTすると、
 *   ブラウザの制限や Instabase 側の防御（WAF等）で弾かれてエラーになることがある。
 * - そこで、まず当アプリのページ（同一オリジン）を新規タブで開き、
 *   そのページ内で Instabase の `/rooms/:room_uid/orders` にフォームPOSTして遷移させる。
 *
 * 受け取るクエリ:
 * - 例: /instabase/orders?order[room_uid]=...&order[bookings_attributes][0][start_at]=...&...
 *
 * セキュリティ:
 * - 転送するキーは許可リストに限定し、値の形式も検証する
 *   （任意のフィールドをInstabaseのフォームへ注入させない）
 * - frame-ancestors 'none' / X-Frame-Options: DENY を返し、
 *   第三者サイトの隠しiframeからの自動送信（CSRF踏み台化）を防ぐ
 */

/** 転送を許可するクエリキーと値の検証ルール */
const ALLOWED_PARAMS: Record<string, RegExp> = {
  "order[room_uid]": /^[0-9]+$/,
  // "YYYY-MM-DD HH:MM"
  "order[bookings_attributes][0][start_at]": /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
  "order[bookings_attributes][0][end_at]": /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
  "order[bookings_attributes][0][plan_id]": /^[0-9]+$/,
  "order[num_of_people]": /^[0-9]{1,3}$/,
};

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = url.searchParams;

  const roomUid = params.get("order[room_uid]");
  if (!roomUid || !/^[0-9]+$/.test(roomUid)) {
    return NextResponse.json(
      { error: "order[room_uid] が不正です" },
      { status: 400 },
    );
  }

  // 許可リストにあるキーのみ、形式検証を通った値だけを転送する
  const forwardedParams: Array<[string, string]> = [];
  for (const [name, pattern] of Object.entries(ALLOWED_PARAMS)) {
    const value = params.get(name);
    if (value === null) continue;
    if (!pattern.test(value)) {
      return NextResponse.json(
        { error: `${name} の形式が不正です` },
        { status: 400 },
      );
    }
    forwardedParams.push([name, value]);
  }

  const action = `https://www.instabase.jp/rooms/${roomUid}/orders`;

  // フォームPOSTが弾かれた場合のフォールバック（カレンダーへ誘導）
  const startAt = params.get("order[bookings_attributes][0][start_at]"); // "YYYY-MM-DD HH:MM"
  const fallback = (() => {
    if (!startAt) return null;
    const m = startAt.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})$/);
    if (!m) return null;
    const date = m[1];
    const hh = Number(m[2]);
    const mm = Number(m[3]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    const from = Math.floor((hh * 60 + mm) / 30);
    const to = Math.min(from + 2, 47);
    const q = new URLSearchParams({
      planType: "hourly",
      date,
      from: String(from),
      to: String(to),
    });
    return `https://www.instabase.jp/space/${roomUid}/cal?${q.toString()}#bookingInfo`;
  })();

  // hidden inputs を構築（許可リスト通過分のみ）
  const inputsHtml = forwardedParams
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`,
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="referrer" content="no-referrer" />
    <title>Instabaseへ移動中...</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; }
      .muted { color: #666; font-size: 14px; }
      .btn { display: inline-block; padding: 10px 14px; border-radius: 8px; background: #111; color: #fff; text-decoration: none; border: 0; cursor: pointer; }
      .box { max-width: 720px; margin: 0 auto; }
      code { background: #f3f3f3; padding: 2px 6px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div class="box">
      <h1 style="font-size:18px; margin: 0 0 8px;">Instabaseへ移動中...</h1>
      <p class="muted" style="margin: 0 0 16px;">
        自動で予約ページへ遷移します。遷移しない場合は下のボタンを押してください。
      </p>
      <form id="f" method="POST" action="${action}" referrerpolicy="no-referrer" accept-charset="UTF-8" target="_self">
        ${inputsHtml}
        <button class="btn" type="submit">Instabaseへ進む</button>
      </form>
      ${
        fallback
          ? `<p class="muted" style="margin-top: 12px;">
               うまく遷移できない場合は、こちらからカレンダーを開いて時間を選択してください：
               <a href="${fallback}" target="_self" rel="noreferrer">カレンダーを開く</a>
             </p>`
          : ""
      }
      <p class="muted" style="margin-top: 12px;">
        送信先: <code>${action}</code>
      </p>
    </div>
    <script>
      (function () {
        try {
          document.getElementById('f').submit();
        } catch (e) {
          // ボタンで手動送信
        }
      })();
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      // 第三者サイトのiframeに埋め込んでの自動POST（CSRF踏み台化）を防ぐ
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "frame-ancestors 'none'",
      "Cache-Control": "no-store",
    },
  });
}
