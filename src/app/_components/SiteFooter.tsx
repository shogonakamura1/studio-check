import Link from "next/link";
import { STUDIO_CATEGORIES } from "@/lib/studio-content";
import { STUDIO_DATA } from "@/lib/studios";

/**
 * 全ページ共通のフッター。スタジオ別ページへの内部リンクを持つ。
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <nav
          aria-label="対応スタジオ"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8"
        >
          {STUDIO_CATEGORIES.map(({ category, ids }) => (
            <div key={category}>
              <p className="text-sm font-semibold text-muted mb-3">
                {category}
              </p>
              <ul className="space-y-2">
                {ids.map((id) => (
                  <li key={id}>
                    <Link
                      href={`/studios/${id}`}
                      className="text-sm text-muted hover:text-foreground transition-colors"
                    >
                      {STUDIO_DATA[id]?.name ?? id}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-4 border-t border-border pt-6 text-sm text-muted">
          <Link href="/" className="hover:text-foreground transition-colors">
            空き状況を検索
          </Link>
          <Link
            href="/studios"
            className="hover:text-foreground transition-colors"
          >
            対応スタジオ一覧
          </Link>
          <Link
            href="/guide"
            className="hover:text-foreground transition-colors"
          >
            使い方・FAQ
          </Link>
          <span className="ml-auto">
            STUDIO_CHECK - 福岡のスタジオ空き状況チェッカー
          </span>
        </div>
      </div>
    </footer>
  );
}
