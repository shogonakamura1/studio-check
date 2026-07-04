/**
 * 構造化データ（JSON-LD）を埋め込む共通コンポーネント。
 *
 * data には静的な定数のみを渡すこと（ユーザー入力を渡さない）。
 * "<" のエスケープは script タグ閉じ注入への保険。
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
