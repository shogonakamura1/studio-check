"use client";

export function BackToTopButton() {
  return (
    <button
      type="button"
      onClick={() => {
        const el = document.getElementById("search-controls");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}
      className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-full border border-border bg-card/90 backdrop-blur-sm text-foreground shadow-lg hover:border-accent transition-colors"
      title="検索条件へ戻る"
    >
      上部に戻る
    </button>
  );
}

