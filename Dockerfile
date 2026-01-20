# Playwright公式イメージをベースに使用（依存関係がすべて含まれている）
FROM mcr.microsoft.com/playwright:v1.57.0-noble

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール（devDependencies含む、playwrightのため）
RUN npm ci

# ソースコードをコピー
COPY . .

# ポートを公開
EXPOSE 3001

# 環境変数
ENV NODE_ENV=production
ENV PORT=3001

# APIサーバーを起動
CMD ["npm", "run", "api:start"]
