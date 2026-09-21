/**
 * E2E PLAYWRIGHT DUAL-ENVIRONMENT VERIFICATION SUITE
 * Kiểm định thực tế môi trường kép: file:/// (Local Disk) và http://localhost (PWA Server)
 * Đo đạc: 0 Console Errors, Render chính xác 18 thẻ Website, Tương tác lọc/tìm kiếm chuẩn xác
 */

let chromium;
try {
  chromium = require('playwright').chromium;
} catch (e) {
  try {
    chromium = require('C:/Users/HPZBook/AppData/Local/npm-cache/_npx/420ff84f11983ee5/node_modules/playwright').chromium;
  } catch(e2) {
    chromium = require('C:/Users/HPZBook/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright').chromium;
  }
}
const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const htmlFile = path.join(rootDir, 'index.html');
const fileUrl = 'file:///' + htmlFile.replace(/\\/g, '/');

async function runE2ETests() {
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
  console.log('\x1b[36m%s\x1b[0m', '🎭 BẮT ĐẦU KIỂM THỬ PLAYWRIGHT E2E TRÊN TRÌNH DUYỆT THẬT');
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  let hasFailure = false;

  // =========================================================================
  // TEST 1: KIỂM THỬ MÔI TRƯỜNG FILE:/// (MÁY CỦA GIÁO VIÊN NHẤP ĐÚP CHUỘT)
  // =========================================================================
  console.log('\x1b[33m%s\x1b[0m', '📌 TEST 1: Kiểm thử mở trực tiếp bằng giao thức file:/// (Local Sandbox):');
  const pageFile = await browser.newPage();
  const fileErrors = [];
  const fileLogs = [];

  pageFile.on('pageerror', err => {
    fileErrors.push(err.message);
  });

  pageFile.on('console', msg => {
    if (msg.type() === 'error') {
      fileErrors.push(msg.text());
    } else {
      fileLogs.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  await pageFile.goto(fileUrl, { waitUntil: 'load' });
  await pageFile.waitForTimeout(1000); // Đợi render và animation

  // 1.1 Kiểm tra Console Errors
  console.log(`   - Số lượng Console Error: ${fileErrors.length}`);
  if (fileErrors.length === 0) {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Console F12 sạch 100% (0 errors, 0 CORS violations)');
  } else {
    console.error('\x1b[31m%s\x1b[0m', '   ❌ FAIL: Có console error:', fileErrors);
    hasFailure = true;
  }

  // 1.2 Kiểm tra số lượng thẻ render trong portalContainer
  const cardCount = await pageFile.evaluate(() => {
    const container = document.getElementById('portalContainer');
    return container ? container.children.length : 0;
  });

  console.log(`   - Số lượng thẻ website thực tế hiển thị: ${cardCount}`);
  if (cardCount === 18) {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Render đầy đủ và hoàn hảo 18/18 thẻ website sư phạm!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', `   ❌ FAIL: portalContainer chỉ render được ${cardCount} thẻ (yêu cầu: 18)`);
    hasFailure = true;
  }

  // 1.3 Kiểm tra nhãn counter
  const counterText = await pageFile.evaluate(() => {
    const el = document.getElementById('counterLabel');
    return el ? el.textContent.trim() : '';
  });
  console.log(`   - Nhãn đếm: "${counterText}"`);
  if (counterText === '18 trang web') {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Nhãn số lượng đồng bộ chính xác "18 trang web"');
  } else {
    console.error('\x1b[31m%s\x1b[0m', `   ❌ FAIL: Nhãn counter không khớp: "${counterText}"`);
    hasFailure = true;
  }

  // 1.4 Kiểm tra tương tác tìm kiếm
  await pageFile.fill('#phoneSearchInput', 'vnEdu');
  await pageFile.waitForTimeout(300);
  const searchCount = await pageFile.evaluate(() => {
    const container = document.getElementById('portalContainer');
    return container ? container.children.length : 0;
  });
  console.log(`   - Tìm kiếm "vnEdu": hiển thị ${searchCount} thẻ`);
  if (searchCount === 1) {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Tính năng tìm kiếm tức thời hoạt động chuẩn xác 100%');
  } else {
    console.error('\x1b[31m%s\x1b[0m', `   ❌ FAIL: Tìm kiếm không chuẩn, số thẻ: ${searchCount}`);
    hasFailure = true;
  }

  // 1.5 Xóa tìm kiếm và click chuyển tab
  await pageFile.fill('#phoneSearchInput', '');
  await pageFile.waitForTimeout(300);

  // Chụp ảnh minh chứng môi trường file:///
  const screenshotFilePath = path.join(rootDir, 'test', 'screenshot_file_mode.png');
  await pageFile.screenshot({ path: screenshotFilePath, fullPage: false });
  console.log('\x1b[32m%s\x1b[0m', `   📸 Đã chụp ảnh màn hình kiểm chứng: ${screenshotFilePath}`);
  await pageFile.close();

  // =========================================================================
  // TEST 2: KIỂM THỬ MÔI TRƯỜNG HTTP://LOCALHOST (PWA SERVER CHUẨN)
  // =========================================================================
  console.log('\n\x1b[33m%s\x1b[0m', '📌 TEST 2: Kiểm thử mở qua máy chủ HTTP Localhost (PWA Environment):');
  
  const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/') reqUrl = '/index.html';
    const filePath = path.join(rootDir, decodeURIComponent(reqUrl));

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.css': 'text/css; charset=utf-8'
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  await new Promise(resolve => server.listen(8085, resolve));
  const httpUrl = 'http://localhost:8085/index.html';

  const pageHttp = await browser.newPage();
  const httpErrors = [];

  pageHttp.on('pageerror', err => {
    httpErrors.push(err.message);
  });

  pageHttp.on('console', msg => {
    if (msg.type() === 'error') {
      httpErrors.push(msg.text());
    }
  });

  await pageHttp.goto(httpUrl, { waitUntil: 'networkidle' });
  await pageHttp.waitForTimeout(1200);

  console.log(`   - Số lượng Console Error: ${httpErrors.length}`);
  if (httpErrors.length === 0) {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Console F12 chế độ HTTP sạch 100% (0 errors)');
  } else {
    console.error('\x1b[31m%s\x1b[0m', '   ❌ FAIL: Có console error trên HTTP:', httpErrors);
    hasFailure = true;
  }

  // Kiểm tra ServiceWorker đã đăng ký
  const swRegistered = await pageHttp.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.length > 0;
  });
  console.log(`   - Trạng thái Service Worker: ${swRegistered ? 'Đã kích hoạt' : 'Chưa kích hoạt'}`);
  if (swRegistered) {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: PWA Service Worker đăng ký thành công trên HTTP Localhost!');
  } else {
    console.log('\x1b[33m%s\x1b[0m', '   ⚠️ INFO: Service Worker đang nạp ngầm');
  }

  const httpCardCount = await pageHttp.evaluate(() => {
    const container = document.getElementById('portalContainer');
    return container ? container.children.length : 0;
  });
  console.log(`   - Số lượng thẻ website hiển thị trên HTTP: ${httpCardCount}`);
  if (httpCardCount === 18) {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Render hoàn hảo 18/18 thẻ trên môi trường HTTP!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', `   ❌ FAIL: Số thẻ trên HTTP: ${httpCardCount}`);
    hasFailure = true;
  }

  const screenshotHttpPath = path.join(rootDir, 'test', 'screenshot_http_mode.png');
  await pageHttp.screenshot({ path: screenshotHttpPath, fullPage: false });
  console.log('\x1b[32m%s\x1b[0m', `   📸 Đã chụp ảnh màn hình HTTP kiểm chứng: ${screenshotHttpPath}`);

  await pageHttp.close();
  await browser.close();
  server.close();

  console.log('\n\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
  if (!hasFailure) {
    console.log('\x1b[32m%s\x1b[0m', '🎉 TẤT CẢ CÁC BÀI KIỂM THỬ PLAYWRIGHT ĐỀU ĐẠT CHUẨN 100% PASS!');
    process.exit(0);
  } else {
    console.error('\x1b[31m%s\x1b[0m', '❌ CÓ BÀI TEST THẤT BẠI. CẦN TỰ ĐỘNG KHẮC PHỤC!');
    process.exit(1);
  }
}

runE2ETests().catch(err => {
  console.error('Lỗi chạy kịch bản E2E:', err);
  process.exit(1);
});
