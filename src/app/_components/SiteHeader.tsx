import Link from "next/link";

/**
 * 全ページ共通のヘッダー。
 * h1 は各ページの <main> 内に置く（h1はページごとに1つ）。
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
