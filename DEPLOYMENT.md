# 本番環境へのデプロイガイド

## CREAログイン認証の設定

本番環境ではファイルシステムに`auth-crea.json`が存在しないため、環境変数を使用して認証情報を設定します。

### ステップ1: ローカルで認証情報を生成

```bash
npm run auth:crea
```

実行後、`auth-crea.json`が生成されます。

### ステップ2: auth-crea.jsonの内容を環境変数に設定

#### 方法A: JSONを1行にまとめる（推奨）

```bash
# macOS/Linux
cat auth-crea.json | jq -c . | pbcopy

# または手動で
cat auth-crea.json
```

内容をコピーして、デプロイ先の環境変数に設定します。

#### Vercelの場合

1. Vercelダッシュボードでプロジェクトを開く
2. Settings → Environment Variables
3. 新しい環境変数を追加:
   - **Name**: `CREA_AUTH_STATE`
   - **Value**: `auth-crea.json`の内容全体（JSON形式）
   - **Environment**: Production (+ Preview, Development if needed)

#### Netlifyの場合

1. Site settings → Environment variables
2. Add a variable:
   - **Key**: `CREA_AUTH_STATE`
   - **Value**: `auth-crea.json`の内容全体

#### その他のホスティングサービス

環境変数の設定方法は各サービスのドキュメントを参照してください。

### ステップ3: デプロイ

```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod

# またはGitにプッシュ（自動デプロイ設定の場合）
git push origin main
```

## 環境変数の例

```bash
# .env.production (ローカルテスト用)
CREA_AUTH_STATE='{"cookies":[{"name":"_session","value":"xxx","domain":"coubic.com",...}],"origins":[...]}'
```

## セキュリティ注意事項

⚠️ **重要**: `auth-crea.json`にはログイン情報が含まれるため:

1. ✅ `.gitignore`に追加済み（コミットしない）
2. ✅ 環境変数として安全に保存
3. ⚠️ 定期的に再生成（セッション期限切れ対策）
4. ⚠️ 本番環境の環境変数は暗号化されていることを確認

## トラブルシューティング

### エラー: "認証情報が見つかりません"

**原因**: 環境変数`CREA_AUTH_STATE`が設定されていない

**解決策**:
1. 環境変数が正しく設定されているか確認
2. JSON形式が正しいか確認（改行やエスケープに注意）
3. デプロイ後に環境変数を変更した場合は再デプロイ

### エラー: "Failed to parse CREA_AUTH_STATE"

**原因**: JSON形式が不正

**解決策**:
```bash
# JSONの検証
echo $CREA_AUTH_STATE | jq .

# または
node -e "JSON.parse(process.env.CREA_AUTH_STATE)"
```

### セッション期限切れ

**症状**: CREAの空き状況が取得できない

**解決策**:
1. ローカルで`npm run auth:crea`を再実行
2. 新しい`auth-crea.json`の内容で環境変数を更新
3. 再デプロイ

## セッション自動更新（オプション）

頻繁にセッション期限が切れる場合は、定期的に再ログインするスクリプトを追加できます：

```typescript
// scripts/refresh-crea-auth.ts
import { saveCreaAuth } from "./save-crea-auth";

async function main() {
  console.log("Refreshing CREA auth...");
  await saveCreaAuth();
  console.log("Auth refreshed successfully");
}

main();
```

CI/CDパイプラインで定期実行することも可能です。

## 本番環境での動作確認

デプロイ後、以下のエンドポイントで動作確認：

```bash
# APIエンドポイント
curl "https://your-domain.com/api/availability?studios=crea&date=2026-01-27"
```

正常に動作している場合、CREAのスタジオ情報が返されます。
