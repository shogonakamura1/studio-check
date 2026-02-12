"use client";

export function ResultsLegend() {
  return (
    <>
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-accent" />
          <span className="text-muted">空き</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-danger/60" />
          <span className="text-muted">予約済み</span>
        </div>
      </div>
      <div className="mt-2 text-sm text-danger">
        <li>○ボタンを押すと直接予約ページに飛びます。</li>
        <li>各スタジオや部屋の名前を押すと、その詳細ページに移動します。</li>
      </div>
    </>
  );
}

