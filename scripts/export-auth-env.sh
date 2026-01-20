#!/bin/bash

# CREAの認証情報を環境変数用にエクスポートするスクリプト

AUTH_FILE="auth-crea.json"

if [ ! -f "$AUTH_FILE" ]; then
  echo "❌ Error: $AUTH_FILE not found"
  echo "Please run: npm run auth:crea"
  exit 1
fi

echo "📋 Exporting CREA_AUTH_STATE for environment variable..."
echo ""
echo "Copy the following line and set it as an environment variable in your hosting service:"
echo ""
echo "CREA_AUTH_STATE="

# JSONを1行にまとめて出力
if command -v jq &> /dev/null; then
  # jqがインストールされている場合
  jq -c . "$AUTH_FILE"
else
  # jqがない場合、Pythonを使用
  if command -v python3 &> /dev/null; then
    python3 -c "import json; print(json.dumps(json.load(open('$AUTH_FILE')), separators=(',', ':')))"
  elif command -v python &> /dev/null; then
    python -c "import json; print(json.dumps(json.load(open('$AUTH_FILE')), separators=(',', ':')))"
  else
    # どちらもない場合、そのまま出力
    cat "$AUTH_FILE"
  fi
fi

echo ""
echo "✅ Done! Set this value in your hosting service's environment variables."
echo ""
echo "Example for Vercel:"
echo "  1. Go to: https://vercel.com/[your-project]/settings/environment-variables"
echo "  2. Add: CREA_AUTH_STATE = [paste the JSON above]"
echo ""
echo "Example for Netlify:"
echo "  1. Go to: Site settings → Environment variables"
echo "  2. Add: CREA_AUTH_STATE = [paste the JSON above]"
