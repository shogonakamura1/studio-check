# STUDIO_CHECK - スタジオ空き状況チェッカー

福岡エリアのレンタルスタジオの空き状況を一括で確認できるWebアプリケーション。

## 対応スタジオ

- **BUZZ系スタジオ**: 福岡本店、天神、博多
- **福岡市民会館**: リハーサル室、練習室①、練習室③
- **レンタルスタジオCREA**: 大名、CREA+、大名Ⅱ

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
- `date` (必須): 日付（`YYYY-MM-DD`形式）

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

**例:**

```bash
# BUZZ福岡本店とCREA大名の空き状況を取得
curl "http://localhost:3000/api/availability?studios=fukuokahonten,crea-daimyo&date=2026-01-27"
```

**レスポンス例:**

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
  ]
}
```

## プロジェクト構成

```
studio-check/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/
│   │   │   └── availability/
│   │   │       └── route.ts    # 空き状況APIエンドポイント
│   │   ├── page.tsx            # メインページ
│   │   ├── layout.tsx          # レイアウト
│   │   └── globals.css         # グローバルスタイル
│   ├── lib/
│   │   └── scrapers/           # スクレイパー
│   │       ├── crea.ts         # CREAスクレイパー
│   │       └── fukuoka-civic-hall.ts  # 福岡市民会館スクレイパー
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
- Vercel Hobbyプランは10秒のタイムアウト制限があります
- 複数スタジオを同時に取得する場合は、Proプラン（60秒タイムアウト）を推奨します

### その他のデプロイ先

Vercelの制限を回避したい場合、以下のサービスも利用可能です：

- **Netlify**: タイムアウト制限あり（要確認）
- **Railway**: 無料枠あり、タイムアウト制限なし
- **Render.com**: 無料枠あり、タイムアウト制限なし

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **UI**: React 19, TailwindCSS 4
- **スクレイピング**: Cheerio
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
