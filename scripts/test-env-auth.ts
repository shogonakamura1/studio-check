/**
 * 環境変数からCREA認証情報が正しく読み込まれるかテスト
 */

import * as fs from "fs";
import * as path from "path";

function testAuthState() {
  console.log("🧪 Testing CREA auth state loading...\n");

  // Test 1: Environment variable
  const authJson = process.env.CREA_AUTH_STATE;
  if (authJson) {
    console.log("✅ Environment variable CREA_AUTH_STATE found");
    try {
      const parsed = JSON.parse(authJson);
      console.log("✅ Successfully parsed JSON from environment variable");
      console.log(`   - Cookies: ${parsed.cookies?.length || 0}`);
      console.log(`   - Origins: ${parsed.origins?.length || 0}`);
    } catch (e) {
      console.error("❌ Failed to parse CREA_AUTH_STATE");
      console.error("   Error:", e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  } else {
    console.log("⚠️  Environment variable CREA_AUTH_STATE not found");
  }

  // Test 2: File
  const authPath = path.join(process.cwd(), "auth-crea.json");
  if (fs.existsSync(authPath)) {
    console.log("\n✅ File auth-crea.json found");
    try {
      const content = fs.readFileSync(authPath, "utf-8");
      const parsed = JSON.parse(content);
      console.log("✅ Successfully parsed JSON from file");
      console.log(`   - Cookies: ${parsed.cookies?.length || 0}`);
      console.log(`   - Origins: ${parsed.origins?.length || 0}`);
    } catch (e) {
      console.error("❌ Failed to read/parse auth-crea.json");
      console.error("   Error:", e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  } else {
    console.log("\n⚠️  File auth-crea.json not found");
  }

  // Summary
  console.log("\n📊 Summary:");
  if (authJson || fs.existsSync(authPath)) {
    console.log("✅ CREA authentication is configured correctly");
    console.log("\nRecommendation for production:");
    console.log("  - Set CREA_AUTH_STATE environment variable");
    console.log("  - Run: npm run auth:export");
  } else {
    console.log("❌ CREA authentication is NOT configured");
    console.log("\nTo fix:");
    console.log("  1. Create .env.local with COUBIC_EMAIL and COUBIC_PASSWORD");
    console.log("  2. Run: npm run auth:crea");
    console.log("  3. For production, run: npm run auth:export");
    process.exit(1);
  }
}

testAuthState();
