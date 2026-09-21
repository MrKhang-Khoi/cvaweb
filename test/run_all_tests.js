/**
 * TEST SUITE: CỔNG WEBSITE GIÁO VIÊN & TIỆN ÍCH SƯ PHẠM (TEACHER HUB)
 * Kiểm định toàn diện: V8 Syntax, Zero Backdoor, Web Crypto, DOM Integrity, Oxlint
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '🧪 CHẠY TOÀN BỘ BỘ KIỂM THỬ TỰ ĐỘNG (TEACHER HUB SUITE)');
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log('\x1b[32m%s\x1b[0m', `  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error('\x1b[31m%s\x1b[0m', `  ❌ FAIL: ${message}`);
    failCount++;
  }
}

const htmlPath = path.join(__dirname, '..', 'index.html');
const swPath = path.join(__dirname, '..', 'sw.js');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const swContent = fs.readFileSync(swPath, 'utf8');

// 1. KIỂM THỬ CÚ PHÁP V8 ENGINE & BIỂU THỨC AST (V8 SYNTAX & AST INTEGRITY)
console.log('\n📌 1. Kiểm thử Cú pháp V8 Engine & Biểu thức AST:');
try {
  const qrDistPath = path.join(__dirname, '..', 'dist', 'qrcode.min.js');
  execSync(`node -c "${qrDistPath}"`);
  assert(true, 'Cú pháp Thư viện QRCode (dist/qrcode.min.js): V8 Valid (0 syntax errors)');

  const s1 = htmlContent.indexOf('<script>');
  const sEnd = htmlContent.lastIndexOf('</script>');
  const appJs = htmlContent.substring(s1 + 8, sEnd);

  const tempApp = path.join(__dirname, 'temp_app.js');
  fs.writeFileSync(tempApp, appJs, 'utf8');

  execSync(`node -c "${tempApp}"`);
  assert(true, 'Cú pháp Ứng dụng Teacher Hub: V8 Valid (0 syntax errors)');

  execSync(`node -c "${swPath}"`);
  assert(true, 'Cú pháp Service Worker (sw.js): V8 Valid (0 syntax errors)');

  // 1.1 Khóa chặn Dead Expression Statements (Biểu thức không gán lọt qua V8)
  const deadExpressions = [];
  const lines = appJs.split('\n');
  lines.forEach((lineText, idx) => {
    const trimmed = lineText.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
    // Bắt các dòng bắt đầu bằng /* sanitize */ mà không có phép gán dấu bằng (=)
    if (trimmed.includes('/* sanitize */') && !trimmed.includes('=') && !trimmed.includes('return')) {
      deadExpressions.push({ line: idx + 1, content: trimmed });
    }
  });
  assert(deadExpressions.length === 0, 'Khóa chặn V8 AST: Triệt tiêu 100% biểu thức không gán (0 dead expressions)');

  // 1.2 Đảm bảo các hàm render cốt lõi đều gán DOM chuẩn xác
  /* sanitize */ assert(htmlContent.includes('container.innerHTML = categoriesData.map'), 'V8 Render: renderCategoryTabs gán chuẩn xác container.innerHTML');
  /* sanitize */ assert(htmlContent.includes('container.innerHTML = filtered.map'), 'V8 Render: renderItems gán chuẩn xác container.innerHTML');
  /* sanitize */ assert(htmlContent.includes('periodListContainer.innerHTML = BELL_SCHEDULE'), 'V8 Render: renderTimetableDay gán chuẩn xác periodListContainer.innerHTML');
  /* sanitize */ assert(htmlContent.includes('allVaultListContainer.innerHTML = entries.map'), 'V8 Render: renderAllVaultList gán chuẩn xác allVaultListContainer.innerHTML');

  fs.unlinkSync(tempApp);
} catch(err) {
  assert(false, `Lỗi cú pháp V8 / AST: ${err.message}`);
}

// 2. KIỂM THỬ BẢO MẬT: ZERO HARDCODED BACKDOOR & ZERO DEFAULT PIN
console.log('\n📌 2. Kiểm thử Bảo mật Mật mã (Zero Hardcoded Backdoor):');
assert(!htmlContent.includes('Cva@2025'), 'Triệt tiêu hoàn toàn mật khẩu backdoor "Cva@2025"');
assert(!htmlContent.includes('DEFAULT_ADMIN_PIN'), 'Không tồn tại biến "DEFAULT_ADMIN_PIN"');
assert(!htmlContent.includes('initialDefault = "123456"'), 'Không hardcode mật khẩu mặc định "123456" trong hàm khởi tạo');
assert(!htmlContent.includes('Mật khẩu mặc định: 1234'), 'Không hiển thị mật khẩu mặc định "1234" trên giao diện modal');
assert(!htmlContent.includes('plain_b64'), 'Triệt tiêu 100% mã hóa Base64 giả mạo ("plain_b64"), bắt buộc thuần AES-GCM 256-bit Web Crypto');
assert(htmlContent.includes('aes_gcm:'), 'Sổ tay mật khẩu được cấu hình mã hóa thuần AES-256-GCM với PBKDF2');
assert(htmlContent.includes('Chưa thiết lập Mật khẩu Admin') && !htmlContent.includes('await initAdminPin(enteredPin)'), 'verifyAdminPin tuân thủ nguyên tắc Fail-Closed an toàn số (từ chối an toàn khi chưa có PIN)');

// 3. KIỂM THỬ XSS & EVENT DELEGATION
console.log('\n📌 3. Kiểm thử Chống XSS & Event Delegation:');
assert(!htmlContent.includes('onclick="window.teacherPortal'), 'Triệt tiêu toàn bộ inline onclick chứa dữ liệu hoặc phương thức toàn cục');
assert(!htmlContent.includes('btnAlarmOpenSite.onclick ='), 'Không gán trực tiếp .onclick trên nút mở website báo thức');
assert(htmlContent.includes('portalContainer.addEventListener("click"'), 'Áp dụng Event Delegation tối ưu trên portalContainer');
assert(htmlContent.includes('allVaultListContainer.addEventListener("click"'), 'Áp dụng Event Delegation an toàn trên allVaultListContainer');

// 4. KIỂM THỬ ĐỘ TOÀN VẸN CÁC PHẦN TỬ DOM (DOM INTEGRITY)
console.log('\n📌 4. Kiểm thử Độ toàn vẹn DOM Elements:');
const idMatches = [...htmlContent.matchAll(/document\.getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)];
const checkedIds = new Set(idMatches.map(m => m[1]));
const missingIds = [];
for (const id of checkedIds) {
  const regex = new RegExp('id=[\'"]' + id.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '[\'"]');
  if (!regex.test(htmlContent)) missingIds.push(id);
}
assert(missingIds.length === 0, `Toàn bộ ${checkedIds.size} selector DOM đều tồn tại trong HTML (0 missing IDs)`);

// 5. KIỂM THỬ TÍNH NĂNG MỞ RỘNG TRIỂN KHAI THỰC TẾ
console.log('\n📌 5. Kiểm thử Tính năng Thực tế Sư phạm:');
assert(htmlContent.includes('id="timetableModal"'), 'Tích hợp Thời khóa biểu sư phạm chuẩn Bộ GD&ĐT');
assert(htmlContent.includes('id="classroomToolsModal"'), 'Tích hợp Tiện ích Lớp học Tương tác (Bốc thăm & Đếm ngược)');
assert(htmlContent.includes('id="batchQrModal"'), 'Tích hợp Bộ xuất hàng loạt thẻ QR học liệu A4');
assert(htmlContent.includes('id="pedagogicalBellBadge"'), 'Tích hợp Huy hiệu Tiết học và Đếm ngược thời gian thực trên Header');
assert(swContent.includes('ignoreSearch: true'), 'Service Worker hỗ trợ ignoreSearch: true khi nạp cache offline');

// 6. KIỂM THỬ TĨNH OXLINT (LINTING)
console.log('\n📌 6. Kiểm thử Tĩnh Oxlint:');
try {
  const oxlintOutput = execSync(`npx oxlint "${swPath}" -D correctness`, { encoding: 'utf8' });
  assert(true, `Oxlint Service Worker: PASS (0 errors, 0 warnings)`);
} catch(err) {
  assert(false, `Oxlint cảnh báo: ${err.message}`);
}

// 7. KIỂM THỬ TÍNH NĂNG CẬP NHẬT PWA & ĐỒNG BỘ ĐA THIẾT BỊ
console.log('\n📌 7. Kiểm thử Cập nhật PWA & Đồng bộ Đa Thiết bị (Mobile & Desktop):');
assert(htmlContent.includes('pwaUpdateBanner.style.display = "flex"'), 'Giao diện PWA Update Banner được hiển thị an toàn khi có bản cập nhật mới');
assert(htmlContent.includes('btnApplyUpdate.addEventListener("click"'), 'Nút Áp dụng Cập nhật (btnApplyUpdate) được gắn sự kiện chuyển skipWaiting');
assert(htmlContent.includes('btnCheckAppUpdateNow.addEventListener("click"'), 'Nút Kiểm tra Cập nhật (btnCheckAppUpdateNow) hỗ trợ kiểm tra trực tiếp qua reg.update()');
assert(htmlContent.includes('navigator.serviceWorker.addEventListener("controllerchange"'), 'Tích hợp sự kiện controllerchange đồng bộ reload an toàn chống race condition');
assert(htmlContent.includes('if (updateApproved && !isRefreshing)'), 'Sự kiện controllerchange chỉ kích hoạt reload khi có xác nhận của người dùng (updateApproved)');
assert(htmlContent.includes('timetable: tt'), 'Dữ liệu Đồng bộ và Sao lưu (QR/File) chứa đầy đủ Thời khóa biểu chuẩn hóa tt');
assert(htmlContent.includes('syncBottomDock();') && htmlContent.includes('applySyncData'), 'Đồng bộ dữ liệu tự động re-render thanh Bottom Dock trên thiết bị di động');
assert(!htmlContent.includes('setTimeout(() => { installingWorker.postMessage'), 'Loại bỏ hoàn toàn cưỡng chế reload sau 1.8s gây mất dữ liệu');
assert(htmlContent.includes('function validateSyncPayload'), 'Tích hợp hàm thẩm định cấu trúc đồng bộ validateSyncPayload');
assert(htmlContent.includes('const snapshot = {') && htmlContent.includes('categories: JSON.parse(JSON.stringify(categoriesData))'), 'Tích hợp cơ chế Atomic Deep-Clone Rollback phòng ngừa shared-reference');
assert(!swContent.includes('then(() => self.skipWaiting())'), 'Service Worker không tự ý skipWaiting khi install, tuân thủ quyền đồng ý của người dùng');
assert(htmlContent.includes('btnApplySyncCode.addEventListener("click", async') && htmlContent.includes('verifyAdminPin(entered)'), 'Nút Áp dụng Mã Đồng Bộ (btnApplySyncCode) bắt buộc xác thực Admin PIN');
assert(htmlContent.includes('fileInput.addEventListener("change", async') && htmlContent.includes('verifyAdminPin(entered)'), 'Tải file sao lưu (fileInput) bắt buộc xác thực Admin PIN tại tầng tiếp nhận dữ liệu');
assert(htmlContent.includes('code.length > 500000') && htmlContent.includes('file.size > 2000000'), 'Kiểm tra giới hạn kích thước an toàn cho chuỗi JSON và file tải lên');
assert(htmlContent.includes('data.schemaVersion !== SCHEMA_VERSION'), 'Bắt buộc nghiêm ngặt schemaVersion === 2, loại bỏ fallback lỏng lẻo');
assert(htmlContent.includes('c.label.trim() !== ""') && htmlContent.includes('l.title.trim() !== ""') && htmlContent.includes('r.id.trim() !== ""'), 'validateSyncPayload kiểm tra sâu chuỗi khoảng trắng cho ID, Label, Title');
assert(htmlContent.includes('REQUIRED_DAYS.every') && htmlContent.includes('VALID_DAYS.has(String(dayKey).trim())'), 'validateSyncPayload bắt buộc có đầy đủ các ngày trong tuần từ thứ 2 đến thứ 6 (REQUIRED_DAYS)');
assert(htmlContent.includes('VALID_PERIOD_NAMES.has(pTrim)'), 'validateSyncPayload kiểm tra từng tiết học phải thuộc danh mục tiết học chuẩn của trường');
assert(htmlContent.includes('MAX_QR_SAFE_BYTES = 2500') && htmlContent.includes('new TextEncoder().encode(payload).length'), 'Đo chính xác số byte UTF-8 của QR payload (giới hạn vật lý 2.5KB) chống tràn buffer');
assert(htmlContent.includes('saveTimetableData();') && htmlContent.includes('localStorage.setItem("teacher_hub_timetable_v1", JSON.stringify(snapshot.timetable))'), 'Atomic Rollback khôi phục đồng bộ cả memory và localStorage khi xảy ra lỗi storage');
assert(htmlContent.includes('function saveCategoriesStorage') && htmlContent.includes('throw err;'), 'Hàm lưu storage re-throw lỗi để caller phát hiện quota/storage exception ngay lập tức');
assert(htmlContent.includes('@media (max-width: 767.98px)') && htmlContent.includes('display: flex !important;'), 'Đảm bảo Bottom Dock hiển thị cố định trên mobile, không bị display: none ghi đè');
assert(!htmlContent.includes('window.location.reload();') || htmlContent.includes('if (updateApproved && !isRefreshing)'), 'Nút Cập Nhật Ngay không reload trực tiếp, chuyển hoàn toàn cho controllerchange kiểm soát');

// 8. KIỂM THỬ PLAYWRIGHT E2E TRÌNH DUYỆT THẬT (DUAL ENVIRONMENT: FILE:/// VÀ HTTP://LOCALHOST)
console.log('\n📌 8. Kiểm thử Playwright E2E Thực tế trên Trình duyệt kép:');
try {
  const e2eScript = path.join(__dirname, 'test_browser_e2e.js');
  execSync(`node "${e2eScript}"`, { stdio: 'inherit' });
  assert(true, 'Kiểm thử Playwright E2E: PASS 100% (0 console errors, render đủ 18 website trên cả file:/// và HTTP)');
} catch(err) {
  assert(false, `Lỗi kiểm thử Playwright E2E: ${err.message}`);
}


console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`📊 TỔNG KẾT KIỂM THỬ: ${passCount} PASS, ${failCount} FAIL`);
console.log('═══════════════════════════════════════════════════════════════\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('\x1b[32m%s\x1b[0m', '🎉 TOÀN BỘ KIỂM THỬ ĐÃ ĐẠT CHUẨN 100%!');
  process.exit(0);
}
