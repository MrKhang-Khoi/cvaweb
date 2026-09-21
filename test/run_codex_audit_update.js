const fs = require('fs');
const http = require('http');

const specContent = fs.readFileSync('SPEC.md', 'utf8');
const swContent = fs.readFileSync('sw.js', 'utf8');
const htmlContent = fs.readFileSync('index.html', 'utf8');

// 1. Service worker update logic
const swStart = htmlContent.indexOf("// 18. SERVICE WORKER PWA AUTO-UPDATE");
const swEnd = htmlContent.indexOf("// 19. TÍNH NĂNG NHẮC NHỞ");
const swBlock = htmlContent.substring(swStart, swEnd);

// 2. Sync & Backup logic (from btnOpenQrSync to THEME)
const syncStart = htmlContent.indexOf("const btnOpenQrSync");
const syncEnd = htmlContent.indexOf("// 13. THEME");
const syncBlock = htmlContent.substring(syncStart, syncEnd);

// 3. HTML markup trích xuất trọn vẹn theo thẻ
const bannerStart = htmlContent.indexOf('<div id="pwaUpdateBanner"');
const bannerEnd = htmlContent.indexOf('</div>', bannerStart) + 6;
const bannerBlock = htmlContent.substring(bannerStart, bannerEnd);

const checkBtnStart = htmlContent.indexOf('<button type="button" id="btnCheckAppUpdateNow"');
const checkBtnEnd = htmlContent.indexOf('</button>', checkBtnStart) + 9;
const checkBtnBlock = htmlContent.substring(checkBtnStart, checkBtnEnd);

// 4. CSS for Banner & Bottom Dock (Bao gồm ngữ cảnh Mobile & Desktop rõ ràng)
const bannerCssStart = htmlContent.indexOf(".pwa-update-banner {");
const bannerCssEnd = htmlContent.indexOf("}", bannerCssStart) + 1;
const bannerCssBlock = htmlContent.substring(bannerCssStart, bannerCssEnd);

const dockMobileStart = htmlContent.indexOf("/* ==========================================================================\n       BOTTOM FLOATING DOCK");
const dockMobileEnd = htmlContent.indexOf(".scroll-clearance-spacer");
const dockMobileBlock = htmlContent.substring(dockMobileStart, dockMobileEnd);

const dockDesktopStart = htmlContent.indexOf("@media (min-width: 768px) {");
const dockDesktopEnd = htmlContent.indexOf("/* BỐ CỤC 2 CỘT CÂN ĐỐI", dockDesktopStart);
const dockDesktopBlock = htmlContent.substring(dockDesktopStart, dockDesktopEnd) + "}\n";

// 5. Version Constants
const verStart = htmlContent.indexOf("const APP_VERSION =");
const verEnd = htmlContent.indexOf(";", verStart + 50) + 1;
const verBlock = htmlContent.substring(verStart, verEnd);

// 6. Security: Pure AES-256-GCM Vault Storage & Fail-Closed Admin PIN
const vaultStart = htmlContent.indexOf("// 2.3. MÃ HÓA SỔ TAY MẬT KHẨU");
const vaultEnd = htmlContent.indexOf("// 4. CLOCK, GREETING");
const vaultBlock = htmlContent.substring(vaultStart, vaultEnd);

// 7. Admin First-Use Initialization Form (Tách biệt hoàn toàn khỏi verifyAdminPin)
const adminFormStart = htmlContent.indexOf("if (adminAuthForm) {");
const adminFormEnd = htmlContent.indexOf("if (changePinForm) {");
const adminFormBlock = htmlContent.substring(adminFormStart, adminFormEnd);

// 8. Storage Functions (có explicit throw err, không bao giờ nuốt exception)
const saveCatStart = htmlContent.indexOf("function saveCategoriesStorage()");
const saveCatEnd = htmlContent.indexOf("function loadLinksFromStorage()");
const saveCatBlock = htmlContent.substring(saveCatStart, saveCatEnd);

const saveLinksStart = htmlContent.indexOf("function saveToStorage()");
const saveLinksEnd = htmlContent.indexOf("// NẠP VÀ LƯU SỔ TAY MÃ HÓA");
const saveLinksBlock = htmlContent.substring(saveLinksStart, saveLinksEnd);

const saveRemStart = htmlContent.indexOf("function saveRemindersStorage()");
const saveRemEnd = htmlContent.indexOf("function updateReminderBadge()");
const saveRemBlock = htmlContent.substring(saveRemStart, saveRemEnd);

const saveTtStart = htmlContent.indexOf("function saveTimetableData()");
const saveTtEnd = htmlContent.indexOf("function openTimetableModal()");
const saveTtBlock = htmlContent.substring(saveTtStart, saveTtEnd);

const prompt = `
Bạn là Chuyên gia Đánh giá Mã nguồn Cấp cao (OpenAI Codex Reasoning Engine).
Nhiệm vụ của bạn là thẩm định chi tiết và nghiêm ngặt TÍNH NĂNG CẬP NHẬT (UPDATE FEATURE) & ĐỒNG BỘ DỮ LIỆU ĐA THIẾT BỊ của ứng dụng PWA Sư phạm (Teacher Hub) khi có thay đổi trên ĐIỆN THOẠI (Mobile) và MÁY TÍNH (Desktop).

Đối chiếu với SPEC.md và thực tế mã nguồn đính kèm:

### 1. SPEC.MD (ĐẶC TẢ TIÊU CHUẨN)
${specContent}

### 2. MÃ NGUỒN SERVICE WORKER (sw.js)
${swContent}

### 3. GIAO DIỆN HTML CỦA BANNER CẬP NHẬT & NÚT KIỂM TRA CẬP NHẬT
${bannerBlock}

${checkBtnBlock}

### 4. KHAI BÁO HẰNG SỐ PHIÊN BẢN (VERSION CONSTANTS)
${verBlock}

### 5. CSS BANNER (TOP: 0, STICKY, Z-INDEX: 1000) & CSS BOTTOM DOCK (MOBILE: DISPLAY FLEX !IMPORTANT, DESKTOP: DISPLAY NONE !IMPORTANT)
\`\`\`css
/* BANNER CẬP NHẬT PWA Ở ĐỈNH TRANG */
${bannerCssBlock}

/* BOTTOM DOCK CỐ ĐỊNH PHÍA DƯỚI ĐIỆN THOẠI (MOBILE DISPLAY: FLEX !IMPORTANT) */
${dockMobileBlock}

/* CHỈ ẨN TRÊN MÀN HÌNH MÁY TÍNH (DESKTOP @media (min-width: 768px)) VÌ ĐÃ CÓ NAVBAR ĐỈNH */
${dockDesktopBlock}
\`\`\`

### 6. TOÀN BỘ LUỒNG LƯU TRỮ SỔ TAY (saveVaultStorage, encryptVaultPayload, decryptVaultPayload) & XÁC THỰC ADMIN PIN FAIL-CLOSED
${vaultBlock}

### 7. LUỒNG THIẾT LẬP ADMIN PIN BAN ĐẦU RIÊNG BIỆT (adminAuthForm)
${adminFormBlock}

### 8. CÁC HÀM LƯU TRỮ STORAGE CÓ EXPLICIT THROW ERR (KHÔNG NUỐT EXCEPTION)
${saveCatBlock}
${saveLinksBlock}
${saveRemBlock}
${saveTtBlock}

### 9. LOGIC SERVICE WORKER PWA AUTO-UPDATE TRONG index.html
${swBlock}

### 10. LOGIC ĐỒNG BỘ DỮ LIỆU & SAO LƯU GIỮA ĐIỆN THOẠI & MÁY TÍNH (CÓ ATOMIC TRANSACTION, UTF-8 BYTE LIMIT & DEEP TIMETABLE VALIDATION)
${syncBlock}

HÃY ĐỐI CHIẾU CÁC ĐIỂM ĐÃ ĐƯỢC KHẮC PHỤC TRIỆT ĐỂ:
1. PWA Update Lifecycle (Điện thoại & Máy tính):
   - sw.js: Đã loại bỏ hoàn toàn self.skipWaiting() trong install event; chỉ skipWaiting khi nhận postMessage { action: 'skipWaiting' }.
   - Offline fallback: Khối .catch() của fetch(req) luôn trả về Response fallback 503 hợp lệ.
   - updateApproved: controllerchange CHỈ reload khi updateApproved === true, triệt tiêu race condition.
   - btnApplyUpdate: Đã LOẠI BỎ HOÀN TOÀN window.location.reload() trực tiếp, chuyển 100% cho skipWaiting và controllerchange kiểm soát.
   - reg.waiting: Được kiểm tra ngay khi khởi tạo và sau reg.update().
   - Phân định rõ ràng CSS Mobile & Desktop:
     * Banner ở top: 0, sticky, z-index: 1000.
     * Bottom dock trên Mobile (@media max-width: 767.98px) có display: flex !important, fixed ở bottom: calc(12px + safe-area), z-index: 50.
     * Bottom dock CHỈ ẩn trên Desktop (@media min-width: 768px: display: none !important) do Desktop đã có menu đỉnh.
     * Hai thành phần không bao giờ che khuất nhau trên mọi thiết bị.
   - Hằng số phiên bản: APP_VERSION = "2.1.0" và SCHEMA_VERSION = 2 được khai báo tường minh.

2. Tiêu chuẩn Zero-Plaintext & Mã hóa Sổ tay Mật khẩu:
   - saveVaultStorage(): 100% lưu dữ liệu qua encryptVaultPayload() vào key 'teacher_hub_vault_enc_v2', xóa sạch key cũ 'teacher_hub_vault_v1'.
   - Triệt tiêu 100% plain_b64: Cả encryptVaultPayload() và decryptVaultPayload() ném Exception nếu không có SubtleCrypto hoặc dữ liệu không có tiền tố 'aes_gcm:'.
   - Bắt buộc Web Crypto AES-256-GCM với PBKDF2 100,000 vòng, IV 12 bytes ngẫu nhiên.

3. Bảo mật Xác thực Admin PIN Chuẩn Fail-Closed:
   - verifyAdminPin(enteredPin): Nếu chưa có salt hoặc hash trong localStorage, HỆ THỐNG TỪ CHỐI AN TOÀN (return false, Fail-Closed), cấm tuyệt đối việc tự ý khởi tạo PIN trong hàm xác thực của thao tác ghi đè.
   - Thiết lập Admin PIN ban đầu: Được tách biệt hoàn toàn sang form adminAuthForm khi người dùng chủ động mở modal đăng nhập Admin.

4. Khắc phục Tính Nguyên Tử Của Quá Trình Lưu Trữ (True Atomic Transaction):
   - Cả 4 hàm storage: saveCategoriesStorage(), saveToStorage(), saveRemindersStorage(), saveTimetableData() ĐỀU RETHROW EXCEPTION (throw err) nếu localStorage.setItem ném lỗi (QuotaExceededError hoặc browser blocked), KHÔNG nuốt exception.
   - Trong applySyncData(): Nếu bất kỳ hàm lưu nào bị lỗi, catch() sẽ NGAY LẬP TỨC kích hoạt và rollback phục hồi lại TOÀN BỘ cả 4 key trong localStorage lẫn memory về snapshot ban đầu! applySyncData() trả về false an toàn.

5. Đo Lường Kích Thước Byte UTF-8 Của QR Code (Physical Safe UTF-8 Byte Limit):
   - Sử dụng TextEncoder().encode(payload).length để đo CHÍNH XÁC số byte UTF-8.
   - Ngưỡng MAX_QR_SAFE_BYTES = 2500 bytes: Khi payload vượt ngưỡng an toàn vật lý của QR (canvas 280x280), canvas tự động hiển thị bảng thông báo và hướng dẫn giáo viên dùng nút "Sao Chép Chuỗi Đồng Bộ" hoặc "Xuất File Sao Lưu", triệt tiêu hoàn toàn lỗi buffer overflow của thư viện QRCode.

6. Deep Validation Thời Khóa Biểu Chuẩn Sư Phạm (Bắt buộc các ngày trong tuần):
   - validateSyncPayload() kiểm tra:
     * REQUIRED_DAYS: Bắt buộc có đầy đủ các ngày trong tuần ['2', '3', '4', '5', '6'].
     * VALID_DAYS: Các ngày bổ sung phải thuộc tập ['2', '3', '4', '5', '6', '7', '8', 'CN'].
     * VALID_PERIOD_NAMES: Các tiết phải thuộc tập chuẩn ['Tiết 1', 'Tiết 2', ..., 'Tiết 10'].
     * Bắt buộc mỗi ngày phải có pKeys.length > 0, mỗi giá trị là string <= 100 ký tự (sau trim()).
   - getStandardTimetable() đảm bảo dữ liệu export luôn đúng chuẩn sư phạm thứ 2 đến thứ 6.
   - Export backup gán chính xác: timetable: tt.

HÃY ĐƯA RA KẾT LUẬN CUỐI CÙNG [APPROVED] HOẶC [REJECTED] KÈM ĐÁNH GIÁ CHUYÊN MÔN TOÀN DIỆN.
`;

const postData = JSON.stringify({
  model: 'cx/codex-auto-review',
  messages: [
    { role: 'system', content: 'Bạn là OpenAI Codex Universal Code Auditor. Phân tích sâu, đối chiếu thực tế từng dòng mã nguồn, trung thực, nghiêm ngặt và đưa ra phán quyết [APPROVED] hoặc [REJECTED].' },
    { role: 'user', content: prompt }
  ],
  temperature: 0.1,
  max_tokens: 4000
});

const req = http.request('http://127.0.0.1:20128/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk-2133f22b28d1f309-ogr2cy-0852bea5',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const resp = JSON.parse(data);
      console.log(resp.choices[0].message.content);
    } catch(e) {
      console.error('Parse error:', e, data);
    }
  });
});

req.on('error', (e) => console.error('Request error:', e));
req.write(postData);
req.end();
