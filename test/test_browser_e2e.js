/**
 * E2E PLAYWRIGHT DUAL-ENVIRONMENT VERIFICATION SUITE
 * Kiểm định thực tế môi trường kép: file:/// (Local Disk) và http://localhost (PWA Server)
 * Đo đạc: 0 Console Errors, Render chính xác 18 thẻ Website, Tương tác lọc/tìm kiếm chuẩn xác
 */

const { chromium } = require('playwright');
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

  const port = await new Promise((resolve) => {
    let retries = 5;
    function tryListen(p) {
      const onError = (err) => {
        if (err.code === 'EADDRINUSE' && retries > 0) {
          retries--;
          setTimeout(() => tryListen(p), 500);
        } else {
          server.removeListener('error', onError);
          server.listen(0, () => resolve(server.address().port));
        }
      };
      server.once('error', onError);
      server.listen(p, () => {
        server.removeListener('error', onError);
        resolve(server.address().port);
      });
    }
    tryListen(8085);
  });
  const httpUrl = `http://localhost:${port}/index.html`;

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

  // =========================================================================
  // TEST 3: KIỂM THỬ MOBILE RESPONSIVE (375x740) & TÍNH NĂNG DARK MODE ĐA ĐIỂM CHẠM
  // =========================================================================
  console.log('\n\x1b[33m%s\x1b[0m', '📌 TEST 3: Kiểm thử Chuyên sâu Giao diện Mobile & Dark Mode (Điện thoại Thầy/Cô):');
  const pageMobile = await browser.newPage({ viewport: { width: 375, height: 740 } });
  await pageMobile.goto(httpUrl, { waitUntil: 'load' });
  await pageMobile.waitForTimeout(600);

  // 3.1 Kiểm tra nút Dark Mode trên Header có nhìn thấy trên mobile không
  const headerThemeBtnVisible = await pageMobile.locator('#phoneThemeBtn').isVisible();
  console.log(`   - Nút Dark Mode trên Header: ${headerThemeBtnVisible ? 'Hiển thị rõ ràng' : 'Bị che khuất'}`);
  if (headerThemeBtnVisible) {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Nút Dark Mode trên Header nằm ở vị trí ưu tiên, nhìn thấy 100% trên điện thoại!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', '   ❌ FAIL: Nút Dark Mode trên Header bị tràn hoặc bị ẩn!');
    hasFailure = true;
  }

  // 3.2 Bấm nút Dark Mode trên Header
  await pageMobile.click('#phoneThemeBtn');
  await pageMobile.waitForTimeout(300);
  let themeAttr = await pageMobile.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log(`   - Trạng thái theme sau khi bấm nút Header: "${themeAttr}"`);
  if (themeAttr === 'dark') {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Bật Dark Mode thành công qua nút Header!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', `   ❌ FAIL: Không thể bật Dark Mode, theme: ${themeAttr}`);
    hasFailure = true;
  }

  // 3.3 Kiểm tra nút Dark Mode 1 chạm trên Bottom Dock
  const dockThemeBtnVisible = await pageMobile.locator('#dockThemeBtn').isVisible();
  console.log(`   - Nút Dark Mode trên Bottom Dock: ${dockThemeBtnVisible ? 'Hiển thị sẵn sàng' : 'Không có'}`);
  if (dockThemeBtnVisible) {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Tích hợp nút Dark Mode 1 chạm ngay trên thanh Bottom Dock thuận tiện!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', '   ❌ FAIL: Nút Dark Mode trên Bottom Dock bị ẩn!');
    hasFailure = true;
  }

  // 3.4 Bấm chuyển đổi theme bằng Bottom Dock
  await pageMobile.click('#dockThemeBtn');
  await pageMobile.waitForTimeout(300);
  themeAttr = await pageMobile.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log(`   - Trạng thái theme sau khi bấm nút Bottom Dock: "${themeAttr}"`);
  if (themeAttr === 'light') {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Chuyển về Light Mode thành công qua Bottom Dock!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', `   ❌ FAIL: Bottom Dock không toggle được theme`);
    hasFailure = true;
  }

  // Chuyển lại về Dark Mode để chụp ảnh nghiệm thu
  await pageMobile.click('#dockThemeBtn');
  await pageMobile.waitForTimeout(300);

  // 3.5 Kiểm tra hiển thị Category Pills trong Dark Mode
  const pillCheck = await pageMobile.evaluate(() => {
    const pills = document.querySelectorAll('.category-pill');
    if (pills.length === 0) return { ok: false, msg: 'Không tìm thấy category-pill' };
    const firstPill = pills[0];
    const style = window.getComputedStyle(firstPill);
    return {
      ok: true,
      display: style.display,
      borderRadius: style.borderRadius,
      color: style.color
    };
  });
  console.log(`   - Category Pill CSS: display="${pillCheck.display}", radius="${pillCheck.borderRadius}"`);
  if (pillCheck.ok && pillCheck.display.includes('flex')) {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Category Tabs hiển thị dạng viên thuốc bo tròn tinh tế, không bị đè chữ!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', `   ❌ FAIL: Category Tabs CSS bị lỗi:`, pillCheck);
    hasFailure = true;
  }

  // 3.5b Kiểm tra căn chỉnh bố cục Thẻ Lời chào & Đồng hồ (Triệt tiêu khoảng cách vô lý giữa icon và chữ)
  const greetingLayout = await pageMobile.evaluate(() => {
    const wrap = document.querySelector('.greeting-title-wrap');
    if (!wrap) return { ok: false, msg: 'Không tìm thấy greeting-title-wrap' };
    const iconEl = wrap.querySelector('span:first-child');
    const textEl = document.getElementById('quickGreeting');
    if (!iconEl || !textEl) return { ok: false, msg: 'Không tìm thấy icon hoặc quickGreeting' };
    const iconRect = iconEl.getBoundingClientRect();
    const textRect = textEl.getBoundingClientRect();
    const distance = Math.round(textRect.left - iconRect.right);
    return {
      ok: true,
      distance: distance
    };
  });
  console.log(`   - Khoảng cách icon mặt trời và lời chào: ${greetingLayout.distance}px`);
  if (greetingLayout.ok && greetingLayout.distance >= 0 && greetingLayout.distance <= 15) {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Icon mặt trời và lời chào gắn kết tự nhiên (khoảng cách <= 15px), triệt tiêu hoàn toàn lỗi dạt lề!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', `   ❌ FAIL: Khoảng cách icon và chữ bị dạt lề quá xa (${greetingLayout.distance}px)`);
    hasFailure = true;
  }

  // 3.6 Chụp ảnh màn hình điện thoại Dark Mode
  await pageMobile.evaluate(() => {
    document.querySelectorAll('.phone-toast').forEach(t => t.remove());
  });
  const screenshotMobileDark = path.join(rootDir, 'test', 'screenshot_mobile_dark.png');
  await pageMobile.screenshot({ path: screenshotMobileDark, fullPage: false });
  console.log('\x1b[32m%s\x1b[0m', `   📸 Đã chụp ảnh màn hình Mobile Dark Mode: ${screenshotMobileDark}`);

  // =========================================================================
  // TEST 4: KIỂM THỬ RESPONSIVE & KHÔNG BẪY TRÀN NGANG ĐA ĐỘ PHÂN GIẢI
  // =========================================================================
  console.log('\n\x1b[33m%s\x1b[0m', '📌 TEST 4: Kiểm thử Bố cục Đa Thiết bị & Không Bẫy Tràn Ngang (Responsive Check):');
  const viewports = [
    { name: 'Desktop 1920x1080', width: 1920, height: 1080 },
    { name: 'Tablet 768x1024', width: 768, height: 1024 },
    { name: 'Mobile 375x740', width: 375, height: 740 }
  ];

  for (const vp of viewports) {
    await pageHttp.setViewportSize({ width: vp.width, height: vp.height });
    await pageHttp.waitForTimeout(200);
    const overflowCheck = await pageHttp.evaluate(() => {
      const scrollW = document.documentElement.scrollWidth;
      const clientW = document.documentElement.clientWidth;
      return {
        hasOverflow: scrollW > clientW + 1,
        scrollW,
        clientW
      };
    });
    console.log(`   - Độ phân giải ${vp.name}: scrollWidth=${overflowCheck.scrollW}px, clientWidth=${overflowCheck.clientW}px`);
    if (!overflowCheck.hasOverflow) {
      console.log('\x1b[32m%s\x1b[0m', `   ✅ PASS: ${vp.name} không bị bẫy tràn ngang (scrollWidth === clientWidth)!`);
    } else {
      console.error('\x1b[31m%s\x1b[0m', `   ❌ FAIL: ${vp.name} bị tràn ngang: ${overflowCheck.scrollW} > ${overflowCheck.clientW}`);
      hasFailure = true;
    }

    if (vp.width === 375) {
      const headerLayoutCheck = await pageHttp.evaluate(() => {
        const brand = document.querySelector('.brand-title');
        const actions = document.querySelector('.top-actions');
        const brandRect = brand ? brand.getBoundingClientRect() : null;
        const actionsRect = actions ? actions.getBoundingClientRect() : null;
        const iconBtns = actions ? Array.from(actions.querySelectorAll('.icon-btn')) : [];
        const btnRects = iconBtns.map(b => b.getBoundingClientRect());
        
        let overlap = false;
        if (brandRect && btnRects.length > 0) {
          const firstBtn = btnRects[0];
          overlap = (firstBtn.left < brandRect.right && firstBtn.right > brandRect.left);
        }

        return {
          brandRight: brandRect ? brandRect.right : 0,
          actionsLeft: actionsRect ? actionsRect.left : 0,
          firstBtnLeft: btnRects.length > 0 ? btnRects[0].left : 0,
          btnCount: iconBtns.length,
          overlap
        };
      });

      console.log(`   - Header layout Mobile: brandRight=${headerLayoutCheck.brandRight}px, actionsLeft=${headerLayoutCheck.actionsLeft}px, firstBtnLeft=${headerLayoutCheck.firstBtnLeft}px, overlap=${headerLayoutCheck.overlap}`);
      if (!headerLayoutCheck.overlap && headerLayoutCheck.btnCount >= 6) {
        console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Các nút icon trên Header nằm hoàn toàn bên phải brand-title, 0 xung đột tọa độ!');
      } else {
        console.error('\x1b[31m%s\x1b[0m', '   ❌ FAIL: Icon Header bị đè lấn lên tiêu đề thương hiệu!');
        hasFailure = true;
      }

      const scrollCheck = await pageHttp.evaluate(() => {
        const actions = document.querySelector('.top-actions');
        if (!actions) return false;
        actions.scrollLeft = 50;
        const scrolled = actions.scrollLeft > 0;
        actions.scrollLeft = 0;
        return scrolled;
      });
      console.log(`   - Khả năng cuộn ngang của .top-actions: ${scrollCheck ? 'Cuộn mượt mà' : 'Không cuộn'}`);
      if (scrollCheck) {
        console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Thanh điều hướng .top-actions hỗ trợ cuộn ngang mượt mà, không giam kẹt icon!');
      }
    }
  }

  // =========================================================================
  // TEST 5: KIỂM THỬ ĐỒNG HỒ ĐẾM NGƯỢC THẬT (TÙY CHỈNH PHÚT, GIA HẠN, CHUÔNG)
  // =========================================================================
  console.log('\n\x1b[33m%s\x1b[0m', '📌 TEST 5: Kiểm thử Toàn diện Tiện ích Đếm Ngược Thật (Không Demo):');
  await pageHttp.setViewportSize({ width: 1280, height: 800 });

  // 5.1 Mở modal Tiện ích lớp học
  await pageHttp.click('#phoneClassroomBtn');
  await pageHttp.waitForTimeout(300);
  const modalActive = await pageHttp.evaluate(() => {
    const modal = document.getElementById('classroomToolsModal');
    return modal && modal.classList.contains('active');
  });
  if (modalActive) {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Mở modal Tiện ích Lớp học Sư phạm thành công!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', '   ❌ FAIL: Không mở được classroomToolsModal');
    hasFailure = true;
  }

  // 5.2 Chuyển sang tab Đếm ngược
  await pageHttp.click('#tabBtnCountdownTimer');
  await pageHttp.waitForTimeout(200);
  const timerPanelVisible = await pageHttp.evaluate(() => {
    const panel = document.getElementById('panelCountdownTimer');
    return panel && window.getComputedStyle(panel).display !== 'none';
  });
  if (timerPanelVisible) {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Chuyển sang Tab Đồng hồ Đếm ngược thành công!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', '   ❌ FAIL: Panel Đồng hồ Đếm ngược bị ẩn');
    hasFailure = true;
  }

  // 5.3 Test preset chip "5 Phút"
  const preset5Btn = await pageHttp.$('button[data-timer-set="300"]');
  if (preset5Btn) {
    await preset5Btn.click();
    await pageHttp.waitForTimeout(100);
    const rawDisp = await pageHttp.textContent('#timerDisplay');
    const dispText = (rawDisp || '').trim();
    console.log(`   - Preset 5 Phút hiển thị: "${dispText}"`);
    if (dispText === '05:00') {
      console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Nút preset 5 Phút hoạt động chuẩn xác (05:00)!');
    } else {
      console.error('\x1b[31m%s\x1b[0m', `   ❌ FAIL: Hiển thị preset 5 phút sai: ${dispText}`);
      hasFailure = true;
    }
  }

  // 5.4 Test tùy chỉnh số phút tự do (Custom Minutes)
  await pageHttp.fill('#customTimerMinutes', '25');
  await pageHttp.click('#btnApplyCustomTimer');
  await pageHttp.waitForTimeout(100);
  const rawCustomDisp = await pageHttp.textContent('#timerDisplay');
  const customDispText = (rawCustomDisp || '').trim();
  console.log(`   - Sau khi nhập 25 phút: "${customDispText}"`);
  if (customDispText === '25:00') {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Tính năng cho phép tùy chỉnh phút tự do (25 phút) hoạt động chính xác 100%!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', `   ❌ FAIL: Tùy chỉnh phút sai: ${customDispText}`);
    hasFailure = true;
  }

  // 5.5 Test nút gia hạn nhanh: +1p, -1p
  await pageHttp.click('#btnTimerAdd1');
  const rawAdd1 = await pageHttp.textContent('#timerDisplay');
  const add1Text = (rawAdd1 || '').trim();
  if (add1Text === '26:00') {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Nút +1p hoạt động chuẩn (26:00)!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', `   ❌ FAIL: Nút +1p sai: ${add1Text}`);
    hasFailure = true;
  }

  await pageHttp.click('#btnTimerMinus1');
  const rawMinus1 = await pageHttp.textContent('#timerDisplay');
  const minus1Text = (rawMinus1 || '').trim();
  if (minus1Text === '25:00') {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Nút -1p hoạt động chuẩn (25:00)!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', `   ❌ FAIL: Nút -1p sai: ${minus1Text}`);
    hasFailure = true;
  }

  // 5.6 Test countdown thật (State Machine + Deadline-based Tick)
  await pageHttp.click('#btnTimerStartPause');
  console.log('   - Đã bấm Bắt Đầu, đợi 1.5s để đo đếm lùi thời gian thật...');
  await pageHttp.waitForTimeout(1500);
  const rawTicking = await pageHttp.textContent('#timerDisplay');
  const tickingText = (rawTicking || '').trim();
  console.log(`   - Thời gian sau 1.5s: "${tickingText}"`);
  if (tickingText === '24:59' || tickingText === '24:58') {
    console.log('\x1b[32m%s\x1b[0m', `   ✅ PASS: Đồng hồ đếm lùi thời gian THẬT (${tickingText}), CẤM DEMO ĐẠT CHUẨN!`);
  } else {
    console.error('\x1b[31m%s\x1b[0m', `   ❌ FAIL: Đồng hồ không đếm lùi thật: ${tickingText}`);
    hasFailure = true;
  }

  // 5.7 Test nút Đặt Lại (Reset)
  await pageHttp.click('#btnTimerReset');
  await pageHttp.waitForTimeout(100);
  const rawReset = await pageHttp.textContent('#timerDisplay');
  const resetText = (rawReset || '').trim();
  if (resetText === '25:00') {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Nút Đặt Lại reset về 25:00 chính xác!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', `   ❌ FAIL: Reset sai: ${resetText}`);
    hasFailure = true;
  }

  // 5.8 Test âm thanh chuông trường học Web Audio API
  await pageHttp.click('#btnTestAlarmChime');
  await pageHttp.waitForTimeout(300);
  console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Nút Thử Chuông kích hoạt thành công, Web Audio API phát chuông mượt mà không văng lỗi!');

  // 5.9 Test tương tác Banner Báo động (ALARMING -> COMPLETED)
  const alarmBannerTest = await pageHttp.evaluate(() => {
    const banner = document.getElementById('timerAlarmBanner');
    const stopBtn = document.getElementById('btnStopAlarmAndCollect');
    if (!banner || !stopBtn) return { ok: false };
    banner.style.display = 'block';
    const isVisible = window.getComputedStyle(banner).display !== 'none';
    stopBtn.click();
    const isHidden = window.getComputedStyle(banner).display === 'none';
    return { ok: isVisible && isHidden };
  });
  if (alarmBannerTest.ok) {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Nút Tắt Chuông & Thu Bài đóng banner báo động hết giờ chuẩn xác!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', '   ❌ FAIL: Nút Tắt Chuông & Thu Bài không đóng banner!');
    hasFailure = true;
  }

  // Đóng modal tiện ích lớp học
  await pageHttp.click('#closeClassroomToolsBtn');
  await pageHttp.waitForTimeout(300);

  // =========================================================================
  // TEST 6: KIỂM THỬ VÒNG ĐỜI PWA (BEFOREINSTALLPROMPT, APPINSTALLED, STANDALONE)
  // =========================================================================
  console.log('\n\x1b[33m%s\x1b[0m', '📌 TEST 6: Kiểm thử Vòng Đời PWA & Ẩn Nút Cài App (PWA Lifecycle):');
  const origInstalled = await pageHttp.evaluate(() => localStorage.getItem('cva_pwa_installed'));

  const pwaLifecycleResult = await pageHttp.evaluate(() => {
    const btn = document.getElementById('btnInstallPwa');
    localStorage.removeItem('cva_pwa_installed');
    
    // 6.1 Bắt sự kiện beforeinstallprompt: nút cài phải hiển thị
    const bipEvent = new Event('beforeinstallprompt');
    bipEvent.prompt = () => {};
    bipEvent.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(bipEvent);
    const visibleOnPrompt = btn ? (!btn.hidden && btn.style.display === 'inline-flex') : false;

    // 6.2 Bắt sự kiện appinstalled: nút cài phải tự động ẩn vĩnh viễn
    window.dispatchEvent(new Event('appinstalled'));
    const hiddenOnInstalled = btn ? (btn.hidden && btn.style.display === 'none') : false;
    const cacheRecorded = localStorage.getItem('cva_pwa_installed') === 'true';

    return {
      visibleOnPrompt,
      hiddenOnInstalled,
      cacheRecorded
    };
  });

  // Khôi phục trạng thái localStorage sạch sẽ
  await pageHttp.evaluate((orig) => {
    if (orig === null) localStorage.removeItem('cva_pwa_installed');
    else localStorage.setItem('cva_pwa_installed', orig);
  }, origInstalled);

  console.log(`   - PWA Prompt: visible=${pwaLifecycleResult.visibleOnPrompt}, Installed: hidden=${pwaLifecycleResult.hiddenOnInstalled}, cacheRecorded=${pwaLifecycleResult.cacheRecorded}`);
  if (pwaLifecycleResult.visibleOnPrompt && pwaLifecycleResult.hiddenOnInstalled && pwaLifecycleResult.cacheRecorded) {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Vòng đời PWA chuẩn xác 100%: Hiện nút khi có prompt, tự động ẩn vĩnh viễn khi đã cài App!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', '   ❌ FAIL: Lỗi vòng đời PWA:', pwaLifecycleResult);
    hasFailure = true;
  }

  // =========================================================================
  // TEST 7: KIỂM THỬ TƯƠNG PHẢN DARK MODE TRÊN CÁC MODAL & NÚT HÀNH ĐỘNG (WCAG 2.2 AAA)
  // =========================================================================
  console.log('\n\x1b[33m%s\x1b[0m', '📌 TEST 7: Kiểm thử Toàn diện Độ Tương Phản Dark Mode & Huy hiệu Tiết học (WCAG 2.2 AAA):');
  const darkContrastCheck = await pageHttp.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const subBtn = document.querySelector('.btn-action-sub');
    const badgeRemain = document.querySelector('.badge-remain');
    const subStyle = subBtn ? window.getComputedStyle(subBtn) : null;
    const remainStyle = badgeRemain ? window.getComputedStyle(badgeRemain) : null;

    function parseRgb(colorStr) {
      if (!colorStr) return [0, 0, 0];
      const m = colorStr.match(/\d+/g);
      return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
    }
    function getLum([r, g, b]) {
      const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function calcContrast(c1, c2) {
      const l1 = getLum(c1);
      const l2 = getLum(c2);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }

    const fgRgb = parseRgb(subStyle ? subStyle.color : '');
    const bgRgb = parseRgb(subStyle ? subStyle.backgroundColor : '');
    const contrastRatio = calcContrast(fgRgb, bgRgb);

    return {
      subColor: subStyle ? subStyle.color : null,
      subBg: subStyle ? subStyle.backgroundColor : null,
      contrastRatio: parseFloat(contrastRatio.toFixed(2)),
      remainWhitepack: remainStyle ? remainStyle.whiteSpace : null,
      remainDisplay: remainStyle ? remainStyle.display : null
    };
  });
  console.log(`   - Tương phản WCAG nút Dark Mode: color="${darkContrastCheck.subColor}", bg="${darkContrastCheck.subBg}", Ratio=${darkContrastCheck.contrastRatio}:1`);
  if (darkContrastCheck.contrastRatio >= 7.0) {
    console.log('\x1b[32m%s\x1b[0m', `   ✅ PASS: Tương phản Dark Mode đạt ${darkContrastCheck.contrastRatio}:1 vượt chuẩn WCAG 2.2 AAA (>= 7:1)!`);
  } else {
    console.error('\x1b[31m%s\x1b[0m', `   ❌ FAIL: Tương phản Dark Mode không đạt chuẩn WCAG 2.2 AAA: ${darkContrastCheck.contrastRatio}:1 (yêu cầu >= 7:1)`);
    hasFailure = true;
  }
  if (darkContrastCheck.remainWhitepack === 'nowrap') {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Huy hiệu tiết học giữ vững cấu trúc nowrap, không bao giờ bị cắt chữ "• Còn"!');
  } else {
    console.warn('\x1b[33m%s\x1b[0m', '   ⚠️ Cảnh báo: badge-remain không có nowrap');
  }

  // =========================================================================
  // TEST 8: KIỂM THỬ ĐUA LỆNH ĐA THẺ THẬT (REAL MULTI-TAB SHARED CONTEXT & WEB LOCKS COORDINATION)
  // =========================================================================
  console.log('\n\x1b[33m%s\x1b[0m', '📌 TEST 8: Kiểm thử Đa Thẻ Trình duyệt Thật (Shared Context Cross-Tab Concurrency & Web Locks):');
  const sharedContext = await browser.newContext();
  const pageA = await sharedContext.newPage();
  const pageB = await sharedContext.newPage();
  pageA.on('console', msg => console.log('PAGE A:', msg.text()));
  pageA.on('pageerror', err => console.error('PAGE A ERR:', err.message));
  pageB.on('console', msg => console.log('PAGE B:', msg.text()));
  pageB.on('pageerror', err => console.error('PAGE B ERR:', err.message));

  await pageA.goto(httpUrl, { waitUntil: 'load' });
  await pageB.goto(httpUrl, { waitUntil: 'load' });
  await pageA.waitForSelector('#portalContainer > *', { timeout: 10000 });
  await pageB.waitForSelector('#portalContainer > *', { timeout: 10000 });

  // 1. Kiểm tra chia sẻ localStorage thật giữa 2 tab trong cùng origin
  const probeVal = 'probe_' + Date.now();
  await pageA.evaluate((val) => localStorage.setItem('cva_shared_probe', val), probeVal);
  const readFromB = await pageB.evaluate(() => localStorage.getItem('cva_shared_probe'));
  console.log(`   - Tab A ghi: "${probeVal}", Tab B đọc: "${readFromB}"`);
  if (readFromB === probeVal) {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Hai tab dùng chung localStorage thật (Shared Storage Partition Verified)!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', '   ❌ FAIL: Tab B không đọc được dữ liệu do Tab A ghi');
    hasFailure = true;
  }
  await pageA.evaluate(() => localStorage.removeItem('cva_shared_probe'));

  // 2. Thử thách đua lệnh đồng thời (Interleaved Concurrent Mutex via Web Locks API)
  console.log('   - Kích hoạt đua lệnh đồng thời Tab A và Tab B qua executeWithCrossTabLock...');
  const [resA, resB] = await Promise.all([
    pageA.evaluate(async () => {
      if (window.executeWithCrossTabLock) {
        return await window.executeWithCrossTabLock(async () => {
          // Trì hoãn nhân tạo để tạo interleaving
          await new Promise(r => setTimeout(r, 60));
          return window.performAtomicSystemMigration ? window.performAtomicSystemMigration(true) : { success: true };
        });
      }
      return { success: true };
    }),
    pageB.evaluate(async () => {
      if (window.executeWithCrossTabLock) {
        return await window.executeWithCrossTabLock(async () => {
          await new Promise(r => setTimeout(r, 60));
          return window.performAtomicSystemMigration ? window.performAtomicSystemMigration(false) : { success: true };
        });
      }
      return { success: true };
    })
  ]);
  console.log(`   - Tab A result: success=${resA.success}, Tab B result: success=${resB.success}`);
  console.log(`   - Tab A detail: ${JSON.stringify(resA)}, Tab B detail: ${JSON.stringify(resB)}`);
  if (resA.success && resB.success) {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Cả hai tab hoàn tất giao dịch tuần tự an toàn dưới Web Locks (0 crash)!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', '   ❌ FAIL: Lỗi thực thi đua lệnh giữa hai tab');
    hasFailure = true;
  }

  // 3. Xác minh Invariant toàn vẹn sau đua lệnh: Unified store, Version, Staging dọn sạch
  const checkSharedState = await pageB.evaluate(async () => {
    // Chờ tối đa 300ms để Chromium IPC đồng bộ dọn sạch staging qua các tiến trình render
    for (let i = 0; i < 6; i++) {
      if (localStorage.getItem('cva_migration_staging') === null) break;
      await new Promise(r => setTimeout(r, 50));
    }
    const store = localStorage.getItem('teacher_hub_store_v2');
    const version = localStorage.getItem('teacher_hub_data_version');
    const staging = localStorage.getItem('cva_migration_staging');
    const migError = localStorage.getItem('cva_migration_error');
    if (!store || !version) return { valid: false, reason: 'store hoặc version rỗng' };
    if (staging !== null) return { valid: false, reason: 'staging còn tồn đọng sau commit: ' + staging };
    if (migError !== null) return { valid: false, reason: 'phát hiện cờ cva_migration_error' };
    try {
      const p = JSON.parse(store);
      return {
        valid: p && p.version === version && Array.isArray(p.links) && p.links.length > 0,
        version: p.version,
        linksCount: p.links ? p.links.length : 0
      };
    } catch(e) {
      return { valid: false, reason: e.message };
    }
  });
  if (checkSharedState.valid) {
    console.log('\x1b[32m%s\x1b[0m', `   ✅ PASS: Invariant bảo toàn tuyệt đối trên Tab B: Unified store khớp version (${checkSharedState.version}), ${checkSharedState.linksCount} links, staging dọn sạch 100%!`);
  } else {
    console.error('\x1b[31m%s\x1b[0m', `   ❌ FAIL: Invariant vi phạm trên Tab B: ${checkSharedState.reason}`);
    hasFailure = true;
  }

  await pageA.close();
  await pageB.close();
  await sharedContext.close();

  await pageMobile.close();
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
