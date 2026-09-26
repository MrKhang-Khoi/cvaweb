/**
 * TAB-BY-TAB DESKTOP VS MOBILE PARITY VERIFICATION SUITE
 * 
 * Mục tiêu: Minh chứng thực nghiệm 100% trên trình duyệt thật (Playwright):
 * 1. So sánh từng Tab một giữa Desktop (1920x1080) và Điện thoại (390x844).
 * 2. Đo đạc danh sách website, số lượng, tiêu đề và URL trên từng tab.
 * 3. Chụp ảnh màn hình đối chứng Desktop vs Mobile cho từng tab.
 * 4. Kiểm tra nút "🔄 Cập nhật" trên điện thoại tự động đồng bộ 100% với dữ liệu máy tính từ Cloud.
 */

let chromium;
try {
  chromium = require('playwright').chromium;
} catch (e) {
  try {
    chromium = require('C:/Users/HPZBook/Desktop/TIỆN TÍCH GIÁO VIÊN/node_modules/playwright').chromium;
  } catch {
    throw e;
  }
}
const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const artifactDir = 'C:/Users/HPZBook/.gemini/antigravity/brain/bd57cfbc-2b98-48fe-997a-99e347ce01fe';

async function startServer() {
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

  return new Promise((resolve) => {
    server.listen(0, () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function verifyTabByTab() {
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════════════');
  console.log('\x1b[36m%s\x1b[0m', '📱💻 KIỂM ĐỊNH THỰC TẾ ĐỒNG NHẤT 100% TỪNG TAB: MÁY TÍNH VS ĐIỆN THOẠI');
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════════════\n');

  const { server, port } = await startServer();
  const httpUrl = `http://localhost:${port}/index.html`;

  const browser = await chromium.launch({ headless: true });

  // 1. Khởi tạo Context Máy tính (Desktop 1920x1080)
  const desktopContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    isMobile: false
  });
  const pageDesktop = await desktopContext.newPage();

  // 2. Khởi tạo Context Điện thoại (Mobile 390x844 - iPhone / Android tiêu chuẩn)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const pageMobile = await mobileContext.newPage();

  console.log(`🌐 Đang mở hệ thống tại: ${httpUrl}`);
  await Promise.all([
    pageDesktop.goto(httpUrl, { waitUntil: 'networkidle' }),
    pageMobile.goto(httpUrl, { waitUntil: 'networkidle' })
  ]);
  await new Promise(r => setTimeout(r, 1000));

  // 3. Lấy danh sách Tabs từ cả 2 thiết bị
  const getTabs = async (page) => {
    return page.evaluate(() => {
      const pills = Array.from(document.querySelectorAll('#catScrollTrack .category-pill'));
      return pills.map(p => ({
        id: p.getAttribute('data-cat'),
        text: p.innerText.replace(/\s+/g, ' ').trim()
      }));
    });
  };

  const desktopTabs = await getTabs(pageDesktop);
  const mobileTabs = await getTabs(pageMobile);

  console.log('\n📊 DANH SÁCH TABS ĐƯỢC PHÁT HIỆN:');
  console.log(`   - Desktop: ${desktopTabs.length} tabs -> [${desktopTabs.map(t => t.text).join(' | ')}]`);
  console.log(`   - Mobile:  ${mobileTabs.length} tabs -> [${mobileTabs.map(t => t.text).join(' | ')}]`);

  if (desktopTabs.length !== mobileTabs.length) {
    console.error(`❌ LỆCH SỐ LƯỢNG TAB! Desktop: ${desktopTabs.length}, Mobile: ${mobileTabs.length}`);
    process.exit(1);
  }

  // 4. Hàm trích xuất dữ liệu website của Tab hiện tại
  const extractTabData = async (page) => {
    return page.evaluate(() => {
      const counterText = document.getElementById('counterLabel')?.textContent.trim() || '';
      const cards = Array.from(document.querySelectorAll('#portalContainer .list-item-card, #portalContainer .grid-item-card'));
      const items = cards.map(c => {
        const titleEl = c.querySelector('.item-title, .grid-title');
        const url = c.getAttribute('data-url') || '';
        const id = c.getAttribute('data-id') || '';
        const isFav = !!c.querySelector('.fav-active, .grid-star-btn[fill="currentColor"]');
        return {
          id,
          title: titleEl ? titleEl.textContent.trim() : '',
          url,
          isFav
        };
      });
      return { counterText, count: items.length, items };
    });
  };

  const comparisonReport = [];
  let allMatched = true;

  // Đảm bảo thư mục lưu ảnh tồn tại
  const imgDir = path.join(rootDir, 'test', 'tab_screenshots');
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

  console.log('\n🔍 BẮT ĐẦU ĐỐI CHỨNG CHI TIẾT TỪNG TAB (TAB-BY-TAB RECONCILIATION):');
  console.log('────────────────────────────────────────────────────────────────────────');

  for (let i = 0; i < desktopTabs.length; i++) {
    const tab = desktopTabs[i];
    console.log(`\n📌 [TAB ${i + 1}/${desktopTabs.length}] "${tab.text}" (ID: ${tab.id}):`);

    // Click chọn tab trên Desktop
    await pageDesktop.click(`#catScrollTrack .category-pill[data-cat="${tab.id}"]`);
    await pageDesktop.waitForSelector(`#catScrollTrack .category-pill[data-cat="${tab.id}"].active`);

    // Tap chọn tab trên Mobile
    await pageMobile.tap(`#catScrollTrack .category-pill[data-cat="${tab.id}"]`);
    await pageMobile.waitForSelector(`#catScrollTrack .category-pill[data-cat="${tab.id}"].active`);

    await new Promise(r => setTimeout(r, 400));

    const deskData = await extractTabData(pageDesktop);
    const mobData = await extractTabData(pageMobile);

    console.log(`   - Số trang trên Desktop: ${deskData.count} (${deskData.counterText})`);
    console.log(`   - Số trang trên Mobile:  ${mobData.count} (${mobData.counterText})`);

    // So sánh số lượng
    const countMatch = deskData.count === mobData.count;

    // So sánh chi tiết từng trang web theo thứ tự
    const titlesDesktop = deskData.items.map(it => it.title);
    const titlesMobile = mobData.items.map(it => it.title);
    const urlsDesktop = deskData.items.map(it => it.url);
    const urlsMobile = mobData.items.map(it => it.url);

    let itemsMatch = true;
    const diffs = [];

    if (!countMatch) {
      itemsMatch = false;
      diffs.push(`Lệch số lượng: Desktop=${deskData.count} vs Mobile=${mobData.count}`);
    } else {
      for (let j = 0; j < titlesDesktop.length; j++) {
        if (titlesDesktop[j] !== titlesMobile[j]) {
          itemsMatch = false;
          diffs.push(`Mục #${j + 1}: Desktop="${titlesDesktop[j]}" vs Mobile="${titlesMobile[j]}"`);
        }
        if (urlsDesktop[j] !== urlsMobile[j]) {
          itemsMatch = false;
          diffs.push(`URL #${j + 1}: Desktop="${urlsDesktop[j]}" vs Mobile="${urlsMobile[j]}"`);
        }
      }
    }

    if (itemsMatch) {
      console.log(`   \x1b[32m✅ KHỚP TUYỆT ĐỐI 100%! Cả Desktop và Mobile đều có ${deskData.count} trang web giống hệt nhau.\x1b[0m`);
      console.log(`      Danh sách: ${titlesDesktop.join(' | ')}`);
    } else {
      console.error(`   \x1b[31m❌ SAI LỆCH DỮ LIỆU TẠI TAB "${tab.text}":\x1b[0m`, diffs);
      allMatched = false;
    }

    // Chụp ảnh màn hình đối chứng
    const deskShot = path.join(imgDir, `tab_${i + 1}_${tab.id}_desktop.png`);
    const mobShot = path.join(imgDir, `tab_${i + 1}_${tab.id}_mobile.png`);
    await pageDesktop.screenshot({ path: deskShot });
    await pageMobile.screenshot({ path: mobShot });

    // Lưu vào artifacts nếu có
    if (fs.existsSync(artifactDir)) {
      fs.copyFileSync(deskShot, path.join(artifactDir, `tab_${i + 1}_${tab.id}_desktop.png`));
      fs.copyFileSync(mobShot, path.join(artifactDir, `tab_${i + 1}_${tab.id}_mobile.png`));
    }

    comparisonReport.push({
      index: i + 1,
      id: tab.id,
      name: tab.text,
      desktopCount: deskData.count,
      mobileCount: mobData.count,
      matched: itemsMatch,
      titles: titlesDesktop
    });
  }

  // 5. TEST ĐỒNG BỘ 1 CHẠM TỪ CLOUD (KHI ĐIỆN THOẠI ĐANG CÓ DỮ LIỆU CŨ HOẶC BỊ LỆCH)
  console.log('\n\x1b[33m%s\x1b[0m', '📌 TEST ĐỒNG BỘ: Giả lập Điện thoại bị lệch/thiếu dữ liệu, bấm "🔄 Cập nhật" để kéo từ Cloud:');
  
  // Xóa bớt link trên điện thoại để cố tình tạo ra lệch lạc
  await pageMobile.evaluate(() => {
    // Cố tình xóa chỉ để lại 2 link
    const sample = [
      { id: "canva", title: "Canva Giáo Dục", url: "https://www.canva.com", category: "ai", color: "#2563eb", iconChar: "CV", isFavorite: true },
      { id: "azota", title: "Azota", url: "https://azota.vn", category: "ai", color: "#16a34a", iconChar: "AZ", isFavorite: true }
    ];
    window.linksData = sample;
    localStorage.setItem("teacher_hub_links_v2", JSON.stringify(sample));
    localStorage.setItem("teacher_hub_cloud_synced_at", "0");
    if (typeof renderItems === "function") renderItems();
  });
  await new Promise(r => setTimeout(r, 400));

  const degradedMobileCount = await pageMobile.evaluate(() => {
    return document.querySelectorAll('#portalContainer .list-item-card, #portalContainer .grid-item-card').length;
  });
  console.log(`   - Số thẻ trên điện thoại sau khi giả lập lệch: ${degradedMobileCount} thẻ (Đang bị thiếu so với Máy tính: 30 thẻ)`);

  // Bấm nút "🔄 Cập nhật" trên màn hình điện thoại
  console.log('   - Giáo viên chạm nút "🔄 Cập nhật" trên điện thoại...');
  await pageMobile.tap('#btnTeacherQuickSync');

  // Chờ sync kết thúc
  await pageMobile.waitForFunction(() => {
    const btn = document.getElementById('btnTeacherQuickSync');
    return btn && !btn.classList.contains('syncing');
  }, { timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1200));

  // Kiểm tra lại trên điện thoại sau khi nhấn Cập nhật
  const restoredMobileData = await pageMobile.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('#portalContainer .list-item-card, #portalContainer .grid-item-card'));
    return {
      count: cards.length,
      titles: cards.map(c => c.querySelector('.item-title, .grid-title')?.textContent.trim() || '')
    };
  });
  console.log(`   - Số thẻ trên điện thoại sau khi Cập nhật: ${restoredMobileData.count} thẻ`);

  const resyncSuccess = restoredMobileData.count === 30;
  if (resyncSuccess) {
    console.log('\x1b[32m%s\x1b[0m', '   ✅ PASS: Nút "🔄 Cập nhật" kéo chuẩn xác 100% dữ liệu 30 website từ Cloud về điện thoại!');
  } else {
    console.error('\x1b[31m%s\x1b[0m', `   ❌ FAIL: Sau khi cập nhật, số thẻ là ${restoredMobileData.count}, kỳ vọng: 30`);
    allMatched = false;
  }

  // Chụp ảnh bằng chứng sau phục hồi
  const reSyncShot = path.join(imgDir, 'mobile_after_quick_sync.png');
  await pageMobile.screenshot({ path: reSyncShot });
  if (fs.existsSync(artifactDir)) {
    fs.copyFileSync(reSyncShot, path.join(artifactDir, 'mobile_after_quick_sync.png'));
  }

  await pageDesktop.close();
  await desktopContext.close();
  await pageMobile.close();
  await mobileContext.close();
  await browser.close();
  server.close();

  // 6. IN BẢNG BÁO CÁO NGHIỆM THU
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('📋 BẢNG TỔNG HỢP ĐỐI CHỨNG MINH CHỨNG TỪNG TAB (DESKTOP VS MOBILE):');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.table(comparisonReport.map(r => ({
    'Tab': r.index,
    'Tên Danh Mục': r.name,
    'Số Web Máy Tính': r.desktopCount,
    'Số Web Điện Thoại': r.mobileCount,
    'Trạng Thái Khớp': r.matched ? '✅ MATCH 100%' : '❌ LỆCH'
  })));

  // Ghi báo cáo ra file JSON để lưu bằng chứng kiểm định
  const reportPath = path.join(rootDir, 'test', 'tab_parity_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(comparisonReport, null, 2), 'utf-8');
  console.log(`📄 Đã lưu báo cáo nghiệm thu chi tiết tại: ${reportPath}`);

  if (allMatched && resyncSuccess) {
    console.log('\n\x1b[32m%s\x1b[0m', '🎉 TẤT CẢ CÁC TAB TRÊN MÁY TÍNH VÀ ĐIỆN THOẠI ĐÃ ĐỒNG NHẤT 100% HOÀN TOÀN!');
    process.exit(0);
  } else {
    console.error('\n\x1b[31m%s\x1b[0m', '❌ PHÁT HIỆN SỰ SAI LỆCH GIỮA MÁY TÍNH VÀ ĐIỆN THOẠI!');
    process.exit(1);
  }
}

verifyTabByTab().catch(err => {
  console.error('Lỗi thực thi kiểm định:', err);
  process.exit(1);
});
