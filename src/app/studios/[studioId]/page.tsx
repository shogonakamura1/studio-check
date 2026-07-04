import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/app/_components/JsonLd";
import { SiteFooter } from "@/app/_components/SiteFooter";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import {
  STUDIO_CATEGORIES,
  STUDIO_PAGE_CONTENT,
} from "@/lib/studio-content";
import { STUDIO_DATA } from "@/lib/studios";

type Params = { studioId: string };

export function generateStaticParams(): Params[] {
  return Object.keys(STUDIO_PAGE_CONTENT).map((studioId) => ({ studioId }));
}

// generateStaticParams にないIDは404にする（全ページビルド時に静的生成）
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { studioId } = await params;
  const content = STUDIO_PAGE_CONTENT[studioId];
  if (!content) return {};
  return {
    title: content.title,
    description: content.lead,
    alternates: { canonical: `/studios/${studioId}` },
    openGraph: {
      title: `${content.title}｜${SITE_NAME}`,
      description: content.lead,
      url: `/studios/${studioId}`,
    },
  };
}

export default async function StudioPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { studioId } = await params;
  const content = STUDIO_PAGE_CONTENT[studioId];
  const studio = STUDIO_DATA[studioId];
  if (!content || !studio) notFound();

  const relatedIds =
    STUDIO_CATEGORIES.find((c) => c.category === content.category)?.ids.filter(
      (id) => id !== studioId,
    ) ?? [];

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
      {
        "@type": "ListItem",
        position: 3,
        name: studio.name,
        item: `${SITE_URL}/studios/${studioId}`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background grid-pattern flex flex-col">
      <SiteHeader />

      <main className="max-w-3xl mx-auto px-4 py-8 w-full flex-1">
        {/* パンくず */}
        <nav aria-label="パンくず" className="text-xs text-muted mb-6">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:text-foreground">
                ホーム
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/studios" className="hover:text-foreground">
                対応スタジオ
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">{studio.name}</li>
          </ol>
        </nav>

        <h1 className="text-2xl font-bold mb-4">{content.heading}</h1>
        <p className="text-muted leading-relaxed mb-8">{content.lead}</p>

        {/* CTA */}
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-lg font-semibold bg-accent text-background hover:bg-accent/90 transition-all mb-10"
        >
          {studio.name}の空き状況を検索する →
        </Link>

        {/* 基本情報 */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4">基本情報</h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <dl>
              {content.facts.map((fact, i) => (
                <div
                  key={fact.label}
                  className={`flex px-4 py-3 text-sm ${
                    i > 0 ? "border-t border-border/50" : ""
                  }`}
                >
                  <dt className="w-32 shrink-0 text-muted">{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* 説明 */}
        <section className="mb-10 space-y-4">
          {content.paragraphs.map((p) => (
            <p key={p.slice(0, 24)} className="text-sm leading-relaxed">
              {p}
            </p>
          ))}
        </section>

        {/* 時間帯 */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4">予約枠・時間帯</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted">
            {content.timeSlotNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>

        {/* 予約の流れ */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4">予約までの流れ</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            {content.bookingSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="text-xs text-muted mt-4">
            ※ 空き状況は検索時に各公式サイトから取得しています。予約の確定・料金は
            <a
              href={studio.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline mx-1"
            >
              {content.officialLabel}
            </a>
            でご確認ください。
          </p>
        </section>

        {/* 関連スタジオ */}
        {relatedIds.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold mb-4">
              同系列のスタジオ
            </h2>
            <ul className="space-y-2 text-sm">
              {relatedIds.map((id) => (
                <li key={id}>
                  <Link
                    href={`/studios/${id}`}
                    className="text-accent hover:underline"
                  >
                    {STUDIO_DATA[id]?.name ?? id}の空き状況・予約方法
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <JsonLd data={breadcrumbJsonLd} />
      </main>

      <SiteFooter />
    </div>
  );
}
