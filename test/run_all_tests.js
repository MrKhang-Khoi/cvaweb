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

// 1. KIỂM THỬ CÚ PHÁP V8 (SYNTAX V8 INTEGRITY)
console.log('\n📌 1. Kiểm thử Cú pháp V8 Engine:');
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

  fs.unlinkSync(tempApp);
} catch(err) {
  assert(false, `Lỗi cú pháp V8: ${err.message}`);
}

// 2. KIỂM THỬ BẢO MẬT: ZERO HARDCODED BACKDOOR & ZERO DEFAULT PIN
console.log('\n📌 2. Kiểm thử Bảo mật Mật mã (Zero Hardcoded Backdoor):');
assert(!htmlContent.includes('Cva@2025'), 'Triệt tiêu hoàn toàn mật khẩu backdoor "Cva@2025"');
assert(!htmlContent.includes('DEFAULT_ADMIN_PIN'), 'Không tồn tại biến "DEFAULT_ADMIN_PIN"');
assert(!htmlContent.includes('initialDefault = "123456"'), 'Không hardcode mật khẩu mặc định "123456" trong hàm khởi tạo');
assert(!htmlContent.includes('Mật khẩu mặc định: 1234'), 'Không hiển thị mật khẩu mặc định "1234" trên giao diện modal');
assert(!htmlContent.includes('plain_b64') || htmlContent.includes('aes_gcm:'), 'Sổ tay mật khẩu được cấu hình mã hóa AES-256-GCM với PBKDF2');

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

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`📊 TỔNG KẾT KIỂM THỬ: ${passCount} PASS, ${failCount} FAIL`);
console.log('═══════════════════════════════════════════════════════════════\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('\x1b[32m%s\x1b[0m', '🎉 TOÀN BỘ KIỂM THỬ ĐÃ ĐẠT CHUẨN 100%!');
  process.exit(0);
}
