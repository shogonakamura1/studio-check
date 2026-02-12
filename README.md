# STUDIO_CHECK - スタジオ空き状況チェッカー

福岡エリアのレンタルスタジオの空き状況を一括で確認できるWebアプリケーション。

## 対応スタジオ

- **BUZZ系スタジオ**: 福岡本店、天神、博多
- **福岡市民会館**: リハーサル室、練習室①、練習室③
- **レンタルスタジオCREA**: 大名、CREA+、大名Ⅱ
- **Instabase**: スタジオ in and out（スペース単位）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて確認してください。

## 利用可能なスクリプト

### 開発

- `npm run dev` - 開発サーバーを起動
- `npm run build` - 本番用ビルド
- `npm start` - 本番サーバーを起動
- `npm run lint` - ESLintでコードチェック

### テスト（スクレイパー単体テスト）

- `npm run test:civic-hall` - 福岡市民会館スクレイパーをテスト
- `npm run test:crea` - CREAスクレイパーをテスト

## APIエンドポイント

### GET `/api/availability`

スタジオの空き状況を取得します。

**パラメータ:**
- `studios` (必須): スタジオIDのカンマ区切り
- `date` (いずれか必須): 日付（`YYYY-MM-DD`形式）
- `dates` (いずれか必須): 日付のカンマ区切り（最大7件、重複は自動で除去）
- `include-late-night` (任意): `1` の場合、BUZZ系のみ「翌日早朝（00:00〜05:30）を前日分に合成」して返します（深夜練向け）

**スタジオID一覧:**

| スタジオID | スタジオ名 |
|-----------|-----------|
| `fukuokahonten` | BUZZ福岡本店 |
| `fukuokatenjin` | BUZZ福岡天神 |
| `fukuokahakata` | BUZZ福岡博多 |
| `civichall-rehearsal` | 福岡市民会館 リハーサル室 |
| `civichall-practice1` | 福岡市民会館 練習室① |
| `civichall-practice3` | 福岡市民会館 練習室③ |
| `crea-daimyo` | CREA大名 |
| `crea-plus` | CREA+ |
| `crea-daimyo2` | CREA大名Ⅱ |
| `instabase-in-and-out` | スタジオ in and out（Instabase） |

**例:**

```bash
# BUZZ福岡本店とCREA大名の空き状況を取得
curl "http://localhost:3000/api/availability?studios=fukuokahonten,crea-daimyo&date=2026-01-27"
```

**レスポンス例（1日指定）:**

```json
{
  "date": "2026-01-27",
  "dayOfWeek": "火",
  "studios": [
    {
      "studioId": "fukuokahonten",
      "studioName": "BUZZ福岡本店",
      "date": "2026-01-27",
      "dayOfWeek": "火",
      "timeSlots": [
        {
          "time": "06:00",
          "studios": [
            { "studioNumber": 1, "isAvailable": true },
            { "studioNumber": 2, "isAvailable": false }
          ]
        }
      ]
    }
  ],
  "availableStudios": [
    {
      "id": "fukuokahonten",
      "name": "BUZZ福岡本店",
      "studioCount": 12,
      "lateNight": { "start": "23:30", "end": "06:00" },
      "url": "https://buzz-st.com/fukuokahonten",
      "buzzStudioIds": [289, 290, 291]
    }
  ]
}
```

**レスポンス例（複数日）:**

```json
{
  "dates": [
    {
      "date": "2026-01-27",
      "dayOfWeek": "火",
      "studios": []
    },
    {
      "date": "2026-01-28",
      "dayOfWeek": "水",
      "studios": []
    }
  ],
  "availableStudios": []
}
```

### GET `/instabase/orders`

Instabase の予約導線で必要になる「予約ドラフト作成（フォームPOST）」を、このアプリ内で中継するためのページです。

- ブラウザの制限やInstabase側の防御（WAF/Origin制限等）で、別オリジンからの直接POSTが失敗するケースがあるため、**同一オリジン上のページでフォームPOSTして遷移**させます
- 受け取ったクエリ（`order[...]` 形式）をそのままhidden inputとして埋め込み、`https://www.instabase.jp/rooms/:room_uid/orders` にPOSTします
- うまく遷移できない場合は、カレンダーページへのフォールバックリンクを表示します

例（形だけの例です。実際にInstabaseが受け付けるパラメータに合わせてください）:

```text
/instabase/orders?order[room_uid]=3746057795&order[bookings_attributes][0][start_at]=2026-02-12%2010:00&order[bookings_attributes][0][end_at]=2026-02-12%2011:00
```

## スクレイピング方式（少し詳しめ）

このプロジェクトはPlaywright等のブラウザ自動操作は使わず、**HTML/JSONの取得→パース**で空き状況を生成します（Next.jsのサーバー側で実行）。

- **BUZZ系（`buzz-st.com`）**
  - **取得**: `https://buzz-st.com/{store}/{YYYY-MM-DD}` を `fetch` で取得
  - **パース**: `cheerio`でテーブル（`table tbody tr`）を走査し、先頭セルの時刻（`HH:MM`）をキーにスロット化
  - **空き判定**: 各スタジオ列の`button`が `reserve_modal_trigger` クラスを持つかで判定
  - **深夜練（任意）**: `include-late-night=1` のとき、翌日（`date+1`）の 00:00〜05:30 を前日分に合成して返します

- **福岡市民会館（`k3.p-kashikan.jp`）**
  - **取得**: 対象ページに `POST`（`application/x-www-form-urlencoded`）し、HTMLを直接取得
  - **主なPOSTパラメータ**: `op=srch_sst`, `UseYM`, `UseDay`, `UseDate`, `ShisetsuCode=001`
  - **パース**: `koma-table`を含むテーブルを抽出し、セル文字（`○/×/●/-` 等）を時間帯（9:00-12:30 / 13:00-15:30 / 16:00-18:30 / 19:00-22:00）に対応付け
  - **対象部屋**: リハーサル室 / 練習室① / 練習室③ のみを抽出

- **レンタルスタジオCREA（Coubic）**
  - **取得**: CoubicのAPI（予約イベント）から**JSONを直接取得**して空き状況を生成（HTMLスクレイピングではありません）
  - **スタジオ対応付け**: イベントの `public_id` を元に、CREA側のスタジオIDへマッピング
  - **空き判定**: イベントの `reservable` / `vacancy` 等の情報を元にスロット化（実装内で整形）

- **Instabase**
  - **取得**: `https://www.instabase.jp/space/{spaceId}/monthly_cal?month={offset}` を `Accept: application/json` で取得
    - `offset` は「現在の日本時間（JST）の年月」からの月差分（0=今月, 1=翌月...）
  - **パース**: `days[].psi` のうち、開始時刻判定には `0..47`（30分刻み）を使用
  - **空き判定**: `psi[i] !== 0` を「予約可能」として扱います
  - **予約導線**: 現状は安定して開ける `.../cal?...#bookingInfo` を `bookingUrl` として返します（環境によって `date/from/to` が反映されない場合があるため）。必要に応じて上記の `/instabase/orders` を使ってフォームPOST中継も可能です。

## プロジェクト構成

```
studio-check/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/
│   │   │   └── availability/
│   │   │       └── route.ts    # 空き状況APIエンドポイント
│   │   ├── instabase/
│   │   │   └── orders/
│   │   │       └── route.ts    # Instabase フォームPOST中継ページ
│   │   ├── page.tsx            # メインページ
│   │   ├── layout.tsx          # レイアウト
│   │   └── globals.css         # グローバルスタイル
│   ├── lib/
│   │   └── scrapers/           # スクレイパー
│   │       ├── crea.ts                 # CREAスクレイパー
│   │       ├── fukuoka-civic-hall.ts   # 福岡市民会館スクレイパー
│   │       └── instabase.ts            # Instabaseスクレイパー
│   └── types/
│       └── index.ts            # 型定義
├── scripts/                    # テストスクリプト
│   ├── test-civic-hall.ts
│   └── test-crea.ts
└── public/                     # 静的ファイル
```

## デプロイ

### Vercel（推奨）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/studio-check)

**デプロイ手順:**

```bash
# 1. Gitにプッシュ
git add .
git commit -m "Add studio check app"
git push origin main

# 2. Vercel CLIでデプロイ
npm i -g vercel
vercel --prod
```

**注意**: 
- Vercelの実行時間制限により、同時取得数や対象サイトのレスポンス次第でタイムアウトする可能性があります
- このAPIはサーバー側の実行上限を `60秒` に設定しています（`maxDuration = 60`）

### その他のデプロイ先

Vercelの制限を回避したい場合、以下のサービスも利用可能です：

- **Netlify**: タイムアウト制限あり（要確認）
- **Railway**: 無料枠あり、タイムアウト制限なし
- **Render.com**: 無料枠あり、タイムアウト制限なし

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **UI**: React 19, TailwindCSS 4
- **スクレイピング**: Cheerio / HTMLパース（正規表現）/ 外部JSON API取得
- **言語**: TypeScript
- **デプロイ**: Vercel対応

## トラブルシューティング

### スクレイピングが失敗する

1. 対象サイトのHTMLレイアウトが変更された可能性があります
2. スクレイパーのコード（`src/lib/scrapers/`）を確認してください

### 詳細なエラーログを見る

```bash
# APIを直接呼び出してエラーを確認
curl -v "http://localhost:3000/api/availability?studios=fukuokahonten&date=2026-01-27"
```

### スクレイパー単体でテスト

```bash
# 福岡市民会館
npm run test:civic-hall

# CREA
npm run test:crea
```

## 開発

### 新しいスタジオを追加する

1. `src/lib/scrapers/` にスクレイパーを追加
2. `src/app/api/availability/route.ts` の `STUDIO_DATA` にスタジオ情報を追加
3. 必要に応じて型定義を `src/types/index.ts` に追加

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。
