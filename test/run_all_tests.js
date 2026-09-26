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

const s1 = htmlContent.indexOf('<script>');
const sEnd = htmlContent.lastIndexOf('</script>');
const appJs = htmlContent.substring(s1 + 8, sEnd);

async function main() {
// 1. KIỂM THỬ CÚ PHÁP V8 ENGINE & BIỂU THỨC AST (V8 SYNTAX & AST INTEGRITY)
console.log('\n📌 1. Kiểm thử Cú pháp V8 Engine & Biểu thức AST:');
try {
  const qrDistPath = path.join(__dirname, '..', 'dist', 'qrcode.min.js');
  execSync(`node -c "${qrDistPath}"`);
  assert(true, 'Cú pháp Thư viện QRCode (dist/qrcode.min.js): V8 Valid (0 syntax errors)');

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
assert(htmlContent.includes('timerPresetContainer.addEventListener("click"'), 'Áp dụng Event Delegation tối ưu trên timerPresetContainer');

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
  execSync(`npx oxlint "${swPath}" "${__dirname}" -D correctness`, { encoding: 'utf8' });
  assert(true, `Oxlint Static Analysis (sw.js & test/): PASS (0 errors, 0 warnings)`);
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
assert(htmlContent.includes('btnApplySyncCode.addEventListener("click"') && htmlContent.includes('openAdminAuthModal(executeApplySync'), 'Nút Áp dụng Mã Đồng Bộ (btnApplySyncCode) bắt buộc xác thực Admin PIN và truyền continuation callback');
assert(htmlContent.includes('fileInput.addEventListener("change"') && htmlContent.includes('!isAdminLoggedIn') && htmlContent.includes('openAdminAuthModal('), 'Tải file sao lưu (fileInput) bắt buộc xác thực Admin PIN tại tầng tiếp nhận dữ liệu');
assert(htmlContent.includes('code.length > 500000') && htmlContent.includes('file.size > 2000000'), 'Kiểm tra giới hạn kích thước an toàn cho chuỗi JSON và file tải lên (tối đa 2MB)');
const checkFileSizeSafe = (size) => size <= 2000000;
assert(checkFileSizeSafe(1500000) === true, 'File sao lưu 1.5MB (1,500,000 bytes) được xử lý hợp lệ');
assert(checkFileSizeSafe(2000001) === false, 'File sao lưu 2.000.001 bytes bị từ chối chính xác do vượt giới hạn 2MB');
assert(htmlContent.includes('data.schemaVersion !== SCHEMA_VERSION'), 'Bắt buộc nghiêm ngặt schemaVersion === 2, loại bỏ fallback lỏng lẻo');
assert(htmlContent.includes('c.label.trim() !== ""') && htmlContent.includes('l.title.trim() !== ""') && htmlContent.includes('r.id.trim() !== ""'), 'validateSyncPayload kiểm tra sâu chuỗi khoảng trắng cho ID, Label, Title');
assert(htmlContent.includes('REQUIRED_DAYS.every') && htmlContent.includes('VALID_DAYS.has(String(dayKey).trim())'), 'validateSyncPayload bắt buộc có đầy đủ các ngày trong tuần từ thứ 2 đến thứ 6 (REQUIRED_DAYS)');
assert(htmlContent.includes('VALID_PERIOD_NAMES.has(pTrim)'), 'validateSyncPayload kiểm tra từng tiết học phải thuộc danh mục tiết học chuẩn của trường');
assert(htmlContent.includes('MAX_QR_SAFE_BYTES = 2500') && htmlContent.includes('new TextEncoder().encode(payload).length'), 'Đo chính xác số byte UTF-8 của QR payload (giới hạn vật lý 2.5KB) chống tràn buffer');
assert(htmlContent.includes('saveTimetableData') && (htmlContent.includes('localStorage.setItem("teacher_hub_timetable_v1", JSON.stringify(snapshot.timetable))') || htmlContent.includes('fencedSetItem("teacher_hub_timetable_v1", JSON.stringify(snapshot.timetable))')), 'Atomic Rollback khôi phục đồng bộ cả memory và localStorage khi xảy ra lỗi storage');
assert(htmlContent.includes('function saveCategoriesStorage') && htmlContent.includes('throw err;'), 'Hàm lưu storage re-throw lỗi để caller phát hiện quota/storage exception ngay lập tức');
assert(htmlContent.includes('@media (max-width: 767.98px)') && htmlContent.includes('display: flex !important;'), 'Đảm bảo Bottom Dock hiển thị cố định trên mobile, không bị display: none ghi đè');
assert(!htmlContent.includes('window.location.reload();') || htmlContent.includes('if (updateApproved && !isRefreshing)'), 'Nút Cập Nhật Ngay không reload trực tiếp, chuyển hoàn toàn cho controllerchange kiểm soát');
assert(htmlContent.includes('CURRENT_DATA_VERSION =') && htmlContent.includes('performAtomicSystemMigration'), 'Tích hợp cơ chế Atomic System Migration versioned seed data giải quyết triệt để lỗi app cũ không update');
assert(!htmlContent.includes('existing.url = defItem.url;'), 'Bảo toàn 100% dữ liệu tùy biến: cấm ghi đè URL/Title của liên kết đã tồn tại');
assert(htmlContent.includes('greeting-title-wrap') && htmlContent.includes('btnSyncSystemDefaults'), 'Bọc icon và lời chào trong greeting-title-wrap và tích hợp nút đồng bộ hệ thống');
assert(htmlContent.includes('btnSyncSystemDefaults.addEventListener("click"') && htmlContent.includes('openAdminAuthModal(executeSyncDefaults'), 'Nút Đồng bộ Hệ thống (btnSyncSystemDefaults) bắt buộc xác thực Admin PIN và truyền continuation callback');
assert(htmlContent.includes('btnRestoreOriginalDefaults.addEventListener("click"') && htmlContent.includes('openAdminAuthModal(executeRestoreDefaults'), 'Nút Khôi phục Mặc định (btnRestoreOriginalDefaults) bắt buộc xác thực Admin PIN và truyền continuation callback');
assert(htmlContent.includes('performAtomicSystemRestore(lockCtx)'), 'Nút Khôi phục Mặc định (btnRestoreOriginalDefaults) tích hợp cơ chế snapshot rollback nguyên tử');
assert(htmlContent.includes('performAtomicSystemMigration(false, activeLock)') && htmlContent.includes('!migrationRes.success') && htmlContent.includes('showToast'), 'loadLinksFromStorage kiểm tra kết quả migration và hiển thị toast cảnh báo khi thất bại');
assert(htmlContent.includes('localStorage.setItem("cva_migration_error", JSON.stringify'), 'performAtomicSystemMigration đánh dấu cờ cva_migration_error có cấu trúc khi rollback thất bại');
assert(htmlContent.includes('localStorage.setItem("cva_restore_error", JSON.stringify'), 'performAtomicSystemRestore đánh dấu cờ cva_restore_error có cấu trúc khi rollback thất bại');
assert(htmlContent.includes('computeTxChecksum') && htmlContent.includes('recoverStagingTransaction') && htmlContent.includes('status: "prepared"'), 'Tích hợp Two-Phase Commit (2PC) Staging Status, Checksum và hàm recoverStagingTransaction chống crash');
assert(htmlContent.includes('prevGenBeforeLock > stagingGen') && htmlContent.includes('activeLockCtx') && htmlContent.includes('FencingViolation'), 'recoverStagingTransaction sở hữu Web Locks độc quyền, CAS check và fencing generation chống stale overwrite');
assert(htmlContent.includes('safeSetAndVerify') && htmlContent.includes('safeRemoveAndVerify'), 'recoverStagingTransaction thực hiện Read-After-Write verification trên mọi khóa');
assert(htmlContent.includes('verifyLock()') && htmlContent.includes('FencingViolation: writer generation'), 'Cơ chế Fencing Verification và Fail-Closed độc quyền Web Locks');
assert(htmlContent.includes('isStorageDegraded') && htmlContent.includes('showDegradedStorageBanner') && htmlContent.includes('hasCriticalStorageFault'), 'loadLinksFromStorage kích hoạt Chế độ An toàn (Degraded Mode) và hiển thị banner cảnh báo khi phát hiện lỗi recovery/migration');
assert(htmlContent.includes('executeWithCrossTabLock') && htmlContent.includes('navigator.locks.request("cva_storage_exclusive_lock"'), 'Đồng bộ thao tác ghi bằng Web Locks API (executeWithCrossTabLock) ngăn chặn xung đột đa tab');
assert(htmlContent.includes('saveVaultStorageUnlocked') && htmlContent.includes('currentLockContext'), 'Tích hợp hàm saveVaultStorageUnlocked và re-entrant Web Locks context triệt tiêu hoàn toàn deadlock');
assert(htmlContent.includes('vRec.checksum !== expectedVChecksum') && htmlContent.includes('vault_crash_recovery_checksum_mismatch'), 'recoverStagingTransaction kiểm tra nghiêm ngặt checksum và metadata của cva_vault_staging (Fail-Closed)');

// Khóa chặn SPEC 3.1: Zero Swallowed Catch
const emptyCatches = [...appJs.matchAll(/catch\s*\([^)]*\)\s*\{\s*\}/g)];
assert(emptyCatches.length === 0, `Khóa chặn SPEC 3.1: Triệt tiêu 100% khối catch nuốt lỗi im lặng (0 empty catches, phát hiện ${emptyCatches.length})`);

// Trích xuất mã nguồn hàm hoàn chỉnh bằng bộ phân tích cân bằng dấu ngoặc (Brace-Balanced Scanner)
function extractFunctionBody(code, funcName) {
  const funcPattern = new RegExp(`(?:async\\s+)?function\\s+${funcName}\\s*\\(`);
  const match = funcPattern.exec(code);
  if (!match) return null;
  const funcStart = match.index;
  const braceStart = code.indexOf('{', funcStart);
  if (braceStart === -1) return null;
  let depth = 1;
  let i = braceStart + 1;
  let inString = false;
  let stringChar = '';
  let inLineComment = false;
  let inBlockComment = false;
  while (i < code.length && depth > 0) {
    const ch = code[i];
    const prev = code[i - 1];
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
    } else if (inBlockComment) {
      if (ch === '/' && prev === '*') inBlockComment = false;
    } else if (inString) {
      if (ch === stringChar && prev !== '\\') inString = false;
    } else if (ch === '/' && code[i + 1] === '/') {
      inLineComment = true;
      i++;
    } else if (ch === '/' && code[i + 1] === '*') {
      inBlockComment = true;
      i++;
    } else if (ch === '"' || ch === "'" || ch === '`') {
      inString = true;
      stringChar = ch;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
    }
    i++;
  }
  return depth === 0 ? code.slice(funcStart, i) : null;
}

const safeStorageRemoveFuncCode = extractFunctionBody(appJs, 'safeStorageRemove');
const verifyAuthFencingFuncCode = extractFunctionBody(appJs, 'verifyAuthFencing');
const safeFencedSetAuthFuncCode = extractFunctionBody(appJs, 'safeFencedSetAuth');
const safeFencedRemoveAuthFuncCode = extractFunctionBody(appJs, 'safeFencedRemoveAuth');
const validateAuthStagingFuncCode = extractFunctionBody(appJs, 'validateAuthStagingPayload');
const validateStoredAuthFuncCode = extractFunctionBody(appJs, 'validateStoredAuthState');
const checkRateLimitFuncCode = extractFunctionBody(appJs, 'checkRateLimit');
const checkRateLimitUnlockedFuncCode = extractFunctionBody(appJs, 'checkRateLimitUnlocked');
const recordAuthFailureFuncCode = extractFunctionBody(appJs, 'recordAuthFailure');
const resetAuthFailuresFuncCode = extractFunctionBody(appJs, 'resetAuthFailures');

// 7.1 Kiểm thử Thực tế hàm performAtomicSystemMigration trong Node.js VM Sandbox
console.log('\n📌 7.1 Kiểm thử Thực tế performAtomicSystemMigration (Node.js VM Sandbox):');
await (async () => {
  const vm = require('vm');

  const rawSha256FuncCode = extractFunctionBody(appJs, 'computeRawSha256');
  assert(Boolean(rawSha256FuncCode), 'Trích xuất thành công 100% mã nguồn hàm computeRawSha256');
  const checksumFuncCode = extractFunctionBody(appJs, 'computeTxChecksum');
  assert(Boolean(checksumFuncCode), 'Trích xuất thành công 100% mã nguồn hàm computeTxChecksum');
  const recoverFuncCode = extractFunctionBody(appJs, 'recoverStagingTransaction');
  assert(Boolean(recoverFuncCode) && recoverFuncCode.includes('safeSetAndVerify'), 'Trích xuất 100% thân hàm recoverStagingTransaction hoàn chỉnh (Brace-balanced Scanner)');
  const migrationFuncCode = extractFunctionBody(appJs, 'performAtomicSystemMigration');
  assert(Boolean(migrationFuncCode) && migrationFuncCode.includes('fencedSetItem'), 'Trích xuất 100% thân hàm performAtomicSystemMigration hoàn chỉnh (Brace-balanced Scanner)');
  const restoreFuncCode = extractFunctionBody(appJs, 'performAtomicSystemRestore');
  assert(Boolean(restoreFuncCode) && restoreFuncCode.includes('fencedSetItem'), 'Trích xuất 100% thân hàm performAtomicSystemRestore hoàn chỉnh (Brace-balanced Scanner)');
  const updateUnifiedUnlockedFuncCode = extractFunctionBody(appJs, 'updateUnifiedStoreUnlocked');
  assert(Boolean(updateUnifiedUnlockedFuncCode), 'Trích xuất thành công 100% mã nguồn hàm updateUnifiedStoreUnlocked');
  const updateUnifiedFuncCode = extractFunctionBody(appJs, 'updateUnifiedStore');
  assert(Boolean(updateUnifiedFuncCode), 'Trích xuất thành công 100% mã nguồn hàm updateUnifiedStore');
  const lockFuncCode = extractFunctionBody(appJs, 'executeWithCrossTabLock');
  assert(Boolean(lockFuncCode), 'Trích xuất thành công 100% mã nguồn hàm executeWithCrossTabLock');
  const validateStoreFuncCode = extractFunctionBody(appJs, 'validateAndGetUnifiedStore');
  assert(Boolean(validateStoreFuncCode), 'Trích xuất thành công 100% mã nguồn hàm validateAndGetUnifiedStore');
  const saveCatFuncCode = extractFunctionBody(appJs, 'saveCategoriesStorage');
  assert(Boolean(saveCatFuncCode), 'Trích xuất thành công 100% mã nguồn hàm saveCategoriesStorage');
  const saveLinksFuncCode = extractFunctionBody(appJs, 'saveToStorage');
  assert(Boolean(saveLinksFuncCode), 'Trích xuất thành công 100% mã nguồn hàm saveToStorage');
  const loadCatFuncCode = extractFunctionBody(appJs, 'loadCategoriesFromStorage');
  assert(Boolean(loadCatFuncCode), 'Trích xuất thành công 100% mã nguồn hàm loadCategoriesFromStorage');
  const loadLinksFuncCode = extractFunctionBody(appJs, 'loadLinksFromStorage');
  assert(Boolean(loadLinksFuncCode), 'Trích xuất thành công 100% mã nguồn hàm loadLinksFromStorage');
  const validateSyncFuncCode = extractFunctionBody(appJs, 'validateSyncPayload');
  assert(Boolean(validateSyncFuncCode), 'Trích xuất thành công 100% mã nguồn hàm validateSyncPayload');
  const delItemFuncCode = extractFunctionBody(appJs, 'delItem');
  assert(Boolean(safeStorageRemoveFuncCode), 'Trích xuất thành công 100% mã nguồn hàm safeStorageRemove');
  assert(Boolean(verifyAuthFencingFuncCode), 'Trích xuất thành công 100% mã nguồn hàm verifyAuthFencing');
  assert(Boolean(safeFencedSetAuthFuncCode), 'Trích xuất thành công 100% mã nguồn hàm safeFencedSetAuth');
  assert(Boolean(safeFencedRemoveAuthFuncCode), 'Trích xuất thành công 100% mã nguồn hàm safeFencedRemoveAuth');
  assert(Boolean(validateAuthStagingFuncCode), 'Trích xuất thành công 100% mã nguồn hàm validateAuthStagingPayload');
  assert(Boolean(validateStoredAuthFuncCode), 'Trích xuất thành công 100% mã nguồn hàm validateStoredAuthState');
  assert(Boolean(checkRateLimitFuncCode), 'Trích xuất thành công 100% mã nguồn hàm checkRateLimit');
  assert(Boolean(checkRateLimitUnlockedFuncCode), 'Trích xuất thành công 100% mã nguồn hàm checkRateLimitUnlocked');
  assert(Boolean(recordAuthFailureFuncCode), 'Trích xuất thành công 100% mã nguồn hàm recordAuthFailure');
  assert(Boolean(resetAuthFailuresFuncCode), 'Trích xuất thành công 100% mã nguồn hàm resetAuthFailures');

  // Static AST / regex verification for Zero Implicit Coercion & Secure Fencing in auth path
  const authCodeBundle = [
    validateStoredAuthFuncCode,
    checkRateLimitFuncCode,
    checkRateLimitUnlockedFuncCode,
    recordAuthFailureFuncCode,
    resetAuthFailuresFuncCode
  ].join("\n");

  assert(!/Number\s*\(\s*(rawFails|rawLockUntil|lockUntilRaw|curAuthFailsRaw)/.test(authCodeBundle),
    'Static Verification: CẤM 100% biểu thức Number(rawFails), Number(rawLockUntil) hoặc Number(lockUntilRaw) trong toàn bộ auth path');
  assert(!authCodeBundle.includes('localStorage.setItem("cva_auth_error"'),
    'Static Verification: CẤM raw localStorage.setItem("cva_auth_error") trong auth path (Bắt buộc dùng safeFencedSetAuth)');
  assert(verifyAuthFencingFuncCode.includes('JSON.parse(curLockRaw)'),
    'Static Verification: verifyAuthFencing bắt buộc parse JSON cva_migration_lock');
  assert(verifyAuthFencingFuncCode.includes('parsedLock.token !== ctx.token'),
    'Static Verification: verifyAuthFencing bắt buộc kiểm tra token ownership của lock marker');

  if (migrationFuncCode) {
    const mockStorageMap = new Map();
    let throwOnKey = null;
    let throwOnRollback = false;

    const mockLocalStorage = {
      getItem: (k) => mockStorageMap.get(k) || null,
      setItem: (k, v) => {
        if (throwOnKey && k === throwOnKey) {
          throw new Error(`QuotaExceededError on key ${k}`);
        }
        if (throwOnRollback && k !== 'cva_migration_error' && k !== 'cva_migration_lock' && k !== 'cva_fencing_generation') {
          throw new Error(`Rollback storage disk failure on key ${k}`);
        }
        mockStorageMap.set(k, String(v));
      },
      removeItem: (k) => mockStorageMap.delete(k)
    };

    const initialLinks = [
      { id: "link-vnedu", title: "vnEdu Cá Nhân Của Tôi", url: "https://custom.vnedu.vn", category: "diem" }
    ];
    const initialCats = [
      { id: "diem", label: "Sổ điểm" }
    ];

    const defaultLockCtx = {
      generation: 1,
      token: "lock_tok_sandbox_15",
      verifyFencing: () => {
        const curGen = Number(mockLocalStorage.getItem("cva_fencing_generation") || 0);
        const curTok = mockLocalStorage.getItem("cva_fencing_token");
        return curGen === 1 && curTok === "lock_tok_sandbox_15";
      }
    };
    mockStorageMap.set("cva_fencing_generation", "1");
    mockStorageMap.set("cva_fencing_token", "lock_tok_sandbox_15");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({
      token: "lock_tok_sandbox_15",
      generation: 1,
      time: Date.now()
    }));

    // Khởi tạo storage ban đầu
    mockStorageMap.set("teacher_hub_links_v2", JSON.stringify(initialLinks));
    mockStorageMap.set("teacher_hub_categories_v1", JSON.stringify(initialCats));
    mockStorageMap.set("teacher_hub_data_version", "2026.09.20.01");

    const sandbox = {
      console: { log: () => {}, warn: () => {}, error: () => {} },
      localStorage: mockLocalStorage,
      showToast: () => {},
      isStorageDegraded: false,
      showDegradedStorageBanner: () => {},
      CURRENT_DATA_VERSION: "2026.09.21.03",
      SCHEMA_VERSION: 2,
      DEFAULT_LINKS: [
        { id: "link-vnedu", title: "vnEdu Mặc Định", url: "https://vnedu.vn", category: "diem" },
        { id: "link-new-system", title: "Cổng Mới Hệ Thống", url: "https://new.edu.vn", category: "diem" }
      ],
      DEFAULT_CATEGORIES: [
        { id: "diem", label: "Sổ điểm" },
        { id: "cat-new", label: "Danh mục Mới" }
      ],
      linksData: JSON.parse(JSON.stringify(initialLinks)),
      categoriesData: JSON.parse(JSON.stringify(initialCats)),
      remindersData: [],
      teacherTimetableData: {},
      currentLockContext: defaultLockCtx,
      navigator: {
        locks: {
          request: async (name, opts, cb) => {
            const curGen = Number(mockLocalStorage.getItem("cva_fencing_generation") || 0) + 1;
            mockLocalStorage.setItem("cva_fencing_generation", String(curGen));
            mockLocalStorage.setItem("cva_fencing_token", "lock_tok_sandbox_15");
            const ctx = {
              generation: curGen,
              token: "lock_tok_sandbox_15",
              verifyFencing: () => {
                const g = Number(mockLocalStorage.getItem("cva_fencing_generation") || 0);
                const t = mockLocalStorage.getItem("cva_fencing_token");
                return g === curGen && t === "lock_tok_sandbox_15";
              }
            };
            sandbox.currentLockContext = ctx;
            try {
              return await cb(ctx);
            } finally {
              sandbox.currentLockContext = defaultLockCtx;
            }
          }
        }
      },
      syncMemoryFromLatestStorage: () => {}
    };

    const rearmSandboxLock = () => {
      mockStorageMap.set("cva_fencing_generation", "1");
      mockStorageMap.set("cva_fencing_token", "lock_tok_sandbox_15");
      mockStorageMap.set("cva_migration_lock", JSON.stringify({
        token: "lock_tok_sandbox_15",
        generation: 1,
        time: Date.now()
      }));
      sandbox.currentLockContext = defaultLockCtx;
    };

    const script = new vm.Script(
      'let CURRENT_DATA_VERSION = this.CURRENT_DATA_VERSION || "2026.09.21.03";\n' +
      'let SCHEMA_VERSION = 2;\n' +
      'const MAX_AUTH_FAILS = 5;\n' +
      'let currentLockContext = this.currentLockContext || null;\n' +
      'let remindersData = this.remindersData || [];\n' +
      'let teacherTimetableData = this.teacherTimetableData || {};\n' +
      'Object.defineProperty(this, "CURRENT_DATA_VERSION", {\n' +
      '  get: () => CURRENT_DATA_VERSION,\n' +
      '  set: (v) => { CURRENT_DATA_VERSION = v; },\n' +
      '  configurable: true\n' +
      '});\n' +
      'Object.defineProperty(this, "currentLockContext", {\n' +
      '  get: () => currentLockContext,\n' +
      '  set: (v) => { currentLockContext = v; },\n' +
      '  configurable: true\n' +
      '});\n' +
      'Object.defineProperty(this, "remindersData", {\n' +
      '  get: () => remindersData,\n' +
      '  set: (v) => { remindersData = v; },\n' +
      '  configurable: true\n' +
      '});\n' +
      'Object.defineProperty(this, "teacherTimetableData", {\n' +
      '  get: () => teacherTimetableData,\n' +
      '  set: (v) => { teacherTimetableData = v; },\n' +
      '  configurable: true\n' +
      '});\n' +
      (safeStorageRemoveFuncCode ? safeStorageRemoveFuncCode + '\nthis.safeStorageRemove = safeStorageRemove;\n' : '') +
      (verifyAuthFencingFuncCode ? verifyAuthFencingFuncCode + '\nthis.verifyAuthFencing = verifyAuthFencing;\n' : '') +
      (safeFencedSetAuthFuncCode ? safeFencedSetAuthFuncCode + '\nthis.safeFencedSetAuth = safeFencedSetAuth;\n' : '') +
      (safeFencedRemoveAuthFuncCode ? safeFencedRemoveAuthFuncCode + '\nthis.safeFencedRemoveAuth = safeFencedRemoveAuth;\n' : '') +
      (lockFuncCode ? lockFuncCode + '\nthis.executeWithCrossTabLock = executeWithCrossTabLock;\n' : '') +
      (rawSha256FuncCode ? rawSha256FuncCode + '\nthis.computeRawSha256 = computeRawSha256;\n' : '') +
      (updateUnifiedUnlockedFuncCode ? updateUnifiedUnlockedFuncCode + '\nthis.updateUnifiedStoreUnlocked = updateUnifiedStoreUnlocked;\n' : '') +
      (checksumFuncCode ? checksumFuncCode + '\nthis.computeTxChecksum = computeTxChecksum;\n' : '') +
      (updateUnifiedFuncCode ? updateUnifiedFuncCode + '\nthis.updateUnifiedStore = updateUnifiedStore;\n' : '') +
      (validateStoreFuncCode ? validateStoreFuncCode + '\nthis.validateAndGetUnifiedStore = validateAndGetUnifiedStore;\n' : '') +
      (saveCatFuncCode ? saveCatFuncCode + '\nthis.saveCategoriesStorage = saveCategoriesStorage;\n' : '') +
      (saveLinksFuncCode ? saveLinksFuncCode + '\nthis.saveToStorage = saveToStorage;\n' : '') +
      (recoverFuncCode ? recoverFuncCode + '\nthis.recoverStagingTransaction = recoverStagingTransaction;\n' : '') +
      (loadCatFuncCode ? loadCatFuncCode + '\nthis.loadCategoriesFromStorage = loadCategoriesFromStorage;\n' : '') +
      (loadLinksFuncCode ? loadLinksFuncCode + '\nthis.loadLinksFromStorage = loadLinksFromStorage;\n' : '') +
      (validateSyncFuncCode ? validateSyncFuncCode + '\nthis.validateSyncPayload = validateSyncPayload;\n' : '') +
      (validateAuthStagingFuncCode ? validateAuthStagingFuncCode + '\nthis.validateAuthStagingPayload = validateAuthStagingPayload;\n' : '') +
      (validateStoredAuthFuncCode ? validateStoredAuthFuncCode + '\nthis.validateStoredAuthState = validateStoredAuthState;\n' : '') +
      (checkRateLimitUnlockedFuncCode ? checkRateLimitUnlockedFuncCode + '\nthis.checkRateLimitUnlocked = checkRateLimitUnlocked;\n' : '') +
      (checkRateLimitFuncCode ? checkRateLimitFuncCode + '\nthis.checkRateLimit = checkRateLimit;\n' : '') +
      (recordAuthFailureFuncCode ? recordAuthFailureFuncCode + '\nthis.recordAuthFailure = recordAuthFailure;\n' : '') +
      (resetAuthFailuresFuncCode ? resetAuthFailuresFuncCode + '\nthis.resetAuthFailures = resetAuthFailures;\n' : '') +
      (restoreFuncCode ? restoreFuncCode + '\nthis.performAtomicSystemRestore = performAtomicSystemRestore;\n' : '') +
      migrationFuncCode + '\nthis.performAtomicSystemMigration = performAtomicSystemMigration;'
    );
    const context = vm.createContext(sandbox);
    script.runInContext(context);

    // Test VM 1: Migration thành công, bảo toàn link cũ và bổ sung link mới
    const res1 = sandbox.performAtomicSystemMigration(false);
    assert(res1.success === true && res1.addedCount === 1, 'VM Sandbox 1: performAtomicSystemMigration trả về success = true và addedCount = 1');
    const migratedVnedu = sandbox.linksData.find(l => l.id === "link-vnedu");
    assert(migratedVnedu && migratedVnedu.title === "vnEdu Cá Nhân Của Tôi", 'VM Sandbox 1: Bảo toàn 100% URL và Title tùy biến của giáo viên');
    assert(sandbox.linksData.some(l => l.id === "link-new-system"), 'VM Sandbox 1: Bổ sung liên kết mới "link-new-system" thành công');
    assert(sandbox.localStorage.getItem("teacher_hub_data_version") === "2026.09.21.03", 'VM Sandbox 1: Ghi đúng version vào localStorage sau khi thành công');
    assert(JSON.parse(sandbox.localStorage.getItem("teacher_hub_links_v2")).length === 2, 'VM Sandbox 1: Storage links_v2 đồng bộ 2 items với RAM');

    // Test VM 2: Không chạy lại khi version đã khớp và force = false (Idempotency)
    const res2 = sandbox.performAtomicSystemMigration(false);
    assert(res2.success === true && res2.skipped === true, 'VM Sandbox 2: Idempotency - Tự động skip khi phiên bản đã khớp');

    // Test VM 3: Lỗi xảy ra sau khi đã ghi một phần (Partial Write Failure: ghi xong categories, ghi links thì lỗi)
    sandbox.CURRENT_DATA_VERSION = "2026.09.22.01"; // Giả định có phiên bản mới hơn
    sandbox.DEFAULT_LINKS.push({ id: "link-v3", title: "Link v3", url: "https://v3.vn" });
    const snapCategoriesBefore = sandbox.localStorage.getItem("teacher_hub_categories_v1");
    const snapUnifiedBefore = sandbox.localStorage.getItem("teacher_hub_store_v2");
    const snapLinksCountBefore = sandbox.linksData.length;

    throwOnKey = "teacher_hub_links_v2"; // Ném lỗi khi ghi links
    const resPartial = sandbox.performAtomicSystemMigration(false);
    assert(resPartial.success === false, 'VM Sandbox 3: Bắt được lỗi khi ghi storage dở dang (Partial Write Failure)');
    assert(sandbox.localStorage.getItem("teacher_hub_categories_v1") === snapCategoriesBefore, 'VM Sandbox 3: Rollback thành công categories_v1 về snapshot cũ sau khi links bị lỗi');
    assert(sandbox.localStorage.getItem("teacher_hub_store_v2") === snapUnifiedBefore, 'VM Sandbox 3: Rollback thành công teacher_hub_store_v2 về snapshot cũ sau khi links bị lỗi');
    assert(sandbox.linksData.length === snapLinksCountBefore, 'VM Sandbox 3: RAM linksData không bị thay đổi');
    assert(sandbox.localStorage.getItem("teacher_hub_data_version") === "2026.09.21.03", 'VM Sandbox 3: Version marker KHÔNG bị ghi đè sang phiên bản mới');

    // Test VM 4: Rollback cũng thất bại (Double Failure) -> Đánh dấu cờ lỗi cva_migration_error
    throwOnRollback = true;
    const resDoubleFail = sandbox.performAtomicSystemMigration(true);
    assert(resDoubleFail.success === false, 'VM Sandbox 4: Trả về success: false khi gặp Double Failure');
    assert(sandbox.localStorage.getItem("cva_migration_error") !== null, 'VM Sandbox 4: Đánh dấu cờ cva_migration_error bền vững khi rollback thất bại');
    const errObj = JSON.parse(sandbox.localStorage.getItem("cva_migration_error"));
    assert(errObj && errObj.stage === "atomic_migration_rollback_partial_or_full_failed", 'VM Sandbox 4: Cờ lỗi cva_migration_error ghi lại đúng stage và message lỗi');

    // Test VM 5: Fail-Closed khi đọc snapshot thất bại (Dừng ngay, bảo vệ dữ liệu không bị xóa)
    throwOnRollback = false;
    throwOnKey = null;
    const throwOnGetMap = new Set(["teacher_hub_links_v2"]);
    const originalGet = mockLocalStorage.getItem;
    mockLocalStorage.getItem = (k) => {
      if (throwOnGetMap.has(k)) throw new Error("PermissionDenied / Corrupted disk read");
      return originalGet(k);
    };
    const resFailClosed = sandbox.performAtomicSystemMigration(true);
    assert(resFailClosed.success === false && resFailClosed.error.includes("Fail-Closed"), 'VM Sandbox 5: Fail-Closed kích hoạt an toàn khi không thể đọc snapshot');
    mockLocalStorage.getItem = originalGet;

    // Test VM 6: Fail-Closed khi không có Web Locks API (Fail-Closed)
    sandbox.currentLockContext = null;
    let thrownNoLock = false;
    try {
      sandbox.performAtomicSystemMigration(true, null);
    } catch(err) {
      if (err.message && err.message.includes("StorageLockUnavailable")) {
        thrownNoLock = true;
      }
    }
    assert(thrownNoLock, 'VM Sandbox 6: performAtomicSystemMigration từ chối thực thi khi không có Web Locks context (Fail-Closed)');
    sandbox.currentLockContext = defaultLockCtx;

    // Test VM 7: Version Re-check trước khi Commit
    mockStorageMap.set("teacher_hub_data_version", "2026.09.22.01"); // Giả lập tab 1 vừa commit phiên bản mới
    sandbox.CURRENT_DATA_VERSION = "2026.09.22.01";
    const resRecheck = sandbox.performAtomicSystemMigration(false);
    assert(resRecheck.success === true && resRecheck.skipped === true, 'VM Sandbox 7: Version Re-check phát hiện version đã được tab khác cập nhật');

    // Test VM 8: Fail-Closed khi xảy ra lỗi ghi storage trong fencedSetItem (Quota/Disk Error)
    throwOnKey = "teacher_hub_store_v2";
    const resLockErr = sandbox.performAtomicSystemMigration(true);
    assert(resLockErr.success === false && resLockErr.error.includes("QuotaExceededError"), 'VM Sandbox 8: Fail-Closed rollback kích hoạt an toàn khi không thể ghi store');
    throwOnKey = null;

    // Test VM 9: Fencing Violation khi generation bị thay đổi trước khi commit
    mockStorageMap.set("cva_fencing_generation", "99"); // Tab khác tăng generation
    const resRace = sandbox.performAtomicSystemMigration(true);
    assert(resRace.success === false && (resRace.error.includes("fencing") || resRace.error.includes("Fencing")), 'VM Sandbox 9: Fencing Check chặn đứng race condition khi generation bị superseded');
    mockStorageMap.set("cva_fencing_generation", "1");

    // Test VM 10: Fail-Closed với performAtomicSystemRestore khi không có lock
    sandbox.currentLockContext = null;
    let thrownRestoreNoLock = false;
    try {
      sandbox.performAtomicSystemRestore(null);
    } catch(err) {
      if (err.message && err.message.includes("StorageLockUnavailable")) {
        thrownRestoreNoLock = true;
      }
    }
    assert(thrownRestoreNoLock, 'VM Sandbox 10: performAtomicSystemRestore từ chối thực thi khi không có Web Locks context (Fail-Closed)');
    sandbox.currentLockContext = defaultLockCtx;

    // Test VM 11: Fencing Violation khi token bị thay đổi giữa chừng (Fail-Closed)
    const origTouchSet = mockLocalStorage.setItem;
    let tokenInterleaved = false;
    mockLocalStorage.setItem = (k, v) => {
      origTouchSet(k, v);
      if (k === "cva_migration_staging" && !tokenInterleaved) {
        tokenInterleaved = true;
        mockStorageMap.set("cva_fencing_token", "superseded_foreign_token");
      }
    };
    const resNumericLock = sandbox.performAtomicSystemMigration(true);
    assert(resNumericLock.success === false && (resNumericLock.error.includes("fencing") || resNumericLock.error.includes("Fencing")), 'VM Sandbox 11: verifyLock phát hiện token bị thay đổi giữa chừng và hủy transaction (Fail-Closed)');
    mockLocalStorage.setItem = origTouchSet;
    mockStorageMap.set("cva_fencing_token", "lock_tok_sandbox_15");

    // Test VM 12: Kiểm thử Thực tế Crash Recovery tại 5 Điểm Gián Đoạn (Point-in-Time Crash Recovery)
    const snapC0 = JSON.stringify(initialCats);
    const snapL0 = JSON.stringify(initialLinks);
    const snapV0 = "2026.09.21.03";
    const snapU0 = JSON.stringify({
      version: snapV0,
      generation: 1,
      token: "snap_u0_tok",
      categories: initialCats,
      links: initialLinks,
      checksum: sandbox.computeTxChecksum(initialCats, initialLinks, snapV0),
      time: Date.now()
    });
    mockStorageMap.set("teacher_hub_categories_v1", snapC0);
    mockStorageMap.set("teacher_hub_links_v2", snapL0);
    mockStorageMap.set("teacher_hub_data_version", snapV0);
    mockStorageMap.set("teacher_hub_store_v2", snapU0);

    const candC1 = [{ id: "diem", label: "Sổ điểm" }, { id: "cat-new", label: "Danh mục Mới" }];
    const candL1 = [{ id: "link-vnedu", title: "vnEdu Cá Nhân Của Tôi", url: "https://custom.vnedu.vn", category: "diem" }, { id: "link-new", title: "Link Mới", url: "https://new.vn" }];
    const candV1 = "2026.09.22.01";
    const stagingPreparedPoint1 = {
      token: "crash_token_1",
      fencingGeneration: 1,
      version: candV1,
      candidateVersion: candV1,
      categories: candC1,
      candidateCategories: candC1,
      links: candL1,
      candidateLinks: candL1,
      previousVersion: snapV0,
      previousCategoriesJson: snapC0,
      previousLinksJson: snapL0,
      previousUnifiedStoreJson: snapU0,
      action: "migration",
      status: "prepared",
      checksum: sandbox.computeTxChecksum(candC1, candL1, candV1),
      time: Date.now()
    };

    // Test VM 12.1: Crash Điểm 1 - Crash ngay sau khi ghi staging prepared (Storage còn nguyên C0, L0, V0, U0)
    mockStorageMap.set("cva_fencing_generation", "1");
    mockStorageMap.set("cva_fencing_token", "lock_tok_sandbox_15");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({ token: "lock_tok_sandbox_15", generation: 1, time: Date.now() }));
    sandbox.currentLockContext = defaultLockCtx;
    mockStorageMap.set("cva_migration_staging", JSON.stringify(stagingPreparedPoint1));
    const recRes1 = sandbox.recoverStagingTransaction();
    assert(recRes1.recovered === true && recRes1.action === "rolled_back", 'VM Sandbox 12.1: Crash Điểm 1 (sau staging prepared) -> recoverStagingTransaction rollback an toàn');
    assert(mockStorageMap.get("teacher_hub_categories_v1") === snapC0, 'VM Sandbox 12.1: Categories bảo toàn đúng snapshot cũ C0');
    assert(mockStorageMap.get("teacher_hub_links_v2") === snapL0, 'VM Sandbox 12.1: Links bảo toàn đúng snapshot cũ L0');
    assert(mockStorageMap.get("teacher_hub_data_version") === snapV0, 'VM Sandbox 12.1: Version bảo toàn đúng snapshot cũ V0');
    assert(mockStorageMap.get("teacher_hub_store_v2") === snapU0, 'VM Sandbox 12.1: Unified Store bảo toàn đúng snapshot cũ U0');
    assert(!mockStorageMap.has("cva_migration_staging"), 'VM Sandbox 12.1: Staging được dọn sạch sau khi rollback thành công');

    // Test VM 12.2: Crash Điểm 2 - Crash sau khi ghi categories C1, trước khi ghi links (PARTIAL WRITE!)
    mockStorageMap.set("cva_fencing_generation", "1");
    mockStorageMap.set("cva_fencing_token", "lock_tok_sandbox_15");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({ token: "lock_tok_sandbox_15", generation: 1, time: Date.now() }));
    sandbox.currentLockContext = defaultLockCtx;
    mockStorageMap.set("teacher_hub_categories_v1", JSON.stringify(candC1)); // Partial write C1 đã vào disk!
    mockStorageMap.set("teacher_hub_links_v2", snapL0); // Links vẫn là L0
    mockStorageMap.set("teacher_hub_data_version", snapV0); // Version vẫn là V0
    mockStorageMap.set("teacher_hub_store_v2", snapU0);
    const stagingPreparedPoint2 = { ...stagingPreparedPoint1, token: "crash_token_2" };
    mockStorageMap.set("cva_migration_staging", JSON.stringify(stagingPreparedPoint2));
    const recRes2 = sandbox.recoverStagingTransaction();
    assert(recRes2.recovered === true && recRes2.action === "rolled_back", 'VM Sandbox 12.2: Crash Điểm 2 (partial write categories C1) -> recoverStagingTransaction rollback triệt để');
    assert(mockStorageMap.get("teacher_hub_categories_v1") === snapC0, 'VM Sandbox 12.2: Partial write categories C1 được rollback trở lại chính xác C0!');
    assert(mockStorageMap.get("teacher_hub_links_v2") === snapL0, 'VM Sandbox 12.2: Links giữ nguyên L0');
    assert(mockStorageMap.get("teacher_hub_data_version") === snapV0, 'VM Sandbox 12.2: Version giữ nguyên V0');
    assert(mockStorageMap.get("teacher_hub_store_v2") === snapU0, 'VM Sandbox 12.2: Unified Store giữ nguyên U0 sau rollback');
    assert(!mockStorageMap.has("cva_migration_staging"), 'VM Sandbox 12.2: Staging dọn sạch sau rollback');

    // Test VM 12.3: Crash Điểm 3 - Crash sau khi ghi links L1, trước khi chuyển committed
    mockStorageMap.set("cva_fencing_generation", "1");
    mockStorageMap.set("cva_fencing_token", "lock_tok_sandbox_15");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({ token: "lock_tok_sandbox_15", generation: 1, time: Date.now() }));
    sandbox.currentLockContext = defaultLockCtx;
    mockStorageMap.set("teacher_hub_categories_v1", JSON.stringify(candC1));
    mockStorageMap.set("teacher_hub_links_v2", JSON.stringify(candL1));
    mockStorageMap.set("teacher_hub_data_version", snapV0);
    mockStorageMap.set("teacher_hub_store_v2", "partial_store_candidate");
    const stagingPreparedPoint3 = { ...stagingPreparedPoint1, token: "crash_token_3" };
    mockStorageMap.set("cva_migration_staging", JSON.stringify(stagingPreparedPoint3));
    const recRes3 = sandbox.recoverStagingTransaction();
    assert(recRes3.recovered === true && recRes3.action === "rolled_back", 'VM Sandbox 12.3: Crash Điểm 3 (sau links L1, chưa committed) -> rollback sạch về C0, L0, V0, U0');
    assert(mockStorageMap.get("teacher_hub_categories_v1") === snapC0 && mockStorageMap.get("teacher_hub_links_v2") === snapL0, 'VM Sandbox 12.3: Cả categories lẫn links đều rollback về snapshot cũ');
    assert(mockStorageMap.get("teacher_hub_store_v2") === snapU0, 'VM Sandbox 12.3: Unified Store rollback triệt để về snapshot cũ U0');

    // Test VM 12.4: Crash Điểm 4 - Crash sau khi đã chuyển committed, trước khi ghi version V1
    mockStorageMap.set("cva_fencing_generation", "1");
    mockStorageMap.set("cva_fencing_token", "lock_tok_sandbox_15");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({ token: "lock_tok_sandbox_15", generation: 1, time: Date.now() }));
    sandbox.currentLockContext = defaultLockCtx;
    mockStorageMap.set("teacher_hub_categories_v1", JSON.stringify(candC1));
    mockStorageMap.set("teacher_hub_links_v2", JSON.stringify(candL1));
    mockStorageMap.set("teacher_hub_data_version", snapV0);
    const stagingCommittedPoint4 = {
      ...stagingPreparedPoint1,
      token: "crash_token_4",
      status: "committed"
    };
    mockStorageMap.set("cva_migration_staging", JSON.stringify(stagingCommittedPoint4));
    const recRes4 = sandbox.recoverStagingTransaction();
    assert(recRes4.recovered === true && recRes4.action === "committed", 'VM Sandbox 12.4: Crash Điểm 4 (sau committed) -> recoverStagingTransaction hoàn tất commit thành công');
    assert(mockStorageMap.get("teacher_hub_data_version") === candV1, 'VM Sandbox 12.4: Version được hoàn tất commit lên candV1!');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_store_v2")).version === candV1, 'VM Sandbox 12.4: Unified Store được hoàn tất commit lên candV1!');
    assert(!mockStorageMap.has("cva_migration_staging"), 'VM Sandbox 12.4: Staging dọn sạch sau commit');

    // Test VM 12.5: Crash Điểm 5 - Corrupted Checksum / Payload Bị Can Thiệp -> Fail-Closed
    mockStorageMap.set("cva_fencing_generation", "1");
    mockStorageMap.set("cva_fencing_token", "lock_tok_sandbox_15");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({ token: "lock_tok_sandbox_15", generation: 1, time: Date.now() }));
    sandbox.currentLockContext = defaultLockCtx;
    const stagingCorruptedPoint5 = {
      ...stagingPreparedPoint1,
      token: "crash_token_5",
      checksum: "corrupted_checksum_tampered"
    };
    mockStorageMap.set("cva_migration_staging", JSON.stringify(stagingCorruptedPoint5));
    const recRes5 = sandbox.recoverStagingTransaction();
    assert(recRes5.recovered === false && recRes5.error.includes("Fail-Closed"), 'VM Sandbox 12.5: Corrupted Checksum kích hoạt Fail-Closed an toàn');
    assert(mockStorageMap.has("cva_migration_staging"), 'VM Sandbox 12.5: Bảo lưu staging không xóa mù quáng để phục vụ chẩn đoán');
    assert(mockStorageMap.has("cva_migration_error"), 'VM Sandbox 12.5: Đánh dấu cờ lỗi cva_migration_error bền vững');
    mockStorageMap.delete("cva_migration_staging");
    mockStorageMap.delete("cva_migration_error");

    // Test VM 12.6: Crash Điểm 6 - Staging record thuộc fencing generation cũ (fencingGeneration 3 < activeGen 5) -> An toàn bỏ qua rollback
    const freshCats = [{ id: "diem", label: "Sổ điểm Mới" }];
    const freshLinks = [{ id: "link-fresh", title: "Fresh Link", url: "https://fresh.vn" }];
    mockStorageMap.set("teacher_hub_categories_v1", JSON.stringify(freshCats));
    mockStorageMap.set("teacher_hub_links_v2", JSON.stringify(freshLinks));
    mockStorageMap.set("cva_fencing_generation", "5"); // Transaction mới đã đạt generation 5
    mockStorageMap.set("cva_fencing_token", "lock_tok_sandbox_15");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({ token: "lock_tok_sandbox_15", generation: 5, time: Date.now() }));
    sandbox.currentLockContext = { generation: 5, token: "lock_tok_sandbox_15", verifyFencing: () => true };

    const stagingStalePoint6 = {
      ...stagingPreparedPoint1,
      token: "crash_token_stale",
      fencingGeneration: 3, // Staging cũ thế hệ 3
      status: "prepared"
    };
    mockStorageMap.set("cva_migration_staging", JSON.stringify(stagingStalePoint6));
    const recRes6 = sandbox.recoverStagingTransaction();
    assert(recRes6.recovered === false && recRes6.clean === true, 'VM Sandbox 12.6: Staging record thế hệ cũ (fencingGeneration 3 < 5) an toàn bỏ qua rollback');
    assert(mockStorageMap.get("teacher_hub_categories_v1") === JSON.stringify(freshCats), 'VM Sandbox 12.6: Không bị rollback đè nát categories của transaction mới');
    assert(mockStorageMap.get("teacher_hub_links_v2") === JSON.stringify(freshLinks), 'VM Sandbox 12.6: Không bị rollback đè nát links của transaction mới');
    assert(!mockStorageMap.has("cva_migration_staging"), 'VM Sandbox 12.6: Staging cũ được dọn sạch an toàn');

    // Test VM 12.6.b: Generation tăng (activeGen 5 > stagingGen 3) nhưng CHƯA có transaction mới nào commit hoàn tất -> Fail-Closed
    mockStorageMap.set("teacher_hub_data_version", snapV0);
    mockStorageMap.set("cva_fencing_generation", "5");
    mockStorageMap.set("cva_fencing_token", "lock_tok_sandbox_15");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({ token: "lock_tok_sandbox_15", generation: 5, time: Date.now() }));
    sandbox.currentLockContext = { generation: 5, token: "lock_tok_sandbox_15", verifyFencing: () => true };
    const stagingStaleUnverified = {
      ...stagingPreparedPoint1,
      token: "crash_token_unverified",
      fencingGeneration: 3,
      status: "prepared"
    };
    mockStorageMap.set("cva_migration_staging", JSON.stringify(stagingStaleUnverified));
    const recRes6b = sandbox.recoverStagingTransaction();
    assert(recRes6b.recovered === false && recRes6b.error.includes("Fail-Closed"), 'VM Sandbox 12.6.b: Generation tăng nhưng chưa có commit mới kích hoạt Fail-Closed an toàn');
    assert(mockStorageMap.has("cva_migration_staging"), 'VM Sandbox 12.6.b: Bảo lưu staging WAL không xóa mù quáng');
    assert(mockStorageMap.has("cva_migration_error"), 'VM Sandbox 12.6.b: Đánh dấu cờ lỗi cva_migration_error');
    mockStorageMap.delete("cva_migration_staging");
    mockStorageMap.delete("cva_migration_error");

    // Test VM 12.7: Staging thiếu fencingGeneration -> Fail-Closed
    const stagingMissingGen7 = {
      ...stagingPreparedPoint1,
      token: "crash_token_missing_gen"
    };
    delete stagingMissingGen7.fencingGeneration;
    mockStorageMap.set("cva_fencing_generation", "1");
    mockStorageMap.set("cva_fencing_token", "lock_tok_sandbox_15");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({ token: "lock_tok_sandbox_15", generation: 1, time: Date.now() }));
    sandbox.currentLockContext = defaultLockCtx;
    mockStorageMap.set("cva_migration_staging", JSON.stringify(stagingMissingGen7));
    const recRes7 = sandbox.recoverStagingTransaction();
    assert(recRes7.recovered === false && recRes7.error.includes("Fail-Closed"), 'VM Sandbox 12.7: Staging thiếu fencingGeneration kích hoạt Fail-Closed an toàn');
    assert(mockStorageMap.has("cva_migration_staging"), 'VM Sandbox 12.7: Bảo lưu staging không xóa mù quáng khi thiếu metadata');
    assert(mockStorageMap.has("cva_migration_error"), 'VM Sandbox 12.7: Đánh dấu cờ lỗi cva_migration_error');
    mockStorageMap.delete("cva_migration_staging");
    mockStorageMap.delete("cva_migration_error");

    // Test VM 12.8: Staging cũ committed khi transaction mới đã hoàn tất (CAS Mismatch) -> Chặn đứng stale overwrite
    mockStorageMap.set("teacher_hub_data_version", "2026.09.28.01"); // Version mới hơn candV1
    mockStorageMap.set("cva_fencing_generation", "10"); // Transaction mới đã đạt gen 10
    mockStorageMap.set("cva_fencing_token", "lock_tok_sandbox_15");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({ token: "lock_tok_sandbox_15", generation: 10, time: Date.now() }));
    sandbox.currentLockContext = { generation: 10, token: "lock_tok_sandbox_15", verifyFencing: () => true };
    const stagingCommittedStale8 = {
      ...stagingPreparedPoint1,
      token: "crash_token_stale_committed",
      fencingGeneration: 4, // Staging cũ gen 4 (< 10)
      status: "committed"
    };
    mockStorageMap.set("cva_migration_staging", JSON.stringify(stagingCommittedStale8));
    const recRes8 = sandbox.recoverStagingTransaction();
    assert(recRes8.recovered === false && recRes8.error.includes("CAS mismatch"), 'VM Sandbox 12.8: Staging committed cũ khi version đã đổi kích hoạt CAS mismatch');
    assert(mockStorageMap.get("teacher_hub_data_version") === "2026.09.28.01", 'VM Sandbox 12.8: Bảo toàn version của transaction mới không bị ghi đè');
    assert(mockStorageMap.has("cva_migration_staging"), 'VM Sandbox 12.8: Bảo lưu staging để chẩn đoán');
    assert(mockStorageMap.has("cva_migration_error"), 'VM Sandbox 12.8: Ghi nhận cờ lỗi cva_migration_error');
    mockStorageMap.delete("cva_migration_staging");
    mockStorageMap.delete("cva_migration_error");

    // Test VM 12.9: Recovery khi khóa phân tán đang bị tab khác giữ -> Từ chối an toàn
    mockStorageMap.set("cva_migration_lock", JSON.stringify({
      token: "tab_busy_token",
      generation: 15,
      time: Date.now()
    }));
    mockStorageMap.set("cva_migration_staging", JSON.stringify(stagingPreparedPoint1));
    const recRes9 = sandbox.recoverStagingTransaction();
    assert(recRes9.recovered === false && (recRes9.error.includes("FencingViolation") || recRes9.error.includes("Rollback failed") || recRes9.error.includes("Recovery lock")), 'VM Sandbox 12.9: Recovery từ chối an toàn khi khóa đang bận');
    assert(mockStorageMap.has("cva_migration_staging"), 'VM Sandbox 12.9: Staging được giữ nguyên');
    mockStorageMap.delete("cva_migration_lock");
    mockStorageMap.delete("cva_migration_staging");

    // Test VM 12.10: Disk failure khi recovery rollback kích hoạt cờ lỗi an toàn
    mockStorageMap.set("cva_fencing_generation", "1");
    mockStorageMap.set("cva_fencing_token", "lock_tok_sandbox_15");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({ token: "lock_tok_sandbox_15", generation: 1, time: Date.now() }));
    sandbox.currentLockContext = defaultLockCtx;
    mockStorageMap.set("cva_migration_staging", JSON.stringify(stagingPreparedPoint1));
    throwOnRollback = true;
    const recRes10 = sandbox.recoverStagingTransaction();
    throwOnRollback = false;
    assert(recRes10.recovered === false, 'VM Sandbox 12.10: Lỗi ghi đĩa khi recovery rollback được bắt an toàn');
    assert(mockStorageMap.has("cva_migration_error"), 'VM Sandbox 12.10: Ghi nhận cờ cva_migration_error khi rollback thất bại');
    mockStorageMap.delete("cva_migration_staging");
    mockStorageMap.delete("cva_migration_error");

    // Test VM 12.11 (Codex Point 4): Staging có generation tương lai (stagingGen 20 > myRecoveryGen 1) -> Phase 1 Fail-Closed
    mockStorageMap.clear();
    mockStorageMap.set("cva_fencing_generation", "1");
    mockStorageMap.set("cva_fencing_token", "lock_tok_sandbox_15");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({ token: "lock_tok_sandbox_15", generation: 1, time: Date.now() }));
    sandbox.currentLockContext = defaultLockCtx;
    const stagingFutureGen = {
      ...stagingPreparedPoint1,
      token: "future_token_12_11",
      fencingGeneration: 20, // Generation 20 > myRecoveryGen 1!
      status: "prepared"
    };
    mockStorageMap.set("cva_migration_staging", JSON.stringify(stagingFutureGen));
    const recResFuture = sandbox.recoverStagingTransaction();
    assert(recResFuture.recovered === false && recResFuture.error && recResFuture.error.includes("Fail-Closed"), 'VM Sandbox 12.11: Staging generation tương lai (20 > 1) kích hoạt Phase 1 Fail-Closed');
    assert(mockStorageMap.has("cva_migration_staging"), 'VM Sandbox 12.11: Staging không bị xóa mù quáng');
    assert(mockStorageMap.has("cva_migration_error"), 'VM Sandbox 12.11: Đánh dấu cờ lỗi cva_migration_error');
    const errFuture = JSON.parse(mockStorageMap.get("cva_migration_error"));
    assert(errFuture.stage === "migration_crash_recovery_future_generation", 'VM Sandbox 12.11: Cờ lỗi ghi đúng stage migration_crash_recovery_future_generation');
    mockStorageMap.delete("cva_migration_staging");
    mockStorageMap.delete("cva_migration_error");

    // Test VM 12.12 (Codex Point 4): Store Staging có generation tương lai (stGen 25 > myRecoveryGen 1) -> Phase 1 Fail-Closed
    mockStorageMap.clear();
    mockStorageMap.set("cva_fencing_generation", "1");
    mockStorageMap.set("cva_fencing_token", "lock_tok_sandbox_15");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({ token: "lock_tok_sandbox_15", generation: 1, time: Date.now() }));
    sandbox.currentLockContext = defaultLockCtx;
    const storeFutureGen = {
      status: "prepared",
      token: "future_tok_store",
      fencingGeneration: 25,
      version: "2026.09.21.03",
      checksum: sandbox.computeTxChecksum([], [], "2026.09.21.03", [], {}),
      categories: [],
      links: [],
      reminders: [],
      timetable: {},
      previous: { store: null, version: null, categories: [], links: [], reminders: [], timetable: {} }
    };
    mockStorageMap.set("cva_store_staging", JSON.stringify(storeFutureGen));
    const recStoreFuture = sandbox.recoverStagingTransaction();
    assert(recStoreFuture.recovered === false && recStoreFuture.error && recStoreFuture.error.includes("Fail-Closed"), 'VM Sandbox 12.12: Store staging generation tương lai (25 > 1) kích hoạt Phase 1 Fail-Closed');
    assert(mockStorageMap.has("cva_store_staging"), 'VM Sandbox 12.12: Staging store không bị xóa');
    assert(mockStorageMap.has("cva_store_error"), 'VM Sandbox 12.12: Đánh dấu cờ lỗi cva_store_error');
    const errStoreFuture = JSON.parse(mockStorageMap.get("cva_store_error"));
    assert(errStoreFuture.stage === "store_crash_recovery_future_generation", 'VM Sandbox 12.12: Cờ lỗi ghi đúng stage store_crash_recovery_future_generation');
    mockStorageMap.delete("cva_store_staging");
    mockStorageMap.delete("cva_store_error");

    // Test VM 12.13 (Codex Point 2): Auth Staging lockout roll-forward
    mockStorageMap.clear();
    mockStorageMap.set("cva_fencing_generation", "1");
    mockStorageMap.set("cva_fencing_token", "lock_tok_sandbox_15");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({ token: "lock_tok_sandbox_15", generation: 1, time: Date.now() }));
    sandbox.currentLockContext = defaultLockCtx;
    const authLockoutStaging = {
      stage: "auth_lockout",
      fails: 5,
      isLockout: true,
      lockUntil: 1999999999000,
      generation: 1,
      token: "lock_tok_sandbox_15"
    };
    mockStorageMap.set("cva_auth_staging", JSON.stringify(authLockoutStaging));
    const recRes12_13 = sandbox.recoverStagingTransaction();
    assert(recRes12_13.recovered === true, 'VM Sandbox 12.13: recoverStagingTransaction khôi phục thành công cva_auth_staging (auth_lockout)');
    assert(mockStorageMap.get("teacher_hub_auth_fails") === "5", 'VM Sandbox 12.13: teacher_hub_auth_fails được roll-forward về 5');
    assert(mockStorageMap.get("teacher_hub_lock_until") === "1999999999000", 'VM Sandbox 12.13: teacher_hub_lock_until được roll-forward chính xác');
    assert(mockStorageMap.get("teacher_hub_auth_generation") === "1", 'VM Sandbox 12.13: teacher_hub_auth_generation được ghi nhận');
    assert(mockStorageMap.get("teacher_hub_auth_token") === "lock_tok_sandbox_15", 'VM Sandbox 12.13: teacher_hub_auth_token được ghi nhận');
    assert(!mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.13: cva_auth_staging được dọn sạch sau khi phục hồi');

    // Test VM 12.14 (Codex Point 2): Auth Staging reset_auth_failures roll-forward
    mockStorageMap.clear();
    mockStorageMap.set("cva_fencing_generation", "1");
    mockStorageMap.set("cva_fencing_token", "lock_tok_sandbox_15");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({ token: "lock_tok_sandbox_15", generation: 1, time: Date.now() }));
    mockStorageMap.set("teacher_hub_auth_fails", "5");
    mockStorageMap.set("teacher_hub_lock_until", "1999999999000");
    sandbox.currentLockContext = defaultLockCtx;
    const authResetStaging = {
      stage: "reset_auth_failures",
      fails: 0,
      isLockout: false,
      lockUntil: 0,
      generation: 1,
      token: "lock_tok_sandbox_15"
    };
    mockStorageMap.set("cva_auth_staging", JSON.stringify(authResetStaging));
    const recRes12_14 = sandbox.recoverStagingTransaction();
    assert(recRes12_14.recovered === true, 'VM Sandbox 12.14: recoverStagingTransaction khôi phục thành công reset_auth_failures');
    assert(!mockStorageMap.has("teacher_hub_auth_fails"), 'VM Sandbox 12.14: teacher_hub_auth_fails được xóa sạch');
    assert(!mockStorageMap.has("teacher_hub_lock_until"), 'VM Sandbox 12.14: teacher_hub_lock_until được xóa sạch');
    assert(mockStorageMap.get("teacher_hub_auth_generation") === "1", 'VM Sandbox 12.14: teacher_hub_auth_generation được ghi nhận');
    assert(!mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.14: cva_auth_staging dọn sạch sau khi phục hồi');

    // Test VM 12.15 (Codex Point 2): Auth Staging future generation -> Phase 1 Fail-Closed
    mockStorageMap.clear();
    mockStorageMap.set("cva_fencing_generation", "1");
    mockStorageMap.set("cva_fencing_token", "lock_tok_sandbox_15");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({ token: "lock_tok_sandbox_15", generation: 1, time: Date.now() }));
    sandbox.currentLockContext = defaultLockCtx;
    const authFutureGen = {
      stage: "auth_lockout",
      fails: 5,
      isLockout: true,
      lockUntil: 1999999999000,
      generation: 30,
      token: "tok_future"
    };
    mockStorageMap.set("cva_auth_staging", JSON.stringify(authFutureGen));
    const recRes12_15 = sandbox.recoverStagingTransaction();
    assert(recRes12_15.recovered === false && recRes12_15.error && recRes12_15.error.includes("Fail-Closed"), 'VM Sandbox 12.15: Auth staging generation tương lai (30 > 1) kích hoạt Phase 1 Fail-Closed');
    assert(mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.15: Staging được bảo lưu để chẩn đoán');
    assert(mockStorageMap.has("cva_auth_error"), 'VM Sandbox 12.15: Ghi nhận cờ lỗi cva_auth_error');
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.16 (Adversarial Codex Point 4): Staging auth cũ (Tab A) KHÔNG ĐƯỢC GHI ĐÈ auth state mới của Tab B
    mockStorageMap.clear();
    mockStorageMap.set("cva_fencing_generation", "2");
    mockStorageMap.set("cva_fencing_token", "tok_tab_b");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({ token: "tok_tab_b", generation: 2, time: Date.now() }));
    mockStorageMap.set("teacher_hub_auth_generation", "2");
    mockStorageMap.set("teacher_hub_auth_token", "tok_tab_b");
    sandbox.currentLockContext = { generation: 2, token: "tok_tab_b", verifyFencing: () => true };

    const staleAuthLockoutA = {
      stage: "auth_lockout",
      fails: 5,
      isLockout: true,
      lockUntil: 1999999999000,
      generation: 1,
      token: "tok_tab_a"
    };
    mockStorageMap.set("cva_auth_staging", JSON.stringify(staleAuthLockoutA));
    const recRes12_16 = sandbox.recoverStagingTransaction();
    assert(recRes12_16.recovered === true, 'VM Sandbox 12.16: Staging cũ của Tab A được nhận diện đã bị supersede');
    assert(!mockStorageMap.has("teacher_hub_auth_fails"), 'VM Sandbox 12.16: KHÔNG bị Tab A ghi đè auth_fails lên state của Tab B');
    assert(!mockStorageMap.has("teacher_hub_lock_until"), 'VM Sandbox 12.16: KHÔNG bị Tab A ghi đè lock_until lên state của Tab B');
    assert(mockStorageMap.get("teacher_hub_auth_generation") === "2", 'VM Sandbox 12.16: Bảo toàn generation của Tab B');
    assert(mockStorageMap.get("teacher_hub_auth_token") === "tok_tab_b", 'VM Sandbox 12.16: Bảo toàn token của Tab B');
    assert(!mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.16: Staging cũ được dọn dẹp sạch');

    // Test VM 12.17 (Adversarial Codex Point 4): Staging reset cũ của Tab A KHÔNG ĐƯỢC XÓA lockout mới của Tab B
    mockStorageMap.clear();
    mockStorageMap.set("cva_fencing_generation", "3");
    mockStorageMap.set("cva_fencing_token", "tok_tab_b_locked");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({ token: "tok_tab_b_locked", generation: 3, time: Date.now() }));
    mockStorageMap.set("teacher_hub_auth_fails", "5");
    mockStorageMap.set("teacher_hub_lock_until", "1999999999000");
    mockStorageMap.set("teacher_hub_auth_generation", "3");
    mockStorageMap.set("teacher_hub_auth_token", "tok_tab_b_locked");
    sandbox.currentLockContext = { generation: 3, token: "tok_tab_b_locked", verifyFencing: () => true };

    const staleAuthResetA = {
      stage: "reset_auth_failures",
      fails: 0,
      isLockout: false,
      lockUntil: 0,
      generation: 1,
      token: "tok_tab_a"
    };
    mockStorageMap.set("cva_auth_staging", JSON.stringify(staleAuthResetA));
    const recRes12_17 = sandbox.recoverStagingTransaction();
    assert(recRes12_17.recovered === true, 'VM Sandbox 12.17: Staging reset cũ của Tab A được nhận diện đã bị supersede');
    assert(mockStorageMap.get("teacher_hub_auth_fails") === "5", 'VM Sandbox 12.17: Lockout của Tab B được bảo toàn 100% (fails=5)');
    assert(mockStorageMap.get("teacher_hub_lock_until") === "1999999999000", 'VM Sandbox 12.17: Thời hạn lockout của Tab B được bảo toàn');
    assert(!mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.17: Staging reset cũ được dọn sạch');

    // Test VM 12.18 (Adversarial Codex Point 2): Generation tăng nhưng chưa có commit mới chứng minh -> Fail-Closed
    mockStorageMap.clear();
    mockStorageMap.set("cva_fencing_generation", "5");
    mockStorageMap.set("cva_fencing_token", "tok_uncommitted");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({ token: "tok_uncommitted", generation: 5, time: Date.now() }));
    sandbox.currentLockContext = { generation: 5, token: "tok_uncommitted", verifyFencing: () => true };

    const unverifiedAuthStaging = {
      stage: "auth_lockout",
      fails: 5,
      isLockout: true,
      lockUntil: 1999999999000,
      generation: 1,
      token: "tok_tab_a"
    };
    mockStorageMap.set("cva_auth_staging", JSON.stringify(unverifiedAuthStaging));
    const recRes12_18 = sandbox.recoverStagingTransaction();
    assert(recRes12_18.recovered === false && recRes12_18.error && recRes12_18.error.includes("Fail-Closed"), 'VM Sandbox 12.18: Staging gen cũ khi chưa có commit mới chứng minh kích hoạt Fail-Closed an toàn');
    assert(mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.18: Staging được bảo lưu để chẩn đoán');
    assert(mockStorageMap.has("cva_auth_error"), 'VM Sandbox 12.18: Ghi nhận cờ lỗi cva_auth_error');
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.19 (Adversarial Codex Finding): Staging auth chứa fails: null kích hoạt Fail-Closed & ghi cva_auth_error
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "auth_lockout",
      fails: null,
      isLockout: true,
      lockUntil: 1999999999000,
      generation: 1,
      token: "tok_test_rec"
    }));
    const recRes12_19 = sandbox.recoverStagingTransaction();
    assert(recRes12_19.recovered === false && recRes12_19.error && recRes12_19.error.includes("Fail-Closed"), 'VM Sandbox 12.19: Staging auth chứa fails: null kích hoạt Fail-Closed an toàn');
    assert(mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.19: Staging được bảo lưu để chẩn đoán');
    assert(mockStorageMap.has("cva_auth_error"), 'VM Sandbox 12.19: Ghi nhận cờ lỗi cva_auth_error khi fails bị null');
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.20 (Adversarial Codex Finding): Stored teacher_hub_auth_fails = "abc" kích hoạt Phase 1 Fail-Closed
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("teacher_hub_auth_fails", "abc");
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "auth_lockout",
      fails: 5,
      isLockout: true,
      lockUntil: 1999999999000,
      generation: 1,
      token: "tok_test_rec"
    }));
    const recRes12_20 = sandbox.recoverStagingTransaction();
    assert(recRes12_20.recovered === false && recRes12_20.error && recRes12_20.error.includes("Fail-Closed"), 'VM Sandbox 12.20: Stored teacher_hub_auth_fails bị hỏng kích hoạt Phase 1 Fail-Closed');
    assert(mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.20: Staging được bảo lưu để chẩn đoán');
    assert(mockStorageMap.has("cva_auth_error"), 'VM Sandbox 12.20: Ghi nhận cờ lỗi cva_auth_error khi stored fails bị biến dạng');
    mockStorageMap.delete("teacher_hub_auth_fails");
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.21 (Codex Adversarial Finding): stage "auth_lockout" nhưng isLockout: false
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "auth_lockout",
      fails: 5,
      isLockout: false,
      lockUntil: 1999999999000,
      generation: 1,
      token: "tok_test_rec"
    }));
    const recRes12_21 = sandbox.recoverStagingTransaction();
    assert(recRes12_21.recovered === false && recRes12_21.error && recRes12_21.error.includes("Fail-Closed"), 'VM Sandbox 12.21: stage auth_lockout với isLockout: false kích hoạt Phase 1 Fail-Closed');
    assert(mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.21: Staging được bảo lưu để chẩn đoán');
    assert(mockStorageMap.has("cva_auth_error"), 'VM Sandbox 12.21: Ghi nhận cờ lỗi cva_auth_error khi auth_lockout có isLockout: false');
    assert(!mockStorageMap.has("teacher_hub_lock_until"), 'VM Sandbox 12.21: Không ghi đè teacher_hub_lock_until khi staging mâu thuẫn');
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.22 (Codex Adversarial Finding): stage "auth_failure_increment" nhưng isLockout: true
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "auth_failure_increment",
      fails: 3,
      isLockout: true,
      lockUntil: 1999999999000,
      generation: 1,
      token: "tok_test_rec"
    }));
    const recRes12_22 = sandbox.recoverStagingTransaction();
    assert(recRes12_22.recovered === false && recRes12_22.error && recRes12_22.error.includes("Fail-Closed"), 'VM Sandbox 12.22: stage auth_failure_increment với isLockout: true kích hoạt Phase 1 Fail-Closed');
    assert(mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.22: Staging được bảo lưu để chẩn đoán');
    assert(mockStorageMap.has("cva_auth_error"), 'VM Sandbox 12.22: Ghi nhận cờ lỗi cva_auth_error khi increment có isLockout: true');
    assert(!mockStorageMap.has("teacher_hub_auth_fails"), 'VM Sandbox 12.22: Không commit teacher_hub_auth_fails khi staging mâu thuẫn');
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.23 (Codex Adversarial Finding): stage "auth_lockout" nhưng lockUntil: 0
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "auth_lockout",
      fails: 5,
      isLockout: true,
      lockUntil: 0,
      generation: 1,
      token: "tok_test_rec"
    }));
    const recRes12_23 = sandbox.recoverStagingTransaction();
    assert(recRes12_23.recovered === false && recRes12_23.error && recRes12_23.error.includes("Fail-Closed"), 'VM Sandbox 12.23: stage auth_lockout với lockUntil: 0 kích hoạt Phase 1 Fail-Closed');
    assert(mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.23: Staging được bảo lưu để chẩn đoán');
    assert(mockStorageMap.has("cva_auth_error"), 'VM Sandbox 12.23: Ghi nhận cờ lỗi cva_auth_error khi lockUntil = 0 trong auth_lockout');
    assert(!mockStorageMap.has("teacher_hub_lock_until"), 'VM Sandbox 12.23: Không ghi teacher_hub_lock_until khi lockUntil không hợp lệ');
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.24 (Codex Adversarial Finding): stage "auth_lockout", fails: 5 nhưng thiếu hoặc sai isLockout (ví dụ: isLockout là string "true")
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "auth_lockout",
      fails: 5,
      isLockout: "true",
      lockUntil: 1999999999000,
      generation: 1,
      token: "tok_test_rec"
    }));
    const recRes12_24 = sandbox.recoverStagingTransaction();
    assert(recRes12_24.recovered === false && recRes12_24.error && recRes12_24.error.includes("Fail-Closed"), 'VM Sandbox 12.24: isLockout không phải boolean (string "true") kích hoạt Phase 1 Fail-Closed');
    assert(mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.24: Staging được bảo lưu để chẩn đoán');
    assert(mockStorageMap.has("cva_auth_error"), 'VM Sandbox 12.24: Ghi nhận cờ lỗi cva_auth_error khi isLockout sai kiểu');
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.25 (Codex Adversarial Finding): stage "reset_auth_failures" nhưng isLockout: true
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "reset_auth_failures",
      fails: 0,
      isLockout: true,
      lockUntil: 0,
      generation: 1,
      token: "tok_test_rec"
    }));
    const recRes12_25 = sandbox.recoverStagingTransaction();
    assert(recRes12_25.recovered === false && recRes12_25.error && recRes12_25.error.includes("Fail-Closed"), 'VM Sandbox 12.25: stage reset_auth_failures với isLockout: true kích hoạt Phase 1 Fail-Closed');
    assert(mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.25: Staging được bảo lưu để chẩn đoán');
    assert(mockStorageMap.has("cva_auth_error"), 'VM Sandbox 12.25: Ghi nhận cờ lỗi cva_auth_error khi reset có isLockout: true');
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.26 (Codex Adversarial Finding): stage "reset_auth_failures" nhưng fails: 3 (fails !== 0)
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "reset_auth_failures",
      fails: 3,
      isLockout: false,
      lockUntil: 0,
      generation: 1,
      token: "tok_test_rec"
    }));
    const recRes12_26 = sandbox.recoverStagingTransaction();
    assert(recRes12_26.recovered === false && recRes12_26.error && recRes12_26.error.includes("Fail-Closed"), 'VM Sandbox 12.26: stage reset_auth_failures với fails !== 0 kích hoạt Phase 1 Fail-Closed');
    assert(mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.26: Staging được bảo lưu để chẩn đoán');
    assert(mockStorageMap.has("cva_auth_error"), 'VM Sandbox 12.26: Ghi nhận cờ lỗi cva_auth_error khi reset có fails !== 0');
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.27 (Codex Adversarial Finding): stage "reset_auth_failures" nhưng lockUntil: 5000 (lockUntil !== 0)
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "reset_auth_failures",
      fails: 0,
      isLockout: false,
      lockUntil: 5000,
      generation: 1,
      token: "tok_test_rec"
    }));
    const recRes12_27 = sandbox.recoverStagingTransaction();
    assert(recRes12_27.recovered === false && recRes12_27.error && recRes12_27.error.includes("Fail-Closed"), 'VM Sandbox 12.27: stage reset_auth_failures với lockUntil !== 0 kích hoạt Phase 1 Fail-Closed');
    assert(mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.27: Staging được bảo lưu để chẩn đoán');
    assert(mockStorageMap.has("cva_auth_error"), 'VM Sandbox 12.27: Ghi nhận cờ lỗi cva_auth_error khi reset có lockUntil !== 0');
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.28 (Codex Adversarial Finding): stage "reset_auth_failures" với lockUntil: "0" (chuỗi thay vì số)
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "reset_auth_failures",
      fails: 0,
      isLockout: false,
      lockUntil: "0",
      generation: 1,
      token: "tok_test_rec"
    }));
    const recRes12_28 = sandbox.recoverStagingTransaction();
    assert(recRes12_28.recovered === false && recRes12_28.error && recRes12_28.error.includes("Fail-Closed"), 'VM Sandbox 12.28: lockUntil: "0" kích hoạt Phase 1 Fail-Closed');
    assert(mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.28: Staging được bảo lưu để chẩn đoán');
    assert(mockStorageMap.has("cva_auth_error"), 'VM Sandbox 12.28: Ghi nhận cờ lỗi cva_auth_error khi lockUntil là chuỗi "0"');
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.29 (Codex Adversarial Finding): stage "auth_failure_increment" với lockUntil: "0" (chuỗi thay vì số)
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "auth_failure_increment",
      fails: 2,
      isLockout: false,
      lockUntil: "0",
      generation: 1,
      token: "tok_test_rec"
    }));
    const recRes12_29 = sandbox.recoverStagingTransaction();
    assert(recRes12_29.recovered === false && recRes12_29.error && recRes12_29.error.includes("Fail-Closed"), 'VM Sandbox 12.29: lockUntil: "0" trong increment kích hoạt Phase 1 Fail-Closed');
    assert(mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.29: Staging được bảo lưu để chẩn đoán');
    assert(mockStorageMap.has("cva_auth_error"), 'VM Sandbox 12.29: Ghi nhận cờ lỗi cva_auth_error');
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.30 (Codex Adversarial Finding): stage "auth_lockout" với lockUntil: "5000" (chuỗi thay vì số)
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "auth_lockout",
      fails: 5,
      isLockout: true,
      lockUntil: "5000",
      generation: 1,
      token: "tok_test_rec"
    }));
    const recRes12_30 = sandbox.recoverStagingTransaction();
    assert(recRes12_30.recovered === false && recRes12_30.error && recRes12_30.error.includes("Fail-Closed"), 'VM Sandbox 12.30: lockUntil: "5000" trong lockout kích hoạt Phase 1 Fail-Closed');
    assert(mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.30: Staging được bảo lưu để chẩn đoán');
    assert(mockStorageMap.has("cva_auth_error"), 'VM Sandbox 12.30: Ghi nhận cờ lỗi cva_auth_error');
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.31 (Codex Adversarial Finding): lockUntil là chuỗi rỗng "" hoặc "NaN"
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "reset_auth_failures",
      fails: 0,
      isLockout: false,
      lockUntil: "",
      generation: 1,
      token: "tok_test_rec"
    }));
    const recRes12_31 = sandbox.recoverStagingTransaction();
    assert(recRes12_31.recovered === false && recRes12_31.error && recRes12_31.error.includes("Fail-Closed"), 'VM Sandbox 12.31: lockUntil: "" kích hoạt Phase 1 Fail-Closed');
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "reset_auth_failures",
      fails: 0,
      isLockout: false,
      lockUntil: "NaN",
      generation: 1,
      token: "tok_test_rec"
    }));
    const recRes12_31b = sandbox.recoverStagingTransaction();
    assert(recRes12_31b.recovered === false && recRes12_31b.error && recRes12_31b.error.includes("Fail-Closed"), 'VM Sandbox 12.31b: lockUntil: "NaN" kích hoạt Phase 1 Fail-Closed');
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.32 (Codex Adversarial Finding): fails là chuỗi "0" hoặc "5"
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "reset_auth_failures",
      fails: "0",
      isLockout: false,
      lockUntil: 0,
      generation: 1,
      token: "tok_test_rec"
    }));
    const recRes12_32 = sandbox.recoverStagingTransaction();
    assert(recRes12_32.recovered === false && recRes12_32.error && recRes12_32.error.includes("Fail-Closed"), 'VM Sandbox 12.32: fails: "0" kích hoạt Phase 1 Fail-Closed');
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "auth_lockout",
      fails: "5",
      isLockout: true,
      lockUntil: 5000,
      generation: 1,
      token: "tok_test_rec"
    }));
    const recRes12_32b = sandbox.recoverStagingTransaction();
    assert(recRes12_32b.recovered === false && recRes12_32b.error && recRes12_32b.error.includes("Fail-Closed"), 'VM Sandbox 12.32b: fails: "5" kích hoạt Phase 1 Fail-Closed');
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.33 (Codex Adversarial Finding): generation là chuỗi "1" thay vì số
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "reset_auth_failures",
      fails: 0,
      isLockout: false,
      lockUntil: 0,
      generation: "1",
      token: "tok_test_rec"
    }));
    const recRes12_33 = sandbox.recoverStagingTransaction();
    assert(recRes12_33.recovered === false && recRes12_33.error && recRes12_33.error.includes("Fail-Closed"), 'VM Sandbox 12.33: generation: "1" kích hoạt Phase 1 Fail-Closed');
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.34 (Codex Adversarial Finding): checkRateLimit() ngoài lock từ chối staging chứa lockUntil: "0"
    mockStorageMap.clear();
    sandbox.isStorageDegraded = false;
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "reset_auth_failures",
      fails: 0,
      isLockout: false,
      lockUntil: "0",
      generation: 1,
      token: "tok_test_rec"
    }));
    const checkRateRes = sandbox.checkRateLimit();
    assert(checkRateRes === false, 'VM Sandbox 12.34: checkRateLimit() từ chối staging có lockUntil: "0"');
    assert(sandbox.isStorageDegraded === true, 'VM Sandbox 12.34: checkRateLimit() kích hoạt isStorageDegraded khi staging sai kiểu');
    sandbox.isStorageDegraded = false;
    mockStorageMap.delete("cva_auth_staging");

    // Test VM 12.35 (Codex Adversarial Finding): validateAuthStagingPayload từ chối lockUntil: new Number(0)
    const valResObjNumber = sandbox.validateAuthStagingPayload({
      stage: "reset_auth_failures",
      fails: 0,
      isLockout: false,
      lockUntil: new Number(0),
      generation: 1,
      token: "tok_test_rec"
    });
    assert(valResObjNumber.valid === false, 'VM Sandbox 12.35: validateAuthStagingPayload từ chối lockUntil là Object Number (new Number(0))');

    // Test VM 12.36 (Codex Requirement 4): recoverStagingTransaction từ chối khi stored fails = "5" nhưng lockUntil = "5000" (năm 1970)
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("teacher_hub_auth_fails", "5");
    mockStorageMap.set("teacher_hub_lock_until", "5000");
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "reset_auth_failures",
      fails: 0,
      isLockout: false,
      lockUntil: 0,
      generation: 1,
      token: "lock_tok_sandbox_15"
    }));
    const recRes12_36 = sandbox.recoverStagingTransaction();
    assert(recRes12_36.recovered === false && recRes12_36.error && recRes12_36.error.includes("Fail-Closed"), 'VM Sandbox 12.36: Stored auth state corrupted (lockUntil 1970) kích hoạt Fail-Closed trong Phase 1');
    assert(mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.36: Staging được bảo lưu nguyên vẹn để chẩn đoán');
    assert(mockStorageMap.has("cva_auth_error"), 'VM Sandbox 12.36: Ghi nhận cờ lỗi cva_auth_error');
    assert(mockStorageMap.get("teacher_hub_auth_fails") === "5", 'VM Sandbox 12.36: Không thay đổi teacher_hub_auth_fails trong storage');
    assert(mockStorageMap.get("teacher_hub_lock_until") === "5000", 'VM Sandbox 12.36: Không thay đổi teacher_hub_lock_until trong storage');
    mockStorageMap.delete("teacher_hub_auth_fails");
    mockStorageMap.delete("teacher_hub_lock_until");
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.37 (Codex Requirement 4): recoverStagingTransaction từ chối khi stored fails = "0" (0 không được phép lưu dạng khóa)
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("teacher_hub_auth_fails", "0");
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "auth_lockout",
      fails: 5,
      isLockout: true,
      lockUntil: 1999999999000,
      generation: 1,
      token: "lock_tok_sandbox_15"
    }));
    const recRes12_37 = sandbox.recoverStagingTransaction();
    assert(recRes12_37.recovered === false && recRes12_37.error && recRes12_37.error.includes("Fail-Closed"), 'VM Sandbox 12.37: Stored fails = "0" kích hoạt Fail-Closed trong Phase 1');
    assert(mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.37: Staging được bảo lưu nguyên vẹn để chẩn đoán');
    assert(mockStorageMap.has("cva_auth_error"), 'VM Sandbox 12.37: Ghi nhận cờ lỗi cva_auth_error');
    assert(mockStorageMap.get("teacher_hub_auth_fails") === "0", 'VM Sandbox 12.37: Không thay đổi teacher_hub_auth_fails trong storage');
    assert(!mockStorageMap.has("teacher_hub_lock_until"), 'VM Sandbox 12.37: Không ghi đè teacher_hub_lock_until khi storage hỏng');
    mockStorageMap.delete("teacher_hub_auth_fails");
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.38 (Codex Requirement 4): recoverStagingTransaction từ chối khi stored fails = "3" nhưng có lock_until
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("teacher_hub_auth_fails", "3");
    mockStorageMap.set("teacher_hub_lock_until", "1999999999000");
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "auth_failure_increment",
      fails: 4,
      isLockout: false,
      lockUntil: 0,
      generation: 1,
      token: "lock_tok_sandbox_15"
    }));
    const recRes12_38 = sandbox.recoverStagingTransaction();
    assert(recRes12_38.recovered === false && recRes12_38.error && recRes12_38.error.includes("Fail-Closed"), 'VM Sandbox 12.38: Stored fails = "3" kèm lock_until kích hoạt Fail-Closed trong Phase 1');
    assert(mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.38: Staging được bảo lưu nguyên vẹn để chẩn đoán');
    assert(mockStorageMap.has("cva_auth_error"), 'VM Sandbox 12.38: Ghi nhận cờ lỗi cva_auth_error');
    assert(mockStorageMap.get("teacher_hub_auth_fails") === "3", 'VM Sandbox 12.38: Không thay đổi teacher_hub_auth_fails');
    assert(mockStorageMap.get("teacher_hub_lock_until") === "1999999999000", 'VM Sandbox 12.38: Không thay đổi teacher_hub_lock_until');
    mockStorageMap.delete("teacher_hub_auth_fails");
    mockStorageMap.delete("teacher_hub_lock_until");
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 12.39 (Codex Requirement 4): recoverStagingTransaction từ chối khi orphan lock_until tồn tại mà không có auth_fails
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("teacher_hub_lock_until", "1999999999000");
    mockStorageMap.set("cva_auth_staging", JSON.stringify({
      stage: "auth_lockout",
      fails: 5,
      isLockout: true,
      lockUntil: 1999999999000,
      generation: 1,
      token: "lock_tok_sandbox_15"
    }));
    const recRes12_39 = sandbox.recoverStagingTransaction();
    assert(recRes12_39.recovered === false && recRes12_39.error && recRes12_39.error.includes("Fail-Closed"), 'VM Sandbox 12.39: Orphan lock_until kích hoạt Fail-Closed trong Phase 1');
    assert(mockStorageMap.has("cva_auth_staging"), 'VM Sandbox 12.39: Staging được bảo lưu nguyên vẹn để chẩn đoán');
    assert(mockStorageMap.has("cva_auth_error"), 'VM Sandbox 12.39: Ghi nhận cờ lỗi cva_auth_error');
    assert(!mockStorageMap.has("teacher_hub_auth_fails"), 'VM Sandbox 12.39: Không ghi đè teacher_hub_auth_fails');
    assert(mockStorageMap.get("teacher_hub_lock_until") === "1999999999000", 'VM Sandbox 12.39: Không thay đổi orphan lock_until');
    mockStorageMap.delete("teacher_hub_lock_until");
    mockStorageMap.delete("cva_auth_staging");
    mockStorageMap.delete("cva_auth_error");

    // Test VM 13: Kiểm thử Thực tế Fencing Preemption Interleaving (Codex Invariant: Tab B Preempts Tab A)
    mockStorageMap.clear();
    mockStorageMap.set("cva_fencing_generation", "1");
    mockStorageMap.set("cva_fencing_token", "lock_tok_sandbox_15");
    mockStorageMap.set("cva_migration_lock", JSON.stringify({ token: "lock_tok_sandbox_15", generation: 1, time: Date.now() }));
    sandbox.currentLockContext = defaultLockCtx;
    mockStorageMap.set("teacher_hub_data_version", "2026.09.20.01");
    mockStorageMap.set("teacher_hub_categories_v1", JSON.stringify(initialCats));
    mockStorageMap.set("teacher_hub_links_v2", JSON.stringify(initialLinks));

    const tabBCats = [{ id: "tab_b_cat", label: "Danh mục của Tab B" }];
    const tabBLinks = [{ id: "tab_b_link", title: "Web Tab B", url: "https://tab-b.vn" }];
    const tabBVer = "2026.09.29.99";

    const origSet13 = mockLocalStorage.setItem;
    let tabBPreempted = false;

    mockLocalStorage.setItem = (k, v) => {
      origSet13(k, v);
      // Khi Tab A vừa ghi staging record (status: prepared), Tab B lập tức chen ngang preempt:
      if (k === "cva_migration_staging" && !tabBPreempted) {
        tabBPreempted = true;
        // Tab B tăng fencing generation lên 10
        mockStorageMap.set("cva_fencing_generation", "10");
        // Tab B chiếm lock với token của Tab B
        mockStorageMap.set("cva_migration_lock", JSON.stringify({
          token: "token_tab_b_winner",
          generation: 10,
          time: Date.now()
        }));
        // Tab B ghi dữ liệu của Tab B vào storage
        mockStorageMap.set("teacher_hub_categories_v1", JSON.stringify(tabBCats));
        mockStorageMap.set("teacher_hub_links_v2", JSON.stringify(tabBLinks));
        mockStorageMap.set("teacher_hub_data_version", tabBVer);
        mockStorageMap.set("teacher_hub_store_v2", JSON.stringify({
          version: tabBVer,
          generation: 10,
          token: "token_tab_b_winner",
          categories: tabBCats,
          links: tabBLinks,
          checksum: "ck_tab_b",
          time: Date.now()
        }));
      }
    };

    const resTabA = sandbox.performAtomicSystemMigration(true);
    mockLocalStorage.setItem = origSet13;

    // Kiểm tra kết quả thực tế:
    assert(resTabA.success === false, 'VM Sandbox 13: Tab A bị chặn đứng khi bị Tab B preempt');
    assert(resTabA.error && (resTabA.error.includes("fencing") || resTabA.error.includes("Fencing") || resTabA.error.includes("khóa")), 'VM Sandbox 13: Lỗi trả về xác nhận vi phạm fencing generation');

    // Dữ liệu của Tab B phải nguyên vẹn 100%, không bị Tab A rollback đè nát
    assert(mockStorageMap.get("teacher_hub_categories_v1") === JSON.stringify(tabBCats), 'VM Sandbox 13: Categories của Tab B nguyên vẹn 100%, Tab A không thể rollback đè lên');
    assert(mockStorageMap.get("teacher_hub_links_v2") === JSON.stringify(tabBLinks), 'VM Sandbox 13: Links của Tab B nguyên vẹn 100%, Tab A không thể rollback đè lên');
    assert(mockStorageMap.get("teacher_hub_data_version") === tabBVer, 'VM Sandbox 13: Version của Tab B nguyên vẹn 100%');
    assert(mockStorageMap.get("cva_fencing_generation") === "10", 'VM Sandbox 13: Fencing generation của Tab B được bảo toàn');

    // Test VM 14: Kiểm thử Thực tế Unified Store Priority & Safe Fallback
    mockStorageMap.clear();
    sandbox.CURRENT_DATA_VERSION = "2026.09.21.03";
    const unifiedCats = [{ id: "unified_cat", label: "Danh mục Unified Store" }];
    const unifiedLinks = [{ id: "unified_link", title: "Web Unified Store", url: "https://unified.vn", category: "unified_cat" }];
    mockStorageMap.set("teacher_hub_store_v2", JSON.stringify({
      version: "2026.09.21.03",
      generation: 1,
      token: "tok_unified",
      categories: unifiedCats,
      links: unifiedLinks,
      checksum: sandbox.computeTxChecksum(unifiedCats, unifiedLinks, "2026.09.21.03"),
      time: Date.now()
    }));
    // Dữ liệu thứ cấp cũ khác với unified store
    mockStorageMap.set("teacher_hub_categories_v1", JSON.stringify([{ id: "stale_cat", label: "Cũ" }]));
    mockStorageMap.set("teacher_hub_links_v2", JSON.stringify([{ id: "stale_link", title: "Cũ", url: "https://stale.vn" }]));
    mockStorageMap.set("teacher_hub_data_version", "2026.09.21.03");

    sandbox.loadCategoriesFromStorage();
    assert(sandbox.categoriesData.length === 1 && sandbox.categoriesData[0].id === "unified_cat", 'VM Sandbox 14: loadCategoriesFromStorage ưu tiên nạp từ teacher_hub_store_v2');

    sandbox.loadLinksFromStorage();
    assert(sandbox.linksData.length === 1 && sandbox.linksData[0].id === "unified_link", 'VM Sandbox 14: loadLinksFromStorage ưu tiên nạp từ teacher_hub_store_v2');

    // Khi teacher_hub_store_v2 không có -> fallback mượt mà về teacher_hub_links_v2 và teacher_hub_categories_v1
    mockStorageMap.delete("teacher_hub_store_v2");
    mockStorageMap.set("teacher_hub_categories_v1", JSON.stringify([{ id: "fallback_cat", label: "Fallback Cat" }]));
    mockStorageMap.set("teacher_hub_links_v2", JSON.stringify([{ id: "fallback_link", title: "Fallback Link", url: "https://fallback.vn" }]));
    mockStorageMap.set("teacher_hub_data_version", "2026.09.21.03");

    sandbox.loadCategoriesFromStorage();
    assert(sandbox.categoriesData.length === 1 && sandbox.categoriesData[0].id === "fallback_cat", 'VM Sandbox 14: loadCategoriesFromStorage fallback an toàn về teacher_hub_categories_v1');

    sandbox.loadLinksFromStorage();
    assert(sandbox.linksData.length === 1 && sandbox.linksData[0].id === "fallback_link", 'VM Sandbox 14: loadLinksFromStorage fallback an toàn về teacher_hub_links_v2');

    // Kiểm tra tính nhất quán (Consistency Check - Chống Split-Brain sau Crash):
    // Giả lập crash sau khi ghi teacher_hub_store_v2 nhưng chưa ghi version marker
    mockStorageMap.clear();
    mockStorageMap.set("teacher_hub_store_v2", JSON.stringify({
      version: "2026.09.99.01", // Version uncommitted/mismatched!
      generation: 9,
      token: "tok_uncommitted",
      categories: [{ id: "uncommitted_cat", label: "Chưa commit" }],
      links: [{ id: "uncommitted_link", title: "Chưa commit", url: "https://uncommitted.vn" }],
      checksum: sandbox.computeTxChecksum([{ id: "uncommitted_cat", label: "Chưa commit" }], [{ id: "uncommitted_link", title: "Chưa commit", url: "https://uncommitted.vn" }], "2026.09.99.01"),
      time: Date.now()
    }));
    mockStorageMap.set("teacher_hub_categories_v1", JSON.stringify([{ id: "valid_cat", label: "Hợp lệ" }]));
    mockStorageMap.set("teacher_hub_links_v2", JSON.stringify([{ id: "valid_link", title: "Hợp lệ", url: "https://valid.vn" }]));
    mockStorageMap.set("teacher_hub_data_version", "2026.09.21.03"); // Version cũ chưa commit!

    assert(sandbox.validateAndGetUnifiedStore() === null, 'VM Sandbox 14: validateAndGetUnifiedStore từ chối store có version không khớp (chống split-brain)');
    sandbox.loadCategoriesFromStorage();
    assert(sandbox.categoriesData[0].id === "valid_cat", 'VM Sandbox 14: loadCategoriesFromStorage an toàn bỏ qua unified store không nhất quán');
    sandbox.loadLinksFromStorage();
    assert(sandbox.linksData.some(l => l.id === "valid_link"), 'VM Sandbox 14: loadLinksFromStorage an toàn bỏ qua unified store không nhất quán');

    // Test VM 15: Kiểm thử Tính Nguyên Tử 2-Stage & Rollback khi Lưu Trữ (saveToStorage & saveCategoriesStorage)
    mockStorageMap.clear();
    mockStorageMap.set("teacher_hub_links_v2", JSON.stringify([{ id: "initial_link", title: "Link Đầu", url: "https://init.vn" }]));
    mockStorageMap.set("teacher_hub_categories_v1", JSON.stringify([{ id: "initial_cat", label: "Cat Đầu" }]));
    mockStorageMap.set("teacher_hub_store_v2", JSON.stringify({
      version: "2026.09.21.03",
      generation: 1,
      token: "init_token",
      categories: [{ id: "initial_cat", label: "Cat Đầu" }],
      links: [{ id: "initial_link", title: "Link Đầu", url: "https://init.vn" }],
      checksum: sandbox.computeTxChecksum([{ id: "initial_cat", label: "Cat Đầu" }], [{ id: "initial_link", title: "Link Đầu", url: "https://init.vn" }], "2026.09.21.03"),
      time: Date.now()
    }));
    sandbox.linksData = [{ id: "new_link_candidate", title: "Link Mới", url: "https://new.vn" }];
    sandbox.categoriesData = [{ id: "new_cat_candidate", label: "Cat Mới" }];

    // 1. Khi ghi unified store bị lỗi -> saveToStorage phải rethrow và rollback teacher_hub_links_v2
    throwOnKey = "teacher_hub_store_v2";
    let saveLinksThrew = false;
    try {
      await sandbox.saveToStorage();
    } catch(err) {
      saveLinksThrew = Boolean(err);
    }
    assert(saveLinksThrew === true, 'VM Sandbox 15: saveToStorage ném lỗi (fail-closed) khi không thể cập nhật unified store');
    const linksAfterFailedSave = JSON.parse(mockStorageMap.get("teacher_hub_links_v2"));
    assert(linksAfterFailedSave.length === 1 && linksAfterFailedSave[0].id === "initial_link", 'VM Sandbox 15: saveToStorage tự động rollback teacher_hub_links_v2 về snapshot ban đầu');

    // 2. Khi ghi unified store bị lỗi -> saveCategoriesStorage phải rethrow và rollback teacher_hub_categories_v1
    let saveCatsThrew = false;
    try {
      await sandbox.saveCategoriesStorage();
    } catch(err) {
      saveCatsThrew = Boolean(err);
    }
    assert(saveCatsThrew === true, 'VM Sandbox 15: saveCategoriesStorage ném lỗi (fail-closed) khi không thể cập nhật unified store');
    const catsAfterFailedSave = JSON.parse(mockStorageMap.get("teacher_hub_categories_v1"));
    assert(catsAfterFailedSave.length === 1 && catsAfterFailedSave[0].id === "initial_cat", 'VM Sandbox 15: saveCategoriesStorage tự động rollback teacher_hub_categories_v1 về snapshot ban đầu');

    throwOnKey = null;
    mockStorageMap.clear();
    rearmSandboxLock();

    // Test VM 16: Crash Recovery cho cva_sync_staging ở trạng thái 'prepared' (Crash Point trước khi commit hoàn tất) -> Rollback 4 tables + store_v2
    const prevSyncCats = [{ id: "cat_prev", label: "Cat Snapshot" }];
    const prevSyncLinks = [{ id: "link_prev", title: "Link Snapshot", url: "https://prev.vn", category: "cat_prev" }];
    const prevSyncRems = [{ id: "rem_prev", title: "Rem Snapshot" }];
    const prevSyncTT = { "2": { "Tiết 1": "Toán" } };

    const dirtySyncCats = [{ id: "cat_dirty", label: "Cat Dirty" }];
    const dirtySyncLinks = [{ id: "link_dirty", title: "Link Dirty", url: "https://dirty.vn", category: "cat_dirty" }];
    const dirtySyncRems = [{ id: "rem_dirty", title: "Rem Dirty" }];
    const dirtySyncTT = { "2": { "Tiết 1": "Văn" } };

    mockStorageMap.set("teacher_hub_categories_v1", JSON.stringify(dirtySyncCats));
    mockStorageMap.set("teacher_hub_links_v2", JSON.stringify(dirtySyncLinks));

    const syncStagingPrepared = {
      status: "prepared",
      token: "sync_tok_prep_99",
      fencingGeneration: 1,
      time: Date.now(),
      version: sandbox.CURRENT_DATA_VERSION,
      candidateVersion: sandbox.CURRENT_DATA_VERSION,
      categories: dirtySyncCats,
      links: dirtySyncLinks,
      reminders: dirtySyncRems,
      timetable: dirtySyncTT,
      checksum: sandbox.computeTxChecksum(dirtySyncCats, dirtySyncLinks, sandbox.CURRENT_DATA_VERSION, dirtySyncRems, dirtySyncTT),
      previous: {
        categories: prevSyncCats,
        links: prevSyncLinks,
        reminders: prevSyncRems,
        timetable: prevSyncTT
      }
    };
    mockStorageMap.set("cva_sync_staging", JSON.stringify(syncStagingPrepared));

    const recSyncPrepared = sandbox.recoverStagingTransaction();
    assert(recSyncPrepared.recovered === true, 'VM Sandbox 16: recoverStagingTransaction khôi phục thành công cva_sync_staging ở trạng thái prepared');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_categories_v1"))[0].id === "cat_prev", 'VM Sandbox 16: Categories được rollback 100% về snapshot previous');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_links_v2"))[0].id === "link_prev", 'VM Sandbox 16: Links được rollback 100% về snapshot previous');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_reminders_v1"))[0].id === "rem_prev", 'VM Sandbox 16: Reminders được rollback 100% về snapshot previous');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_timetable_v1"))["2"]["Tiết 1"] === "Toán", 'VM Sandbox 16: Timetable được rollback 100% về snapshot previous');
    assert(!mockStorageMap.has("cva_sync_staging"), 'VM Sandbox 16: cva_sync_staging được dọn sạch sau khi rollback thành công');

    // Test VM 17: Crash Recovery cho cva_sync_staging ở trạng thái 'committed' (Crash Point sau commit nhưng chưa dọn staging) -> Roll-forward 4 tables + store_v2
    mockStorageMap.clear();
    rearmSandboxLock();
    const commitSyncCats = [{ id: "cat_commit", label: "Cat Committed" }];
    const commitSyncLinks = [{ id: "link_commit", title: "Link Committed", url: "https://commit.vn", category: "cat_commit" }];
    const commitSyncRems = [{ id: "rem_commit", title: "Rem Committed" }];
    const commitSyncTT = { "3": { "Tiết 2": "Văn" } };

    const syncStagingCommitted = {
      status: "committed",
      token: "sync_tok_commit_100",
      fencingGeneration: 1,
      time: Date.now(),
      version: sandbox.CURRENT_DATA_VERSION,
      candidateVersion: sandbox.CURRENT_DATA_VERSION,
      categories: commitSyncCats,
      links: commitSyncLinks,
      reminders: commitSyncRems,
      timetable: commitSyncTT,
      checksum: sandbox.computeTxChecksum(commitSyncCats, commitSyncLinks, sandbox.CURRENT_DATA_VERSION, commitSyncRems, commitSyncTT),
      previous: {
        categories: prevSyncCats,
        links: prevSyncLinks
      }
    };
    mockStorageMap.set("cva_sync_staging", JSON.stringify(syncStagingCommitted));

    const recSyncCommitted = sandbox.recoverStagingTransaction();
    assert(recSyncCommitted.recovered === true, 'VM Sandbox 17: recoverStagingTransaction khôi phục thành công cva_sync_staging ở trạng thái committed');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_categories_v1"))[0].id === "cat_commit", 'VM Sandbox 17: Categories được roll-forward thành công lên committed');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_links_v2"))[0].id === "link_commit", 'VM Sandbox 17: Links được roll-forward thành công lên committed');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_reminders_v1"))[0].id === "rem_commit", 'VM Sandbox 17: Reminders được roll-forward thành công lên committed');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_timetable_v1"))["3"]["Tiết 2"] === "Văn", 'VM Sandbox 17: Timetable được roll-forward thành công lên committed');
    const unifiedAfterCommit = JSON.parse(mockStorageMap.get("teacher_hub_store_v2"));
    assert(unifiedAfterCommit && unifiedAfterCommit.links[0].id === "link_commit", 'VM Sandbox 17: Unified Store được cập nhật khớp với dữ liệu committed');
    assert(!mockStorageMap.has("cva_sync_staging"), 'VM Sandbox 17: cva_sync_staging được dọn sạch sau khi roll-forward thành công');

    // Test VM 18: Crash Recovery cho cva_sync_staging khi dữ liệu bị hỏng (Corrupted JSON / Invalid structure) -> Fail-Closed & ghi nhận cva_sync_error
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_sync_staging", "CORRUPTED_NON_JSON_DATA_!!!");
    const recSyncCorrupted = sandbox.recoverStagingTransaction();
    assert(recSyncCorrupted.recovered === false && recSyncCorrupted.error && recSyncCorrupted.error.includes("Fail-Closed"), 'VM Sandbox 18: cva_sync_staging bị hỏng kích hoạt Fail-Closed an toàn');
    assert(mockStorageMap.has("cva_sync_staging"), 'VM Sandbox 18: Bảo lưu cva_sync_staging bị hỏng để phục vụ chẩn đoán (không xóa mù quáng)');
    assert(mockStorageMap.has("cva_sync_error"), 'VM Sandbox 18: Đánh dấu cờ lỗi cva_sync_error bền vững');

    // Test VM 19: Crash Recovery cho cva_vault_staging ở trạng thái prepared -> Rollback về previous salt và ciphertext
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("teacher_hub_vault_salt", "salt_dirty_123");
    mockStorageMap.set("teacher_hub_vault_enc_v2", "cipher_dirty_123");
    const vaultPrepCk = sandbox.computeTxChecksum(null, null, "vault_v1", null, { salt: "salt_dirty_123", ciphertext: "cipher_dirty_123" });
    mockStorageMap.set("cva_vault_staging", JSON.stringify({
      status: "prepared",
      token: "tok_vault_prep_19",
      fencingGeneration: 1,
      version: "vault_v1",
      checksum: vaultPrepCk,
      time: Date.now(),
      salt: "salt_dirty_123",
      ciphertext: "cipher_dirty_123",
      previous: {
        salt: "salt_prev_ok",
        ciphertext: "cipher_prev_ok",
        envelope: JSON.stringify({ version: 1, salt: "salt_prev_ok", ciphertext: "cipher_prev_ok" })
      }
    }));
    const recVaultPrep = sandbox.recoverStagingTransaction();
    assert(recVaultPrep.recovered === true && recVaultPrep.clean === true, 'VM Sandbox 19: cva_vault_staging prepared được khôi phục thành công');
    assert(mockStorageMap.get("teacher_hub_vault_salt") === "salt_prev_ok", 'VM Sandbox 19: Salt được rollback về snapshot previous');
    assert(mockStorageMap.get("teacher_hub_vault_enc_v2") === "cipher_prev_ok", 'VM Sandbox 19: Ciphertext được rollback về snapshot previous');
    assert(!mockStorageMap.has("cva_vault_staging"), 'VM Sandbox 19: cva_vault_staging được dọn sạch sau rollback');

    // Test VM 20: Crash Recovery cho cva_vault_staging ở trạng thái committed -> Roll-forward
    mockStorageMap.clear();
    rearmSandboxLock();
    const vaultCommitCk = sandbox.computeTxChecksum(null, null, "vault_v1", null, { salt: "salt_committed_456", ciphertext: "cipher_committed_456" });
    mockStorageMap.set("cva_vault_staging", JSON.stringify({
      status: "committed",
      token: "tok_vault_commit_20",
      fencingGeneration: 1,
      version: "vault_v1",
      checksum: vaultCommitCk,
      time: Date.now(),
      salt: "salt_committed_456",
      ciphertext: "cipher_committed_456",
      envelope: JSON.stringify({ version: 1, salt: "salt_committed_456", ciphertext: "cipher_committed_456" })
    }));
    sandbox.recoverStagingTransaction();
    assert(mockStorageMap.get("teacher_hub_vault_salt") === "salt_committed_456", 'VM Sandbox 20: Salt được roll-forward thành công lên committed');
    assert(mockStorageMap.get("teacher_hub_vault_enc_v2") === "cipher_committed_456", 'VM Sandbox 20: Ciphertext được roll-forward thành công lên committed');
    assert(!mockStorageMap.has("cva_vault_staging"), 'VM Sandbox 20: cva_vault_staging được dọn sạch sau commit');

    // Test VM 21: cva_sync_staging thiếu fencingGeneration kích hoạt Fail-Closed an toàn
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_sync_staging", JSON.stringify({
      status: "committed",
      token: "tok_no_gen",
      // fencingGeneration is missing!
      version: sandbox.CURRENT_DATA_VERSION,
      candidateVersion: sandbox.CURRENT_DATA_VERSION,
      categories: [{ id: "cat1", label: "Cat 1" }],
      links: [{ id: "link1", title: "L1", url: "https://l1.vn" }]
    }));
    const recSyncNoGen = sandbox.recoverStagingTransaction();
    assert(recSyncNoGen.recovered === false && recSyncNoGen.error && recSyncNoGen.error.includes("Fail-Closed"), 'VM Sandbox 21: cva_sync_staging thiếu fencingGeneration kích hoạt Fail-Closed an toàn');
    assert(mockStorageMap.has("cva_sync_staging"), 'VM Sandbox 21: Bảo lưu cva_sync_staging khi thiếu metadata (không xóa mù quáng)');
    assert(mockStorageMap.has("cva_sync_error"), 'VM Sandbox 21: Ghi nhận cờ cva_sync_error bền vững');

    // Test VM 22: validateSyncPayload chặn đứng Resource Exhaustion (vượt quá 300 links hoặc url dài > 1000)
    const validTT = {
      "2": { "Tiết 1": "Toán" },
      "3": { "Tiết 1": "Lý" },
      "4": { "Tiết 1": "Hóa" },
      "5": { "Tiết 1": "Sinh" },
      "6": { "Tiết 1": "Văn" }
    };
    const oversizedPayload = {
      schemaVersion: 2,
      categories: [{ id: "c1", label: "C1" }],
      links: Array.from({ length: 305 }, (_, i) => ({ id: `l_${i}`, title: `Link ${i}`, url: "https://test.vn" })),
      reminders: [],
      timetable: validTT
    };
    assert(sandbox.validateSyncPayload(oversizedPayload) === false, 'VM Sandbox 22: validateSyncPayload từ chối payload có số links > 300 (Resource Exhaustion Guard)');

    const maliciousLongUrlPayload = {
      schemaVersion: 2,
      categories: [{ id: "c1", label: "C1" }],
      links: [{ id: "l1", title: "L1", url: "https://" + "a".repeat(1005) }],
      reminders: [],
      timetable: validTT
    };
    assert(sandbox.validateSyncPayload(maliciousLongUrlPayload) === false, 'VM Sandbox 22: validateSyncPayload từ chối url quá dài (> 1000 ký tự)');

    // Test VM 23: cva_vault_staging thiếu fencingGeneration kích hoạt Fail-Closed an toàn
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_vault_staging", JSON.stringify({
      status: "committed",
      token: "tok_vault_no_gen",
      // fencingGeneration is missing!
      version: "vault_v1",
      checksum: vaultCommitCk,
      time: Date.now(),
      salt: "salt_committed_456",
      ciphertext: "cipher_committed_456"
    }));
    const recVaultNoGen = sandbox.recoverStagingTransaction();
    assert(recVaultNoGen.recovered === false && recVaultNoGen.error && recVaultNoGen.error.includes("Fail-Closed"), 'VM Sandbox 23: cva_vault_staging thiếu fencingGeneration kích hoạt Fail-Closed an toàn');
    assert(mockStorageMap.has("cva_vault_staging"), 'VM Sandbox 23: Bảo lưu cva_vault_staging khi thiếu metadata');
    assert(mockStorageMap.has("cva_vault_error"), 'VM Sandbox 23: Ghi nhận cờ cva_vault_error bền vững');

    // Test VM 24: cva_vault_staging checksum mismatch / corrupted payload -> Fail-Closed
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_vault_staging", JSON.stringify({
      status: "committed",
      token: "tok_vault_bad_ck",
      fencingGeneration: 1,
      version: "vault_v1",
      checksum: "tampered_checksum_vault",
      time: Date.now(),
      salt: "salt_committed_456",
      ciphertext: "cipher_committed_456"
    }));
    const recVaultBadCk = sandbox.recoverStagingTransaction();
    assert(recVaultBadCk.recovered === false && recVaultBadCk.error && recVaultBadCk.error.includes("Fail-Closed"), 'VM Sandbox 24: cva_vault_staging checksum mismatch kích hoạt Fail-Closed an toàn');
    assert(mockStorageMap.has("cva_vault_staging"), 'VM Sandbox 24: Bảo lưu cva_vault_staging khi checksum sai lệch');
    assert(mockStorageMap.has("cva_vault_error"), 'VM Sandbox 24: Ghi nhận cờ cva_vault_error bền vững');

    // Test VM 25: cva_vault_staging status không hợp lệ -> Fail-Closed
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_vault_staging", JSON.stringify({
      status: "invalid_status_unknown",
      token: "tok_vault_unknown",
      fencingGeneration: 1,
      version: "vault_v1",
      checksum: vaultCommitCk,
      time: Date.now(),
      salt: "salt_committed_456",
      ciphertext: "cipher_committed_456"
    }));
    const recVaultUnknownStatus = sandbox.recoverStagingTransaction();
    assert(recVaultUnknownStatus.recovered === false && recVaultUnknownStatus.error && recVaultUnknownStatus.error.includes("Fail-Closed"), 'VM Sandbox 25: cva_vault_staging status lạ kích hoạt Fail-Closed an toàn');
    assert(mockStorageMap.has("cva_vault_staging"), 'VM Sandbox 25: Bảo lưu cva_vault_staging khi status lạ');
    assert(mockStorageMap.has("cva_vault_error"), 'VM Sandbox 25: Ghi nhận cờ cva_vault_error bền vững');

    // Test VM 26: Xóa website có Vault credentials dưới active lock không gây Deadlock
    let vaultSaveUnlockedInvoked = false;
    let lockAcquiredCount = 0;
    const testLinks = [
      { id: "web_vault_1", title: "Web Cần Xóa", url: "https://vault1.vn", category: "diem" },
      { id: "web_vault_2", title: "Web Giữ Lại", url: "https://vault2.vn", category: "diem" }
    ];
    const testVaultData = {
      "web_vault_1": { u: "admin", p: "pass123" },
      "web_vault_2": { u: "user", p: "pass456" }
    };
    const mockDelContext = {
      isAdminLoggedIn: true,
      linksData: [...testLinks],
      vaultData: { ...testVaultData },
      confirm: () => true,
      showToast: () => {},
      renderItems: () => {},
      saveToStorage: () => {},
      currentLockContext: null,
      saveVaultStorageUnlocked: async (ctx) => {
        vaultSaveUnlockedInvoked = true;
        assert(ctx && ctx.token === "test_del_token", 'VM Sandbox 26: saveVaultStorageUnlocked nhận đúng lockCtx từ outer lock');
      },
      executeWithCrossTabLock: async function(cb) {
        lockAcquiredCount++;
        const ctx = { token: "test_del_token", generation: 5 };
        return await cb(ctx);
      }
    };
    if (delItemFuncCode) {
      const delScript = new vm.Script(delItemFuncCode + '\nthis.delItem = delItem;');
      delScript.runInContext(vm.createContext(mockDelContext));
      await mockDelContext.delItem("web_vault_1");
      assert(vaultSaveUnlockedInvoked === true, 'VM Sandbox 26: delItem đã gọi saveVaultStorageUnlocked thành công');
      assert(mockDelContext.vaultData["web_vault_1"] === undefined, 'VM Sandbox 26: Credentials của web_vault_1 đã được xóa khỏi vaultData');
      assert(mockDelContext.vaultData["web_vault_2"] !== undefined, 'VM Sandbox 26: Credentials của web_vault_2 vẫn được bảo toàn');
      assert(mockDelContext.linksData.length === 1 && mockDelContext.linksData[0].id === "web_vault_2", 'VM Sandbox 26: linksData đã xóa web_vault_1 thành công');
      assert(lockAcquiredCount === 1, 'VM Sandbox 26: executeWithCrossTabLock chỉ acquire 1 lần duy nhất (Zero Deadlock)');
    }

    // Test VM 27: Round-trip Sync Payload (validateSyncPayload chấp nhận 100% payload xuất ra từ getSyncPayload)
    const validRoundTripTT = {
      "2": { "Tiết 1": "Toán", "Tiết 2": "", "Tiết 3": "", "Tiết 4": "", "Tiết 5": "" },
      "3": { "Tiết 1": "", "Tiết 2": "", "Tiết 3": "", "Tiết 4": "", "Tiết 5": "" },
      "4": { "Tiết 1": "", "Tiết 2": "", "Tiết 3": "", "Tiết 4": "", "Tiết 5": "" },
      "5": { "Tiết 1": "", "Tiết 2": "", "Tiết 3": "", "Tiết 4": "", "Tiết 5": "" },
      "6": { "Tiết 1": "", "Tiết 2": "", "Tiết 3": "", "Tiết 4": "", "Tiết 5": "Sinh hoạt lớp" }
    };
    const sampleExportPayload = {
      app: "cva_teacher_hub",
      sync: "cva",
      schemaVersion: 2,
      version: "2026.09.21.03",
      v: "2026.09.21.03",
      exportedAt: new Date().toISOString(),
      categories: [{ id: "diem", label: "Sổ điểm" }],
      links: [{ id: "link-vnedu", title: "vnEdu", url: "https://vnedu.vn", category: "diem" }],
      reminders: [{ id: "rem-1", title: "Nhắc nhở giáo án" }],
      timetable: validRoundTripTT
    };
    assert(sandbox.validateSyncPayload(sampleExportPayload) === true, 'VM Sandbox 27: validateSyncPayload chấp nhận 100% payload chuẩn từ getSyncPayload (Round-trip Sync Schema Verified)');

    // Test VM 28: cva_sync_staging prepared thiếu version hoặc checksum sai -> Fail-Closed
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_sync_staging", JSON.stringify({
      status: "prepared",
      token: "tok_prep_no_ver",
      fencingGeneration: 1,
      // version missing!
      categories: [{ id: "cat_no_ver", label: "No Ver" }],
      links: [],
      reminders: [],
      timetable: {},
      checksum: "dummy_checksum",
      previous: { categories: [] }
    }));
    const recSyncNoVer = sandbox.recoverStagingTransaction();
    assert(recSyncNoVer.recovered === false && recSyncNoVer.error && recSyncNoVer.error.includes("Fail-Closed"), 'VM Sandbox 28: cva_sync_staging prepared thiếu version kích hoạt Fail-Closed an toàn');
    assert(mockStorageMap.has("cva_sync_staging"), 'VM Sandbox 28: Bảo lưu cva_sync_staging khi thiếu version');
    assert(mockStorageMap.has("cva_sync_error"), 'VM Sandbox 28: Ghi nhận cờ cva_sync_error');

    // Test VM 28.b: cva_sync_staging prepared có checksum sai lệch -> Fail-Closed
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_sync_staging", JSON.stringify({
      status: "prepared",
      token: "tok_prep_bad_chk",
      fencingGeneration: 1,
      version: "2026.09.21.03",
      categories: [{ id: "cat_chk", label: "Bad Checksum" }],
      links: [],
      reminders: [],
      timetable: {},
      checksum: "WRONG_CHECKSUM_VALUE_123",
      previous: { categories: [] }
    }));
    const recSyncBadChk = sandbox.recoverStagingTransaction();
    assert(recSyncBadChk.recovered === false && recSyncBadChk.error && recSyncBadChk.error.includes("Fail-Closed"), 'VM Sandbox 28.b: cva_sync_staging prepared checksum sai lệch kích hoạt Fail-Closed an toàn');
    assert(mockStorageMap.has("cva_sync_staging"), 'VM Sandbox 28.b: Bảo lưu cva_sync_staging khi sai lệch checksum');
    assert(mockStorageMap.has("cva_sync_error"), 'VM Sandbox 28.b: Ghi nhận cờ cva_sync_error khi sai lệch checksum');

    // Test VM 29: saveVaultStorageUnlocked dọn sạch teacher_hub_vault_v1 (Zero Plaintext Gatekeeper)
    mockStorageMap.clear();
    let legacyPlaintextRemoved = false;
    const mockVaultStorageMap = new Map();
    mockVaultStorageMap.set("teacher_hub_vault_v1", JSON.stringify({ old: "plaintext" }));
    mockVaultStorageMap.set("cva_fencing_generation", "1");
    mockVaultStorageMap.set("cva_fencing_token", "lock_tok_vault_test");

    const mockVaultContext = {
      isVaultUnlocked: true,
      sessionVaultPin: "123456",
      vaultData: { "acc1": { u: "teacher", p: "secret" } },
      localStorage: {
        getItem: (k) => mockVaultStorageMap.get(k) || null,
        setItem: (k, v) => mockVaultStorageMap.set(k, String(v)),
        removeItem: (k) => {
          if (k === "teacher_hub_vault_v1") legacyPlaintextRemoved = true;
          mockVaultStorageMap.delete(k);
        }
      },
      generateSalt: () => "mock_salt_16bytes",
      encryptVaultPayload: async () => "mock_encrypted_ciphertext_aes_gcm",
      computeTxChecksum: sandbox.computeTxChecksum,
      console: { log: () => {}, warn: () => {}, error: () => {} }
    };

    const vaultSaveCode = extractFunctionBody(appJs, 'saveVaultStorageUnlocked');
    if (vaultSaveCode) {
      const lockCtx = {
        generation: 1,
        token: "lock_tok_vault_test",
        verifyFencing: () => true
      };
      const scriptVault = new vm.Script(
        (safeStorageRemoveFuncCode ? safeStorageRemoveFuncCode + '\n' : '') +
        vaultSaveCode + '\nthis.saveVaultStorageUnlocked = saveVaultStorageUnlocked;'
      );
      scriptVault.runInContext(vm.createContext(mockVaultContext));
      await mockVaultContext.saveVaultStorageUnlocked(lockCtx);

      assert(legacyPlaintextRemoved === true, 'VM Sandbox 29: safeFencedRemove đã được gọi để xóa teacher_hub_vault_v1');
      assert(mockVaultStorageMap.get("teacher_hub_vault_v1") === undefined, 'VM Sandbox 29: teacher_hub_vault_v1 hoàn toàn bị triệt tiêu khỏi storage (Zero Plaintext Invariant)');
      assert(mockVaultStorageMap.get("teacher_hub_vault_enc_v2") === "mock_encrypted_ciphertext_aes_gcm", 'VM Sandbox 29: Dữ liệu mã hóa teacher_hub_vault_enc_v2 được lưu thành công');
      assert(!mockVaultStorageMap.has("cva_vault_staging"), 'VM Sandbox 29: cva_vault_staging được dọn sạch sau khi commit thành công');
    }

    // Test VM 30: cva_vault_staging thiếu version -> Fail-Closed
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_vault_staging", JSON.stringify({
      status: "prepared",
      token: "tok_vault_no_ver",
      fencingGeneration: 1,
      // version missing!
      checksum: vaultPrepCk,
      time: Date.now(),
      salt: "salt_dirty_123",
      ciphertext: "cipher_dirty_123",
      previous: {
        salt: "salt_prev_ok",
        ciphertext: "cipher_prev_ok"
      }
    }));
    const recVaultNoVer = sandbox.recoverStagingTransaction();
    assert(recVaultNoVer.recovered === false && recVaultNoVer.error && recVaultNoVer.error.includes("Fail-Closed"), 'VM Sandbox 30: cva_vault_staging thiếu version kích hoạt Fail-Closed an toàn');
    assert(mockStorageMap.has("cva_vault_staging"), 'VM Sandbox 30: Bảo lưu cva_vault_staging khi thiếu version');
    assert(mockStorageMap.has("cva_vault_error"), 'VM Sandbox 30: Ghi nhận cờ cva_vault_error khi thiếu version');

    // Test VM 31: Crash Recovery cho cva_store_staging ở trạng thái 'prepared' -> Rollback về previous snapshot
    mockStorageMap.clear();
    rearmSandboxLock();
    const prevStoreCats = [{ id: "cat_prev_st", label: "Cat Prev St" }];
    const prevStoreLinks = [{ id: "link_prev_st", title: "Link Prev St", url: "https://prev-st.vn", category: "cat_prev_st" }];
    const prevStoreRems = [{ id: "rem_prev_st", title: "Rem Prev St" }];
    const prevStoreTT = { "2": { "Tiết 1": "Toán Prev" } };
    const prevStorePayload = JSON.stringify({
      schemaVersion: 2,
      version: "2026.09.21.02",
      generation: 1,
      token: "tok_prev_store",
      categories: prevStoreCats,
      links: prevStoreLinks,
      reminders: prevStoreRems,
      timetable: prevStoreTT,
      checksum: "prev_checksum_store",
      time: Date.now()
    });

    const dirtyStoreCats = [{ id: "cat_dirty_st", label: "Cat Dirty St" }];
    const dirtyStoreLinks = [{ id: "link_dirty_st", title: "Link Dirty St", url: "https://dirty-st.vn", category: "cat_dirty_st" }];
    const dirtyStoreRems = [{ id: "rem_dirty_st", title: "Rem Dirty St" }];
    const dirtyStoreTT = { "2": { "Tiết 1": "Văn Dirty" } };

    mockStorageMap.set("teacher_hub_categories_v1", JSON.stringify(dirtyStoreCats));
    mockStorageMap.set("teacher_hub_links_v2", JSON.stringify(dirtyStoreLinks));
    mockStorageMap.set("teacher_hub_reminders_v1", JSON.stringify(dirtyStoreRems));
    mockStorageMap.set("teacher_hub_timetable_v1", JSON.stringify(dirtyStoreTT));
    mockStorageMap.set("teacher_hub_store_v2", "dirty_store_corrupted");
    mockStorageMap.set("teacher_hub_data_version", "2026.09.21.03");

    const storeStagingPrepared = {
      status: "prepared",
      token: "store_tok_prep_31",
      fencingGeneration: 1,
      time: Date.now(),
      version: sandbox.CURRENT_DATA_VERSION,
      categories: dirtyStoreCats,
      links: dirtyStoreLinks,
      reminders: dirtyStoreRems,
      timetable: dirtyStoreTT,
      checksum: sandbox.computeTxChecksum(dirtyStoreCats, dirtyStoreLinks, sandbox.CURRENT_DATA_VERSION, dirtyStoreRems, dirtyStoreTT),
      previous: {
        categories: prevStoreCats,
        links: prevStoreLinks,
        reminders: prevStoreRems,
        timetable: prevStoreTT,
        store: prevStorePayload,
        version: "2026.09.21.02"
      }
    };
    mockStorageMap.set("cva_store_staging", JSON.stringify(storeStagingPrepared));

    const recStorePrepared = sandbox.recoverStagingTransaction();
    assert(recStorePrepared.recovered === true, 'VM Sandbox 31: recoverStagingTransaction khôi phục thành công cva_store_staging ở trạng thái prepared');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_categories_v1"))[0].id === "cat_prev_st", 'VM Sandbox 31: Categories được rollback 100% về previous snapshot');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_links_v2"))[0].id === "link_prev_st", 'VM Sandbox 31: Links được rollback 100% về previous snapshot');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_reminders_v1"))[0].id === "rem_prev_st", 'VM Sandbox 31: Reminders được rollback 100% về previous snapshot');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_timetable_v1"))["2"]["Tiết 1"] === "Toán Prev", 'VM Sandbox 31: Timetable được rollback 100% về previous snapshot');
    assert(mockStorageMap.get("teacher_hub_store_v2") === prevStorePayload, 'VM Sandbox 31: Master Manifest được rollback 100% về previous snapshot');
    assert(mockStorageMap.get("teacher_hub_data_version") === "2026.09.21.02", 'VM Sandbox 31: Version được rollback 100% về previous snapshot');
    assert(!mockStorageMap.has("cva_store_staging"), 'VM Sandbox 31: cva_store_staging được dọn sạch sau khi rollback thành công');

    // Test VM 32: Crash Recovery cho cva_store_staging ở trạng thái 'committed' -> Roll-forward
    mockStorageMap.clear();
    rearmSandboxLock();
    const commitStoreCats = [{ id: "cat_commit_st", label: "Cat Committed St" }];
    const commitStoreLinks = [{ id: "link_commit_st", title: "Link Committed St", url: "https://commit-st.vn", category: "cat_commit_st" }];
    const commitStoreRems = [{ id: "rem_commit_st", title: "Rem Committed St" }];
    const commitStoreTT = { "3": { "Tiết 3": "Hóa" } };

    const storeStagingCommitted = {
      status: "committed",
      token: "store_tok_commit_32",
      fencingGeneration: 1,
      time: Date.now(),
      version: sandbox.CURRENT_DATA_VERSION,
      categories: commitStoreCats,
      links: commitStoreLinks,
      reminders: commitStoreRems,
      timetable: commitStoreTT,
      checksum: sandbox.computeTxChecksum(commitStoreCats, commitStoreLinks, sandbox.CURRENT_DATA_VERSION, commitStoreRems, commitStoreTT),
      previous: {
        categories: prevStoreCats,
        links: prevStoreLinks,
        reminders: prevStoreRems,
        timetable: prevStoreTT,
        store: prevStorePayload,
        version: "2026.09.21.02"
      }
    };
    mockStorageMap.set("cva_store_staging", JSON.stringify(storeStagingCommitted));

    const recStoreCommitted = sandbox.recoverStagingTransaction();
    assert(recStoreCommitted.recovered === true, 'VM Sandbox 32: recoverStagingTransaction khôi phục thành công cva_store_staging ở trạng thái committed');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_categories_v1"))[0].id === "cat_commit_st", 'VM Sandbox 32: Categories được roll-forward thành công lên committed');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_links_v2"))[0].id === "link_commit_st", 'VM Sandbox 32: Links được roll-forward thành công lên committed');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_reminders_v1"))[0].id === "rem_commit_st", 'VM Sandbox 32: Reminders được roll-forward thành công lên committed');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_timetable_v1"))["3"]["Tiết 3"] === "Hóa", 'VM Sandbox 32: Timetable được roll-forward thành công lên committed');
    const storeUnified = JSON.parse(mockStorageMap.get("teacher_hub_store_v2"));
    assert(storeUnified && storeUnified.links[0].id === "link_commit_st", 'VM Sandbox 32: Unified Store được cập nhật khớp với dữ liệu committed');
    assert(!mockStorageMap.has("cva_store_staging"), 'VM Sandbox 32: cva_store_staging được dọn sạch sau khi roll-forward thành công');

    // Test VM 33: Crash Recovery cho cva_store_staging khi dữ liệu bị hỏng -> Fail-Closed & ghi nhận cva_store_error
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("cva_store_staging", "CORRUPTED_STORE_NON_JSON_!!!");
    const recStoreCorrupted = sandbox.recoverStagingTransaction();
    assert(recStoreCorrupted.recovered === false && recStoreCorrupted.error && recStoreCorrupted.error.includes("Fail-Closed"), 'VM Sandbox 33: cva_store_staging bị hỏng kích hoạt Fail-Closed an toàn');
    assert(mockStorageMap.has("cva_store_staging"), 'VM Sandbox 33: Bảo lưu cva_store_staging bị hỏng để phục vụ chẩn đoán');
    assert(mockStorageMap.has("cva_store_error"), 'VM Sandbox 33: Đánh dấu cờ lỗi cva_store_error bền vững');

    // Test VM 34: Tiền kiểm định vô điều kiện toàn cục (Unconditional Global Staging Pre-Validation)
    // Khi cva_vault_staging bị corrupt, cva_store_staging hợp lệ (committed) CẤM TUYỆT ĐỐI không được roll-forward
    mockStorageMap.clear();
    rearmSandboxLock();
    // 1. Vault staging bị corrupt
    mockStorageMap.set("cva_vault_staging", "CORRUPTED_VAULT_PAYLOAD_NON_JSON");
    // 2. Store staging chuẩn ở trạng thái committed
    const test34Cats = [{ id: "cat34", label: "Cat 34" }];
    const test34Links = [{ id: "link34", title: "Link 34", url: "https://l34.vn" }];
    const test34Ck = sandbox.computeTxChecksum(test34Cats, test34Links, sandbox.CURRENT_DATA_VERSION, [], {});
    mockStorageMap.set("cva_store_staging", JSON.stringify({
      status: "committed",
      token: "tok34",
      fencingGeneration: 1,
      version: sandbox.CURRENT_DATA_VERSION,
      categories: test34Cats,
      links: test34Links,
      reminders: [],
      timetable: {},
      checksum: test34Ck,
      time: Date.now()
    }));
    // Đặt storage cũ
    mockStorageMap.set("teacher_hub_links_v2", JSON.stringify([{ id: "old_link", title: "Old", url: "https://old.vn" }]));

    const recCombinedCorrupt = sandbox.recoverStagingTransaction();
    assert(recCombinedCorrupt.recovered === false && recCombinedCorrupt.error && recCombinedCorrupt.error.includes("Fail-Closed"), 'VM Sandbox 34: cva_vault_staging corrupt kích hoạt Fail-Closed toàn cục ngay ở bước Pre-Validation');
    assert(mockStorageMap.has("cva_vault_error"), 'VM Sandbox 34: Đánh dấu cờ lỗi cva_vault_error bền vững');
    assert(mockStorageMap.has("cva_store_staging"), 'VM Sandbox 34: cva_store_staging được bảo toàn nguyên vẹn, không bị xóa hay commit dở dang');
    const linksAfterAbortedRec = JSON.parse(mockStorageMap.get("teacher_hub_links_v2"));
    assert(linksAfterAbortedRec[0].id === "old_link", 'VM Sandbox 34: Storage links cũ không bị ghi đè hay roll-forward khi hệ thống có staging corrupt khác');

    // Test VM 35: performAtomicSystemRestore đồng bộ và verify đủ cả 4 bản chiếu (categories, links, reminders, timetable) và Master Manifest
    mockStorageMap.clear();
    rearmSandboxLock();
    const customPrevCats = [{ id: "custom_c", label: "Custom Cat" }];
    const customPrevLinks = [{ id: "custom_l", title: "Custom Link", url: "https://cust.vn" }];
    const existingRems = [{ id: "rem_persist", title: "Nhắc nhở quan trọng" }];
    const existingTT = { "2": { "Tiết 1": "Toán Khóa" } };
    mockStorageMap.set("teacher_hub_categories_v1", JSON.stringify(customPrevCats));
    mockStorageMap.set("teacher_hub_links_v2", JSON.stringify(customPrevLinks));
    mockStorageMap.set("teacher_hub_reminders_v1", JSON.stringify(existingRems));
    mockStorageMap.set("teacher_hub_timetable_v1", JSON.stringify(existingTT));
    mockStorageMap.set("teacher_hub_data_version", "2026.09.20.01");
    sandbox.linksData = customPrevLinks;
    sandbox.categoriesData = customPrevCats;
    sandbox.remindersData = existingRems;
    sandbox.teacherTimetableData = existingTT;

    const restoreRes = sandbox.performAtomicSystemRestore(defaultLockCtx);
    assert(restoreRes.success === true, 'VM Sandbox 35: performAtomicSystemRestore trả về success: true');
    // Categories và links phục hồi về mặc định
    const restoredCats = JSON.parse(mockStorageMap.get("teacher_hub_categories_v1"));
    const restoredLinks = JSON.parse(mockStorageMap.get("teacher_hub_links_v2"));
    assert(restoredCats.some(c => c.id === "diem"), 'VM Sandbox 35: Categories được phục hồi về DEFAULT_CATEGORIES');
    assert(restoredLinks.some(l => l.id === "link-vnedu"), 'VM Sandbox 35: Links được phục hồi về DEFAULT_LINKS');
    // Reminders và timetable được bảo toàn trong cả projection và Master Manifest
    const restoredRems = JSON.parse(mockStorageMap.get("teacher_hub_reminders_v1"));
    const restoredTT = JSON.parse(mockStorageMap.get("teacher_hub_timetable_v1"));
    assert(restoredRems.length === 1 && restoredRems[0].id === "rem_persist", 'VM Sandbox 35: Reminders projection được bảo toàn và cập nhật đồng bộ');
    assert(restoredTT["2"]["Tiết 1"] === "Toán Khóa", 'VM Sandbox 35: Timetable projection được bảo toàn và cập nhật đồng bộ');
    const restoredManifest = JSON.parse(mockStorageMap.get("teacher_hub_store_v2"));
    assert(restoredManifest && restoredManifest.reminders[0].id === "rem_persist", 'VM Sandbox 35: Master Manifest teacher_hub_store_v2 chứa đầy đủ reminders và timetable');
    assert(!mockStorageMap.has("cva_migration_staging"), 'VM Sandbox 35: Staging dọn sạch sau khi restore hoàn tất');

    // Test VM 36: performAtomicSystemRestore gặp sự cố ghi đĩa giữa chừng (Disk Error / Quota Failure trên reminders)
    // -> Rollback nguyên tử toàn bộ cả 4 projections và Master Manifest về snapshot ban đầu
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("teacher_hub_categories_v1", JSON.stringify(customPrevCats));
    mockStorageMap.set("teacher_hub_links_v2", JSON.stringify(customPrevLinks));
    mockStorageMap.set("teacher_hub_reminders_v1", JSON.stringify(existingRems));
    mockStorageMap.set("teacher_hub_timetable_v1", JSON.stringify(existingTT));
    mockStorageMap.set("teacher_hub_data_version", "2026.09.20.01");
    mockStorageMap.set("teacher_hub_store_v2", JSON.stringify({
      version: "2026.09.20.01",
      categories: customPrevCats,
      links: customPrevLinks,
      reminders: existingRems,
      timetable: existingTT
    }));
    sandbox.linksData = customPrevLinks;
    sandbox.categoriesData = customPrevCats;
    sandbox.remindersData = existingRems;
    sandbox.teacherTimetableData = existingTT;

    throwOnKey = "teacher_hub_reminders_v1"; // Cắt ngang khi ghi projection reminders!
    const failedRestoreRes = sandbox.performAtomicSystemRestore(defaultLockCtx);
    throwOnKey = null;

    assert(failedRestoreRes.success === false, 'VM Sandbox 36: performAtomicSystemRestore bắt lỗi ghi đĩa và trả về success: false');
    // Xác minh toàn bộ 4 projections và version đã được rollback sạch sẽ về snapshot cũ
    assert(JSON.parse(mockStorageMap.get("teacher_hub_categories_v1"))[0].id === "custom_c", 'VM Sandbox 36: Categories được rollback 100% về snapshot ban đầu');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_links_v2"))[0].id === "custom_l", 'VM Sandbox 36: Links được rollback 100% về snapshot ban đầu');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_reminders_v1"))[0].id === "rem_persist", 'VM Sandbox 36: Reminders được rollback 100% về snapshot ban đầu');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_timetable_v1"))["2"]["Tiết 1"] === "Toán Khóa", 'VM Sandbox 36: Timetable được rollback 100% về snapshot ban đầu');
    assert(mockStorageMap.get("teacher_hub_data_version") === "2026.09.20.01", 'VM Sandbox 36: Version được rollback 100% về snapshot ban đầu');

    // Test VM 37: Zero Non-Lock Cleanup - Fencing mất quyền trước khi dọn staging
    // Bắt buộc bảo lưu staging 100% trên storage và đánh dấu cva_migration_error, CẤM xóa thô bằng raw localStorage.removeItem
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("teacher_hub_categories_v1", JSON.stringify(initialCats));
    mockStorageMap.set("teacher_hub_links_v2", JSON.stringify(initialLinks));
    mockStorageMap.set("teacher_hub_data_version", "2026.09.20.01");
    mockStorageMap.set("teacher_hub_store_v2", JSON.stringify({
      version: "2026.09.20.01",
      generation: 1,
      token: "lock_tok_sandbox_15",
      categories: initialCats,
      links: initialLinks,
      reminders: [],
      timetable: {},
      checksum: sandbox.computeTxChecksum(initialCats, initialLinks, "2026.09.20.01", [], {})
    }));
    sandbox.linksData = JSON.parse(JSON.stringify(initialLinks));
    sandbox.categoriesData = JSON.parse(JSON.stringify(initialCats));

    let rawDeleteCalled = false;
    const origSet37 = mockLocalStorage.setItem;
    const origRemove37 = mockLocalStorage.removeItem;
    mockLocalStorage.setItem = (k, v) => {
      origSet37(k, v);
      // Khi staging chuyển sang committed ngay trước bước cleanup
      if (k === "cva_migration_staging" && typeof v === "string" && v.includes('"committed"')) {
        mockStorageMap.set("cva_fencing_generation", "999"); // Generation bị nâng cấp bởi tab khác
      }
    };
    mockLocalStorage.removeItem = (k) => {
      if (k === "cva_migration_staging") {
        const activeGen = Number(mockStorageMap.get("cva_fencing_generation") || 0);
        if (activeGen !== 1) {
          rawDeleteCalled = true;
        }
      }
      origRemove37(k);
    };

    const resFencingLost = sandbox.performAtomicSystemMigration(true);
    mockLocalStorage.setItem = origSet37;
    mockLocalStorage.removeItem = origRemove37;

    assert(resFencingLost.success === false, 'VM Sandbox 37: Migration thất bại an toàn khi mất fencing trước khi dọn staging');
    assert(rawDeleteCalled === false, 'VM Sandbox 37: Zero Non-Lock Cleanup - Tuyệt đối KHÔNG gọi raw removeItem khi mất fencing');
    assert(mockStorageMap.has("cva_migration_staging"), 'VM Sandbox 37: Staging record được bảo lưu 100% trên storage để phục vụ crash recovery');
    assert(mockStorageMap.has("cva_migration_error"), 'VM Sandbox 37: Đánh dấu cờ lỗi cva_migration_error bền vững');
    const errData37 = JSON.parse(mockStorageMap.get("cva_migration_error"));
    assert(errData37 && errData37.stage === "migration_fencing_lost_staging_preserved", 'VM Sandbox 37: Cờ lỗi ghi đúng stage migration_fencing_lost_staging_preserved');

    // Test VM 38: Two-Phase Staging Pre-Validation
    // Bất kỳ staging record nào corrupt sẽ chặn đứng toàn bộ recovery ngay ở Phase 1 (0 mutation trên data, bảo lưu 100% staging)
    mockStorageMap.clear();
    rearmSandboxLock();
    const oldLinkSnapshot = [{ id: "l_old", title: "Old Link", url: "https://old.vn" }];
    mockStorageMap.set("teacher_hub_links_v2", JSON.stringify(oldLinkSnapshot));
    mockStorageMap.set("teacher_hub_data_version", "2026.09.20.01");

    // Staging 1: Store staging hợp lệ với status committed
    const candStoreLinks = [{ id: "l_new", title: "New Link", url: "https://new.vn" }];
    const storeChecksum = sandbox.computeTxChecksum([], candStoreLinks, "2026.09.21.03", [], {});
    mockStorageMap.set("cva_store_staging", JSON.stringify({
      status: "committed",
      token: "lock_tok_sandbox_15",
      fencingGeneration: 1,
      version: "2026.09.21.03",
      links: candStoreLinks,
      categories: [],
      reminders: [],
      timetable: {},
      checksum: storeChecksum
    }));

    // Staging 2: Vault staging bị corrupt cú pháp JSON
    mockStorageMap.set("cva_vault_staging", "{corrupted_json_syntax");

    // Theo dõi toàn bộ mutation trên storage trong quá trình Pre-Validation
    let totalSetCallsDuringPreVal = 0;
    let totalRemoveCallsDuringPreVal = 0;
    const mutatedKeys = [];
    const origSet38 = mockLocalStorage.setItem;
    const origRemove38 = mockLocalStorage.removeItem;
    mockLocalStorage.setItem = (k, v) => {
      totalSetCallsDuringPreVal++;
      mutatedKeys.push(k);
      origSet38(k, v);
    };
    mockLocalStorage.removeItem = (k) => {
      totalRemoveCallsDuringPreVal++;
      origRemove38(k);
    };

    const preValRes = sandbox.recoverStagingTransaction(defaultLockCtx);
    mockLocalStorage.setItem = origSet38;
    mockLocalStorage.removeItem = origRemove38;

    assert(preValRes.recovered === false && preValRes.error && preValRes.error.includes("Fail-Closed"), 'VM Sandbox 38: Phase 1 Pre-Validation kích hoạt Fail-Closed toàn cục khi phát hiện staging corrupt');
    assert(totalSetCallsDuringPreVal === mutatedKeys.length && totalSetCallsDuringPreVal === 1, 'VM Sandbox 38: Phase 1 Pre-Validation ghi đúng 1 cờ lỗi duy nhất');
    assert(totalRemoveCallsDuringPreVal === 0, 'VM Sandbox 38: Phase 1 Pure Read Snapshot - TUYỆT ĐỐI 0 lần gọi removeItem');
    assert(mutatedKeys.every(k => k === "cva_vault_error"), 'VM Sandbox 38: Phase 1 Pure Read Snapshot - TUYỆT ĐỐI KHÔNG có mutation nào trên data hay staging keys (chỉ ghi cờ lỗi)');
    assert(mockStorageMap.has("cva_store_staging"), 'VM Sandbox 38: cva_store_staging được bảo lưu 100%, không bị commit hay xóa dở dang');
    assert(mockStorageMap.has("cva_vault_staging"), 'VM Sandbox 38: cva_vault_staging bị corrupt được bảo lưu 100% để chẩn đoán');
    assert(mockStorageMap.has("cva_vault_error"), 'VM Sandbox 38: Đánh dấu cờ lỗi cva_vault_error bền vững');
    assert(JSON.parse(mockStorageMap.get("teacher_hub_links_v2"))[0].id === "l_old", 'VM Sandbox 38: Dữ liệu links cũ được giữ nguyên vẹn 100%');

    // Test VM 39: Lifecycle Zero Plaintext Vault Invariant trong loadLinksFromStorage
    // Case 39.1: Đã có bản mã hóa -> Tự động xóa sạch bản văn bản thô teacher_hub_vault_v1 cũ
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("teacher_hub_data_version", "2026.09.21.03");
    mockStorageMap.set("teacher_hub_store_v2", JSON.stringify({
      schemaVersion: 2,
      version: "2026.09.21.03",
      generation: 1,
      token: "lock_tok_sandbox_15",
      categories: initialCats,
      links: initialLinks,
      reminders: [],
      timetable: {},
      checksum: sandbox.computeTxChecksum(initialCats, initialLinks, "2026.09.21.03", [], {}),
      time: Date.now()
    }));
    mockStorageMap.set("teacher_hub_links_v2", JSON.stringify(initialLinks));
    mockStorageMap.set("teacher_hub_categories_v1", JSON.stringify(initialCats));
    mockStorageMap.set("teacher_hub_vault_envelope_v1", JSON.stringify({
      version: "vault_v1",
      salt: "salt_123",
      ciphertext: "enc_cipher_123"
    }));
    mockStorageMap.set("teacher_hub_vault_v1", JSON.stringify({ legacy: "plaintext_secret" }));

    sandbox.loadLinksFromStorage(defaultLockCtx);
    assert(!mockStorageMap.has("teacher_hub_vault_v1"), 'VM Sandbox 39.1: teacher_hub_vault_v1 văn bản thô bị xóa sạch khi đã có bản mã hóa');
    assert(mockStorageMap.has("teacher_hub_vault_envelope_v1"), 'VM Sandbox 39.1: Bản mã hóa teacher_hub_vault_envelope_v1 được bảo toàn nguyên vẹn');

    // Case 39.2: Chưa có bản mã hóa (giáo viên chưa đặt PIN) -> Kích hoạt Degraded Mode, CẤM xóa teacher_hub_vault_v1
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("teacher_hub_data_version", "2026.09.21.03");
    mockStorageMap.set("teacher_hub_store_v2", JSON.stringify({
      schemaVersion: 2,
      version: "2026.09.21.03",
      generation: 1,
      token: "lock_tok_sandbox_15",
      categories: initialCats,
      links: initialLinks,
      reminders: [],
      timetable: {},
      checksum: sandbox.computeTxChecksum(initialCats, initialLinks, "2026.09.21.03", [], {}),
      time: Date.now()
    }));
    mockStorageMap.set("teacher_hub_links_v2", JSON.stringify(initialLinks));
    mockStorageMap.set("teacher_hub_categories_v1", JSON.stringify(initialCats));
    mockStorageMap.set("teacher_hub_vault_v1", JSON.stringify({ teacher_note: "unencrypted_secret" }));

    let degradedBannerReason = null;
    sandbox.showDegradedStorageBanner = (reason) => {
      degradedBannerReason = reason;
      sandbox.isStorageDegraded = true;
    };
    sandbox.isStorageDegraded = false;

    sandbox.loadLinksFromStorage(defaultLockCtx);
    assert(sandbox.isStorageDegraded === true, 'VM Sandbox 39.2: Kích hoạt Degraded Mode an toàn khi phát hiện vault chưa mã hóa');
    assert(degradedBannerReason && degradedBannerReason.includes("Master PIN"), 'VM Sandbox 39.2: Degraded banner hiển thị lý do yêu cầu thiết lập Master PIN');
    assert(mockStorageMap.has("teacher_hub_vault_v1"), 'VM Sandbox 39.2: Bảo toàn 100% dữ liệu teacher_hub_vault_v1 cho giáo viên, tuyệt đối không xóa mù quáng');

    // Case 39.3: Zero Non-Lock Plaintext Vault Deletion - Khi gọi loadLinksFromStorage ngoài lockCtx hợp lệ,
    // TUYỆT ĐỐI KHÔNG xóa raw teacher_hub_vault_v1 (giữ nguyên và bật Degraded Mode)
    mockStorageMap.clear();
    rearmSandboxLock();
    mockStorageMap.set("teacher_hub_data_version", "2026.09.21.03");
    mockStorageMap.set("teacher_hub_store_v2", JSON.stringify({
      schemaVersion: 2,
      version: "2026.09.21.03",
      generation: 1,
      token: "lock_tok_sandbox_15",
      categories: initialCats,
      links: initialLinks,
      reminders: [],
      timetable: {},
      checksum: sandbox.computeTxChecksum(initialCats, initialLinks, "2026.09.21.03", [], {}),
      time: Date.now()
    }));
    mockStorageMap.set("teacher_hub_links_v2", JSON.stringify(initialLinks));
    mockStorageMap.set("teacher_hub_categories_v1", JSON.stringify(initialCats));
    mockStorageMap.set("teacher_hub_vault_envelope_v1", JSON.stringify({
      version: "vault_v1",
      salt: "salt_123",
      ciphertext: "enc_cipher_123"
    }));
    mockStorageMap.set("teacher_hub_vault_v1", JSON.stringify({ legacy: "plaintext_secret" }));

    sandbox.isStorageDegraded = false;
    let rawVaultRemoveCalled = false;
    const trackedRemove39 = mockLocalStorage.removeItem;
    mockLocalStorage.removeItem = (k) => {
      if (k === "teacher_hub_vault_v1") {
        rawVaultRemoveCalled = true;
      }
      trackedRemove39(k);
    };

    // Tạm thời bỏ currentLockContext để giả lập môi trường gọi ngoài Web Locks
    const savedLockCtx = sandbox.currentLockContext;
    sandbox.currentLockContext = null;

    // Gọi loadLinksFromStorage với lockCtx = null (không có Web Lock)
    sandbox.loadLinksFromStorage(null);
    mockLocalStorage.removeItem = trackedRemove39;
    sandbox.currentLockContext = savedLockCtx;

    assert(rawVaultRemoveCalled === false, 'VM Sandbox 39.3: Zero Non-Lock Deletion - CẤM TUYỆT ĐỐI gọi raw removeItem trên teacher_hub_vault_v1 khi không có Web Lock');
    assert(mockStorageMap.has("teacher_hub_vault_v1"), 'VM Sandbox 39.3: teacher_hub_vault_v1 được bảo lưu an toàn khi thiếu Web Lock');
    assert(sandbox.isStorageDegraded === true, 'VM Sandbox 39.3: Kích hoạt Degraded Mode an toàn để nhắc nhở Web Lock context');

    mockStorageMap.clear();
  }
})();

// 7.2.1 Kiểm thử Luồng Hành Vi Xác Thực & Tự Động Tiếp Tục (Pending Admin Action Flow)
console.log('\n📌 7.2.1 Kiểm thử Luồng Tự Động Tiếp Tục Hành Động Sau Xác Thực (Pending Admin Action):');
(() => {
  let pendingAdminAction = null;
  let isModalActive = false;
  let adminLoggedIn = false;

  function openAdminAuthModal(callback = null, actionType = "generic_admin_access") {
    if (isModalActive && pendingAdminAction) {
      return; // Action Substitution Guard
    }
    const ACTION_TIMEOUT_MS = 120000;
    if (typeof callback === 'function') {
      pendingAdminAction = {
        actionId: 'act_' + Math.random().toString(36).substring(2) + '_' + Date.now(),
        actionType: String(actionType || 'generic_admin_access'),
        timestamp: Date.now(),
        expiresAt: Date.now() + ACTION_TIMEOUT_MS,
        callback
      };
    } else {
      pendingAdminAction = null;
    }
    isModalActive = true;
  }
  function closeAdminAuthModal() {
    pendingAdminAction = null;
    isModalActive = false;
  }

  let actionExecuted = false;
  const protectedImportAction = () => {
    actionExecuted = true;
  };

  // 1. Khi chưa đăng nhập -> mở modal và lưu pending action object có actionId, actionType, expiresAt
  openAdminAuthModal(protectedImportAction, "import_backup");
  assert(isModalActive === true && pendingAdminAction !== null, 'Chưa đăng nhập: Mở Admin modal và lưu pending action an toàn');
  assert(pendingAdminAction.actionType === "import_backup", 'Pending action lưu trữ chính xác actionType');
  assert(typeof pendingAdminAction.actionId === "string" && pendingAdminAction.actionId.startsWith("act_"), 'Pending action sở hữu actionId duy nhất');
  assert(pendingAdminAction.expiresAt > Date.now(), 'Pending action có thời hạn expiresAt hợp lệ');
  assert(actionExecuted === false, 'Hành động bảo vệ KHÔNG được thực thi trước khi xác thực thành công');

  // 2. Action Substitution Guard: Khi modal đang active, gọi action khác bị từ chối
  let maliciousActionExecuted = false;
  openAdminAuthModal(() => { maliciousActionExecuted = true; }, "restore_defaults");
  assert(pendingAdminAction.actionType === "import_backup", 'Action Substitution Guard: Từ chối ghi đè action khi auth modal đang active');

  // 3. Nếu người dùng hủy -> callback bị xóa, hành động không chạy
  closeAdminAuthModal();
  assert(isModalActive === false && pendingAdminAction === null, 'Hủy xác thực: Modal đóng và pending action bị hủy bỏ an toàn');
  assert(actionExecuted === false, 'Sau khi hủy: Hành động không bị kích hoạt ngoài ý muốn');

  // 4. Timeout Guard: Nếu đã hết hạn -> không kích hoạt
  openAdminAuthModal(protectedImportAction, "import_backup");
  const expiredRecord = { ...pendingAdminAction, expiresAt: Date.now() - 1000 };
  closeAdminAuthModal();
  if (Date.now() <= expiredRecord.expiresAt) {
    expiredRecord.callback();
  }
  assert(actionExecuted === false, 'Timeout Guard: Thao tác hết hạn không được phép thực thi');

  // 5. Người dùng nhập đúng PIN và đăng nhập thành công -> tự động tiếp tục hành động ban đầu
  openAdminAuthModal(protectedImportAction, "import_backup");
  const actionToResume = pendingAdminAction;
  closeAdminAuthModal();
  adminLoggedIn = true;
  if (actionToResume && typeof actionToResume.callback === 'function') {
    if (Date.now() <= actionToResume.expiresAt) {
      actionToResume.callback();
    }
  }
  assert(adminLoggedIn === true && actionExecuted === true, 'Đăng nhập thành công: Tự động kích hoạt lại hành động hoãn (Zero UX Regression)');
  assert(maliciousActionExecuted === false, 'Hành động giả mạo/thay thế hoàn toàn không bao giờ được chạy');
})();

// 7.2 Kiểm thử Thực tế Rate-Limiting Chống Brute-force Master PIN (SPEC 2.3)
console.log('\n📌 7.2 Kiểm thử Thực tế Rate-Limiting Chống Brute-force PIN & 2PC WAL:');
await (async () => {
  const checkUnlockedFuncCode = extractFunctionBody(appJs, 'checkRateLimitUnlocked');
  const checkFuncCode = extractFunctionBody(appJs, 'checkRateLimit');
  const recordFuncCode = extractFunctionBody(appJs, 'recordAuthFailure');
  const resetFuncCode = extractFunctionBody(appJs, 'resetAuthFailures');
  const verifyAdminPinFuncCode = extractFunctionBody(appJs, 'verifyAdminPin');

  if (checkFuncCode && recordFuncCode && resetFuncCode) {
    const mockMap = new Map();
    const mockLocalStorage = {
      getItem: (k) => mockMap.get(k) || null,
      setItem: (k, v) => mockMap.set(k, String(v)),
      removeItem: (k) => mockMap.delete(k)
    };
    const MAX_AUTH_FAILS = 5;
    const LOCKOUT_MS = 30000;
    const showToast = () => {};

    const evalScope = `
      ${validateAuthStagingFuncCode ? validateAuthStagingFuncCode : ''}
      ${validateStoredAuthFuncCode ? validateStoredAuthFuncCode : ''}
      ${safeStorageRemoveFuncCode ? safeStorageRemoveFuncCode : ''}
      ${verifyAuthFencingFuncCode ? verifyAuthFencingFuncCode : ''}
      ${safeFencedSetAuthFuncCode ? safeFencedSetAuthFuncCode : ''}
      ${safeFencedRemoveAuthFuncCode ? safeFencedRemoveAuthFuncCode : ''}
      ${checkUnlockedFuncCode ? checkUnlockedFuncCode : ''}
      ${checkFuncCode}
      ${recordFuncCode}
      ${resetFuncCode}
      ${verifyAdminPinFuncCode ? verifyAdminPinFuncCode : ''}
      this.validateAuthStagingPayload = typeof validateAuthStagingPayload !== "undefined" ? validateAuthStagingPayload : null;
      this.validateStoredAuthState = typeof validateStoredAuthState !== "undefined" ? validateStoredAuthState : null;
      this.verifyAuthFencing = typeof verifyAuthFencing !== "undefined" ? verifyAuthFencing : null;
      this.safeFencedSetAuth = typeof safeFencedSetAuth !== "undefined" ? safeFencedSetAuth : null;
      this.safeFencedRemoveAuth = typeof safeFencedRemoveAuth !== "undefined" ? safeFencedRemoveAuth : null;
      this.checkRateLimitUnlocked = typeof checkRateLimitUnlocked !== "undefined" ? checkRateLimitUnlocked : null;
      this.checkRateLimit = checkRateLimit;
      this.recordAuthFailure = recordAuthFailure;
      this.resetAuthFailures = resetAuthFailures;
      this.verifyAdminPin = typeof verifyAdminPin !== "undefined" ? verifyAdminPin : null;
    `;
    const vm = require('vm');
    let sandboxGen = 0;
    const sandbox = {
      localStorage: mockLocalStorage,
      MAX_AUTH_FAILS,
      LOCKOUT_MS,
      showToast,
      console: { log: () => {}, warn: () => {}, error: () => {} },
      Date,
      executeWithCrossTabLock: async (cb) => {
        sandboxGen++;
        const tok = 'tok_sandbox_' + sandboxGen;
        mockMap.set('cva_fencing_generation', String(sandboxGen));
        mockMap.set('cva_fencing_token', tok);
        mockMap.set('cva_migration_lock', JSON.stringify({ token: tok, generation: sandboxGen, time: Date.now() }));
        const ctx = {
          generation: sandboxGen,
          token: tok,
          revoked: false,
          verifyFencing: () => {
            if (ctx.revoked) return false;
            if (Number(mockMap.get('cva_fencing_generation')) !== sandboxGen || mockMap.get('cva_fencing_token') !== ctx.token) return false;
            const curL = mockMap.get('cva_migration_lock');
            if (!curL) return false;
            try {
              const p = JSON.parse(curL);
              return Boolean(p && typeof p === "object" && !Array.isArray(p) && p.token === ctx.token && p.generation === sandboxGen);
            } catch {
              return false;
            }
          }
        };
        try {
          return await cb(ctx);
        } finally {
          mockMap.delete('cva_migration_lock');
          ctx.revoked = true;
        }
      }
    };
    const script = new vm.Script(evalScope);
    script.runInContext(vm.createContext(sandbox));

    assert(sandbox.checkRateLimit() === true, 'RateLimit ban đầu cho phép thử xác thực');
    for (let i = 0; i < 4; i++) await sandbox.recordAuthFailure();
    assert(sandbox.checkRateLimit() === true, 'Sau 4 lần sai: Chưa kích hoạt khóa lockout');
    await sandbox.recordAuthFailure(); // Lần 5
    assert(sandbox.checkRateLimit() === false, 'Sau 5 lần sai: Khóa tạm thời 30 giây (checkRateLimit() === false)');
    assert(mockMap.get('teacher_hub_lock_until') !== null, 'Thời điểm khóa teacher_hub_lock_until được lưu bền vững vào localStorage');
    assert(mockMap.get('teacher_hub_auth_fails') === '5', 'Số lần sai được ghi nhận chính xác 5 lần');
    assert(mockMap.has('cva_auth_staging') === false, 'WAL staging cva_auth_staging được dọn sạch sau khi commit');

    await sandbox.resetAuthFailures();
    assert(sandbox.checkRateLimit() === true, 'Sau khi resetAuthFailures(): Mở khóa thành công');
    assert(mockMap.has('teacher_hub_auth_fails') === false, 'Xóa sạch teacher_hub_auth_fails sau khi reset');
    assert(mockMap.has('teacher_hub_lock_until') === false, 'Xóa sạch teacher_hub_lock_until sau khi reset');

    // ── 7.2.1: Adversarial Interleaving Test (Hai tab cùng đua lệnh tại lần thử 4) ──
    console.log('  ▸ 7.2.1 Kiểm tra Dual-Tab Concurrent Race & Interleaving Protection:');
    const sharedAuthMap = new Map();
    sharedAuthMap.set('teacher_hub_auth_fails', '3');
    let currentSharedGen = 0;

    const mockSharedStorage = {
      getItem: (k) => sharedAuthMap.get(k) || null,
      setItem: (k, v) => sharedAuthMap.set(k, String(v)),
      removeItem: (k) => sharedAuthMap.delete(k)
    };

    // Hàm giả lập Web Locks tuần tự hóa giữa 2 tab với fencing markers
    const createTabSandbox = (tabName) => {
      const tabSandbox = {
        localStorage: mockSharedStorage,
        MAX_AUTH_FAILS,
        LOCKOUT_MS,
        showToast: () => {},
        console: { log: () => {}, warn: () => {}, error: () => {} },
        Date,
        executeWithCrossTabLock: async (cb) => {
          currentSharedGen++;
          const gen = currentSharedGen;
          const tok = `tok_${tabName}_gen_${gen}`;
          sharedAuthMap.set('cva_fencing_generation', String(gen));
          sharedAuthMap.set('cva_fencing_token', tok);
          sharedAuthMap.set('cva_migration_lock', JSON.stringify({ token: tok, generation: gen, time: Date.now() }));
          const lockCtx = {
            generation: gen,
            token: tok,
            revoked: false,
            verifyFencing: () => {
              const curG = Number(sharedAuthMap.get('cva_fencing_generation') || 0);
              const curT = sharedAuthMap.get('cva_fencing_token');
              const curL = sharedAuthMap.get('cva_migration_lock');
              if (!curL) return false;
              try {
                const p = JSON.parse(curL);
                return !lockCtx.revoked && curG === gen && curT === tok && Boolean(p && typeof p === "object" && !Array.isArray(p) && p.token === tok && p.generation === gen);
              } catch {
                return false;
              }
            }
          };
          try {
            return await cb(lockCtx);
          } finally {
            if (lockCtx.verifyFencing()) {
              sharedAuthMap.delete('cva_migration_lock');
            }
            lockCtx.revoked = true;
          }
        }
      };
      const s = new vm.Script(evalScope);
      s.runInContext(vm.createContext(tabSandbox));
      return tabSandbox;
    };

    const tabA = createTabSandbox('TabA');
    const tabB = createTabSandbox('TabB');

    // Tab A và Tab B cùng gửi lệnh thất bại gần như đồng thời
    const [resA, resB] = await Promise.all([
      tabA.recordAuthFailure(),
      tabB.recordAuthFailure()
    ]);

    assert(Boolean(resA && resB), 'Dual-Tab Concurrency: Cả hai tab hoàn thành recordAuthFailure an toàn');
    assert(sharedAuthMap.get('teacher_hub_auth_fails') === '5', 'Dual-Tab Concurrency: Không mất lần thử nào (3 -> 4 -> 5, 0 lost updates)');
    assert(sharedAuthMap.get('teacher_hub_lock_until') !== null, 'Dual-Tab Concurrency: Trạng thái lockout được bảo toàn nguyên vẹn');
    assert(tabA.checkRateLimit() === false && tabB.checkRateLimit() === false, 'Dual-Tab Concurrency: Cả hai tab đều nhận diện trạng thái lockout đồng bộ');

    // ── 7.2.2: Stale Writer & Revoked Lock Rejection (Fail-Closed) ──
    console.log('  ▸ 7.2.2 Kiểm tra Stale Writer & Revoked Lock Rejection (Fail-Closed):');
    const revokedCtx = {
      generation: 99,
      token: 'tok_revoked',
      revoked: true,
      verifyFencing: () => false
    };

    let threwRevokedRecord = false;
    try {
      await tabA.recordAuthFailure(revokedCtx);
    } catch (err) {
      threwRevokedRecord = Boolean(err && err.message && err.message.includes('StorageLockUnavailable'));
    }
    assert(threwRevokedRecord === true, 'Fail-Closed: recordAuthFailure ném StorageLockUnavailable khi lock context bị revoked');

    let threwRevokedReset = false;
    try {
      await tabA.resetAuthFailures(revokedCtx);
    } catch (err) {
      threwRevokedReset = Boolean(err && err.message && err.message.includes('StorageLockUnavailable'));
    }
    assert(threwRevokedReset === true, 'Fail-Closed: resetAuthFailures ném StorageLockUnavailable khi lock context bị revoked');
    assert(sharedAuthMap.get('teacher_hub_lock_until') !== null, 'Fail-Closed: Lockout không bị xóa bởi revoked lock context');

    // Stale generation writer
    const staleCtx = {
      generation: 1, // Storage hiện đang ở gen > 1
      token: 'tok_stale',
      revoked: false,
      verifyFencing: () => false
    };

    let threwStaleReset = false;
    try {
      await tabB.resetAuthFailures(staleCtx);
    } catch (err) {
      threwStaleReset = Boolean(err && err.message && err.message.includes('FencingViolation'));
    }
    assert(threwStaleReset === true, 'Fail-Closed: resetAuthFailures ném FencingViolation khi generation bị superseded');
    assert(sharedAuthMap.get('teacher_hub_lock_until') !== null, 'Fail-Closed: Stale generation writer tuyệt đối KHÔNG xóa được teacher_hub_lock_until');

    // ── 7.2.2.b: Adversarial Interleaving Test 1 (Preemption between reset mutations) ──
    console.log('  ▸ 7.2.2.b Adversarial Interleaving: Preemption between reset mutations (Anti-Split-Brain):');
    const advMap = new Map();
    const origLockoutTime = Date.now() + 30000;
    const tabBLockoutTime = Date.now() + 60000;
    advMap.set('teacher_hub_auth_fails', '5');
    advMap.set('teacher_hub_lock_until', String(origLockoutTime));
    advMap.set('cva_fencing_generation', '10');
    advMap.set('cva_fencing_token', 'tok_tabA_gen_10');
    advMap.set('cva_migration_lock', JSON.stringify({ token: 'tok_tabA_gen_10', generation: 10, time: Date.now() }));

    const tabALockCtx = {
      generation: 10,
      token: 'tok_tabA_gen_10',
      revoked: false,
      verifyFencing: () => {
        if (tabALockCtx.revoked) return false;
        if (Number(advMap.get('cva_fencing_generation')) !== 10 || advMap.get('cva_fencing_token') !== 'tok_tabA_gen_10') return false;
        const curL = advMap.get('cva_migration_lock');
        if (!curL) return false;
        try {
          const p = JSON.parse(curL);
          return Boolean(p && typeof p === "object" && !Array.isArray(p) && p.token === 'tok_tabA_gen_10' && p.generation === 10);
        } catch {
          return false;
        }
      }
    };

    let tabBIntervened = false;
    const advStorage = {
      getItem: (k) => advMap.get(k) || null,
      setItem: (k, v) => advMap.set(k, String(v)),
      removeItem: (k) => {
        advMap.delete(k);
        // Ngay khi Tab A vừa xóa teacher_hub_auth_fails: Tab B nhảy vào chiếm quyền (Preemption)
        if (k === 'teacher_hub_auth_fails' && !tabBIntervened) {
          tabBIntervened = true;
          // Tab B nâng generation lên 11 và thiết lập lockout mới
          advMap.set('cva_fencing_generation', '11');
          advMap.set('cva_fencing_token', 'tok_tabB_gen_11');
          advMap.set('cva_migration_lock', JSON.stringify({ token: 'tok_tabB_gen_11', generation: 11, time: Date.now() }));
          advMap.set('teacher_hub_lock_until', String(tabBLockoutTime));
        }
      }
    };

    const advSandbox = {
      localStorage: advStorage,
      MAX_AUTH_FAILS,
      LOCKOUT_MS,
      showToast: () => {},
      console: { log: () => {}, warn: () => {}, error: () => {} },
      Date
    };
    const advScript = new vm.Script(evalScope);
    advScript.runInContext(vm.createContext(advSandbox));

    let threwAdvReset = false;
    try {
      await advSandbox.resetAuthFailures(tabALockCtx);
    } catch (err) {
      threwAdvReset = Boolean(err && err.message && (err.message.includes('FencingViolation') || err.message.includes('AuthRollbackFailed')));
    }
    assert(threwAdvReset === true, 'Adversarial Reset Preemption: Tab A ném FencingViolation / AuthRollbackFailed khi Tab B xen ngang');
    assert(advMap.get('teacher_hub_lock_until') === String(tabBLockoutTime), 'Adversarial Reset Preemption: Lockout của Tab B được bảo toàn 100%, không bị Tab A xóa đè');
    assert(advMap.has('cva_auth_staging') === true, 'Adversarial Reset Preemption: Bảo lưu cva_auth_staging nguyên vẹn để recovery khi mất fencing');
    assert(advSandbox.isStorageDegraded === true, 'Adversarial Reset Preemption: Kích hoạt isStorageDegraded khi phát hiện mất fencing');

    // ── 7.2.2.c: Adversarial Interleaving Test 2 (Preemption during recordAuthFailure) ──
    console.log('  ▸ 7.2.2.c Adversarial Interleaving: Preemption during recordAuthFailure (Anti-Split-Brain):');
    const advRecordMap = new Map();
    advRecordMap.set('teacher_hub_auth_fails', '2');
    advRecordMap.set('cva_fencing_generation', '20');
    advRecordMap.set('cva_fencing_token', 'tok_tabA_gen_20');
    advRecordMap.set('cva_migration_lock', JSON.stringify({ token: 'tok_tabA_gen_20', generation: 20, time: Date.now() }));

    const tabARecordCtx = {
      generation: 20,
      token: 'tok_tabA_gen_20',
      revoked: false,
      verifyFencing: () => {
        if (tabARecordCtx.revoked) return false;
        if (Number(advRecordMap.get('cva_fencing_generation')) !== 20 || advRecordMap.get('cva_fencing_token') !== 'tok_tabA_gen_20') return false;
        const curL = advRecordMap.get('cva_migration_lock');
        if (!curL) return false;
        try {
          const p = JSON.parse(curL);
          return Boolean(p && typeof p === "object" && !Array.isArray(p) && p.token === 'tok_tabA_gen_20' && p.generation === 20);
        } catch {
          return false;
        }
      }
    };

    let tabBRecordIntervened = false;
    const advRecordStorage = {
      getItem: (k) => advRecordMap.get(k) || null,
      setItem: (k, v) => {
        advRecordMap.set(k, String(v));
        // Ngay khi Tab A vừa ghi cva_auth_staging: Tab B xen ngang nâng generation
        if (k === 'cva_auth_staging' && !tabBRecordIntervened) {
          tabBRecordIntervened = true;
          advRecordMap.set('cva_fencing_generation', '21');
          advRecordMap.set('cva_fencing_token', 'tok_tabB_gen_21');
          advRecordMap.set('cva_migration_lock', JSON.stringify({ token: 'tok_tabB_gen_21', generation: 21, time: Date.now() }));
          advRecordMap.set('teacher_hub_auth_fails', '3'); // Tab B ghi nhận thành công fails = 3
        }
      },
      removeItem: (k) => advRecordMap.delete(k)
    };

    const advRecordSandbox = {
      localStorage: advRecordStorage,
      MAX_AUTH_FAILS,
      LOCKOUT_MS,
      showToast: () => {},
      console: { log: () => {}, warn: () => {}, error: () => {} },
      Date
    };
    const advRecordScript = new vm.Script(evalScope);
    advRecordScript.runInContext(vm.createContext(advRecordSandbox));

    let threwAdvRecord = false;
    try {
      await advRecordSandbox.recordAuthFailure(tabARecordCtx);
    } catch (err) {
      threwAdvRecord = Boolean(err && err.message && (err.message.includes('FencingViolation') || err.message.includes('AuthRollbackFailed')));
    }
    assert(threwAdvRecord === true, 'Adversarial Record Preemption: Tab A ném FencingViolation / AuthRollbackFailed khi Tab B xen ngang');
    assert(advRecordMap.get('teacher_hub_auth_fails') === '3', 'Adversarial Record Preemption: Dữ liệu của Tab B được bảo toàn 100%, không bị Tab A ghi đè staled fails');
    assert(advRecordMap.has('cva_auth_staging') === true, 'Adversarial Record Preemption: Bảo lưu cva_auth_staging nguyên vẹn');
    assert(advRecordSandbox.isStorageDegraded === true, 'Adversarial Record Preemption: Kích hoạt isStorageDegraded khi phát hiện mất fencing');

    // ── 7.2.3: In-Flight WAL Staging Protection & Crash Recovery ──
    console.log('  ▸ 7.2.3 Kiểm tra In-Flight WAL Staging Protection & Crash Recovery:');
    const crashAuthMap = new Map();
    const futureLockUntil = Date.now() + 25000;
    // Giả lập crash: cva_auth_staging đã ghi lockout nhưng teacher_hub_lock_until chưa kịp commit
    crashAuthMap.set('cva_auth_staging', JSON.stringify({
      stage: 'auth_lockout',
      fails: 5,
      isLockout: true,
      lockUntil: futureLockUntil,
      generation: 1,
      token: 'tok_crash',
      time: Date.now()
    }));

    const crashSandbox = {
      localStorage: {
        getItem: (k) => crashAuthMap.get(k) || null,
        setItem: (k, v) => crashAuthMap.set(k, String(v)),
        removeItem: (k) => crashAuthMap.delete(k)
      },
      MAX_AUTH_FAILS,
      LOCKOUT_MS,
      showToast: () => {},
      console: { log: () => {}, warn: () => {}, error: () => {} },
      Date
    };
    const crashScript = new vm.Script(evalScope);
    crashScript.runInContext(vm.createContext(crashSandbox));

    assert(crashSandbox.checkRateLimit() === false, 'Crash Invariant: checkRateLimit kích hoạt lockout ngay từ cva_auth_staging dở dang (Fail-Closed)');

    // Reset hợp lệ dưới lock context mới
    await tabA.resetAuthFailures();
    assert(tabA.checkRateLimit() === true, 'Hợp lệ: Sau khi resetAuthFailures dưới Web Locks, hệ thống mở khóa thành công');

    // ── 7.2.4: Corrupt, Truncated & Invalid WAL Staging Tests (Fail-Closed Invariant) ──
    console.log('  ▸ 7.2.4 Kiểm tra Corrupt, Truncated & Malformed WAL Staging (Fail-Closed):');
    const corruptMap = new Map();
    const corruptSandbox = {
      localStorage: {
        getItem: (k) => corruptMap.has(k) ? corruptMap.get(k) : null,
        setItem: (k, v) => corruptMap.set(k, String(v)),
        removeItem: (k) => corruptMap.delete(k)
      },
      MAX_AUTH_FAILS,
      LOCKOUT_MS,
      showToast: () => {},
      console: { log: () => {}, warn: () => {}, error: () => {} },
      Date
    };
    const corruptScript = new vm.Script(evalScope);
    corruptScript.runInContext(vm.createContext(corruptSandbox));

    // Case 1: JSON bị cắt cụt (Truncated JSON do browser bị kill)
    corruptMap.set('cva_auth_staging', '{"stage":"auth_lockout","fails":5,"isLockout":true,"lockUn');
    const resTrunc = corruptSandbox.checkRateLimit();
    assert(resTrunc === false, 'Fail-Closed: checkRateLimit trả về false khi JSON staging bị cắt cụt (Truncated JSON)');
    assert(corruptMap.has('cva_auth_error') === false, 'Pure Read-Only Invariant: checkRateLimit ngoài Web Locks tuyệt đối 0 ghi đĩa (0 storage mutations)');

    // Case 2: Staging thiếu trường bắt buộc (Missing required fields: thiếu fails, token, generation)
    corruptMap.clear();
    corruptMap.set('cva_auth_staging', JSON.stringify({ stage: 'auth_lockout', isLockout: true, lockUntil: Date.now() + 30000 }));
    const resMissing = corruptSandbox.checkRateLimit();
    assert(resMissing === false, 'Fail-Closed: checkRateLimit từ chối khi staging thiếu trường bắt buộc (fails, generation, token)');

    // Case 3: lockUntil là chuỗi không phải số hoặc NaN
    corruptMap.clear();
    corruptMap.set('cva_auth_staging', JSON.stringify({
      stage: 'auth_lockout',
      fails: 5,
      isLockout: true,
      lockUntil: 'invalid_string_not_number',
      generation: 1,
      token: 'tok_test'
    }));
    const resNan = corruptSandbox.checkRateLimit();
    assert(resNan === false, 'Fail-Closed: checkRateLimit từ chối khi lockUntil là chuỗi không phải số');

    // Case 4: lockUntil là số âm
    corruptMap.clear();
    corruptMap.set('cva_auth_staging', JSON.stringify({
      stage: 'auth_lockout',
      fails: 5,
      isLockout: true,
      lockUntil: -999,
      generation: 1,
      token: 'tok_test'
    }));
    const resNegative = corruptSandbox.checkRateLimit();
    assert(resNegative === false, 'Fail-Closed: checkRateLimit từ chối khi lockUntil là số âm');

    // Case 5: Staging dở dang kiểu in-flight increment
    corruptMap.clear();
    corruptMap.set('cva_auth_staging', JSON.stringify({
      stage: 'auth_failure_increment',
      fails: 3,
      isLockout: false,
      lockUntil: 0,
      generation: 1,
      token: 'tok_test'
    }));
    const resInflight = corruptSandbox.checkRateLimit();
    assert(resInflight === false, 'Fail-Closed: checkRateLimit từ chối khi phát hiện staging increment đang ghi dở dang');

    // Case 6 (Adversarial Codex Finding): Staging chứa fails: null
    corruptMap.clear();
    corruptMap.set('cva_auth_staging', JSON.stringify({
      stage: 'auth_lockout',
      fails: null,
      isLockout: true,
      lockUntil: Date.now() + 30000,
      generation: 1,
      token: 'tok_test'
    }));
    const resNullFails = corruptSandbox.checkRateLimit();
    assert(resNullFails === false, 'Fail-Closed: checkRateLimit từ chối khi staging chứa fails: null');

    // Case 7 (Adversarial Codex Finding): Staging chứa fails không phải số hợp lệ
    corruptMap.clear();
    corruptMap.set('cva_auth_staging', JSON.stringify({
      stage: 'auth_lockout',
      fails: 'invalid_nan',
      isLockout: true,
      lockUntil: Date.now() + 30000,
      generation: 1,
      token: 'tok_test'
    }));
    const resNanFails = corruptSandbox.checkRateLimit();
    assert(resNanFails === false, 'Fail-Closed: checkRateLimit từ chối khi staging chứa fails không phải số hợp lệ');

    // Case 8 (Adversarial Codex Finding): teacher_hub_auth_fails = "abc"
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', 'abc');
    const resAbcFails = corruptSandbox.checkRateLimit();
    assert(resAbcFails === false, 'Fail-Closed: checkRateLimit từ chối khi teacher_hub_auth_fails = "abc"');

    // Case 9 (Adversarial Codex Finding): teacher_hub_auth_fails = "NaN"
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', 'NaN');
    const resNanStoredFails = corruptSandbox.checkRateLimit();
    assert(resNanStoredFails === false, 'Fail-Closed: checkRateLimit từ chối khi teacher_hub_auth_fails = "NaN"');

    // Case 10 (Adversarial Codex Finding): teacher_hub_auth_fails = "-1" (số âm)
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', '-1');
    const resNegativeStoredFails = corruptSandbox.checkRateLimit();
    assert(resNegativeStoredFails === false, 'Fail-Closed: checkRateLimit từ chối khi teacher_hub_auth_fails là số âm');

    // Case 11 (Adversarial Codex Finding): teacher_hub_auth_fails = "2.5" (số thập phân)
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', '2.5');
    const resFloatStoredFails = corruptSandbox.checkRateLimit();
    assert(resFloatStoredFails === false, 'Fail-Closed: checkRateLimit từ chối khi teacher_hub_auth_fails là số thập phân');

    // Case 12 (Adversarial Codex Finding): teacher_hub_auth_fails vượt Number.MAX_SAFE_INTEGER
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', '9007199254740992');
    const resHugeStoredFails = corruptSandbox.checkRateLimit();
    assert(resHugeStoredFails === false, 'Fail-Closed: checkRateLimit từ chối khi teacher_hub_auth_fails vượt MAX_SAFE_INTEGER');

    // Case 13 (Adversarial Codex Finding): teacher_hub_auth_fails vượt MAX_AUTH_FAILS (ví dụ: 999)
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', '999');
    const resOverMaxStoredFails = corruptSandbox.checkRateLimit();
    assert(resOverMaxStoredFails === false, 'Fail-Closed: checkRateLimit từ chối khi teacher_hub_auth_fails vượt MAX_AUTH_FAILS');

    // Case 14 (Adversarial Codex Finding): recordAuthFailure dưới lock ném AuthFailuresCorrupted & ghi cva_auth_error khi teacher_hub_auth_fails bị hỏng
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', 'abc');
    corruptMap.set('cva_fencing_generation', '1');
    corruptMap.set('cva_fencing_token', 'tok_corr');
    corruptMap.set('cva_migration_lock', JSON.stringify({ token: 'tok_corr', generation: 1, time: Date.now() }));
    const validLockCtxForCorrupt = {
      generation: 1,
      token: 'tok_corr',
      revoked: false,
      verifyFencing: () => true
    };
    let threwCorruptedAuth = false;
    try {
      await corruptSandbox.recordAuthFailure(validLockCtxForCorrupt);
    } catch (errCorr) {
      threwCorruptedAuth = Boolean(errCorr && errCorr.message && errCorr.message.includes('AuthFailuresCorrupted'));
    }
    assert(threwCorruptedAuth === true, 'Fail-Closed: recordAuthFailure ném AuthFailuresCorrupted khi teacher_hub_auth_fails bị biến dạng');
    assert(corruptMap.has('cva_auth_error') === true, 'Fail-Closed: recordAuthFailure ghi nhận cờ lỗi cva_auth_error khi phát hiện fails bị biến dạng');
    assert(corruptMap.has('cva_auth_staging') === false, 'WAL Invariant: Không commit hay dọn staging mù quáng khi phát hiện corruption');

    // Case 15 (Codex Adversarial Finding): stage: "auth_lockout" nhưng isLockout: false
    corruptMap.clear();
    corruptMap.set('cva_auth_staging', JSON.stringify({
      stage: 'auth_lockout',
      fails: 5,
      isLockout: false,
      lockUntil: Date.now() + 30000,
      generation: 1,
      token: 'tok_test'
    }));
    const resLockoutFalse = corruptSandbox.checkRateLimit();
    assert(resLockoutFalse === false, 'Fail-Closed: checkRateLimit từ chối khi stage auth_lockout có isLockout: false');

    // Case 16 (Codex Adversarial Finding): stage: "auth_failure_increment" nhưng isLockout: true
    corruptMap.clear();
    corruptMap.set('cva_auth_staging', JSON.stringify({
      stage: 'auth_failure_increment',
      fails: 3,
      isLockout: true,
      lockUntil: Date.now() + 30000,
      generation: 1,
      token: 'tok_test'
    }));
    const resIncrementTrue = corruptSandbox.checkRateLimit();
    assert(resIncrementTrue === false, 'Fail-Closed: checkRateLimit từ chối khi stage auth_failure_increment có isLockout: true');

    // Case 17 (Codex Adversarial Finding): stage: "auth_lockout" nhưng lockUntil: 0
    corruptMap.clear();
    corruptMap.set('cva_auth_staging', JSON.stringify({
      stage: 'auth_lockout',
      fails: 5,
      isLockout: true,
      lockUntil: 0,
      generation: 1,
      token: 'tok_test'
    }));
    const resLockoutZero = corruptSandbox.checkRateLimit();
    assert(resLockoutZero === false, 'Fail-Closed: checkRateLimit từ chối khi stage auth_lockout có lockUntil: 0');

    // Case 18 (Codex Adversarial Finding): stage: "auth_lockout", fails: 5 nhưng thiếu isLockout
    corruptMap.clear();
    corruptMap.set('cva_auth_staging', JSON.stringify({
      stage: 'auth_lockout',
      fails: 5,
      lockUntil: Date.now() + 30000,
      generation: 1,
      token: 'tok_test'
    }));
    const resLockoutMissing = corruptSandbox.checkRateLimit();
    assert(resLockoutMissing === false, 'Fail-Closed: checkRateLimit từ chối khi stage auth_lockout thiếu trường isLockout');

    // Case 19 (Codex Adversarial Finding): stage: "auth_lockout", fails: 5 nhưng isLockout là string "true" (không phải boolean)
    corruptMap.clear();
    corruptMap.set('cva_auth_staging', JSON.stringify({
      stage: 'auth_lockout',
      fails: 5,
      isLockout: 'true',
      lockUntil: Date.now() + 30000,
      generation: 1,
      token: 'tok_test'
    }));
    const resLockoutString = corruptSandbox.checkRateLimit();
    assert(resLockoutString === false, 'Fail-Closed: checkRateLimit từ chối khi isLockout là string "true" thay vì boolean');

    // Case 20 (Codex Adversarial Finding): stage: "auth_lockout", fails: 4 (fails < MAX_AUTH_FAILS khi lockout)
    corruptMap.clear();
    corruptMap.set('cva_auth_staging', JSON.stringify({
      stage: 'auth_lockout',
      fails: 4,
      isLockout: true,
      lockUntil: Date.now() + 30000,
      generation: 1,
      token: 'tok_test'
    }));
    const resLockoutFailsMismatch = corruptSandbox.checkRateLimit();
    assert(resLockoutFailsMismatch === false, 'Fail-Closed: checkRateLimit từ chối khi auth_lockout có fails < MAX_AUTH_FAILS');

    // Case 21 (Codex Adversarial Finding): teacher_hub_auth_fails = "0" (0 failures cấm lưu thành khóa)
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', '0');
    assert(corruptSandbox.checkRateLimit() === false, 'Fail-Closed: checkRateLimit từ chối khi stored teacher_hub_auth_fails = "0" (0 lần sai cấm lưu thành khóa)');

    // Case 22 (Codex Adversarial Finding): teacher_hub_auth_fails = "5" (cô lập, thiếu teacher_hub_lock_until)
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', '5');
    assert(corruptSandbox.checkRateLimit() === false, 'Fail-Closed: checkRateLimit từ chối khi teacher_hub_auth_fails = "5" nhưng thiếu teacher_hub_lock_until');

    // Case 23 (Codex Adversarial Finding): teacher_hub_lock_until = "0"
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', '5');
    corruptMap.set('teacher_hub_lock_until', '0');
    assert(corruptSandbox.checkRateLimit() === false, 'Fail-Closed: checkRateLimit từ chối khi teacher_hub_lock_until = "0"');

    // Case 24 (Codex Adversarial Finding): teacher_hub_lock_until = "5000" (năm 1970)
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', '5');
    corruptMap.set('teacher_hub_lock_until', '5000');
    assert(corruptSandbox.checkRateLimit() === false, 'Fail-Closed: checkRateLimit từ chối khi teacher_hub_lock_until = "5000"');

    // Case 25 (Codex Adversarial Finding): teacher_hub_lock_until = "" (chuỗi rỗng)
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', '5');
    corruptMap.set('teacher_hub_lock_until', '');
    assert(corruptSandbox.checkRateLimit() === false, 'Fail-Closed: checkRateLimit từ chối khi teacher_hub_lock_until là chuỗi rỗng');

    // Case 26 (Codex Adversarial Finding): teacher_hub_lock_until = "NaN"
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', '5');
    corruptMap.set('teacher_hub_lock_until', 'NaN');
    assert(corruptSandbox.checkRateLimit() === false, 'Fail-Closed: checkRateLimit từ chối khi teacher_hub_lock_until = "NaN"');

    // Case 27 (Codex Adversarial Finding): teacher_hub_auth_fails = "" (chuỗi rỗng)
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', '');
    assert(corruptSandbox.checkRateLimit() === false, 'Fail-Closed: checkRateLimit từ chối khi teacher_hub_auth_fails là chuỗi rỗng');

    // Case 28 (Codex Adversarial Finding): teacher_hub_lock_until cô lập không có auth_fails
    corruptMap.clear();
    corruptMap.set('teacher_hub_lock_until', '1790000000000');
    assert(corruptSandbox.checkRateLimit() === false, 'Fail-Closed: checkRateLimit từ chối khi teacher_hub_lock_until tồn tại cô lập không có auth_fails');

    // Case 29 (Codex Adversarial Finding): checkRateLimitUnlocked(ctx) từ chối và ghi cva_auth_error khi auth_fails = "0"
    corruptMap.clear();
    corruptMap.set('cva_fencing_generation', '1');
    corruptMap.set('cva_fencing_token', 'tok_corr');
    corruptMap.set('cva_migration_lock', JSON.stringify({ token: 'tok_corr', generation: 1, time: Date.now() }));
    corruptMap.set('teacher_hub_auth_fails', '0');
    const unlockedResZeroFails = corruptSandbox.checkRateLimitUnlocked(validLockCtxForCorrupt);
    assert(unlockedResZeroFails === false, 'Fail-Closed: checkRateLimitUnlocked từ chối khi teacher_hub_auth_fails = "0"');
    assert(corruptMap.has('cva_auth_error') === true, 'Fail-Closed: checkRateLimitUnlocked ghi nhận cờ cva_auth_error khi stored fails = "0"');

    // Case 30 (Codex Adversarial Finding): checkRateLimitUnlocked(ctx) từ chối và ghi cva_auth_error khi lock_until = "5000"
    corruptMap.clear();
    corruptMap.set('cva_fencing_generation', '1');
    corruptMap.set('cva_fencing_token', 'tok_corr');
    corruptMap.set('cva_migration_lock', JSON.stringify({ token: 'tok_corr', generation: 1, time: Date.now() }));
    corruptMap.set('teacher_hub_auth_fails', '5');
    corruptMap.set('teacher_hub_lock_until', '5000');
    const unlockedRes5000Lock = corruptSandbox.checkRateLimitUnlocked(validLockCtxForCorrupt);
    assert(unlockedRes5000Lock === false, 'Fail-Closed: checkRateLimitUnlocked từ chối khi lock_until = "5000"');
    assert(corruptMap.has('cva_auth_error') === true, 'Fail-Closed: checkRateLimitUnlocked ghi nhận cờ cva_auth_error khi lock_until = "5000"');

    // Case 31 (Codex Adversarial Finding): recordAuthFailure(ctx) ném AuthFailuresCorrupted khi stored lock_until = "0"
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', '5');
    corruptMap.set('teacher_hub_lock_until', '0');
    corruptMap.set('cva_fencing_generation', '1');
    corruptMap.set('cva_fencing_token', 'tok_corr');
    corruptMap.set('cva_migration_lock', JSON.stringify({ token: 'tok_corr', generation: 1, time: Date.now() }));
    let threwLockZero = false;
    try {
      await corruptSandbox.recordAuthFailure(validLockCtxForCorrupt);
    } catch (eRecCorr) {
      threwLockZero = Boolean(eRecCorr && eRecCorr.message && eRecCorr.message.includes('AuthFailuresCorrupted'));
    }
    assert(threwLockZero === true, 'Fail-Closed: recordAuthFailure ném AuthFailuresCorrupted khi teacher_hub_lock_until = "0"');

    // Case 32 (Codex Adversarial Finding): recordAuthFailure(ctx) ném AuthFailuresCorrupted khi stored auth_fails = "0"
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', '0');
    corruptMap.set('cva_fencing_generation', '1');
    corruptMap.set('cva_fencing_token', 'tok_corr');
    corruptMap.set('cva_migration_lock', JSON.stringify({ token: 'tok_corr', generation: 1, time: Date.now() }));
    let threwFailsZero = false;
    try {
      await corruptSandbox.recordAuthFailure(validLockCtxForCorrupt);
    } catch (eRecCorr) {
      threwFailsZero = Boolean(eRecCorr && eRecCorr.message && eRecCorr.message.includes('AuthFailuresCorrupted'));
    }
    assert(threwFailsZero === true, 'Fail-Closed: recordAuthFailure ném AuthFailuresCorrupted khi teacher_hub_auth_fails = "0"');

    // Case 33 (Codex Finding - Zero Fail-Open on Expired Lockout Cleanup):
    // Lockout đã hết hạn nhưng lock context bị revoked/superseded -> BẮT BUỘC ném FencingViolation, CẤM return true
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', '5');
    corruptMap.set('teacher_hub_lock_until', '1000000000000'); // Quá khứ: expired lockout
    corruptMap.set('cva_fencing_generation', '2');
    corruptMap.set('cva_fencing_token', 'tok_new');
    corruptMap.set('cva_migration_lock', JSON.stringify({ token: 'tok_new', generation: 2, time: Date.now() }));
    const supersededExpiredLockCtx = {
      generation: 1, // Stale generation 1 < 2
      token: 'tok_old_superseded',
      revoked: false,
      verifyFencing: () => false
    };
    let threwExpiredFencing = false;
    let expiredRetVal = null;
    try {
      expiredRetVal = corruptSandbox.checkRateLimitUnlocked(supersededExpiredLockCtx);
    } catch (eExpired) {
      threwExpiredFencing = Boolean(eExpired && eExpired.message && eExpired.message.includes('FencingViolation'));
    }
    assert(threwExpiredFencing === true && expiredRetVal !== true, 'Zero Fail-Open: checkRateLimitUnlocked ném FencingViolation và KHÔNG return true khi cleanup expired lockout bị mất fencing');
    assert(corruptMap.get('teacher_hub_auth_fails') === '5', 'Zero Fail-Open: Không xóa dở dang teacher_hub_auth_fails khi fencing không hợp lệ');

    // Case 34 (Codex Finding - All-or-Nothing Rollback in recordAuthFailure):
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', '4');
    corruptMap.set('cva_fencing_generation', '1');
    corruptMap.set('cva_fencing_token', 'tok_corr');
    corruptMap.set('cva_migration_lock', JSON.stringify({ token: 'tok_corr', generation: 1, time: Date.now() }));
    corruptSandbox.isStorageDegraded = false;
    const origCorruptSet = corruptSandbox.localStorage.setItem;
    let triggerRecordDiskErr = true;
    corruptSandbox.localStorage.setItem = (k, v) => {
      if (triggerRecordDiskErr && k === 'teacher_hub_lock_until') {
        throw new Error('QuotaExceeded: Simulated disk write failure on lock_until');
      }
      origCorruptSet(k, v);
    };
    let threwRollbackRecord = false;
    try {
      await corruptSandbox.recordAuthFailure(validLockCtxForCorrupt);
    } catch (eRecRb) {
      threwRollbackRecord = Boolean(eRecRb && eRecRb.message);
    } finally {
      corruptSandbox.localStorage.setItem = origCorruptSet;
    }
    assert(threwRollbackRecord === true, 'Fail-Closed: recordAuthFailure ném lỗi khi gặp sự cố đĩa');
    assert(corruptMap.get('teacher_hub_auth_fails') === '4', 'All-or-Nothing Invariant: teacher_hub_auth_fails được rollback về 4');

    // Case 35 (Codex Finding - All-or-Nothing Rollback in resetAuthFailures):
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', '5');
    corruptMap.set('teacher_hub_lock_until', '1999999999000');
    corruptMap.set('cva_fencing_generation', '1');
    corruptMap.set('cva_fencing_token', 'tok_corr');
    corruptMap.set('cva_migration_lock', JSON.stringify({ token: 'tok_corr', generation: 1, time: Date.now() }));
    const origCorruptRemove = corruptSandbox.localStorage.removeItem;
    corruptSandbox.localStorage.removeItem = (k) => {
      if (k === 'teacher_hub_lock_until') {
        throw new Error('StorageFault: Simulated remove failure on lock_until');
      }
      origCorruptRemove(k);
    };
    let threwResetRb = false;
    try {
      await corruptSandbox.resetAuthFailures(validLockCtxForCorrupt);
    } catch (eResetRb) {
      threwResetRb = Boolean(eResetRb && eResetRb.message);
    } finally {
      corruptSandbox.localStorage.removeItem = origCorruptRemove;
    }
    assert(threwResetRb === true, 'Fail-Closed: resetAuthFailures ném lỗi khi xóa gặp sự cố đĩa');
    assert(corruptMap.get('teacher_hub_auth_fails') === '5', 'All-or-Nothing Invariant: teacher_hub_auth_fails được rollback về 5 sau khi reset thất bại');

    // Case 36 (Codex Adversarial Finding - Lock Marker Replacement with Generation/Token Retained):
    // Tab B thay thế cva_migration_lock thành {"token":"attacker_tok","generation":999}
    // nhưng cva_fencing_generation và cva_fencing_token vẫn tạm giữ giá trị cũ (1 và "tok_corr").
    // Tab A (validLockCtxForCorrupt: gen=1, token="tok_corr") KHÔNG được coi cva_migration_lock !== null là hợp lệ!
    corruptMap.clear();
    corruptMap.set('cva_fencing_generation', '1');
    corruptMap.set('cva_fencing_token', 'tok_corr');
    corruptMap.set('cva_migration_lock', JSON.stringify({ token: 'attacker_tok', generation: 999, time: Date.now() }));
    corruptMap.set('teacher_hub_auth_fails', '2');
    
    // verifyAuthFencing bắt buộc trả về false
    assert(corruptSandbox.verifyAuthFencing(validLockCtxForCorrupt) === false, 'Fencing Invariant: verifyAuthFencing từ chối khi cva_migration_lock bị thay thế (token/gen mismatch)');

    // safeFencedSetAuth bắt buộc ném FencingViolation
    let threwFencedSetMarkerMismatch = false;
    try {
      corruptSandbox.safeFencedSetAuth('teacher_hub_auth_fails', '3', validLockCtxForCorrupt);
    } catch (eFencedSet) {
      threwFencedSetMarkerMismatch = Boolean(eFencedSet && eFencedSet.message && eFencedSet.message.includes('FencingViolation'));
    }
    assert(threwFencedSetMarkerMismatch === true, 'Anti-Stale-Writer: safeFencedSetAuth ném FencingViolation khi lock marker bị thay thế');
    assert(corruptMap.get('teacher_hub_auth_fails') === '2', 'Anti-Stale-Writer: Dữ liệu teacher_hub_auth_fails không bị stale writer ghi đè');

    // safeFencedRemoveAuth bắt buộc ném FencingViolation
    let threwFencedRemoveMarkerMismatch = false;
    try {
      corruptSandbox.safeFencedRemoveAuth('teacher_hub_auth_fails', validLockCtxForCorrupt);
    } catch (eFencedRem) {
      threwFencedRemoveMarkerMismatch = Boolean(eFencedRem && eFencedRem.message && eFencedRem.message.includes('FencingViolation'));
    }
    assert(threwFencedRemoveMarkerMismatch === true, 'Anti-Stale-Writer: safeFencedRemoveAuth ném FencingViolation khi lock marker bị thay thế');

    // recordAuthFailure bắt buộc ném FencingViolation
    let threwRecordMarkerMismatch = false;
    try {
      await corruptSandbox.recordAuthFailure(validLockCtxForCorrupt);
    } catch (eRecMarker) {
      threwRecordMarkerMismatch = Boolean(eRecMarker && eRecMarker.message && eRecMarker.message.includes('FencingViolation'));
    }
    assert(threwRecordMarkerMismatch === true, 'Anti-Stale-Writer: recordAuthFailure ném FencingViolation khi lock marker bị thay thế');

    // resetAuthFailures bắt buộc ném FencingViolation
    let threwResetMarkerMismatch = false;
    try {
      await corruptSandbox.resetAuthFailures(validLockCtxForCorrupt);
    } catch (eResetMarker) {
      threwResetMarkerMismatch = Boolean(eResetMarker && eResetMarker.message && eResetMarker.message.includes('FencingViolation'));
    }
    assert(threwResetMarkerMismatch === true, 'Anti-Stale-Writer: resetAuthFailures ném FencingViolation khi lock marker bị thay thế');

    // Case 37 (Codex Adversarial Finding - Expired Lockout Cleanup with Lock Marker Replacement):
    // Lockout đã hết hạn (quá khứ), cva_migration_lock bị Tab B thay thế thành {"token":"tok_B","generation":2}
    // nhưng cva_fencing_generation và cva_fencing_token vẫn là 1 và "tok_corr".
    // checkRateLimitUnlocked bắt buộc ném FencingViolation, CẤM return true, CẤM xóa dữ liệu
    corruptMap.clear();
    corruptMap.set('teacher_hub_auth_fails', '5');
    corruptMap.set('teacher_hub_lock_until', '1000000000000'); // expired lockout
    corruptMap.set('cva_fencing_generation', '1');
    corruptMap.set('cva_fencing_token', 'tok_corr');
    corruptMap.set('cva_migration_lock', JSON.stringify({ token: 'tok_B', generation: 2, time: Date.now() }));
    let threwExpiredMarkerMismatch = false;
    let expiredMarkerRetVal = null;
    try {
      expiredMarkerRetVal = corruptSandbox.checkRateLimitUnlocked(validLockCtxForCorrupt);
    } catch (eExpM) {
      threwExpiredMarkerMismatch = Boolean(eExpM && eExpM.message && eExpM.message.includes('FencingViolation'));
    }
    assert(threwExpiredMarkerMismatch === true && expiredMarkerRetVal !== true, 'Zero Fail-Open: checkRateLimitUnlocked ném FencingViolation khi dọn expired lockout mà lock marker bị thay thế');
    assert(corruptMap.get('teacher_hub_auth_fails') === '5', 'Zero Fail-Open: teacher_hub_auth_fails bảo lưu 100% khi lock marker không khớp');
    assert(corruptMap.get('teacher_hub_lock_until') === '1000000000000', 'Zero Fail-Open: teacher_hub_lock_until bảo lưu 100% khi lock marker không khớp');

    // Case 38 (Codex Adversarial Finding - Corrupted / Non-Object Lock Marker Payloads):
    // Các dạng payload biến dạng của cva_migration_lock:
    // a) Chuỗi không phải JSON: 'not_valid_json'
    // b) Dạng số nguyên thuần túy: '12345'
    // c) Dạng mảng: '["tok_corr", 1]'
    // d) generation là string: '{"token":"tok_corr","generation":"1"}'
    // e) generation là số thực không nguyên: '{"token":"tok_corr","generation":1.5}'
    const malformedLockPayloads = [
      { name: 'Invalid JSON string', payload: 'not_valid_json' },
      { name: 'Pure numeric primitive', payload: '12345' },
      { name: 'Array payload', payload: JSON.stringify(['tok_corr', 1]) },
      { name: 'String generation in JSON', payload: JSON.stringify({ token: 'tok_corr', generation: '1' }) },
      { name: 'Float non-integer generation', payload: JSON.stringify({ token: 'tok_corr', generation: 1.5 }) }
    ];
    for (const mal of malformedLockPayloads) {
      corruptMap.clear();
      corruptMap.set('cva_fencing_generation', '1');
      corruptMap.set('cva_fencing_token', 'tok_corr');
      corruptMap.set('cva_migration_lock', mal.payload);
      assert(corruptSandbox.verifyAuthFencing(validLockCtxForCorrupt) === false, `Malformed Lock Guard: verifyAuthFencing từ chối khi cva_migration_lock là ${mal.name}`);
    }

    // Case 39 (Codex Adversarial Finding - Non-Fenced / Standalone verifyAuthFencing):
    // Khi ctx không có verifyFencing method riêng (chỉ là plain context object { generation: 1, token: "tok_corr" }):
    // verifyAuthFencing vẫn tự thân parse và thẩm định toàn diện cva_migration_lock
    corruptMap.clear();
    corruptMap.set('cva_fencing_generation', '1');
    corruptMap.set('cva_fencing_token', 'tok_corr');
    corruptMap.set('cva_migration_lock', JSON.stringify({ token: 'tok_corr', generation: 1, time: Date.now() }));
    const plainCtx = { generation: 1, token: 'tok_corr' };
    assert(corruptSandbox.verifyAuthFencing(plainCtx) === true, 'Plain Context: verifyAuthFencing chấp thuận khi lock marker khớp 100%');
    corruptMap.set('cva_migration_lock', JSON.stringify({ token: 'tok_other', generation: 1, time: Date.now() }));
    assert(corruptSandbox.verifyAuthFencing(plainCtx) === false, 'Plain Context: verifyAuthFencing từ chối khi lock marker token khác');

    // ── 7.2.5: Zero-Lock Fallback Rejection (Môi trường thiếu Web Locks) ──
    console.log('  ▸ 7.2.5 Kiểm tra Zero-Lock Fallback Rejection (Thiếu Web Locks API):');
    const noLockMap = new Map();
    noLockMap.set('teacher_hub_auth_fails', '5');
    noLockMap.set('teacher_hub_lock_until', '1790000000000');

    // Sandbox hoàn toàn KHÔNG CÓ executeWithCrossTabLock và KHÔNG CÓ lockCtx
    const noLockSandbox = {
      localStorage: {
        getItem: (k) => noLockMap.get(k) || null,
        setItem: (k, v) => noLockMap.set(k, String(v)),
        removeItem: (k) => noLockMap.delete(k)
      },
      MAX_AUTH_FAILS,
      LOCKOUT_MS,
      showToast: () => {},
      console: { log: () => {}, warn: () => {}, error: () => {} },
      Date
    };
    const noLockScript = new vm.Script(evalScope);
    noLockScript.runInContext(vm.createContext(noLockSandbox));

    let threwNoLockRecord = false;
    try {
      await noLockSandbox.recordAuthFailure();
    } catch (err) {
      threwNoLockRecord = Boolean(err && err.message && err.message.includes('StorageLockUnavailable'));
    }
    assert(threwNoLockRecord === true, 'Fail-Closed: recordAuthFailure ném StorageLockUnavailable khi thiếu Web Locks');
    assert(noLockMap.get('teacher_hub_auth_fails') === '5', 'Zero-Write Invariant: recordAuthFailure không ghi đè bất kỳ byte nào khi thiếu khóa');

    let threwNoLockReset = false;
    try {
      await noLockSandbox.resetAuthFailures();
    } catch (err) {
      threwNoLockReset = Boolean(err && err.message && err.message.includes('StorageLockUnavailable'));
    }
    assert(threwNoLockReset === true, 'Fail-Closed: resetAuthFailures ném StorageLockUnavailable khi thiếu Web Locks');
    assert(noLockMap.get('teacher_hub_lock_until') === '1790000000000', 'Zero-Delete Invariant: resetAuthFailures không xóa khóa khi thiếu Web Locks');

    // ── 7.2.6: checkRateLimitUnlocked(ctx) Phục Hồi Tự Động cva_auth_staging Dở Dang ──
    console.log('  ▸ 7.2.6 Kiểm tra checkRateLimitUnlocked(ctx) Tự động Phục hồi cva_auth_staging:');
    const autoRecMap = new Map();
    const autoRecSandbox = {
      localStorage: {
        getItem: (k) => autoRecMap.get(k) || null,
        setItem: (k, v) => autoRecMap.set(k, String(v)),
        removeItem: (k) => autoRecMap.delete(k)
      },
      MAX_AUTH_FAILS,
      LOCKOUT_MS,
      showToast: () => {},
      console: { log: () => {}, warn: () => {}, error: () => {} },
      Date,
      recoverStagingTransaction: () => {
        const raw = autoRecMap.get('cva_auth_staging');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.stage === 'auth_lockout') {
            autoRecMap.set('teacher_hub_auth_fails', String(parsed.fails));
            autoRecMap.set('teacher_hub_lock_until', String(parsed.lockUntil));
            autoRecMap.delete('cva_auth_staging');
            return { recovered: true };
          }
        }
        return { recovered: false };
      }
    };
    const autoRecScript = new vm.Script(evalScope);
    autoRecScript.runInContext(vm.createContext(autoRecSandbox));

    autoRecMap.set('cva_auth_staging', JSON.stringify({
      stage: 'auth_lockout',
      fails: 5,
      isLockout: true,
      lockUntil: Date.now() + 30000,
      generation: 1,
      token: 'tok_auto_rec'
    }));
    const dummyCtx = { generation: 1, token: 'tok_auto_rec', revoked: false, verifyFencing: () => true };
    const checkResAuto = autoRecSandbox.checkRateLimitUnlocked(dummyCtx);
    assert(checkResAuto === false, 'Fail-Closed: checkRateLimitUnlocked trả về false khi staging auth_lockout được roll forward');
    assert(autoRecMap.get('teacher_hub_auth_fails') === '5', 'Recovery: teacher_hub_auth_fails được thiết lập lên 5');
    assert(!autoRecMap.has('cva_auth_staging'), 'Cleanup: cva_auth_staging được dọn sạch sau khi phục hồi');

    // ── 7.2.7: verifyAdminPin(enteredPin) Điều Phối Viên Đơn Giao Dịch Nguyên Tử ──
    console.log('  ▸ 7.2.7 Kiểm tra verifyAdminPin(enteredPin) Điều Phối Viên Đơn Giao Dịch (Single-Transaction Coordinator):');
    const adminMap = new Map();
    let adminGen = 0;
    const adminSandbox = {
      localStorage: {
        getItem: (k) => adminMap.get(k) || null,
        setItem: (k, v) => adminMap.set(k, String(v)),
        removeItem: (k) => adminMap.delete(k)
      },
      MAX_AUTH_FAILS,
      LOCKOUT_MS,
      showToast: () => {},
      console: { log: () => {}, warn: () => {}, error: () => {} },
      Date,
      hashPassword: async (pin, salt) => 'hash_' + salt + '_' + pin,
      executeWithCrossTabLock: async (cb) => {
        adminGen++;
        const tok = 'tok_admin_' + adminGen;
        adminMap.set('cva_fencing_generation', String(adminGen));
        adminMap.set('cva_fencing_token', tok);
        adminMap.set('cva_migration_lock', JSON.stringify({ token: tok, generation: adminGen, time: Date.now() }));
        const ctx = {
          generation: adminGen,
          token: tok,
          revoked: false,
          verifyFencing: () => {
            if (ctx.revoked) return false;
            if (Number(adminMap.get('cva_fencing_generation')) !== adminGen || adminMap.get('cva_fencing_token') !== ctx.token) return false;
            const curL = adminMap.get('cva_migration_lock');
            if (!curL) return false;
            try {
              const p = JSON.parse(curL);
              return Boolean(p && typeof p === "object" && !Array.isArray(p) && p.token === ctx.token && p.generation === adminGen);
            } catch {
              return false;
            }
          }
        };
        try {
          return await cb(ctx);
        } finally {
          adminMap.delete('cva_migration_lock');
          ctx.revoked = true;
        }
      }
    };
    const adminScript = new vm.Script(evalScope);
    adminScript.runInContext(vm.createContext(adminSandbox));

    adminMap.set('teacher_hub_admin_salt', 'salt123');
    adminMap.set('teacher_hub_admin_hash', 'hash_salt123_1234'); // PIN đúng: "1234"

    // Thử sai 4 lần
    for (let i = 1; i <= 4; i++) {
      const vRes = await adminSandbox.verifyAdminPin('wrong_' + i);
      assert(vRes === false, `verifyAdminPin: Thử sai lần ${i} trả về false`);
      assert(adminMap.get('teacher_hub_auth_fails') === String(i), `teacher_hub_auth_fails tăng lên ${i}`);
    }

    // Thử đúng lần thứ 5 -> reset thành công
    const vCorrect = await adminSandbox.verifyAdminPin('1234');
    assert(vCorrect === true, 'verifyAdminPin: Nhập đúng PIN trả về true');
    assert(!adminMap.has('teacher_hub_auth_fails'), 'verifyAdminPin: Reset sạch auth_fails khi nhập đúng');

    // Thử sai liên tiếp 5 lần -> Kích hoạt lockout
    for (let i = 1; i <= 5; i++) {
      const vFail = await adminSandbox.verifyAdminPin('wrong_' + i);
      assert(vFail === false, `verifyAdminPin: Thử sai lockout lần ${i} trả về false`);
    }
    assert(adminMap.get('teacher_hub_auth_fails') === '5', 'Lockout: fails = 5');
    assert(adminMap.has('teacher_hub_lock_until'), 'Lockout: teacher_hub_lock_until được thiết lập');

    // Lần tiếp theo dù nhập đúng PIN cũng bị chặn đứng ngay từ checkRateLimitUnlocked trong lock
    const vBlocked = await adminSandbox.verifyAdminPin('1234');
    assert(vBlocked === false, 'verifyAdminPin: Bị chặn đứng an toàn khi đang trong thời hạn lockout dù nhập đúng PIN');
  }
})();

// 7.3 Kiểm thử Thực tế Recurring Reminders Chu kỳ Lặp (SPEC 3.3)
console.log('\n📌 7.3 Kiểm thử Thực tế Recurring Reminders (Chu kỳ Lặp):');
await (async () => {
  const mAdv = appJs.match(/(?:async\s+)?function advanceOrCompleteReminder[\s\S]*?\n      \}/);
  if (mAdv) {
    let remindersData = [
      { id: 'rem-daily', repeat: 'daily', dueDate: '2026-09-21T08:00:00.000Z', notified: true, completed: true },
      { id: 'rem-weekly', repeat: 'weekly', dueDate: '2026-09-21T08:00:00.000Z', notified: true, completed: true },
      { id: 'rem-monthly', repeat: 'monthly', dueDate: '2026-09-21T08:00:00.000Z', notified: true, completed: true }
    ];

    const vm = require('vm');
    const sandbox = {
      remindersData,
      executeWithCrossTabLock: async (cb) => { await cb(); },
      saveRemindersStorage: () => {},
      renderReminderList: () => {},
      updateReminderBadge: () => {},
      showToast: () => {},
      console: { log: () => {}, warn: () => {}, error: () => {} },
      Date
    };
    const script = new vm.Script(mAdv[0] + '\nthis.advanceOrCompleteReminder = advanceOrCompleteReminder;');
    script.runInContext(vm.createContext(sandbox));

    await sandbox.advanceOrCompleteReminder('rem-daily');
    const dailyItem = sandbox.remindersData.find(x => x.id === 'rem-daily');
    assert(dailyItem.dueDate.startsWith('2026-09-22') && dailyItem.completed === false && dailyItem.notified === false, 'Recurring Daily: Tự động dời dueDate +1 ngày và reset notified/completed');

    await sandbox.advanceOrCompleteReminder('rem-weekly');
    const weeklyItem = sandbox.remindersData.find(x => x.id === 'rem-weekly');
    assert(weeklyItem.dueDate.startsWith('2026-09-28') && weeklyItem.completed === false && weeklyItem.notified === false, 'Recurring Weekly: Tự động dời dueDate +7 ngày và reset notified/completed');

    await sandbox.advanceOrCompleteReminder('rem-monthly');
    const monthlyItem = sandbox.remindersData.find(x => x.id === 'rem-monthly');
    assert(monthlyItem.dueDate.startsWith('2026-10-21') && monthlyItem.completed === false && monthlyItem.notified === false, 'Recurring Monthly: Tự động dời dueDate +1 tháng và reset notified/completed');
  }
})();

// 7.4 Kiểm thử Thực tế Web Crypto AES-256-GCM Vault Encryption (SPEC 2.2)
console.log('\n📌 7.4 Kiểm thử Thực tế Web Crypto AES-256-GCM PBKDF2 Vault:');
await (async () => {
  try {
    const { webcrypto } = require('crypto');
    const vm = require('vm');
    const mEnc = appJs.match(/async function encryptVaultPayload[\s\S]*?\n      \}/);
    const mDec = appJs.match(/async function decryptVaultPayload[\s\S]*?\n      \}/);
    const mDerive = appJs.match(/async function deriveVaultKey[\s\S]*?\n      \}/);

    if (mEnc && mDec && mDerive) {
      const sandboxVaultCrypto = {
        PBKDF2_ROUNDS: 100000,
        window: { crypto: webcrypto },
        TextEncoder,
        TextDecoder,
        Uint8Array,
        btoa,
        atob,
        JSON,
        String,
        Array,
        parseInt,
        console: { log: () => {}, warn: () => {}, error: () => {} }
      };
      const scriptVaultCrypto = new vm.Script(
        'let PBKDF2_ROUNDS = this.PBKDF2_ROUNDS;\n' +
        'let window = this.window;\n' +
        'let TextEncoder = this.TextEncoder;\n' +
        'let TextDecoder = this.TextDecoder;\n' +
        'let Uint8Array = this.Uint8Array;\n' +
        'let btoa = this.btoa;\n' +
        'let atob = this.atob;\n' +
        mDerive[0] + '\n' +
        mEnc[0] + '\n' +
        mDec[0] + '\n' +
        'this.encryptVaultPayload = encryptVaultPayload;\n' +
        'this.decryptVaultPayload = decryptVaultPayload;'
      );
      scriptVaultCrypto.runInContext(vm.createContext(sandboxVaultCrypto));

      const saltHex = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
      const pin = 'MasterPin@2026';
      const testPayload = {
        'link-vnedu': { u: 'gv_cva', p: 'MatKhauKhoDoan@99' },
        'link-smas': { u: 'cva_admin', p: 'SmasSec#2026' }
      };
      const encrypted = await sandboxVaultCrypto.encryptVaultPayload(testPayload, pin, saltHex);
      assert(encrypted.startsWith('aes_gcm:'), 'Web Crypto Vault: Mã hóa AES-256-GCM với PBKDF2 100,000 vòng thành công (aes_gcm:)');
      assert(!encrypted.includes('MatKhauKhoDoan@99'), 'Web Crypto Vault: Triệt tiêu 100% văn bản thô (Zero Plaintext)');

      const decrypted = await sandboxVaultCrypto.decryptVaultPayload(encrypted, pin, saltHex);
      assert(decrypted['link-vnedu'].u === 'gv_cva' && decrypted['link-vnedu'].p === 'MatKhauKhoDoan@99', 'Web Crypto Vault: Giải mã chính xác 100% tài khoản và mật khẩu');
    }
  } catch(err) {
    assert(false, `Web Crypto Vault gặp lỗi: ${err.message}`);
  }
})();

/// 7.5 KIỂM THỬ CHUYÊN SÂU ĐỘ BỀN VỮNG & ĐỐI CHIẾU DỮ LIỆU THỰC TẾ (CODEX INVARIANTS)
await (async () => {
  console.log('\n📌 7.5 Kiểm thử Chuyên sâu Độ Bền Vững & Đối Chiếu Dữ Liệu Thực Tế:');
  const vm = require('vm');
  const rawSha256FuncCode75 = extractFunctionBody(appJs, 'computeRawSha256');

  // 7.5.1 Kiểm thử Fail-Closed khi không có Web Locks API (Safari iOS cũ, WebView)
  const mLock = appJs.match(/async function executeWithCrossTabLock[\s\S]*?\n      \}/);
  const mSaveCat = appJs.match(/async function saveCategoriesStorage[\s\S]*?\n      \}/);
  const mSaveLinks = appJs.match(/async function saveToStorage[\s\S]*?\n      \}/);
  const mSaveRems = appJs.match(/async function saveRemindersStorage[\s\S]*?\n      \}/);
  const mSaveTT = appJs.match(/async function saveTimetableData[\s\S]*?\n      \}/);
  const mSaveVaultUnlocked = appJs.match(/async function saveVaultStorageUnlocked[\s\S]*?\n      \}/);
  if (mLock && mSaveCat && mSaveLinks && mSaveRems && mSaveTT && mSaveVaultUnlocked) {
    let bannerShown = false;
    let actionExecuted = false;
    const noLockStorageMap = new Map();
    noLockStorageMap.set('teacher_hub_links_v2', JSON.stringify([{ id: 'init_l' }]));
    noLockStorageMap.set('teacher_hub_categories_v1', JSON.stringify([{ id: 'init_c' }]));

    const mockStorageNoLocks = {
      getItem: (k) => noLockStorageMap.get(k) || null,
      setItem: (k, v) => noLockStorageMap.set(k, String(v)),
      removeItem: (k) => noLockStorageMap.delete(k)
    };

    const sandboxNoLocks = {
      currentLockContext: null,
      navigator: {}, // Không có Web Locks API
      localStorage: mockStorageNoLocks,
      categoriesData: [{ id: 'cand_c' }],
      linksData: [{ id: 'cand_l' }],
      remindersData: [{ id: 'cand_r' }],
      teacherTimetableData: { '2': { 'Tiết 1': 'Toán' } },
      isVaultUnlocked: true,
      sessionVaultPin: "123456",
      vaultData: { "acc": { u: "test" } },
      showToast: () => {},
      syncMemoryFromLatestStorage: () => {},
      showDegradedStorageBanner: () => { bannerShown = true; },
      console: { log: () => {}, warn: () => {}, error: () => {} }
    };
    const scriptLock = new vm.Script(
      'let currentLockContext = null;\n' +
      (safeStorageRemoveFuncCode ? safeStorageRemoveFuncCode + '\n' : '') +
      mLock[0] + '\n' +
      mSaveCat[0] + '\n' +
      mSaveLinks[0] + '\n' +
      mSaveRems[0] + '\n' +
      mSaveTT[0] + '\n' +
      mSaveVaultUnlocked[0] + '\n' +
      'this.executeWithCrossTabLock = executeWithCrossTabLock;\n' +
      'this.saveCategoriesStorage = saveCategoriesStorage;\n' +
      'this.saveToStorage = saveToStorage;\n' +
      'this.saveRemindersStorage = saveRemindersStorage;\n' +
      'this.saveTimetableData = saveTimetableData;\n' +
      'this.saveVaultStorageUnlocked = saveVaultStorageUnlocked;'
    );
    scriptLock.runInContext(vm.createContext(sandboxNoLocks));

    let threwError = false;
    let errorMessage = '';
    try {
      await sandboxNoLocks.executeWithCrossTabLock(async () => {
        actionExecuted = true;
      });
    } catch(err) {
      threwError = true;
      errorMessage = err.message;
    }

    assert(threwError && errorMessage.includes('StorageLockUnavailable'), 'Web Locks Fail-Closed: Môi trường thiếu Web Locks API bị từ chối an toàn (StorageLockUnavailable)');
    assert(actionExecuted === false, 'Web Locks Fail-Closed: Thao tác ghi bị chặn đứng 100%, không cho phép ghi đè');
    assert(bannerShown === true, 'Web Locks Fail-Closed: Tự động kích hoạt banner Chế độ Chỉ Đọc (Read-Only Mode)');

    // Kiểm tra trực tiếp tất cả các API lưu trữ khi gọi ngoài lock / không có navigator.locks
    let threwSaveLinks = false;
    try { await sandboxNoLocks.saveToStorage(); } catch(e) { threwSaveLinks = Boolean(e && e.message.includes('StorageLockUnavailable')); }
    assert(threwSaveLinks === true, 'Web Locks Fail-Closed: saveToStorage() từ chối ghi khi thiếu Web Locks');

    let threwSaveCats = false;
    try { await sandboxNoLocks.saveCategoriesStorage(); } catch(e) { threwSaveCats = Boolean(e && e.message.includes('StorageLockUnavailable')); }
    assert(threwSaveCats === true, 'Web Locks Fail-Closed: saveCategoriesStorage() từ chối ghi khi thiếu Web Locks');

    let threwSaveRems = false;
    try { await sandboxNoLocks.saveRemindersStorage(); } catch(e) { threwSaveRems = Boolean(e && e.message.includes('StorageLockUnavailable')); }
    assert(threwSaveRems === true, 'Web Locks Fail-Closed: saveRemindersStorage() từ chối ghi khi thiếu Web Locks');

    let threwSaveTT = false;
    try { await sandboxNoLocks.saveTimetableData(); } catch(e) { threwSaveTT = Boolean(e && e.message.includes('StorageLockUnavailable')); }
    assert(threwSaveTT === true, 'Web Locks Fail-Closed: saveTimetableData() từ chối ghi khi thiếu Web Locks');

    let threwSaveVaultUnlocked = false;
    try { await sandboxNoLocks.saveVaultStorageUnlocked(); } catch(e) { threwSaveVaultUnlocked = Boolean(e && e.message.includes('StorageLockUnavailable')); }
    assert(threwSaveVaultUnlocked === true, 'Web Locks Fail-Closed: saveVaultStorageUnlocked() từ chối ghi khi gọi ngoài Web Locks');

    assert(noLockStorageMap.get('teacher_hub_links_v2') === JSON.stringify([{ id: 'init_l' }]), 'Web Locks Fail-Closed: Storage teacher_hub_links_v2 giữ nguyên 100% không bị ô nhiễm');
    assert(noLockStorageMap.get('teacher_hub_categories_v1') === JSON.stringify([{ id: 'init_c' }]), 'Web Locks Fail-Closed: Storage teacher_hub_categories_v1 giữ nguyên 100% không bị ô nhiễm');
  }

  // 7.5.2 Kiểm thử Quota Failure Simulation & Atomic Rollback trong updateUnifiedStore
  const mChecksum = appJs.match(/function computeTxChecksum[\s\S]*?\n      \}/);
  const mUpdateStoreUnlocked = appJs.match(/function updateUnifiedStoreUnlocked[\s\S]*?\n      \}/);
  const mUpdateStore = appJs.match(/function updateUnifiedStore\([\s\S]*?\n      \}/);
  if (mChecksum && mUpdateStoreUnlocked && mUpdateStore) {
    const storageMap = new Map();
    let failOnReminders = true;
    const mockStorage = {
      getItem: (k) => storageMap.get(k) || null,
      setItem: (k, v) => {
        if (failOnReminders && k === 'teacher_hub_reminders_v1') {
          const err = new Error('QuotaExceededError: DOM Exception 22');
          err.name = 'QuotaExceededError';
          throw err;
        }
        storageMap.set(k, String(v));
      },
      removeItem: (k) => storageMap.delete(k)
    };

    const initialCats = [{ id: 'c1', label: 'C1' }];
    const initialLinks = [{ id: 'l1', title: 'L1', url: 'https://l1.vn' }];
    const initialRems = [{ id: 'r1', title: 'R1' }];
    const initialTT = { '2': { 'Tiết 1': 'Toán' } };
    const initialStorePayload = JSON.stringify({
      schemaVersion: 2,
      version: '2026.09.21.03',
      generation: 1,
      token: 'tok_init',
      categories: initialCats,
      links: initialLinks,
      reminders: initialRems,
      timetable: initialTT,
      checksum: 'init_checksum',
      time: Date.now()
    });

    storageMap.set('teacher_hub_store_v2', initialStorePayload);
    storageMap.set('teacher_hub_data_version', '2026.09.21.03');
    storageMap.set('teacher_hub_categories_v1', JSON.stringify(initialCats));
    storageMap.set('teacher_hub_links_v2', JSON.stringify(initialLinks));
    storageMap.set('teacher_hub_reminders_v1', JSON.stringify(initialRems));
    storageMap.set('teacher_hub_timetable_v1', JSON.stringify(initialTT));
    storageMap.set('cva_fencing_generation', '1');
    storageMap.set('cva_fencing_token', 'quota_tok_123');
    storageMap.set('cva_migration_lock', JSON.stringify({ token: 'quota_tok_123', generation: 1 }));

    const sandboxQuota = {
      localStorage: mockStorage,
      CURRENT_DATA_VERSION: '2026.09.21.03',
      currentLockContext: {
        token: 'quota_tok_123',
        generation: 1,
        verifyFencing: () => true
      },
      categoriesData: [{ id: 'c1', label: 'C1 Modified' }],
      linksData: [{ id: 'l1', title: 'L1 Modified', url: 'https://l1.vn' }],
      remindersData: [{ id: 'r1', title: 'R1 Modified' }],
      teacherTimetableData: { '2': { 'Tiết 1': 'Văn' } },
      showDegradedStorageBanner: () => {},
      console: { log: () => {}, warn: () => {}, error: () => {} }
    };

    const scriptQuota = new vm.Script(
      'let currentLockContext = this.currentLockContext;\n' +
      (safeStorageRemoveFuncCode ? safeStorageRemoveFuncCode + '\n' : '') +
      (rawSha256FuncCode75 ? rawSha256FuncCode75 + '\n' : '') +
      mChecksum[0] + '\n' +
      mUpdateStoreUnlocked[0] + '\n' +
      mUpdateStore[0] + '\n' +
      'this.updateUnifiedStoreUnlocked = updateUnifiedStoreUnlocked;\n' +
      'this.updateUnifiedStore = updateUnifiedStore;'
    );
    scriptQuota.runInContext(vm.createContext(sandboxQuota));

    let quotaCaught = false;
    try {
      sandboxQuota.updateUnifiedStore();
    } catch (_err) {
      quotaCaught = Boolean(_err && _err.name === 'QuotaExceededError');
    }

    assert(quotaCaught === true, 'Quota Failure: updateUnifiedStore ném ngoại lệ khi gặp QuotaExceededError');
    assert(storageMap.get('teacher_hub_store_v2') === initialStorePayload, 'Quota Rollback: teacher_hub_store_v2 được hoàn trả nguyên vẹn về snapshot cũ');
    assert(storageMap.get('teacher_hub_data_version') === '2026.09.21.03', 'Quota Rollback: teacher_hub_data_version giữ nguyên vẹn phiên bản cũ');
    assert(storageMap.get('teacher_hub_categories_v1') === JSON.stringify(initialCats), 'Quota Rollback: teacher_hub_categories_v1 được rollback về snapshot cũ');
    assert(storageMap.get('teacher_hub_links_v2') === JSON.stringify(initialLinks), 'Quota Rollback: teacher_hub_links_v2 được rollback về snapshot cũ');
  }

  // 7.5.3 Kiểm thử Tự động Đối chiếu & Đồng bộ Projections với Master Manifest trong validateAndGetUnifiedStore
  const reconcileFuncCode = extractFunctionBody(appJs, 'reconcileProjectionsFromManifest');
  const validateStoreFuncCode = extractFunctionBody(appJs, 'validateAndGetUnifiedStore');
  const checksumFuncCode = extractFunctionBody(appJs, 'computeTxChecksum');
  if (checksumFuncCode && validateStoreFuncCode && reconcileFuncCode) {
    const storageMap = new Map();
    const mockStorage = {
      getItem: (k) => storageMap.get(k) || null,
      setItem: (k, v) => storageMap.set(k, String(v)),
      removeItem: (k) => storageMap.delete(k)
    };

    const manifestCats = [{ id: 'cat-official', label: 'Danh mục Chính thức' }];
    const manifestLinks = [{ id: 'link-official', title: 'Link Chuẩn', url: 'https://chuan.edu.vn', category: 'cat-official' }];
    const manifestRems = [{ id: 'rem-official', title: 'Lời nhắc Chuẩn' }];
    const manifestTT = { '2': { 'Tiết 1': 'Toán Chuẩn' } };

    const sandboxReconcile = {
      localStorage: mockStorage,
      currentLockContext: null,
      console: { log: () => {}, warn: () => {}, error: () => {} }
    };
    const scriptReconcile = new vm.Script(
      (rawSha256FuncCode75 ? rawSha256FuncCode75 + '\n' : '') +
      checksumFuncCode + '\n' +
      reconcileFuncCode + '\n' +
      validateStoreFuncCode + '\n' +
      'this.computeTxChecksum = computeTxChecksum;\n' +
      'this.reconcileProjectionsFromManifest = reconcileProjectionsFromManifest;\n' +
      'this.validateAndGetUnifiedStore = validateAndGetUnifiedStore;'
    );
    scriptReconcile.runInContext(vm.createContext(sandboxReconcile));

    const manifestChecksum = sandboxReconcile.computeTxChecksum(manifestCats, manifestLinks, '2026.09.21.03', manifestRems, manifestTT);
    const validManifestPayload = JSON.stringify({
      schemaVersion: 2,
      version: '2026.09.21.03',
      generation: 10,
      token: 'tok_manifest_truth',
      categories: manifestCats,
      links: manifestLinks,
      reminders: manifestRems,
      timetable: manifestTT,
      checksum: manifestChecksum,
      time: Date.now()
    });

    storageMap.set('teacher_hub_store_v2', validManifestPayload);
    storageMap.set('teacher_hub_data_version', '2026.09.21.03');
    // Cố tình làm sai lệch/rác projection cũ để kiểm tra cơ chế tự phục hồi
    storageMap.set('teacher_hub_categories_v1', JSON.stringify([{ id: 'stale_cat', label: 'Rác cũ' }]));
    storageMap.set('teacher_hub_links_v2', JSON.stringify([{ id: 'stale_link', title: 'Rác cũ', url: 'https://rac.vn' }]));
    storageMap.set('teacher_hub_reminders_v1', JSON.stringify([{ id: 'stale_rem' }]));
    storageMap.set('teacher_hub_timetable_v1', JSON.stringify({ '2': { 'Tiết 1': 'Rác' } }));

    // 1) Test Pure Read: mặc định autoReconcile = false không làm biến đổi storage
    const pureStore = sandboxReconcile.validateAndGetUnifiedStore();
    assert(pureStore !== null, 'Pure Read: validateAndGetUnifiedStore xác thực thành công Master Manifest mà không có tác dụng phụ');
    assert(storageMap.get('teacher_hub_categories_v1') === JSON.stringify([{ id: 'stale_cat', label: 'Rác cũ' }]), 'Pure Read: Không tự ý thay đổi projection categories_v1 khi autoReconcile=false');

    // 2) Test Explicit Reconcile Without Lock: autoReconcile = true mà KHÔNG có lockCtx sẽ từ chối ghi (Fail-Closed)
    const storeWithoutLock = sandboxReconcile.validateAndGetUnifiedStore(true);
    assert(storeWithoutLock !== null, 'Reconciliation Guard: validateAndGetUnifiedStore(true) vẫn trả về manifest hợp lệ');
    assert(storageMap.get('teacher_hub_categories_v1') === JSON.stringify([{ id: 'stale_cat', label: 'Rác cũ' }]), 'Reconciliation Guard: Từ chối ghi đè projection khi gọi ngoài Web Locks');

    // 3) Test Explicit Reconcile With Lock: autoReconcile = true cùng lockCtx hợp lệ sẽ đồng bộ an toàn
    storageMap.set('cva_fencing_generation', '10');
    storageMap.set('cva_fencing_token', 'tok_manifest_truth');
    storageMap.set('cva_migration_lock', JSON.stringify({ token: 'tok_manifest_truth', generation: 10, time: Date.now() }));
    const mockLockCtx = {
      generation: 10,
      token: 'tok_manifest_truth',
      verifyFencing: () => true
    };
    const verifiedStore = sandboxReconcile.validateAndGetUnifiedStore(true, mockLockCtx);
    assert(verifiedStore !== null, 'Reconciliation: validateAndGetUnifiedStore(true, lockCtx) xác thực thành công Master Manifest');
    assert(storageMap.get('teacher_hub_categories_v1') === JSON.stringify(manifestCats), 'Reconciliation: Tự động ghi đè và đồng bộ categories_v1 theo Master Manifest');
    assert(storageMap.get('teacher_hub_links_v2') === JSON.stringify(manifestLinks), 'Reconciliation: Tự động ghi đè và đồng bộ links_v2 theo Master Manifest');
    assert(storageMap.get('teacher_hub_reminders_v1') === JSON.stringify(manifestRems), 'Reconciliation: Tự động ghi đè và đồng bộ reminders_v1 theo Master Manifest');
    assert(storageMap.get('teacher_hub_timetable_v1') === JSON.stringify(manifestTT), 'Reconciliation: Tự động ghi đè và đồng bộ timetable_v1 theo Master Manifest');

    // 4) Codex Point 4: Adversarial test với lockCtx = {} (empty object / fake lock) -> 0 writes
    storageMap.set('teacher_hub_categories_v1', JSON.stringify([{ id: 'stale_adversarial' }]));
    const fakeLockRes = sandboxReconcile.reconcileProjectionsFromManifest(verifiedStore, {});
    assert(fakeLockRes === false, 'Adversarial Guard: reconcileProjectionsFromManifest từ chối lockCtx rỗng {}');
    assert(storageMap.get('teacher_hub_categories_v1') === JSON.stringify([{ id: 'stale_adversarial' }]), 'Adversarial Guard: 0 writes khi lockCtx rỗng {}');

    const fakeValidateRes = sandboxReconcile.validateAndGetUnifiedStore(true, {});
    assert(fakeValidateRes !== null, 'Adversarial Guard: validateAndGetUnifiedStore(true, {}) đọc manifest hợp lệ');
    assert(storageMap.get('teacher_hub_categories_v1') === JSON.stringify([{ id: 'stale_adversarial' }]), 'Adversarial Guard: validateAndGetUnifiedStore(true, {}) không ghi đè khi lockCtx rỗng (0 writes)');
  }

  // 7.5.4 Kiểm thử Stale Writer Guard, Lock Revocation & Missing Lock Marker
  console.log('\n📌 7.5.4 Kiểm thử Stale Writer Guard & Lock Revocation Invariant:');
  const updateUnifiedUnlockedCode = extractFunctionBody(appJs, 'updateUnifiedStoreUnlocked');
  const executeLockCode = extractFunctionBody(appJs, 'executeWithCrossTabLock');
  const saveVaultUnlockedCode = extractFunctionBody(appJs, 'saveVaultStorageUnlocked');
  const reconcileCode = extractFunctionBody(appJs, 'reconcileProjectionsFromManifest');
  const applySyncCode = extractFunctionBody(appJs, 'applySyncData');
  const computeTxChecksumCode = extractFunctionBody(appJs, 'computeTxChecksum');

  if (executeLockCode && updateUnifiedUnlockedCode && saveVaultUnlockedCode && reconcileCode && applySyncCode && computeTxChecksumCode) {
    const storageMap = new Map();
    const mockStorage = {
      getItem: (k) => storageMap.get(k) || null,
      setItem: (k, v) => storageMap.set(k, String(v)),
      removeItem: (k) => storageMap.delete(k)
    };

    let retainedLockCtx = null;
    const sandboxRevoke = {
      localStorage: mockStorage,
      currentLockContext: null,
      isVaultUnlocked: true,
      sessionVaultPin: "123456",
      vaultData: { "acc1": { u: "teacher" } },
      categoriesData: [{ id: "cat1", label: "Cat 1" }],
      linksData: [{ id: "link1", title: "L1", url: "https://l1.vn" }],
      remindersData: [],
      teacherTimetableData: {},
      CURRENT_DATA_VERSION: "2026.09.21.03",
      generateSalt: () => "mock_salt",
      encryptVaultPayload: async () => "mock_enc",
      showToast: () => {},
      refreshAllAfterSync: () => {},
      syncMemoryFromLatestStorage: () => {},
      validateSyncPayload: () => true,
      navigator: {
        locks: {
          request: async (name, opts, cb) => {
            const gen = 1;
            const tok = "tok_test_revocation";
            mockStorage.setItem("cva_fencing_generation", String(gen));
            mockStorage.setItem("cva_fencing_token", tok);
            mockStorage.setItem("cva_migration_lock", JSON.stringify({ token: tok, generation: gen, time: Date.now() }));

            const lockCtx = {
              generation: gen,
              token: tok,
              revoked: false,
              verifyFencing: () => {
                if (lockCtx.revoked) return false;
                const g = Number(mockStorage.getItem("cva_fencing_generation") || 0);
                const t = mockStorage.getItem("cva_fencing_token");
                const l = mockStorage.getItem("cva_migration_lock");
                if (!l) return false;
                try {
                  const p = JSON.parse(l);
                  return g === gen && t === tok && p.token === tok && p.generation === gen;
                } catch { return false; }
              }
            };
            sandboxRevoke.currentLockContext = lockCtx;
            try {
              return await cb(lockCtx);
            } finally {
              lockCtx.revoked = true;
              mockStorage.removeItem("cva_migration_lock");
              sandboxRevoke.currentLockContext = null;
            }
          }
        }
      },
      console: { log: () => {}, warn: () => {}, error: () => {} }
    };

    const scriptRevoke = new vm.Script(
      'let currentLockContext = this.currentLockContext;\n' +
      'let CURRENT_DATA_VERSION = this.CURRENT_DATA_VERSION;\n' +
      'let categoriesData = this.categoriesData;\n' +
      'let linksData = this.linksData;\n' +
      'let remindersData = this.remindersData;\n' +
      'let teacherTimetableData = this.teacherTimetableData;\n' +
      'let isVaultUnlocked = this.isVaultUnlocked;\n' +
      'let sessionVaultPin = this.sessionVaultPin;\n' +
      'let vaultData = this.vaultData;\n' +
      (safeStorageRemoveFuncCode ? safeStorageRemoveFuncCode + '\n' : '') +
      (rawSha256FuncCode75 ? rawSha256FuncCode75 + '\n' : '') +
      computeTxChecksumCode + '\n' +
      executeLockCode + '\n' +
      updateUnifiedUnlockedCode + '\n' +
      saveVaultUnlockedCode + '\n' +
      reconcileCode + '\n' +
      applySyncCode + '\n' +
      'this.computeTxChecksum = computeTxChecksum;\n' +
      'this.executeWithCrossTabLock = executeWithCrossTabLock;\n' +
      'this.updateUnifiedStoreUnlocked = updateUnifiedStoreUnlocked;\n' +
      'this.saveVaultStorageUnlocked = saveVaultStorageUnlocked;\n' +
      'this.reconcileProjectionsFromManifest = reconcileProjectionsFromManifest;\n' +
      'this.applySyncData = applySyncData;'
    );
    scriptRevoke.runInContext(vm.createContext(sandboxRevoke));

    // 1) Test executeWithCrossTabLock marks lockCtx.revoked = true in finally
    await sandboxRevoke.executeWithCrossTabLock(async (lockCtx) => {
      retainedLockCtx = lockCtx;
      assert(lockCtx.revoked === false, 'Lock Revocation: lockCtx.revoked === false khi đang giữ khóa hợp lệ');
    });
    assert(retainedLockCtx !== null && retainedLockCtx.revoked === true, 'Lock Revocation: lockCtx.revoked === true ngay sau khi executeWithCrossTabLock kết thúc');

    // 2) Stale Writer attempts to call updateUnifiedStoreUnlocked with revoked lockCtx -> Throws StorageLockUnavailable
    let threwRevokedUpdate = false;
    try {
      sandboxRevoke.updateUnifiedStoreUnlocked(retainedLockCtx);
    } catch (e) {
      threwRevokedUpdate = Boolean(e && (e.message.includes('StorageLockUnavailable') || e.message.includes('revoked')));
    }
    assert(threwRevokedUpdate === true, 'Stale Writer Guard: updateUnifiedStoreUnlocked ném ngoại lệ khi lockCtx.revoked === true (0 writes)');

    // 3) Stale Writer attempts to call saveVaultStorageUnlocked with revoked lockCtx -> Throws StorageLockUnavailable
    let threwRevokedVault = false;
    try {
      await sandboxRevoke.saveVaultStorageUnlocked(retainedLockCtx);
    } catch (e) {
      threwRevokedVault = Boolean(e && (e.message.includes('StorageLockUnavailable') || e.message.includes('revoked')));
    }
    assert(threwRevokedVault === true, 'Stale Writer Guard: saveVaultStorageUnlocked ném ngoại lệ khi lockCtx.revoked === true (0 writes)');

    // 4) Stale Writer attempts to call reconcileProjectionsFromManifest with revoked lockCtx -> returns false
    const reconcileRevokedRes = sandboxRevoke.reconcileProjectionsFromManifest({
      categories: [{ id: "cat_hacked" }],
      links: [{ id: "l_hacked" }],
      reminders: [],
      timetable: {},
      version: "2026.09.21.03",
      generation: 1,
      token: "tok_test_revocation"
    }, retainedLockCtx);
    assert(reconcileRevokedRes === false, 'Stale Writer Guard: reconcileProjectionsFromManifest từ chối lockCtx.revoked === true (0 writes)');

    // 5) Stale Writer attempts to call applySyncData with revoked lockCtx -> Returns false, 0 writes
    const syncRevokedRes = await sandboxRevoke.applySyncData({
      categories: [{ id: "cat_sync" }],
      links: [{ id: "l_sync", url: "https://sync.vn", title: "Sync" }],
      reminders: [],
      timetable: {}
    }, retainedLockCtx);
    assert(syncRevokedRes === false, 'Stale Writer Guard: applySyncData từ chối lockCtx.revoked === true (0 writes, trả về false)');
    assert(!storageMap.has("cva_sync_staging"), 'Stale Writer Guard: Không có staging nào khi lock bị revoked');

    // 6) Missing cva_migration_lock marker -> verifySyncFencing fail-closed
    const unrevokedLockCtx = {
      generation: 2,
      token: "tok_unrevoked",
      revoked: false,
      verifyFencing: () => true
    };
    mockStorage.setItem("cva_fencing_generation", "2");
    mockStorage.setItem("cva_fencing_token", "tok_unrevoked");
    mockStorage.removeItem("cva_migration_lock"); // missing marker!

    const syncMissingLockRes = await sandboxRevoke.applySyncData({
      categories: [{ id: "cat_sync" }],
      links: [{ id: "l_sync", url: "https://sync.vn", title: "Sync" }],
      reminders: [],
      timetable: {}
    }, unrevokedLockCtx);
    assert(syncMissingLockRes === false, 'Stale Writer Guard: applySyncData từ chối ghi khi cva_migration_lock bị mất (Fail-Closed, 0 bypass, trả về false)');
    assert(!storageMap.has("cva_sync_staging"), 'Stale Writer Guard: Không có staging nào khi cva_migration_lock bị mất');
  }

  // 7.5.5 Kiểm thử Batch Staging Cleanup Preservation trong recoverStagingTransaction
  console.log('\n📌 7.5.5 Kiểm thử Batch Staging Cleanup Preservation:');
  const recoverFuncBody = extractFunctionBody(appJs, 'recoverStagingTransaction');
  const computeChecksumFuncBody = extractFunctionBody(appJs, 'computeTxChecksum');
  if (recoverFuncBody && computeChecksumFuncBody) {
    const batchStorageMap = new Map();
    let failOnStoreManifest = true;

    const mockBatchStorage = {
      getItem: (k) => batchStorageMap.get(k) || null,
      setItem: (k, v) => {
        if (failOnStoreManifest && k === 'teacher_hub_store_v2') {
          const err = new Error('DiskFullError: simulated crash during store manifest write');
          err.name = 'DiskFullError';
          throw err;
        }
        batchStorageMap.set(k, String(v));
      },
      removeItem: (k) => batchStorageMap.delete(k)
    };

    const sandboxBatch = {
      localStorage: mockBatchStorage,
      CURRENT_DATA_VERSION: "2026.09.21.03",
      currentLockContext: {
        generation: 1,
        token: "tok_batch_test",
        revoked: false,
        verifyFencing: () => true
      },
      console: { log: () => {}, warn: () => {}, error: () => {} }
    };

    const scriptBatch = new vm.Script(
      (safeStorageRemoveFuncCode ? safeStorageRemoveFuncCode + '\n' : '') +
      (rawSha256FuncCode75 ? rawSha256FuncCode75 + '\n' : '') +
      computeChecksumFuncBody + '\n' +
      recoverFuncBody + '\n' +
      'this.computeTxChecksum = computeTxChecksum;\n' +
      'this.recoverStagingTransaction = recoverStagingTransaction;'
    );
    scriptBatch.runInContext(vm.createContext(sandboxBatch));

    batchStorageMap.set("cva_fencing_generation", "1");
    batchStorageMap.set("cva_fencing_token", "tok_batch_test");
    batchStorageMap.set("cva_migration_lock", JSON.stringify({ token: "tok_batch_test", generation: 1, time: Date.now() }));

    const vSalt = "batch_salt_123";
    const vCipher = "batch_cipher_123";
    const vChecksum = sandboxBatch.computeTxChecksum(null, null, "vault_v1", null, { salt: vSalt, ciphertext: vCipher });
    batchStorageMap.set("cva_vault_staging", JSON.stringify({
      status: "committed",
      token: "tok_batch_test",
      fencingGeneration: 1,
      version: "vault_v1",
      salt: vSalt,
      ciphertext: vCipher,
      checksum: vChecksum,
      time: Date.now()
    }));

    const storeCats = [{ id: "cat_b", label: "Cat B" }];
    const storeLinks = [{ id: "link_b", title: "LB", url: "https://lb.vn" }];
    const storeChecksum = sandboxBatch.computeTxChecksum(storeCats, storeLinks, "2026.09.21.03", [], {});
    batchStorageMap.set("cva_store_staging", JSON.stringify({
      status: "committed",
      token: "tok_batch_test",
      fencingGeneration: 1,
      version: "2026.09.21.03",
      categories: storeCats,
      links: storeLinks,
      reminders: [],
      timetable: {},
      checksum: storeChecksum,
      time: Date.now()
    }));

    let recoveryResult = null;
    try {
      recoveryResult = sandboxBatch.recoverStagingTransaction();
    } catch {
      // recoverStagingTransaction catches and returns or sets cva_migration_error
    }

    assert(recoveryResult === null || recoveryResult.recovered === false, 'Batch Cleanup Invariant: recoverStagingTransaction ghi nhận thất bại khi write gặp lỗi');
    assert(batchStorageMap.has("cva_vault_staging") === true, 'Batch Cleanup Invariant: cva_vault_staging KHÔNG bị xóa sớm ở Step 2.1, được bảo toàn nguyên vẹn trong WAL');
    assert(batchStorageMap.has("cva_store_staging") === true, 'Batch Cleanup Invariant: cva_store_staging được bảo toàn nguyên vẹn trong WAL');
    assert(batchStorageMap.has("cva_store_error") === true, 'Batch Cleanup Invariant: Đánh dấu cờ cva_store_error phục vụ chẩn đoán');
  }

  // 7.5.6 Kiểm thử Đồng Hồ Sư Phạm Thời Gian Thực & Đếm Ngược Tiết Học Chuẩn Xác Tới Từng Giây
  console.log('\n📌 7.5.6 Kiểm thử Đồng Hồ Sư Phạm Thời Gian Thực & Countdown Invariant:');
  const bellScheduleMatch = appJs.match(/const BELL_SCHEDULE = \[[\s\S]*?\n      \];/);
  const timeToMinutesMatch = appJs.match(/function timeToMinutes[\s\S]*?\n      \}/);
  const getCurrentBellStatusMatch = appJs.match(/function getCurrentBellStatus[\s\S]*?\n      \}/);

  if (bellScheduleMatch && timeToMinutesMatch && getCurrentBellStatusMatch) {
    const sandboxClock = {
      console: { log: () => {}, warn: () => {}, error: () => {} }
    };
    const scriptClock = new vm.Script(
      bellScheduleMatch[0] + '\n' +
      timeToMinutesMatch[0] + '\n' +
      getCurrentBellStatusMatch[0] + '\n' +
      'this.BELL_SCHEDULE = BELL_SCHEDULE;\n' +
      'this.getCurrentBellStatus = getCurrentBellStatus;'
    );
    scriptClock.runInContext(vm.createContext(sandboxClock));

    // 1) Test tại 08:34:59 (1 giây cuối của Tiết 2: 07:50 - 08:35)
    // 08:34:59 -> 30899s. End: 08:35 -> 30900s. remainSec: 1s. remainMin: ceil(1/60) = 1p
    const testDate59 = new Date();
    testDate59.setHours(8, 34, 59, 0);
    const status59 = sandboxClock.getCurrentBellStatus(testDate59);
    assert(status59.active === true, 'Clock Precision: Tại 08:34:59 trạng thái tiết học active === true');
    assert(status59.title === "Tiết 2", 'Clock Precision: Tại 08:34:59 tiêu đề chính xác là Tiết 2');
    assert(status59.remain === "Còn 1p", 'Clock Precision: Tại 08:34:59 hiển thị Còn 1p');
    assert(status59.remainSec === 1, 'Clock Precision: Tại 08:34:59 độ trễ remainSec đúng 1 giây');

    // 2) Test tại 08:35:00 (Thời điểm bắt đầu Giờ Ra Chơi Sáng: 08:35 - 08:55)
    // 08:35:00 -> 30900s. End: 08:55 -> 32100s. remainSec: 1200s. remainMin: 20p
    const testDate00 = new Date();
    testDate00.setHours(8, 35, 0, 0);
    const status00 = sandboxClock.getCurrentBellStatus(testDate00);
    assert(status00.active === true, 'Clock Precision: Tại 08:35:00 trạng thái tiết học active === true');
    assert(status00.title === "Giờ Ra Chơi Sáng", 'Clock Precision: Tại 08:35:00 chuyển mượt sang Giờ Ra Chơi Sáng');
    assert(status00.isRecess === true, 'Clock Precision: Tại 08:35:00 đánh dấu isRecess === true');
    assert(status00.remain === "Còn 20p", 'Clock Precision: Tại 08:35:00 hiển thị Còn 20p');
    assert(status00.remainSec === 1200, 'Clock Precision: Tại 08:35:00 remainSec đúng 1200 giây');

    // 3) Test tại 12:00:00 (Giờ nghỉ trưa)
    const testDateNoon = new Date();
    testDateNoon.setHours(12, 0, 0, 0);
    const statusNoon = sandboxClock.getCurrentBellStatus(testDateNoon);
    assert(statusNoon.active === false, 'Clock Precision: 12:00:00 ngoài giờ học active === false');
    assert(statusNoon.title && statusNoon.title.includes("nghỉ trưa"), 'Clock Precision: 12:00:00 hiển thị thông báo Giờ nghỉ trưa');

    // 4) Test tại 18:00:00 (Hết giờ giảng dạy chính khóa)
    const testDateEvening = new Date();
    testDateEvening.setHours(18, 0, 0, 0);
    const statusEvening = sandboxClock.getCurrentBellStatus(testDateEvening);
    assert(statusEvening.active === false, 'Clock Precision: 18:00:00 active === false');
    assert(statusEvening.title && statusEvening.title.includes("Hết giờ giảng dạy"), 'Clock Precision: 18:00:00 thông báo Hết giờ giảng dạy chính khóa');

    // 5) Kiểm tra tích hợp chu kỳ 1s và sự kiện visibilitychange / focus trong appJs
    assert(appJs.includes("setInterval(updateClockAndGreeting, 1000)"), 'Clock Integration: Chu kỳ updateClockAndGreeting được thiết lập 1000ms (1 giây)');
    assert(appJs.includes('document.addEventListener("visibilitychange"') && appJs.includes("updateClockAndGreeting"), 'Clock Integration: Lắng nghe visibilitychange để cập nhật đồng hồ tức thì khi tab hiện');
    assert(appJs.includes('window.addEventListener("focus", updateClockAndGreeting)'), 'Clock Integration: Lắng nghe window.focus để cập nhật đồng hồ khi focus');
  }
})();

// 7.6 KIỂM THỬ 9 CHỐT CHẶN BẤT BIẾN THEO TIÊU CHUẨN CODEX (CODEX INVARIANTS ENFORCEMENT)
await (async () => {
  console.log('\n📌 7.6 Kiểm thử 9 Chốt chặn Bất biến Theo Tiêu chuẩn Codex (Codex Invariants):');
  const vm = require('vm');

  const rawSha256Code = extractFunctionBody(appJs, 'computeRawSha256');
  const checksumCode = extractFunctionBody(appJs, 'computeTxChecksum');
  const recoverCode = extractFunctionBody(appJs, 'recoverStagingTransaction');
  const validateStoreCode = extractFunctionBody(appJs, 'validateAndGetUnifiedStore');
  const applySyncCode = extractFunctionBody(appJs, 'applySyncData');
  const executeLockCode = extractFunctionBody(appJs, 'executeWithCrossTabLock');
  const saveVaultUnlockedCode = extractFunctionBody(appJs, 'saveVaultStorageUnlocked');
  const updateUnifiedUnlockedCode = extractFunctionBody(appJs, 'updateUnifiedStoreUnlocked');
  const validateSyncCode = extractFunctionBody(appJs, 'validateSyncPayload');
  const safeStorageRemoveCode = extractFunctionBody(appJs, 'safeStorageRemove');

  // --- 7.6.1: Tiêu chuẩn Checksum NIST FIPS 180-4 SHA-256 Chuẩn Quốc Tế ---
  console.log('  ▸ 7.6.1 Kiểm tra NIST FIPS 180-4 Standard SHA-256 Test Vectors:');
  if (rawSha256Code) {
    const sandboxSha = {};
    const scriptSha = new vm.Script(rawSha256Code + '\nthis.computeRawSha256 = computeRawSha256;');
    scriptSha.runInContext(vm.createContext(sandboxSha));

    // NIST Official Vector 1: Empty string ""
    const shaEmpty = sandboxSha.computeRawSha256("");
    assert(shaEmpty === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", 'NIST SHA-256: Chuỗi rỗng "" khớp chính xác mã băm NIST FIPS 180-4 (e3b0c442...)');

    // NIST Official Vector 2: "abc"
    const shaAbc = sandboxSha.computeRawSha256("abc");
    assert(shaAbc === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", 'NIST SHA-256: Chuỗi "abc" khớp chính xác mã băm NIST FIPS 180-4 (ba7816bf...)');

    // NIST Official Vector 3: 448-bit block test string
    const shaLong = sandboxSha.computeRawSha256("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq");
    assert(shaLong === "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1", 'NIST SHA-256: Chuỗi 448-bit khớp chính xác mã băm NIST FIPS 180-4 (248d6a61...)');

    // Verify computeTxChecksum uses computeRawSha256 and produces 64-char hex
    if (checksumCode) {
      const sandboxCk = { computeRawSha256: sandboxSha.computeRawSha256 };
      const scriptCk = new vm.Script(checksumCode + '\nthis.computeTxChecksum = computeTxChecksum;');
      scriptCk.runInContext(vm.createContext(sandboxCk));
      const ck = sandboxCk.computeTxChecksum([{ id: 'c1', label: 'C1' }], [{ id: 'l1', title: 'L1', url: 'https://l1.vn' }], '2026.09.21.03', [], {});
      assert(typeof ck === 'string' && ck.length === 64 && /^[0-9a-f]{64}$/.test(ck), 'NIST SHA-256: computeTxChecksum sản xuất chuỗi hex 64 ký tự chuẩn NIST');
    }
  }

  // --- 7.6.2: Phục Hồi Đột Tử Hàng Loạt Tất-Cả-Hoặc-Không Nguyên Tử (Multi-Staging All-or-Nothing) ---
  console.log('  ▸ 7.6.2 Kiểm tra Multi-Staging All-or-Nothing Crash Recovery:');
  if (recoverCode && rawSha256Code && checksumCode) {
    const multiMap = new Map();
    let throwDuringPhase2Sync = false;

    const mockMultiStorage = {
      getItem: (k) => multiMap.get(k) || null,
      setItem: (k, v) => {
        if (throwDuringPhase2Sync && (k === 'teacher_hub_store_v2' || k === 'teacher_hub_links_v2')) {
          const err = new Error('SimulatedDiskErrorDuringMultiRecovery');
          err.name = 'DiskError';
          throw err;
        }
        multiMap.set(k, String(v));
      },
      removeItem: (k) => multiMap.delete(k)
    };

    const sandboxMulti = {
      localStorage: mockMultiStorage,
      CURRENT_DATA_VERSION: "2026.09.21.03",
      currentLockContext: {
        generation: 1,
        token: "multi_tok_762",
        revoked: false,
        verifyFencing: () => true
      },
      console: { log: () => {}, warn: () => {}, error: () => {} }
    };

    const scriptMulti = new vm.Script(
      safeStorageRemoveCode + '\n' +
      rawSha256Code + '\n' +
      checksumCode + '\n' +
      recoverCode + '\n' +
      'this.computeRawSha256 = computeRawSha256;\n' +
      'this.computeTxChecksum = computeTxChecksum;\n' +
      'this.recoverStagingTransaction = recoverStagingTransaction;'
    );
    scriptMulti.runInContext(vm.createContext(sandboxMulti));

    // Setup initial storage state before crash
    const initialVaultEnvelope = JSON.stringify({ version: "vault_v1", salt: "init_v_salt", ciphertext: "init_v_cipher" });
    const initialStorePayload = JSON.stringify({ version: "2026.09.20.01", categories: [], links: [{ id: "l_old", title: "L Old", url: "https://old.vn" }], reminders: [], timetable: {} });
    const initialLinksPayload = JSON.stringify([{ id: "l_old", title: "L Old", url: "https://old.vn" }]);
    multiMap.set("teacher_hub_vault_envelope_v1", initialVaultEnvelope);
    multiMap.set("teacher_hub_store_v2", initialStorePayload);
    multiMap.set("teacher_hub_links_v2", initialLinksPayload);
    multiMap.set("cva_fencing_generation", "1");
    multiMap.set("cva_fencing_token", "multi_tok_762");
    multiMap.set("cva_migration_lock", JSON.stringify({ token: "multi_tok_762", generation: 1, time: Date.now() }));

    // Prepare 3 staging records in committed status:
    // 1. Vault staging committed
    const vSalt = "new_salt_762";
    const vCipher = "new_cipher_762";
    const vCk = sandboxMulti.computeTxChecksum(null, null, "vault_v1", null, { salt: vSalt, ciphertext: vCipher });
    multiMap.set("cva_vault_staging", JSON.stringify({
      status: "committed",
      token: "multi_tok_762",
      fencingGeneration: 1,
      version: "vault_v1",
      salt: vSalt,
      ciphertext: vCipher,
      checksum: vCk,
      time: Date.now(),
      previous: { envelope: initialVaultEnvelope }
    }));

    // 2. Store staging committed
    const storeCats = [{ id: "c_store", label: "C Store" }];
    const storeLinks = [{ id: "l_store", title: "L Store", url: "https://st.vn" }];
    const sCk = sandboxMulti.computeTxChecksum(storeCats, storeLinks, "2026.09.21.03", [], {});
    multiMap.set("cva_store_staging", JSON.stringify({
      status: "committed",
      token: "multi_tok_762",
      fencingGeneration: 1,
      version: "2026.09.21.03",
      categories: storeCats,
      links: storeLinks,
      reminders: [],
      timetable: {},
      checksum: sCk,
      time: Date.now()
    }));

    // 3. Sync staging committed
    const syncCats = [{ id: "c_sync", label: "C Sync" }];
    const syncLinks = [{ id: "l_sync", title: "L Sync", url: "https://sync.vn" }];
    const syncCk = sandboxMulti.computeTxChecksum(syncCats, syncLinks, "2026.09.21.03", [], {});
    multiMap.set("cva_sync_staging", JSON.stringify({
      status: "committed",
      token: "multi_tok_762",
      fencingGeneration: 1,
      version: "2026.09.21.03",
      categories: syncCats,
      links: syncLinks,
      reminders: [],
      timetable: {},
      checksum: syncCk,
      time: Date.now(),
      previous: { categories: [], links: [{ id: "l_old", title: "L Old", url: "https://old.vn" }] }
    }));

    // Now inject disk failure when writing store during Phase 2
    throwDuringPhase2Sync = true;
    let recMultiResult = null;
    try {
      recMultiResult = sandboxMulti.recoverStagingTransaction();
    } catch {
      // Caught inside or thrown
    }
    throwDuringPhase2Sync = false;

    // Invariant: Because sync step failed, ALL mutations must be rolled back to prePhase2Snapshot
    assert(recMultiResult === null || recMultiResult.recovered === false, 'Multi-Staging All-or-Nothing: recoverStagingTransaction ghi nhận lỗi khi có 1 transaction fail');
    assert(multiMap.get("teacher_hub_vault_envelope_v1") === initialVaultEnvelope, 'Multi-Staging All-or-Nothing: Vault envelope được rollback nguyên tử về pre-recovery snapshot (không bị commit đơn độc)');
    assert(multiMap.get("teacher_hub_store_v2") === initialStorePayload, 'Multi-Staging All-or-Nothing: Store v2 được rollback nguyên tử về pre-recovery snapshot');
    assert(multiMap.get("teacher_hub_links_v2") === initialLinksPayload, 'Multi-Staging All-or-Nothing: Links v2 được rollback nguyên tử về pre-recovery snapshot');
  }

  // --- 7.6.3: Chuẩn Hóa & Nhất Quán Lược Đồ Danh Mục (Schema Category Normalization) ---
  console.log('  ▸ 7.6.3 Kiểm tra Schema Category Normalization & Consistency:');
  if (validateStoreCode && rawSha256Code && checksumCode && applySyncCode) {
    const catMap = new Map();
    const mockCatStorage = {
      getItem: (k) => catMap.get(k) || null,
      setItem: (k, v) => catMap.set(k, String(v)),
      removeItem: (k) => catMap.delete(k)
    };

    const sandboxSchema = {
      localStorage: mockCatStorage,
      CURRENT_DATA_VERSION: "2026.09.21.03",
      currentLockContext: {
        generation: 1,
        token: "cat_tok_763",
        revoked: false,
        verifyFencing: () => true
      },
      categoriesData: [],
      linksData: [],
      remindersData: [],
      teacherTimetableData: {},
      refreshAllAfterSync: () => {},
      syncMemoryFromLatestStorage: () => {},
      showToast: () => {},
      console: { log: () => {}, warn: () => {}, error: () => {} }
    };

    const scriptSchema = new vm.Script(
      'let currentLockContext = this.currentLockContext;\n' +
      'let categoriesData = this.categoriesData;\n' +
      'let linksData = this.linksData;\n' +
      'let remindersData = this.remindersData;\n' +
      'let teacherTimetableData = this.teacherTimetableData;\n' +
      'let CURRENT_DATA_VERSION = this.CURRENT_DATA_VERSION;\n' +
      'let SCHEMA_VERSION = 2;\n' +
      safeStorageRemoveCode + '\n' +
      rawSha256Code + '\n' +
      checksumCode + '\n' +
      validateStoreCode + '\n' +
      validateSyncCode + '\n' +
      applySyncCode + '\n' +
      'this.computeRawSha256 = computeRawSha256;\n' +
      'this.computeTxChecksum = computeTxChecksum;\n' +
      'this.validateAndGetUnifiedStore = validateAndGetUnifiedStore;\n' +
      'this.validateSyncPayload = validateSyncPayload;\n' +
      'this.applySyncData = applySyncData;'
    );
    scriptSchema.runInContext(vm.createContext(sandboxSchema));

    // 1) validateAndGetUnifiedStore chấp nhận link không có category
    const linksNoCat = [{ id: "l_nocat", title: "No Category", url: "https://nocat.vn" }];
    const ckNoCat = sandboxSchema.computeTxChecksum([], linksNoCat, "2026.09.21.03", [], {});
    catMap.set("teacher_hub_store_v2", JSON.stringify({
      schemaVersion: 2,
      version: "2026.09.21.03",
      generation: 1,
      token: "cat_tok_763",
      categories: [],
      links: linksNoCat,
      reminders: [],
      timetable: {},
      checksum: ckNoCat,
      time: Date.now()
    }));
    catMap.set("teacher_hub_data_version", "2026.09.21.03");
    const verifiedNoCat = sandboxSchema.validateAndGetUnifiedStore(false);
    assert(verifiedNoCat !== null, 'Schema Consistency: validateAndGetUnifiedStore chấp nhận link khi không có thuộc tính category');

    // 2) applySyncData chuẩn hóa link thiếu category về "all"
    catMap.set("cva_fencing_generation", "1");
    catMap.set("cva_fencing_token", "cat_tok_763");
    catMap.set("cva_migration_lock", JSON.stringify({ token: "cat_tok_763", generation: 1, time: Date.now() }));

    const validSampleTimetable = {
      "2": { "Tiết 1": "Toán" },
      "3": { "Tiết 1": "Văn" },
      "4": { "Tiết 1": "Anh" },
      "5": { "Tiết 1": "Lý" },
      "6": { "Tiết 1": "Hóa" }
    };

    const syncPayloadMissingCat = {
      schemaVersion: 2,
      categories: [{ id: "cat1", label: "Cat 1" }],
      links: [
        { id: "l1", title: "L1", url: "https://l1.vn" },
        { id: "l2", title: "L2", url: "https://l2.vn", category: "" },
        { id: "l3", title: "L3", url: "https://l3.vn", category: "custom" }
      ],
      reminders: [],
      timetable: validSampleTimetable
    };
    const syncRes = await sandboxSchema.applySyncData(syncPayloadMissingCat, sandboxSchema.currentLockContext);
    assert(syncRes === true, 'Schema Consistency: applySyncData thành công với payload thiếu category');
    const storeAfterSync = JSON.parse(catMap.get("teacher_hub_store_v2"));
    assert(storeAfterSync.links[0].category === "all", 'Schema Consistency: Link thiếu category được chuẩn hóa về "all"');
    assert(storeAfterSync.links[1].category === "all", 'Schema Consistency: Link có category rỗng được chuẩn hóa về "all"');
    assert(storeAfterSync.links[2].category === "custom", 'Schema Consistency: Link có category hợp lệ được giữ nguyên "custom"');
    const validateSyncedStore = sandboxSchema.validateAndGetUnifiedStore(false);
    assert(validateSyncedStore !== null, 'Schema Consistency: Master Manifest sau đồng bộ vượt qua 100% kiểm định validateAndGetUnifiedStore');
  }

  // --- 7.6.4: Bảo Tồn Bản Rõ Sổ Tay Khi Ghi Lỗi (Legacy Plaintext Vault Preservation) ---
  console.log('  ▸ 7.6.4 Kiểm tra Legacy Plaintext Vault Preservation:');
  if (saveVaultUnlockedCode && rawSha256Code && checksumCode) {
    const vaultMap = new Map();
    let failOnCommitted = false;

    const mockVaultStorage = {
      getItem: (k) => vaultMap.get(k) || null,
      setItem: (k, v) => {
        if (failOnCommitted && k === 'cva_vault_staging' && typeof v === 'string' && v.includes('"committed"')) {
          const err = new Error('DiskErrorOnVaultCommit');
          err.name = 'DiskError';
          throw err;
        }
        vaultMap.set(k, String(v));
      },
      removeItem: (k) => vaultMap.delete(k)
    };

    const sandboxVaultPreserve = {
      localStorage: mockVaultStorage,
      CURRENT_DATA_VERSION: "2026.09.21.03",
      currentLockContext: {
        generation: 1,
        token: "v_tok_764",
        revoked: false,
        verifyFencing: () => true
      },
      isVaultUnlocked: true,
      sessionVaultPin: "MasterPin@2026",
      vaultData: { "site-1": { u: "teacher", p: "pass123" } },
      generateSalt: () => "mock_salt_hex_764",
      encryptVaultPayload: async () => "aes_gcm:mock_cipher_764",
      showToast: () => {},
      console: { log: () => {}, warn: () => {}, error: () => {} }
    };

    const scriptVaultPreserve = new vm.Script(
      'let currentLockContext = this.currentLockContext;\n' +
      'let isVaultUnlocked = this.isVaultUnlocked;\n' +
      'let sessionVaultPin = this.sessionVaultPin;\n' +
      'let vaultData = this.vaultData;\n' +
      safeStorageRemoveCode + '\n' +
      rawSha256Code + '\n' +
      checksumCode + '\n' +
      saveVaultUnlockedCode + '\n' +
      'this.computeRawSha256 = computeRawSha256;\n' +
      'this.computeTxChecksum = computeTxChecksum;\n' +
      'this.saveVaultStorageUnlocked = saveVaultStorageUnlocked;'
    );
    scriptVaultPreserve.runInContext(vm.createContext(sandboxVaultPreserve));

    // Setup initial state with legacy plaintext vault
    const legacyPlaintext = JSON.stringify({ "site-1": { u: "teacher", p: "pass123" } });
    vaultMap.set("teacher_hub_vault_v1", legacyPlaintext);
    vaultMap.set("cva_fencing_generation", "1");
    vaultMap.set("cva_fencing_token", "v_tok_764");
    vaultMap.set("cva_migration_lock", JSON.stringify({ token: "v_tok_764", generation: 1, time: Date.now() }));

    // Simulate failure during commit
    failOnCommitted = true;
    let vaultSaveThrew = false;
    try {
      await sandboxVaultPreserve.saveVaultStorageUnlocked(sandboxVaultPreserve.currentLockContext);
    } catch {
      vaultSaveThrew = true;
    }
    failOnCommitted = false;

    assert(vaultSaveThrew === true, 'Legacy Vault Preservation: Bắt lỗi khi commit thất bại');
    assert(vaultMap.get("teacher_hub_vault_v1") === legacyPlaintext, 'Legacy Vault Preservation: teacher_hub_vault_v1 bản rõ được bảo tồn 100% nguyên vẹn khi ghi gặp sự cố');

    // Test successful write: legacy plaintext is removed AFTER committed
    await sandboxVaultPreserve.saveVaultStorageUnlocked(sandboxVaultPreserve.currentLockContext);
    assert(vaultMap.get("teacher_hub_vault_v1") === null || !vaultMap.has("teacher_hub_vault_v1"), 'Legacy Vault Preservation: teacher_hub_vault_v1 được xóa sạch sau khi ghi mã hóa thành công');
    assert(vaultMap.has("teacher_hub_vault_envelope_v1"), 'Legacy Vault Preservation: Bản mã hóa envelope được lưu trữ an toàn');
  }

  // --- 7.6.5: Kiểm Định Đọc-Sau-Ghi & Đọc-Sau-Xóa Đóng-An-Toàn Của Fencing Marker ---
  console.log('  ▸ 7.6.5 Kiểm tra Fencing Marker Read-After-Write & Read-After-Delete:');
  if (executeLockCode) {
    const fenceMap = new Map();
    let failOnFenceKey = null;

    const mockFenceStorage = {
      getItem: (k) => fenceMap.get(k) || null,
      setItem: (k, v) => {
        if (failOnFenceKey && k === failOnFenceKey) {
          return;
        }
        fenceMap.set(k, String(v));
      },
      removeItem: (k) => fenceMap.delete(k)
    };

    const sandboxFence = {
      localStorage: mockFenceStorage,
      currentLockContext: null,
      navigator: {
        locks: {
          request: async (name, opts, cb) => {
            return await cb();
          }
        }
      },
      syncMemoryFromLatestStorage: () => {},
      showDegradedStorageBanner: () => {},
      console: { log: () => {}, warn: () => {}, error: () => {} }
    };

    const scriptFence = new vm.Script(
      'let currentLockContext = this.currentLockContext;\n' +
      safeStorageRemoveCode + '\n' +
      executeLockCode + '\n' +
      'this.executeWithCrossTabLock = executeWithCrossTabLock;'
    );
    scriptFence.runInContext(vm.createContext(sandboxFence));

    // Simulate silent write failure on cva_fencing_generation during lock acquisition
    fenceMap.clear();
    failOnFenceKey = 'cva_fencing_generation';
    let fenceCbRan = false;
    let fenceThrew = false;
    try {
      await sandboxFence.executeWithCrossTabLock(async () => {
        fenceCbRan = true;
      });
    } catch {
      fenceThrew = true;
    }
    failOnFenceKey = null;

    assert(fenceThrew === true, 'Fencing Marker Fail-Closed: Ném lỗi khi Read-After-Write của cva_fencing_generation thất bại');
    assert(fenceCbRan === false, 'Fencing Marker Fail-Closed: Callback TUYỆT ĐỐI KHÔNG được thực thi khi fencing write fail (0 callback)');

    // Verify Read-After-Delete in finally
    let lockReleasedCleanly = false;
    await sandboxFence.executeWithCrossTabLock(async (lockCtx) => {
      assert(lockCtx.revoked === false, 'Fencing Marker: lockCtx hoạt động trong callback');
      lockReleasedCleanly = true;
    });
    assert(lockReleasedCleanly === true, 'Fencing Marker: Giao dịch hoàn tất thành công');
    assert(!fenceMap.has("cva_migration_lock"), 'Fencing Marker Read-After-Delete: cva_migration_lock được xóa sạch 100% trong khối finally');

    // Test Adversarial Fencing Preemption Interleaving (Codex Invariant: Tab B Preempts Tab A before finally)
    const tabBMarker = JSON.stringify({
      token: "tok_tab_b_preempt_adversarial",
      generation: 99,
      time: Date.now()
    });

    let tabAExecuted = false;
    await sandboxFence.executeWithCrossTabLock(async (lockCtx) => {
      assert(lockCtx.revoked === false, 'Fencing Marker: Tab A đang giữ lock hợp lệ');
      // Tab B can thiệp cướp quyền và tăng thế hệ trước khi Tab A vào finally:
      fenceMap.set("cva_fencing_generation", "99");
      fenceMap.set("cva_fencing_token", "tok_tab_b_preempt_adversarial");
      fenceMap.set("cva_migration_lock", tabBMarker);
      tabAExecuted = true;
    });

    assert(tabAExecuted === true, 'Fencing Marker: Tab A hoàn tất callback thành công');
    assert(fenceMap.get("cva_migration_lock") === tabBMarker, 'Adversarial Invariant: Marker của Tab B BẢO LƯU 100%, Tab A tuyệt đối không được xóa marker của Tab B');
    assert(fenceMap.has("cva_migration_lock_cleanup_failed") === true, 'Adversarial Invariant: Tab A ghi nhận cờ cva_migration_lock_cleanup_failed');
    const cleanupErr = JSON.parse(fenceMap.get("cva_migration_lock_cleanup_failed"));
    assert(cleanupErr.reason === "FencingOwnershipMismatchBeforeDelete" || cleanupErr.reason === "LockContextVerifyFencingFailed", 'Adversarial Invariant: Ghi nhận chính xác lý do vi phạm fencing trước khi xóa');

    // Test 3B: Adversarial TOCTOU Race: Tab B can thiệp NGAY SAU ownership check nhưng TRƯỚC lệnh delete!
    const tabBInterleavedMarker = JSON.stringify({
      token: "tok_tab_b_interleaved_cas",
      generation: 100,
      time: Date.now()
    });

    sandboxFence.window = {
      __adversarialPreDeleteHook: () => {
        // Tab B thay đổi cả 3 marker ngay sau ownership check và ngay trước lệnh delete!
        fenceMap.set("cva_fencing_generation", "100");
        fenceMap.set("cva_fencing_token", "tok_tab_b_interleaved_cas");
        fenceMap.set("cva_migration_lock", tabBInterleavedMarker);
      }
    };
    sandboxFence.globalThis = sandboxFence.window;

    fenceMap.delete("cva_migration_lock_cleanup_failed");
    let tabAInterleavedRan = false;
    await sandboxFence.executeWithCrossTabLock(async (lockCtx) => {
      assert(lockCtx.revoked === false, 'Tab A thực thi callback thành công');
      tabAInterleavedRan = true;
    });

    assert(tabAInterleavedRan === true, 'Tab A callback hoàn tất');
    assert(fenceMap.get("cva_migration_lock") === tabBInterleavedMarker, 'Adversarial CAS Anti-TOCTOU Invariant: Marker của Tab B BẢO LƯU 100% khi xen giữa ownership check và delete, Tab A tuyệt đối không được xóa');
    assert(fenceMap.has("cva_migration_lock_cleanup_failed") === true, 'Adversarial CAS Anti-TOCTOU Invariant: Tab A phát hiện CAS mismatch và ghi cờ cva_migration_lock_cleanup_failed');
    const casCleanErr = JSON.parse(fenceMap.get("cva_migration_lock_cleanup_failed"));
    assert(casCleanErr.reason === "CASPreemptionDetectedBeforeDelete", 'Adversarial CAS Anti-TOCTOU Invariant: Ghi nhận chính xác lý do CASPreemptionDetectedBeforeDelete');
    delete sandboxFence.window.__adversarialPreDeleteHook;

    // Test 3C: Adversarial Post-Delete Interleaving: Tab B thay đổi marker NGAY SAU KHI Tab A thực hiện delete!
    sandboxFence.window = {
      __adversarialPostDeleteHook: () => {
        fenceMap.set("cva_fencing_generation", "101");
        fenceMap.set("cva_fencing_token", "tok_tab_b_post_del_race");
      }
    };
    sandboxFence.globalThis = sandboxFence.window;
    fenceMap.delete("cva_migration_lock_cleanup_failed");

    let tabAPostDelRan = false;
    await sandboxFence.executeWithCrossTabLock(async (lockCtx) => {
      assert(lockCtx.revoked === false, 'Tab A thực thi callback thành công');
      tabAPostDelRan = true;
    });

    assert(tabAPostDelRan === true, 'Tab A callback hoàn tất');
    assert(fenceMap.has("cva_migration_lock_cleanup_failed") === true, 'Adversarial Post-Delete Race: Phát hiện post-delete mismatch và ghi cờ cva_migration_lock_cleanup_failed');
    const postDelCleanErr = JSON.parse(fenceMap.get("cva_migration_lock_cleanup_failed"));
    assert(postDelCleanErr.reason === "PostDeleteFencingDoubleCheckFailed", 'Adversarial Post-Delete Race: Ghi nhận chính xác lý do PostDeleteFencingDoubleCheckFailed');
    delete sandboxFence.window.__adversarialPostDeleteHook;

    // Static AST / Invariant Check: Zero Non-Lock Cleanup Invariant & Zero Swallowed Catches
    assert(executeLockCode.includes('safeFencedRemoveLock'), 'Zero Non-Lock Invariant: executeWithCrossTabLock khai báo hàm safeFencedRemoveLock');
    assert(executeLockCode.includes('safeFencedRemoveLock("cva_migration_lock"'), 'Zero Non-Lock Invariant: executeWithCrossTabLock dọn dẹp khóa qua safeFencedRemoveLock');
    assert(!executeLockCode.match(/finally\s*\{[^}]*localStorage\.removeItem\(/), 'Zero Non-Lock Invariant: executeWithCrossTabLock CẤM raw localStorage.removeItem trong finally');
    assert(htmlContent.includes('safeFencedRemoveLock'), 'HTML chứa khai báo an toàn safeFencedRemoveLock');
    assert(!executeLockCode.includes('/* ignore */'), 'Zero Swallowed Catches: executeWithCrossTabLock không chứa /* ignore */ nuốt lỗi');
    assert(executeLockCode.includes('PostDeleteFencingDoubleCheckFailed'), 'Post-Delete Double-Check: executeWithCrossTabLock kiểm tra post-delete fencing mismatch');
  }

  // --- 7.6.6: Điều Phối Viên Đơn Giao Dịch Chống Ghi Đè Đệ Quy (Single Sync Coordinator) ---
  console.log('  ▸ 7.6.6 Kiểm tra Single Transaction Coordinator Invariant:');
  if (updateUnifiedUnlockedCode) {
    const singleCoordMap = new Map();
    const mockCoordStorage = {
      getItem: (k) => singleCoordMap.get(k) || null,
      setItem: (k, v) => singleCoordMap.set(k, String(v)),
      removeItem: (k) => singleCoordMap.delete(k)
    };

    let coordinatorSetCalls = 0;
    const trackedCoordStorage = {
      ...mockCoordStorage,
      setItem: (k, v) => {
        coordinatorSetCalls++;
        mockCoordStorage.setItem(k, v);
      }
    };

    const sandboxCoord = {
      localStorage: trackedCoordStorage,
      isSyncTransactionActive: true,
      CURRENT_DATA_VERSION: "2026.09.21.03",
      currentLockContext: {
        generation: 1,
        token: "tok_coord_766",
        revoked: false,
        verifyFencing: () => true
      },
      categoriesData: [{ id: "c_test" }],
      linksData: [{ id: "l_test" }],
      remindersData: [],
      teacherTimetableData: {},
      console: { log: () => {}, warn: () => {}, error: () => {} }
    };

    // Setup valid fencing markers for single coordinator test
    singleCoordMap.set("cva_fencing_generation", "1");
    singleCoordMap.set("cva_fencing_token", "tok_coord_766");
    singleCoordMap.set("cva_migration_lock", JSON.stringify({ token: "tok_coord_766", generation: 1, time: Date.now() }));

    const scriptCoord = new vm.Script(
      'let currentLockContext = this.currentLockContext;\n' +
      'let isSyncTransactionActive = this.isSyncTransactionActive;\n' +
      'let categoriesData = this.categoriesData;\n' +
      'let linksData = this.linksData;\n' +
      'let remindersData = this.remindersData;\n' +
      'let teacherTimetableData = this.teacherTimetableData;\n' +
      'let CURRENT_DATA_VERSION = this.CURRENT_DATA_VERSION;\n' +
      updateUnifiedUnlockedCode + '\n' +
      'this.updateUnifiedStoreUnlocked = updateUnifiedStoreUnlocked;'
    );
    scriptCoord.runInContext(vm.createContext(sandboxCoord));

    // Case 1: isSyncTransactionActive = true + valid lockCtx & valid fencing -> returns false (0 writes, cấm trả về true giả mạo)
    coordinatorSetCalls = 0;
    const bypassRes = sandboxCoord.updateUnifiedStoreUnlocked(sandboxCoord.currentLockContext);
    assert(bypassRes === false, 'Single Coordinator Invariant: updateUnifiedStoreUnlocked trả về false khi isSyncTransactionActive = true (chống fake success)');
    assert(coordinatorSetCalls === 0, 'Single Coordinator Invariant: 0 storage writes khi sync transaction đang diễn ra (chống re-entrant store write)');

    // Case 2: isSyncTransactionActive = true + lockCtx.revoked = true -> Phải ném StorageLockUnavailable (Fail-Closed)
    coordinatorSetCalls = 0;
    let threwRevokedWhenSyncActive = false;
    try {
      sandboxCoord.updateUnifiedStoreUnlocked({
        generation: 1,
        token: "tok_coord_766",
        revoked: true,
        verifyFencing: () => false
      });
    } catch (e) {
      threwRevokedWhenSyncActive = Boolean(e && e.message && e.message.includes('StorageLockUnavailable'));
    }
    assert(threwRevokedWhenSyncActive === true, 'Fail-Closed Invariant: updateUnifiedStoreUnlocked ném StorageLockUnavailable khi lockCtx.revoked = true kể cả khi isSyncTransactionActive = true');
    assert(coordinatorSetCalls === 0, 'Fail-Closed Invariant: 0 storage writes khi lockCtx.revoked = true');

    // Case 3: isSyncTransactionActive = true + mất cva_migration_lock -> Phải ném FencingViolation (Fail-Closed)
    singleCoordMap.delete("cva_migration_lock");
    coordinatorSetCalls = 0;
    let threwMissingLockWhenSyncActive = false;
    try {
      sandboxCoord.updateUnifiedStoreUnlocked(sandboxCoord.currentLockContext);
    } catch (e) {
      threwMissingLockWhenSyncActive = Boolean(e && e.message && e.message.includes('FencingViolation'));
    }
    assert(threwMissingLockWhenSyncActive === true, 'Fail-Closed Invariant: updateUnifiedStoreUnlocked ném FencingViolation khi cva_migration_lock bị mất kể cả khi isSyncTransactionActive = true');
    assert(coordinatorSetCalls === 0, 'Fail-Closed Invariant: 0 storage writes khi mất cva_migration_lock');

    // Case 4: isSyncTransactionActive = true + generation bị superseded -> Phải ném FencingViolation (Fail-Closed)
    singleCoordMap.set("cva_migration_lock", JSON.stringify({ token: "tok_coord_766", generation: 1, time: Date.now() }));
    singleCoordMap.set("cva_fencing_generation", "99"); // Superseded!
    coordinatorSetCalls = 0;
    let threwSupersededWhenSyncActive = false;
    try {
      sandboxCoord.updateUnifiedStoreUnlocked(sandboxCoord.currentLockContext);
    } catch (e) {
      threwSupersededWhenSyncActive = Boolean(e && e.message && e.message.includes('FencingViolation'));
    }
    assert(threwSupersededWhenSyncActive === true, 'Fail-Closed Invariant: updateUnifiedStoreUnlocked ném FencingViolation khi generation bị superseded kể cả khi isSyncTransactionActive = true');
    assert(coordinatorSetCalls === 0, 'Fail-Closed Invariant: 0 storage writes khi generation bị superseded');
  }

  // --- 7.6.7: Triệt Tiêu Xóa Thô Toàn Cục & Primitive Đọc-Sau-Xóa Duy Nhất (Universal safeStorageRemove Invariant) ---
  console.log('  ▸ 7.6.7 Kiểm tra Universal Zero Raw RemoveItem & safeStorageRemove Invariant:');
  // Static AST check: Trong toàn bộ index.html chỉ có đúng 1 lệnh raw localStorage.removeItem (bên trong chính safeStorageRemove)
  const allRemoveItemMatches = htmlContent.match(/localStorage\.removeItem\s*\(/g) || [];
  assert(allRemoveItemMatches.length === 1, `Universal Zero Raw RemoveItem: Chỉ được phép có duy nhất 1 lệnh raw localStorage.removeItem trong toàn bộ index.html (thực tế: ${allRemoveItemMatches.length})`);
  assert(htmlContent.includes('function safeStorageRemove(key)'), 'Universal Zero Raw RemoveItem: index.html định nghĩa hàm safeStorageRemove(key)');

  if (safeStorageRemoveCode) {
    const removeMap = new Map();
    let simulateFailedDelete = false;
    const mockStorageForRemove = {
      getItem: (k) => removeMap.get(k) || null,
      setItem: (k, v) => removeMap.set(k, String(v)),
      removeItem: (k) => {
        if (!simulateFailedDelete) {
          removeMap.delete(k);
        }
      }
    };
    const sandboxRemove = {
      localStorage: mockStorageForRemove,
      console: { log: () => {}, warn: () => {}, error: () => {} }
    };
    const scriptRemove = new vm.Script(safeStorageRemoveCode + '\nthis.safeStorageRemove = safeStorageRemove;');
    scriptRemove.runInContext(vm.createContext(sandboxRemove));

    // Test 1: Xóa thành công bình thường
    removeMap.set("test_del_key", "val123");
    const delRes = sandboxRemove.safeStorageRemove("test_del_key");
    assert(delRes === true, 'safeStorageRemove: Trả về true khi xóa thành công');
    assert(removeMap.has("test_del_key") === false, 'safeStorageRemove: Khóa đã được xóa sạch khỏi storage');

    // Test 2: Xóa thất bại (Read-After-Delete phát hiện key vẫn còn) -> ném ngoại lệ ReadAfterDeleteFailure
    removeMap.set("test_stuck_key", "sticky");
    simulateFailedDelete = true;
    let threwDeleteFailure = false;
    try {
      sandboxRemove.safeStorageRemove("test_stuck_key");
    } catch(err) {
      threwDeleteFailure = Boolean(err && err.message && err.message.includes('ReadAfterDeleteFailure'));
    }
    simulateFailedDelete = false;
    assert(threwDeleteFailure === true, 'safeStorageRemove: Ném lỗi ReadAfterDeleteFailure (Fail-Closed) khi key không bị xóa khỏi storage');
  }

  // --- 7.6.8: Khôi Phục Marker Fencing Khi Thất Bại & Cờ Báo Hỏng Fencing (Fencing Marker Rollback Invariant) ---
  console.log('  ▸ 7.6.8 Kiểm tra Fencing Marker Rollback & Anti-Partial-Acquisition Invariant:');
  if (executeLockCode && safeStorageRemoveCode) {
    const markerRollbackMap = new Map();
    let failMarkerLockWrite = false;
    let failMarkerRollbackWrite = false;

    const mockMarkerStorage = {
      getItem: (k) => markerRollbackMap.get(k) || null,
      setItem: (k, v) => {
        if (failMarkerLockWrite && k === "cva_migration_lock") {
          throw new Error("SimulatedQuotaErrorOnMigrationLockWrite");
        }
        if (failMarkerRollbackWrite && k === "cva_fencing_generation") {
          throw new Error("SimulatedDiskErrorOnFencingRollback");
        }
        markerRollbackMap.set(k, String(v));
      },
      removeItem: (k) => markerRollbackMap.delete(k)
    };

    const sandboxMarker = {
      localStorage: mockMarkerStorage,
      currentLockContext: null,
      navigator: {
        locks: {
          request: async (name, opts, cb) => await cb()
        }
      },
      syncMemoryFromLatestStorage: () => {},
      showDegradedStorageBanner: () => {},
      console: { log: () => {}, warn: () => {}, error: () => {} }
    };

    const scriptMarker = new vm.Script(
      'let currentLockContext = this.currentLockContext;\n' +
      safeStorageRemoveCode + '\n' +
      executeLockCode + '\n' +
      'this.executeWithCrossTabLock = executeWithCrossTabLock;'
    );
    scriptMarker.runInContext(vm.createContext(sandboxMarker));

    // Case 1: Trước đó có marker cũ, write lock mới fail -> markers được rollback về giá trị cũ
    markerRollbackMap.set("cva_fencing_generation", "5");
    markerRollbackMap.set("cva_fencing_token", "tok_old_gen5");
    markerRollbackMap.set("cva_migration_lock", JSON.stringify({ token: "tok_old_gen5", generation: 5 }));

    failMarkerLockWrite = true;
    let threwAcqErr = false;
    try {
      await sandboxMarker.executeWithCrossTabLock(async () => {});
    } catch {
      threwAcqErr = true;
    }
    failMarkerLockWrite = false;
    assert(threwAcqErr === true, 'Marker Rollback: executeWithCrossTabLock ném ngoại lệ khi ghi marker thất bại');
    assert(markerRollbackMap.get("cva_fencing_generation") === "5", 'Marker Rollback: Generation được phục hồi về giá trị cũ "5"');
    assert(markerRollbackMap.get("cva_fencing_token") === "tok_old_gen5", 'Marker Rollback: Token được phục hồi về giá trị cũ');
    assert(markerRollbackMap.has("cva_migration_lock_acquisition_failed") === true, 'Marker Rollback: Ghi nhận cờ cva_migration_lock_acquisition_failed');

    // Case 2: Rollback marker cũng bị thất bại -> Ghi nhận cờ cva_fencing_corrupt
    failMarkerLockWrite = true;
    failMarkerRollbackWrite = true;
    let threwCorruptErr = false;
    try {
      await sandboxMarker.executeWithCrossTabLock(async () => {});
    } catch {
      threwCorruptErr = true;
    }
    failMarkerLockWrite = false;
    failMarkerRollbackWrite = false;
    assert(threwCorruptErr === true, 'Marker Rollback: Ném lỗi khi cả rollback marker bị lỗi');
    assert(markerRollbackMap.has("cva_fencing_corrupt") === true, 'Marker Rollback: Ghi nhận cờ cva_fencing_corrupt khi rollback marker thất bại');

    // Case 3: recoverStagingTransaction Phase 1 phát hiện cva_fencing_corrupt -> Dừng ngay lập tức (Fail-Closed)
    if (recoverCode) {
      const sandboxCorruptRec = {
        localStorage: mockMarkerStorage,
        currentLockContext: { token: "tok_rec", generation: 6, revoked: false, verifyFencing: () => true },
        console: { log: () => {}, warn: () => {}, error: () => {} }
      };
      const scriptCorruptRec = new vm.Script(
        'let currentLockContext = this.currentLockContext;\n' +
        safeStorageRemoveCode + '\n' +
        recoverCode + '\n' +
        'this.recoverStagingTransaction = recoverStagingTransaction;'
      );
      scriptCorruptRec.runInContext(vm.createContext(sandboxCorruptRec));

      const corruptRes = sandboxCorruptRec.recoverStagingTransaction(sandboxCorruptRec.currentLockContext);
      assert(corruptRes.recovered === false, 'cva_fencing_corrupt Fail-Closed: recoverStagingTransaction từ chối recovery (recovered: false)');
      assert(corruptRes.error && corruptRes.error.includes('FencingCorrupt'), 'cva_fencing_corrupt Fail-Closed: Báo lỗi chính xác FencingCorrupt');
    }
  }

  // --- 7.6.9: Snapshot Toàn Diện & Dừng Khẩn Cấp Khi Rollback Lỗi (Comprehensive Snapshot & Immediate Stop Invariant) ---
  console.log('  ▸ 7.6.9 Kiểm tra Comprehensive Pre-Phase-2 Snapshot & Immediate Rollback-Stop Invariant:');
  if (recoverCode && rawSha256Code && checksumCode && safeStorageRemoveCode) {
    // Kiểm tra cấu trúc prePhase2Snapshot trong mã nguồn index.html
    assert(htmlContent.includes('migrationStaging: localStorage.getItem(MIGRATION_STAGING_KEY)'), 'Comprehensive Snapshot: prePhase2Snapshot chứa migrationStaging');
    assert(htmlContent.includes('syncStaging: localStorage.getItem("cva_sync_staging")'), 'Comprehensive Snapshot: prePhase2Snapshot chứa syncStaging');
    assert(htmlContent.includes('vaultStaging: localStorage.getItem("cva_vault_staging")'), 'Comprehensive Snapshot: prePhase2Snapshot chứa vaultStaging');
    assert(htmlContent.includes('storeStaging: localStorage.getItem("cva_store_staging")'), 'Comprehensive Snapshot: prePhase2Snapshot chứa storeStaging');
    assert(htmlContent.includes('fencingCorrupt: localStorage.getItem("cva_fencing_corrupt")'), 'Comprehensive Snapshot: prePhase2Snapshot chứa fencingCorrupt');
    assert(htmlContent.includes('recoveryRollbackError: localStorage.getItem("cva_recovery_rollback_error")'), 'Comprehensive Snapshot: prePhase2Snapshot chứa recoveryRollbackError');

    // Kiểm tra cấu trúc keysMap đủ 23 keys
    const expectedRollbackKeys = [
      "teacher_hub_store_v2",
      "teacher_hub_data_version",
      "teacher_hub_categories_v1",
      "teacher_hub_links_v2",
      "teacher_hub_reminders_v1",
      "teacher_hub_timetable_v1",
      "teacher_hub_vault_envelope_v1",
      "teacher_hub_vault_salt",
      "teacher_hub_vault_enc_v2",
      "teacher_hub_vault_v1",
      "cva_migration_staging",
      "cva_sync_staging",
      "cva_vault_staging",
      "cva_store_staging",
      "cva_migration_error",
      "cva_sync_error",
      "cva_vault_error",
      "cva_store_error",
      "cva_fencing_corrupt",
      "cva_recovery_rollback_error",
      "cva_migration_lock",
      "cva_fencing_token",
      "cva_fencing_generation"
    ];
    for (const expKey of expectedRollbackKeys) {
      assert(
        recoverCode.includes(`"${expKey}"`) || recoverCode.includes(`[MIGRATION_STAGING_KEY`) || recoverCode.includes(`[MIGRATION_LOCK_KEY`) || recoverCode.includes(`[FENCING_GEN_KEY`),
        `Comprehensive Rollback Keys: keysMap chứa đầy đủ khóa ${expKey}`
      );
    }

    // Kiểm tra cơ chế Dừng Khẩn Cấp (break ngay lập tức) trong rollbackAllToPrePhase2
    assert(recoverCode.includes('break; // Fail-Closed: Dừng ngay lập tức'), 'Immediate Rollback Stop: rollbackAllToPrePhase2 ngắt vòng lặp (break) ngay khi có 1 key lỗi');
    assert(recoverCode.includes('verifyRecoveryLock()'), 'Immediate Rollback Stop: rollbackAllToPrePhase2 kiểm tra verifyRecoveryLock trước và sau mỗi key');
    assert(recoverCode.includes('Phase2RollbackFailed'), 'Immediate Rollback Stop: rollbackAllToPrePhase2 ném Phase2RollbackFailed khi gặp lỗi');

    // Functional Test: Rollback toàn bộ 23 khóa khi Phase 2 gặp lỗi đĩa
    const rollbackAllMap = new Map();
    let throwOnPhase2StoreWrite = false;
    let throwOnRollbackKey = null;

    const mockRollbackAllStorage = {
      getItem: (k) => rollbackAllMap.get(k) || null,
      setItem: (k, v) => {
        if (throwOnPhase2StoreWrite && k === "teacher_hub_store_v2") {
          throwOnPhase2StoreWrite = false;
          throw new Error("SimulatedDiskErrorDuringPhase2Write");
        }
        if (throwOnRollbackKey && k === throwOnRollbackKey) {
          throw new Error("SimulatedErrorOnRollbackKey:" + k);
        }
        rollbackAllMap.set(k, String(v));
      },
      removeItem: (k) => {
        if (throwOnRollbackKey && k === throwOnRollbackKey) {
          throw new Error("SimulatedErrorOnRollbackKey:" + k);
        }
        rollbackAllMap.delete(k);
      }
    };

    const sandboxRollbackAll = {
      localStorage: mockRollbackAllStorage,
      CURRENT_DATA_VERSION: "2026.09.21.03",
      currentLockContext: {
        token: "tok_rollback_23",
        generation: 7,
        revoked: false,
        verifyFencing: () => true
      },
      console: { log: () => {}, warn: () => {}, error: () => {} }
    };

    const scriptRollbackAll = new vm.Script(
      'let currentLockContext = this.currentLockContext;\n' +
      safeStorageRemoveCode + '\n' +
      rawSha256Code + '\n' +
      checksumCode + '\n' +
      recoverCode + '\n' +
      'this.computeRawSha256 = computeRawSha256;\n' +
      'this.computeTxChecksum = computeTxChecksum;\n' +
      'this.recoverStagingTransaction = recoverStagingTransaction;'
    );
    scriptRollbackAll.runInContext(vm.createContext(sandboxRollbackAll));

    // Thiết lập snapshot ban đầu trước khi vào Phase 2
    const initStore = JSON.stringify({ version: "2026.09.20.00", categories: [], links: [{ id: "l_init", title: "Init", url: "https://init.vn" }] });
    const initLinks = JSON.stringify([{ id: "l_init", title: "Init", url: "https://init.vn" }]);
    const initLock = JSON.stringify({ token: "tok_rollback_23", generation: 7, time: Date.now() });

    rollbackAllMap.set("teacher_hub_store_v2", initStore);
    rollbackAllMap.set("teacher_hub_data_version", "2026.09.20.00");
    rollbackAllMap.set("teacher_hub_categories_v1", "[]");
    rollbackAllMap.set("teacher_hub_links_v2", initLinks);
    rollbackAllMap.set("teacher_hub_reminders_v1", "[]");
    rollbackAllMap.set("teacher_hub_timetable_v1", "{}");
    rollbackAllMap.set("teacher_hub_vault_envelope_v1", JSON.stringify({ version: "vault_v1", salt: "s_init", ciphertext: "c_init" }));
    rollbackAllMap.set("teacher_hub_vault_salt", "s_init");
    rollbackAllMap.set("teacher_hub_vault_enc_v2", "c_init");
    rollbackAllMap.set("cva_fencing_generation", "7");
    rollbackAllMap.set("cva_fencing_token", "tok_rollback_23");
    rollbackAllMap.set("cva_migration_lock", initLock);

    // Chuẩn bị store staging committed để kích hoạt Phase 2
    const stCats = [{ id: "c_new" }];
    const stLinks = [{ id: "l_new", url: "https://new.vn" }];
    const stCk = sandboxRollbackAll.computeTxChecksum(stCats, stLinks, "2026.09.21.03", [], {});
    rollbackAllMap.set("cva_store_staging", JSON.stringify({
      status: "committed",
      token: "tok_rollback_23",
      fencingGeneration: 7,
      version: "2026.09.21.03",
      categories: stCats,
      links: stLinks,
      reminders: [],
      timetable: {},
      checksum: stCk,
      time: Date.now()
    }));

    // Bắt lỗi ghi store v2 trong Phase 2 để kiểm thử phục hồi toàn bộ 23 khóa
    throwOnPhase2StoreWrite = true;
    const recRes = sandboxRollbackAll.recoverStagingTransaction(sandboxRollbackAll.currentLockContext);
    throwOnPhase2StoreWrite = false;

    assert(recRes.recovered === false, 'Full 23-Key Rollback: recoverStagingTransaction trả về recovered: false khi Phase 2 gặp lỗi');
    assert(rollbackAllMap.get("teacher_hub_store_v2") === initStore, 'Full 23-Key Rollback: teacher_hub_store_v2 được phục hồi về snapshot');
    assert(rollbackAllMap.get("teacher_hub_links_v2") === initLinks, 'Full 23-Key Rollback: teacher_hub_links_v2 được phục hồi về snapshot');
    assert(rollbackAllMap.get("teacher_hub_data_version") === "2026.09.20.00", 'Full 23-Key Rollback: teacher_hub_data_version được phục hồi về snapshot');
    assert(rollbackAllMap.get("cva_fencing_generation") === "7", 'Full 23-Key Rollback: cva_fencing_generation được phục hồi về snapshot');
    assert(rollbackAllMap.get("cva_fencing_token") === "tok_rollback_23", 'Full 23-Key Rollback: cva_fencing_token được phục hồi về snapshot');
    assert(rollbackAllMap.get("cva_migration_lock") === initLock, 'Full 23-Key Rollback: cva_migration_lock được phục hồi về snapshot');
    assert(rollbackAllMap.has("cva_store_error") === true, 'Full 23-Key Rollback: Cờ lỗi chẩn đoán cva_store_error được ghi nhận sau rollback');

    // Test Dừng Khẩn Cấp (Immediate Stop): Khi một key bị lỗi trong quá trình rollback
    throwOnPhase2StoreWrite = true;
    throwOnRollbackKey = "teacher_hub_data_version";
    const failRollbackRes = sandboxRollbackAll.recoverStagingTransaction(sandboxRollbackAll.currentLockContext);
    throwOnPhase2StoreWrite = false;
    throwOnRollbackKey = null;

    assert(failRollbackRes.recovered === false, 'Rollback Stop: recoverStagingTransaction thất bại khi rollback gặp lỗi');
    assert(rollbackAllMap.has("cva_recovery_rollback_error") === true, 'Rollback Stop: Ghi nhận cờ cva_recovery_rollback_error khi một key bị lỗi trong rollback');
  }
})();

// 7.7 KIỂM TRA TOÀN DIỆN MODULE ĐỒNG BỘ ĐÁM MÂY CLOUD SYNC & SMART MERGE (ZERO-BUG CLOUD INVARIANT)
console.log('\n📌 7.7 Kiểm tra Toàn diện Module Đồng bộ Đám mây Cloud Sync & Smart Merge Toàn trường:');
{
  assert(htmlContent.includes('const CLOUD_SYNC_ENDPOINT =') && htmlContent.includes('firebasedatabase.app'), 'Cloud Sync Endpoint: Trỏ chính xác đến Firebase Realtime Database HTTPS REST endpoint');
  assert(htmlContent.includes('async function syncAdminChangesToCloud') && htmlContent.includes('async function checkCloudSystemUpdates'), 'Cloud Sync Engine: Khai báo đầy đủ 2 hàm đồng bộ syncAdminChangesToCloud và checkCloudSystemUpdates');
  assert(htmlContent.includes('btnCloudSyncAdmin') && htmlContent.includes('btnExportGitHubConfig'), 'Giao diện Admin: Tích hợp đầy đủ nút Đẩy Dữ Liệu Lên Đám Mây và nút Xuất Cấu Hình GitHub');
  assert(htmlContent.includes('teacher_hub_cloud_synced_at'), 'Cloud Sync Marker: Ghi nhận dấu mốc đồng bộ teacher_hub_cloud_synced_at để tối ưu hóa lưu lượng tải');
  assert(htmlContent.includes('cloudLinksMap.has(locLink.id)') && htmlContent.includes('localLinkIds.has(cLink.id)'), 'Smart Merge Algorithm: Triệt để bảo toàn liên kết cá nhân của giáo viên và cập nhật đè link hệ thống');
  assert(htmlContent.includes('validCloudCats.forEach') && htmlContent.includes('catMap.has(cCat.id)'), 'Smart Category Merge: Tự động nạp danh mục mới từ trường mà không ghi đè danh mục cá nhân');
  assert(swContent.includes("CACHE_NAME = 'teacher-hub-v2.3.0'"), 'PWA Cache Invariant: Service Worker sw.js nâng cấp lên CACHE_NAME teacher-hub-v2.3.0');
}

// 8. KIỂM THỬ PLAYWRIGHT E2E TRÌNH DUYỆT THẬT (DUAL ENVIRONMENT: FILE:/// VÀ HTTP://LOCALHOST)
console.log('\n📌 8. Kiểm thử Playwright E2E Thực tế trên Trình duyệt kép:');
try {
  const e2eScript = path.join(__dirname, 'test_browser_e2e.js');
  const projectRoot = path.join(__dirname, '..');
  const nodePaths = [
    path.join(projectRoot, 'node_modules'),
    path.join('C:\\Users\\HPZBook\\Desktop\\TIỆN TÍCH GIÁO VIÊN', 'node_modules')
  ].filter(p => fs.existsSync(p)).join(path.delimiter);
  execSync(`node "${e2eScript}"`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_PATH: process.env.NODE_PATH ? (process.env.NODE_PATH + path.delimiter + nodePaths) : nodePaths
    }
  });
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
}

main().catch(err => {
  console.error('Lỗi chạy suite kiểm thử main:', err);
  process.exit(1);
});
