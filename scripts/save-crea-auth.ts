import { chromium } from "playwright";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// 環境変数を読み込み（.env.local を優先）
const envLocalPath = path.join(process.cwd(), ".env.local");
const envPath = path.join(process.cwd(), ".env");

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

/**
 * Coubic（CREA）のログインセッションを保存
 * 一度実行すると auth-crea.json にセッション情報が保存され、
 * 次回以降はログイン不要でアクセス可能になる
 */
async function saveAuthSession() {
  // 複数の環境変数名パターンを試す
  const email = process.env.COUBIC_EMAIL || process.env.CREA_EMAIL || process.env.EMAIL;
  const password = process.env.COUBIC_PASSWORD || process.env.CREA_PASSWORD || process.env.PASSWORD;

  console.log("🔍 環境変数チェック:");
  console.log(`   COUBIC_EMAIL: ${process.env.COUBIC_EMAIL ? "設定済み" : "未設定"}`);
  console.log(`   CREA_EMAIL: ${process.env.CREA_EMAIL ? "設定済み" : "未設定"}`);
  console.log(`   EMAIL: ${process.env.EMAIL ? "設定済み" : "未設定"}`);
  console.log(`   COUBIC_PASSWORD: ${process.env.COUBIC_PASSWORD ? "設定済み" : "未設定"}`);
  console.log(`   CREA_PASSWORD: ${process.env.CREA_PASSWORD ? "設定済み" : "未設定"}`);
  console.log(`   PASSWORD: ${process.env.PASSWORD ? "設定済み" : "未設定"}`);
  console.log("");

  if (!email || !password) {
    console.error("❌ エラー: .env.local ファイルにメールアドレスとパスワードが設定されていません");
    console.log("\n📝 以下のいずれかの形式で .env.local に設定してください:");
    console.log("   COUBIC_EMAIL=your-email@example.com");
    console.log("   COUBIC_PASSWORD=your-password");
    console.log("\n または");
    console.log("   CREA_EMAIL=your-email@example.com");
    console.log("   CREA_PASSWORD=your-password");
    process.exit(1);
  }

  console.log(`✅ メールアドレス: ${email.substring(0, 3)}***@${email.split("@")[1]}`);
  console.log(`✅ パスワード: ${"*".repeat(password.length)}\n`);

  console.log("🚀 Coubic（CREA）へのログインを開始します...\n");

  const browser = await chromium.launch({ 
    headless: false, // 挙動を確認するため画面を表示
    slowMo: 300 // 操作をゆっくりにして確認しやすくする
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  
  const page = await context.newPage();

  try {
    console.log("📄 ログインページへ移動中...");
    
    // 1. Coubicのログイン画面へ移動
    await page.goto("https://coubic.com/signin/user", {
      waitUntil: "domcontentloaded",
      timeout: 60000, // 60秒に延長
    });

    console.log("   ✅ ページの読み込み（DOM）が完了しました");

    // ページが完全に読み込まれるまで待つ（失敗しても続行）
    try {
      await page.waitForLoadState("networkidle", { timeout: 10000 });
      console.log("   ✅ ネットワークアイドル状態になりました");
    } catch (e) {
      console.log("   ⚠️  ネットワークアイドルを待機できませんでしたが続行します");
    }

    // 少し待って、JavaScriptが実行されるのを待つ
    await page.waitForTimeout(2000);
    console.log("   ⏳ 2秒待機しました");

    // デバッグ用: ページのHTMLを確認
    console.log("\n🔍 ページ内の入力フィールドを検索中...");
    
    // すべてのinput要素を取得してデバッグ
    const inputFields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder,
        className: input.className,
      }));
    });
    
    console.log("   見つかった入力フィールド:");
    inputFields.forEach((field, index) => {
      console.log(`   ${index + 1}. type="${field.type}" name="${field.name}" id="${field.id}" placeholder="${field.placeholder}"`);
    });

    // デバッグ用: ログインページのスクリーンショットを保存
    await page.screenshot({ path: "login-page-before.png" });
    console.log("\n   📸 スクリーンショットを保存: login-page-before.png");

    console.log("\n✏️  メールアドレスとパスワードを入力中...");

    // 2. ログイン情報を入力
    // より確実な方法で入力フィールドを探す
    try {
      // メールアドレス入力欄を探す
      console.log(`   📧 メールアドレス入力欄を検索中...`);
      
      // まずメールアドレス欄が表示されるまで待つ
      const emailInput = await page.waitForSelector('input[type="email"]', { 
        state: 'visible',
        timeout: 15000 
      });
      
      if (!emailInput) {
        throw new Error("メールアドレス入力欄が見つかりません");
      }

      // クリックしてフォーカスを当ててから入力
      await emailInput.click();
      await page.waitForTimeout(500);
      await emailInput.fill(email);
      console.log(`   ✅ メールアドレスを入力しました: ${email.substring(0, 3)}***@${email.split("@")[1]}`);

      // パスワード入力欄を探す
      console.log(`   🔑 パスワード入力欄を検索中...`);
      const passwordInput = await page.waitForSelector('input[type="password"]', { 
        state: 'visible',
        timeout: 15000 
      });
      
      if (!passwordInput) {
        throw new Error("パスワード入力欄が見つかりません");
      }

      await passwordInput.click();
      await page.waitForTimeout(500);
      await passwordInput.fill(password);
      console.log(`   ✅ パスワードを入力しました (${"*".repeat(password.length)}文字)`);

      // 入力後のスクリーンショット
      await page.screenshot({ path: "login-page-after-input.png" });
      console.log("   📸 入力後のスクリーンショット: login-page-after-input.png");

    } catch (error) {
      console.error("\n❌ 入力フィールドが見つかりませんでした");
      await page.screenshot({ path: "login-page-error.png" });
      console.log("   📸 エラー時のスクリーンショット: login-page-error.png");
      throw error;
    }

    console.log("\n🔐 ログインボタンをクリック...");

    // 3. ログインボタンをクリック
    try {
      // ログインボタンを探す
      const submitButton = await page.waitForSelector(
        'button[type="submit"], input[type="submit"], button:has-text("ログイン"), button:has-text("サインイン")',
        { state: 'visible', timeout: 10000 }
      );

      if (!submitButton) {
        throw new Error("ログインボタンが見つかりません");
      }

      await submitButton.click();
      console.log("   ✅ ログインボタンをクリックしました");
      
    } catch (error) {
      console.error("\n❌ ログインボタンが見つかりませんでした");
      
      // すべてのボタンを取得してデバッグ
      const buttons = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.map(btn => ({
          type: btn.type,
          text: btn.textContent?.trim(),
          className: btn.className,
        }));
      });
      
      console.log("   見つかったボタン:");
      buttons.forEach((btn, index) => {
        console.log(`   ${index + 1}. type="${btn.type}" text="${btn.text}" class="${btn.className}"`);
      });
      
      await page.screenshot({ path: "login-button-error.png" });
      console.log("   📸 エラー時のスクリーンショット: login-button-error.png");
      throw error;
    }

    console.log("⏳ ログイン完了を待機中...");

    // 4. ログインが完了するまで待つ
    // URLの変化を待つか、ログイン後の要素を待つ
    try {
      // ログイン後、マイページや予約履歴ページへリダイレクトされることを期待
      // Coubicの場合、ログイン後は様々なページに遷移する可能性がある
      await page.waitForURL(/.*coubic\.com\/(mypage|reservations|bookings|rentalstudiocrea).*/, { 
        timeout: 15000 
      });
    } catch (e) {
      // URLが変わらない場合、またはログインページから離れたことを確認
      console.log("⚠️  特定のURL遷移を検出できませんでした。ログインページから離れたか確認します...");
      
      // ログインページから離れたことを確認（逆にログインページの要素がないことを確認）
      const isStillOnLoginPage = await page.locator('input[type="email"]').isVisible().catch(() => false);
      
      if (!isStillOnLoginPage) {
        console.log("✅ ログインページから離れました");
      } else {
        // まだログインページにいる場合は、少し待ってから再確認
        await page.waitForTimeout(3000);
        const currentUrl = page.url();
        if (!currentUrl.includes('signin')) {
          console.log("✅ ログインに成功しました（URL確認）");
        } else {
          throw new Error("ログインに失敗した可能性があります。URLがまだログインページです。");
        }
      }
    }

    console.log("✅ ログインに成功しました！");

    // 5. ★セッション情報（クッキー・ローカルストレージ）を保存
    const authFilePath = path.join(process.cwd(), "auth-crea.json");
    await context.storageState({ path: authFilePath });

    console.log(`\n💾 ログインセッションを保存しました: ${authFilePath}`);
    console.log("\n🎉 完了！次回以降はこのファイルを使ってログイン不要でアクセスできます。");
    console.log("\n⚠️  注意: auth-crea.json には機密情報が含まれます。Gitにコミットしないでください。");

  } catch (error) {
    console.error("\n❌ エラーが発生しました:", error);
    console.log("\n💡 トラブルシューティング:");
    console.log("- メールアドレスとパスワードが正しいか確認してください");
    console.log("- .env.local の環境変数名を確認してください");
    console.log("- 生成されたスクリーンショット (login-page-*.png) を確認してください");
    console.log("- Coubicのログインページの構造が変わっている可能性があります");
    console.log("- ブラウザウィンドウで手動でログインを試してみてください");
    
    // エラー時もスクリーンショットを保存
    try {
      await page.screenshot({ path: "login-error-final.png" });
      console.log("   📸 エラー時の最終スクリーンショット: login-error-final.png");
    } catch (e) {
      // スクリーンショット失敗は無視
    }
    
    throw error;
  } finally {
    console.log("\n🔒 ブラウザを閉じます（10秒後）...");
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// スクリプト実行
saveAuthSession().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
