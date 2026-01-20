import { scrapeFukuokaCivicHall } from "../src/lib/scrapers/fukuoka-civic-hall";

async function main() {
  // 30日後の日付をテスト
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 30);
  const dateStr = futureDate.toISOString().split("T")[0];

  console.log(`Testing Fukuoka Civic Hall scraper for date: ${dateStr}`);
  console.log("---");

  try {
    const result = await scrapeFukuokaCivicHall(dateStr);
    console.log("Results:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
