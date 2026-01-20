# STUDIO_CHECK - スタジオ空き状況チェッカー

福岡エリアのレンタルスタジオの空き状況を一括で確認できるWebアプリケーション。

## 対応スタジオ

- **BUZZ系スタジオ**: 福岡本店、天神、天神2nd、博多、博多駅前
- **福岡市民会館**: リハーサル室、練習室①、練習室③
- **レンタルスタジオCREA**: 大名、CREA+、大名Ⅱ、CREA music

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. CREA認証情報の設定

CREAの空き状況を取得するには、Coubicへのログインが必要です。

#### ローカル開発環境

1. `.env.local`ファイルを作成:

```bash
COUBIC_EMAIL=your-email@example.com
COUBIC_PASSWORD=your-password
```

2. 認証情報を保存:

```bash
npm run auth:crea
```

これで`auth-crea.json`が生成されます。

#### 本番環境

本番環境では環境変数を使用します。詳細は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

```bash
# 環境変数用のJSON文字列を生成
npm run auth:export
```

### 3. 開発サーバーの起動

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 利用可能なスクリプト

### 開発

- `npm run dev` - 開発サーバーを起動
- `npm run build` - 本番用ビルド
- `npm start` - 本番サーバーを起動
- `npm run lint` - ESLintでコードチェック

### 認証

- `npm run auth:crea` - CREAログイン情報を保存（`auth-crea.json`生成）
- `npm run auth:export` - 環境変数用にJSON文字列を出力

### テスト（スクレイパー単体テスト）

- `npm run test:civic-hall` - 福岡市民会館スクレイパーをテスト
- `npm run test:crea` - CREAスクレイパーをテスト
- `npm run test:parallel` - 並列スクレイパーをテスト（全サイト一括取得）

## APIエンドポイント

### GET `/api/availability`

スタジオの空き状況を取得

**パラメータ:**
- `studios` (必須): スタジオIDのカンマ区切り（例: `fukuokahonten,crea`）
- `date` (必須): 日付（`YYYY-MM-DD`形式）

**例:**

```bash
curl "http://localhost:3000/api/availability?studios=fukuokahonten,crea&date=2026-01-27"
```

## デプロイ

本番環境へのデプロイ方法は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

### 前提条件

1. **環境変数の設定**: `CREA_AUTH_STATE`を設定（[手順](#2-crea認証情報の設定)参照）
2. **Playwrightの要件**:
   - Vercel: **Proプラン推奨**（Hobbyプランは10秒制限で不十分）
   - 他のサービス: タイムアウト60秒以上を推奨

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/studio-check)

**デプロイ手順**:

```bash
# 1. Gitにプッシュ
git add .
git commit -m "Add studio check app"
git push origin main

# 2. Vercel CLIでデプロイ
npm i -g vercel
vercel --prod

# 3. 環境変数を設定
npm run auth:export  # JSON文字列をコピー
# Vercel Dashboard → Settings → Environment Variables
# CREA_AUTH_STATE に貼り付け（Production環境を選択）

# 4. 再デプロイ
vercel --prod
```

**注意**: Vercel Hobbyプランでは10秒のタイムアウト制限があるため、CREAのスクレイピングが失敗する可能性があります。**Proプラン（60秒）を推奨**します。

### 代替デプロイ先（Playwright長時間実行可能）

Vercel Hobbyプランの制限を回避したい場合：

#### Render.com（推奨・無料枠あり）

```bash
# render.yamlを作成済み
git push origin main
# Render.comでGitHub連携してデプロイ
```

#### Railway.app

```bash
railway login
railway init
railway up
```

#### Fly.io

```bash
flyctl launch
flyctl deploy
```

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **UI**: React 19, TailwindCSS
- **スクレイピング**: Playwright, Cheerio
- **言語**: TypeScript
- **デプロイ**: Vercel / Netlify 対応

## トラブルシューティング

### CREAの空き状況が取得できない

1. `auth-crea.json`が存在するか確認
2. セッションが期限切れの場合は`npm run auth:crea`を再実行
3. 本番環境の場合は環境変数`CREA_AUTH_STATE`が正しく設定されているか確認

### 詳細なエラーログを見る

```bash
# APIを直接呼び出してエラーを確認
curl -v "http://localhost:3000/api/availability?studios=crea&date=2026-01-27"
```

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。
