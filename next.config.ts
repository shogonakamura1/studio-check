import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // CSPは開発時のReact Refresh（eval使用）を壊すため本番ビルドのみ適用する
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            // GA4(gtag.js) は googletagmanager から読み込む
            "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
            "style-src 'self' 'unsafe-inline'",
            // GA4 は計測ビーコンを画像で送る場合がある
            "img-src 'self' data: https://www.googletagmanager.com https://*.google-analytics.com",
            "font-src 'self'",
            // GA4 の計測データ送信先
            "connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            // /instabase/orders の中継フォームが instabase.jp へPOSTする
            "form-action 'self' https://www.instabase.jp",
          ].join("; "),
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
