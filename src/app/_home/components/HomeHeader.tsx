"use client";

export function HomeHeader() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-accent animate-pulse-glow" />
          <h1 className="text-xl font-bold tracking-tight">
            STUDIO<span className="text-accent">_</span>CHECK
          </h1>
          <span className="text-muted text-sm ml-auto">
            スタジオ空き状況チェッカー
          </span>
        </div>
      </div>
    </header>
  );
}

