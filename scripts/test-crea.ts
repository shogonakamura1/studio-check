import { scrapeCrea, CREA_STUDIOS } from "../api/scrapers/crea";

async function main() {
  // 1週間後の日付をテスト
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 7);
  const dateStr = futureDate.toISOString().split("T")[0];

  console.log(`\n🚀 CREA スクレイパーテスト`);
  console.log(`📅 対象日: ${dateStr}`);
  console.log(`📍 対象スタジオ: ${Object.keys(CREA_STUDIOS).join(", ")}\n`);

  try {
    // CREA大名Ⅱの平日夜・土日のみテスト
    console.log("🔍 テスト: CREA大名Ⅱ のみ");
    const result = await scrapeCrea(dateStr, ["crea-daimyo2"]);
    
    console.log("\n📊 結果:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ エラー:", error);
  }
}

main();
