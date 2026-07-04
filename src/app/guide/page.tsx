import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/app/_components/JsonLd";
import { SiteFooter } from "@/app/_components/SiteFooter";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const TITLE = "使い方・よくある質問";
const DESCRIPTION =
  "Studio Checkの使い方ガイド。福岡のレンタルスタジオ（BUZZ・福岡市民会館・CREA・Instabase）の空き状況を一括検索する手順、深夜練モードの使い方、検索結果の記号の見方、よくある質問をまとめています。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guide" },
  openGraph: {
    title: `${TITLE}｜${SITE_NAME}`,
    description: DESCRIPTION,
    url: "/guide",
  },
};

const HOW_TO_STEPS = [
  {
    title: "スタジオと日付・時間帯を選ぶ",
    body: "検索したいスタジオにチェックを入れ、カレンダーで日付（最大7日分）を選択します。開始・終了時刻で絞り込みもできます。",
  },
  {
    title: "「検索」を押す",
    body: "各スタジオの公式サイトからその場で最新の空き状況を取得し、スタジオごとに一覧表示します。",
  },
  {
    title: "空き枠（○）をクリックして予約",
    body: "○をクリックすると、そのスタジオの公式予約ページ（BUZZ公式・福岡市施設予約システム・Coubic・Instabase）が開きます。予約の確定は各公式サイト上で行います。",
  },
];

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "Studio Checkとは何ですか？",
    a: "福岡のレンタルスタジオ・ダンススタジオ（BUZZ福岡本店・天神・博多、福岡市民会館のリハーサル室・練習室、CREA大名・CREA+・CREA大名Ⅱ、スタジオin and out）の空き状況を、1回の検索でまとめて確認できる無料ツールです。",
  },
  {
    q: "利用料金はかかりますか？",
    a: "Studio Checkの利用は無料です。スタジオの利用料金は各スタジオの規定に従います（検索結果や各公式予約ページに表示されます）。",
  },
  {
    q: "このサイトで予約までできますか？",
    a: "予約の確定は各スタジオの公式予約サイト（BUZZ公式サイト・福岡市の施設予約システム・Coubic・Instabase）で行います。検索結果の空き枠（○）をクリックすると、該当の予約ページに直接移動できます。",
  },
  {
    q: "空き状況はいつ時点の情報ですか？",
    a: "検索ボタンを押した時点で、各スタジオの公式サイトから直接取得した最新の情報です。ただし直前に予約が入ることもあるため、最終的な空きは予約ページでご確認ください。",
  },
  {
    q: "深夜練モードとは何ですか？",
    a: "BUZZ系スタジオの深夜パック（23:30〜翌6:00）を検索対象に含める機能です。検索条件で深夜帯の時間を指定すると、日付をまたぐ深夜の空き枠もまとめて確認できます。",
  },
  {
    q: "検索結果の記号（○・×・●・−）の意味は？",
    a: "○は空き（クリックで予約ページへ）、×は予約済みです。福岡市民会館では●も予約サイトで申込可能な枠、−は受付期間外を表します。",
  },
  {
    q: "対応しているスタジオはどこですか？",
    a: "BUZZ福岡本店・BUZZ福岡天神・BUZZ福岡博多、福岡市民会館（リハーサル室・練習室①・練習室③）、レンタルスタジオCREA（大名・CREA+・大名Ⅱ）、スタジオin and out（Instabase）の計10施設です。",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "ホーム", item: SITE_URL },
    {
      "@type": "ListItem",
      position: 2,
      name: "使い方・よくある質問",
      item: `${SITE_URL}/guide`,
    },
  ],
};

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-background grid-pattern flex flex-col">
      <SiteHeader />

      <main className="max-w-3xl mx-auto px-4 py-8 w-full flex-1">
        <nav aria-label="パンくず" className="text-xs text-muted mb-6">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:text-foreground">
                ホーム
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">使い方・よくある質問</li>
          </ol>
        </nav>

        <h1 className="text-2xl font-bold mb-4">
          Studio Checkの使い方・よくある質問
        </h1>
        <p className="text-muted leading-relaxed mb-10">{DESCRIPTION}</p>

        {/* 使い方 */}
        <section className="mb-12">
          <h2 className="text-lg font-bold mb-4">使い方（3ステップ）</h2>
          <ol className="space-y-4">
            {HOW_TO_STEPS.map((step, i) => (
              <li
                key={step.title}
                className="bg-card border border-border rounded-lg p-4"
              >
                <p className="font-semibold text-sm mb-1">
                  <span className="text-accent mr-2">{i + 1}.</span>
                  {step.title}
                </p>
                <p className="text-sm text-muted leading-relaxed">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-lg font-bold mb-4">よくある質問</h2>
          <dl className="space-y-4">
            {FAQ_ITEMS.map(({ q, a }) => (
              <div
                key={q}
                className="bg-card border border-border rounded-lg p-4"
              >
                <dt className="font-semibold text-sm mb-2">
                  <span className="text-accent mr-2">Q.</span>
                  {q}
                </dt>
                <dd className="text-sm text-muted leading-relaxed">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-lg font-semibold bg-accent text-background hover:bg-accent/90 transition-all"
        >
          空き状況を検索する →
        </Link>

        <JsonLd data={faqJsonLd} />
        <JsonLd data={breadcrumbJsonLd} />
      </main>

      <SiteFooter />
    </div>
  );
}
