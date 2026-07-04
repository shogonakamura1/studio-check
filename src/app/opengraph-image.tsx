import { ImageResponse } from "next/og";

// SNSシェア時に表示されるOG画像（ビルド時/リクエスト時に動的生成）
// 注: ImageResponse の同梱フォントは日本語グリフを含まないため、
// 画像内のテキストは英数字のみで構成する（日本語は alt とメタ情報で補う）。

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Studio Check - 福岡のレンタルスタジオ空き状況を一括検索";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "linear-gradient(rgba(38,38,38,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(38,38,38,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 9999,
              backgroundColor: "#22c55e",
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 96,
              fontWeight: 700,
              color: "#fafafa",
              letterSpacing: "-0.02em",
            }}
          >
            STUDIO
            <span style={{ color: "#22c55e" }}>_</span>
            CHECK
          </div>
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 34,
            color: "#a3a3a3",
          }}
        >
          Fukuoka rental studio availability, all in one search
        </div>
        <div
          style={{
            marginTop: 48,
            display: "flex",
            gap: 16,
            fontSize: 24,
            color: "#737373",
          }}
        >
          <span
            style={{
              padding: "8px 20px",
              border: "1px solid #262626",
              borderRadius: 9999,
            }}
          >
            BUZZ
          </span>
          <span
            style={{
              padding: "8px 20px",
              border: "1px solid #262626",
              borderRadius: 9999,
            }}
          >
            CREA
          </span>
          <span
            style={{
              padding: "8px 20px",
              border: "1px solid #262626",
              borderRadius: 9999,
            }}
          >
            Instabase
          </span>
          <span
            style={{
              padding: "8px 20px",
              border: "1px solid #262626",
              borderRadius: 9999,
            }}
          >
            + Civic Hall
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
