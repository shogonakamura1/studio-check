import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// GA4 の測定ID（G-XXXXXXXXXX）。Vercel の環境変数で設定する。
// 未設定の環境（ローカル・プレビュー等）では計測タグを出さない。
const gaId = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  title: "Studio Check | スタジオ空き状況チェッカー",
  description: "BUZZスタジオの空き状況を横断的にチェック",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={jetbrainsMono.variable}>
      <body className="antialiased">{children}</body>
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </html>
  );
}
