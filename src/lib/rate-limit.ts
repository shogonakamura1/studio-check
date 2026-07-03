/**
 * 簡易レート制限（インメモリ・スライディングウィンドウ）
 *
 * Vercel Serverless ではインスタンスごとにメモリが独立するため
 * 完全な制限にはならないが、単一インスタンスへのバースト
 * （= 外部サイトへの増幅リクエスト）を抑える最低限の防御として置く。
 * 厳密な制限が必要になったら Upstash Ratelimit 等の外部ストアに置き換える。
 */

const WINDOW_MS = 60_000;
const CLEANUP_THRESHOLD = 1_000;

const requestLog = new Map<string, number[]>();

/**
 * key（通常はクライアントIP）ごとに直近1分間のリクエスト数を数え、
 * 上限を超えていれば true を返す。超えていなければ記録して false を返す。
 */
export function isRateLimited(key: string, maxRequestsPerWindow: number): boolean {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const recent = (requestLog.get(key) ?? []).filter((t) => t > windowStart);
  if (recent.length >= maxRequestsPerWindow) {
    requestLog.set(key, recent);
    return true;
  }

  requestLog.set(key, [...recent, now]);
  cleanupIfNeeded(windowStart);
  return false;
}

function cleanupIfNeeded(windowStart: number): void {
  if (requestLog.size <= CLEANUP_THRESHOLD) return;
  for (const [key, timestamps] of requestLog) {
    if (timestamps.every((t) => t <= windowStart)) {
      requestLog.delete(key);
    }
  }
}

/** テスト用: 記録をすべて消去する */
export function resetRateLimit(): void {
  requestLog.clear();
}
