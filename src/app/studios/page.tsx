import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/app/_components/JsonLd";
import { SiteFooter } from "@/app/_components/SiteFooter";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import {
  STUDIO_CATEGORIES,
  STUDIO_PAGE_CONTENT,
} from "@/lib/studio-content";
import { STUDIO_DATA } from "@/lib/studios";

const TITLE = "福岡の対応スタジオ一覧";
const DESCRIPTION =
  "Studio Checkで空き状況を一括検索できる福岡のレンタルスタジオ一覧。BUZZ福岡本店・天神・博多、福岡市民会館（リハーサル室・練習室）、CREA大名・CREA+・CREA大名Ⅱ、スタジオin and out（Instabase）に対応しています。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/studios" },
  openGraph: {
    title: `${TITLE}｜${SITE_NAME}`,
    description: DESCRIPTION,
    url: "/studios",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "ホーム", item: SITE_URL },
    {
      "@type": "ListItem",
      position: 2,
      name: "対応スタジオ",
      item: `${SITE_URL}/studios`,
    },
  ],
};

export default function StudiosPage() {
  return (
    <div className="min-h-screen bg-background grid-pattern flex flex-col">
      <SiteHeader />

      <main className="max-w-5xl mx-auto px-4 py-8 w-full flex-1">
        <nav aria-label="パンくず" className="text-xs text-muted mb-6">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:text-foreground">
                ホーム
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">対応スタジオ</li>
          </ol>
        </nav>

        <h1 className="text-2xl font-bold mb-4">{TITLE}</h1>
        <p className="text-muted leading-relaxed mb-10">{DESCRIPTION}</p>

        <div className="space-y-10">
          {STUDIO_CATEGORIES.map(({ category, ids }) => (
            <section key={category}>
              <h2 className="text-lg font-bold mb-4">{category}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ids.map((id) => {
                  const content = STUDIO_PAGE_CONTENT[id];
                  const studio = STUDIO_DATA[id];
                  if (!content || !studio) return null;
                  return (
                    <Link
                      key={id}
                      href={`/studios/${id}`}
                      className="block p-4 rounded-lg border border-border bg-card hover:border-muted transition-all"
                    >
                      <p className="font-semibold text-sm mb-1">
                        {studio.name}
                      </p>
                      <p className="text-xs text-muted">{content.access}</p>
                      <p className="text-xs text-accent mt-3">
                        空き状況・予約方法を見る →
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12">
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-lg font-semibold bg-accent text-background hover:bg-accent/90 transition-all"
          >
            すべてのスタジオの空き状況を一括検索する →
          </Link>
        </div>

        <JsonLd data={breadcrumbJsonLd} />
      </main>

      <SiteFooter />
    </div>
  );
}
