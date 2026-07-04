import Link from "next/link";

/**
 * サブページ（/studios, /guide 等）用の共通ヘッダー。
 * ホームは h1 を含む HomeHeader を使う（h1はページごとに1つ）。
 */
export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-accent animate-pulse-glow" />
          <Link href="/" className="text-xl font-bold tracking-tight">
            STUDIO<span className="text-accent">_</span>CHECK
          </Link>
          <nav
            aria-label="サイト内ナビゲーション"
            className="ml-auto flex items-center gap-4 text-sm"
          >
            <Link
              href="/studios"
              className="text-muted hover:text-foreground transition-colors"
            >
              対応スタジオ
            </Link>
            <Link
              href="/guide"
              className="text-muted hover:text-foreground transition-colors"
            >
              使い方
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
