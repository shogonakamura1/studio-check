# テストスクリプト

## スクレイパーのテスト

### 福岡市民会館のテスト

```bash
npm run test:civic-hall
```

### CREAのテスト

```bash
npm run test:crea
```

## 注意事項

- 両スクレイパーはAPI/HTTPリクエストベースで動作するため、Playwrightは不要です
- 福岡市民会館: POSTリクエストでHTMLを取得してパース
- CREA: Coubic APIから直接JSONを取得
