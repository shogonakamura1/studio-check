import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
