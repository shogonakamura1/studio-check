/**
 * 外部サイトへの fetch 共通ラッパー（タイムアウト付き）
 *
 * タイムアウトなしの fetch は、外部サイト1つのハングで
 * Vercel Function の実行上限（60秒）まで巻き込まれ、
 * 他の正常なスタジオの結果まで失われるため必ずこれを使う。
 */

export const DEFAULT_FETCH_TIMEOUT_MS = 15_000;

export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error: unknown) {
    if (
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new Error(
        `外部サイトの応答が${Math.round(timeoutMs / 1000)}秒以内に返りませんでした`,
      );
    }
    throw error;
  }
}
