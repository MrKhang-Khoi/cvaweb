# BẢN ĐẶC TẢ TIÊU CHUẨN KỸ THUẬT & KIỂM ĐỊNH DỰ ÁN (SPEC.MD)
# DỰ ÁN: CỔNG WEBSITE GIÁO VIÊN & TIỆN ÍCH SƯ PHẠM (TEACHER HUB PWA)

## 1. TỔNG QUAN HỆ THỐNG & KIẾN TRÚC
- **Nền tảng**: Progressive Web App (PWA) Offline-First, chuẩn HTML5 / CSS3 / ES2022.
- **Mục tiêu**: Cổng truy cập 1 chạm dành cho giáo viên Việt Nam truy cập nhanh các hệ thống giáo dục (vnEdu, SMAS, CSDL ngành, Học liệu, Violet, Canva, Quizizz...), quản lý sổ tay tài khoản bảo mật, tạo mã QR thương hiệu sư phạm, và quản lý lời nhắc công việc.
- **Môi trường hoạt động**: Trình duyệt di động (iOS Safari, Android Chrome/Samsung Internet) và máy tính (Windows Edge, Chrome, Cốc Cốc, macOS).

---

## 2. TIÊU CHUẨN BẢO MẬT & MẬT MÃ HỌC (ZERO-BACKDOOR & ZERO-PLAINTEXT)
1. **Triệt tiêu cửa sau (Zero Hardcoded Backdoor)**:
   - Tuyệt đối KHÔNG hardcode bất kỳ mật khẩu nào (như `Cva@2025` hay `DEFAULT_ADMIN_PIN`).
   - Cấm cơ chế tự động reset mật khẩu admin khi phiên bản thay đổi làm ghi đè mật khẩu của người dùng.
2. **Mã hóa Sổ tay Mật khẩu (Encrypted Personal Vault)**:
   - Tài khoản & mật khẩu của giáo viên KHÔNG ĐƯỢC lưu ở dạng văn bản thô (Plaintext JSON) trong `localStorage`.
   - Bắt buộc mã hóa bằng **AES-GCM (256-bit)** với khóa dẫn xuất từ Master PIN qua **PBKDF2 (SHA-256, 100,000 vòng)**.
   - Mở Sổ tay tổng hợp bắt buộc phải xác thực Master PIN / Mật khẩu; cấm mở tự do không qua kiểm tra.
3. **Chống vét cạn (Rate-Limiting & Brute-force Protection)**:
   - Giới hạn 5 lần nhập sai mã PIN; sau 5 lần sai, khóa tạm thời 30 giây lưu trạng thái an toàn.
4. **Triệt tiêu lỗi XSS & DOM Injection**:
   - Nghiêm cấm dùng inline `onclick` chứa chuỗi dữ liệu nhạy cảm hoặc chuỗi người dùng nhập (`cred.password`, `linkId`).
   - Mọi dữ liệu hiển thị phải được escape an toàn và dùng Event Delegation qua `data-id` và `addEventListener`.

---

## 3. CHUẨN MỰC LẬP TRÌNH & ĐỘ TIN CẬY (ALIBABA OCR & V8 COMPLIANCE)
1. **Biến và Cú pháp**:
   - 0 biến chưa khai báo (`adminSalt`, `adminHash` phải được loại bỏ triệt để).
   - 0 so sánh lỏng `==` (chuyển 100% sang `===`).
   - 0 nuốt lỗi im lặng `catch(e) {}` (bắt buộc log hoặc thông báo toast rõ ràng).
2. **Quản lý Bộ nhớ & Hiệu năng Event Listeners**:
   - Sử dụng Event Delegation trên container thẻ thay vì gán lặp lại hàng trăm event listeners mỗi lần tìm kiếm hay render.
   - Tái sử dụng hoặc đóng an toàn `AudioContext` (`ctx.close()`) sau khi phát chuông báo, tránh lỗi giới hạn AudioContext của trình duyệt.
3. **Tính Năng Nhắc Việc & Chu kỳ Lặp (Recurring Reminders)**:
   - Xử lý hoàn chỉnh logic lặp (`daily`, `weekly`, `monthly`): khi hoàn thành hoặc đến hạn, tự động dời `dueDate` sang chu kỳ tiếp theo thay vì đóng băng vĩnh viễn.

---

## 4. TIÊU CHUẨN PWA & SERVICE WORKER OFFLINE-FIRST
1. **Service Worker Caching**:
   - Cài đặt bền bỉ (resilient caching): nếu một tài nguyên tùy chọn gặp sự cố, các tài nguyên cốt lõi vẫn được nạp thành công.
   - Hỗ trợ `ignoreSearch: true` khi `caches.match` để các URL có tham số truy vấn vẫn tải được từ cache offline.
   - Điều hướng ngoại mạng an toàn, không làm hỏng hiển thị ảnh khi mất mạng.

---

## 5. TÍNH NĂNG MỞ RỘNG TRIỂN KHAI THỰC TẾ TRƯỜNG HỌC
1. **Thời khóa biểu & Lịch tiết học sư phạm**: Hiển thị tiết học hiện tại (Tiết 1 - 5 sáng, Tiết 1 - 5 chiều) và đếm ngược vào lớp/ra chơi.
2. **Tiện ích Lớp học Tương tác**:
   - Vòng quay may mắn / Bốc thăm ngẫu nhiên học sinh phát biểu.
   - Đồng hồ đếm ngược làm bài / thi đua nhóm.
3. **Đồng bộ Đám mây Cá nhân (Cloud Backup)**: Cho phép giáo viên sao lưu mã hóa vào Google Drive / OneDrive hoặc sao lưu file bảo vệ bằng mật khẩu.
4. **Xuất thẻ QR Học liệu & Bảng dán lớp**: Xuất hàng loạt thẻ QR cho học sinh quét nộp bài tập, tài liệu học tập.

---

## 6. QUY CHUẨN CẬP NHẬT ỨNG DỤNG & ĐỒNG BỘ ĐA THIẾT BỊ (UPDATE & SYNC LIFECYCLE)
1. **Quy trình Cập nhật PWA An toàn (Zero-Data-Loss PWA Update)**:
   - Nghiêm cấm cưỡng chế tự động reload trang (`window.location.reload()`) khi chưa có sự đồng ý của người dùng, tránh làm mất dữ liệu giáo viên đang nhập dở.
   - Bắt buộc kiểm tra `reg.waiting` ngay khi khởi tạo và lắng nghe `reg.onupdatefound` -> `installingWorker.onstatechange === 'installed'`.
   - Hiển thị banner cập nhật (`pwaUpdateBanner`) không che khuất thanh điều hướng di động, kèm 2 tùy chọn: "🚀 Cập Nhật Ngay" và "✕ Để sau".
   - Kích hoạt `skipWaiting` an toàn và đồng bộ tải lại qua sự kiện `navigator.serviceWorker.controllerchange` với cờ chặn `isRefreshing` chống reload lặp vô hạn.
   - Nút "🔄 Kiểm Tra Cập Nhật" (`btnCheckAppUpdateNow`) phải kích hoạt `reg.update()`, phản hồi trạng thái mạng và phiên bản tức thì.
2. **Đồng bộ Đầy đủ Dữ liệu giữa Điện thoại & Máy tính (Multi-Device Full Sync)**:
   - Dữ liệu đồng bộ (QR Sync và Backup JSON) phải có `schemaVersion: 2` và chứa toàn bộ: `categories`, `links`, `reminders`, và `timetable: teacherTimetableData`.
   - **Xác thực Bảo mật Admin PIN**: Mọi thao tác ghi đè dữ liệu (`btnImportFullBackup` và `btnApplySyncCode`) đều bắt buộc phải xác thực Master PIN / Admin PIN (`verifyAdminPin`) nếu chưa đăng nhập.
   - **Thẩm định Sâu Cấu Trúc (Deep Payload Validation)**: `validateSyncPayload()` bắt buộc duyệt kiểm tra từng phần tử:
     - `categories`: Mảng các danh mục có `id` và `label` hợp lệ (chuỗi không rỗng).
     - `links`: Mảng các website có `id`, `title`, và `url` bắt đầu bằng `http://` hoặc `https://`.
     - `reminders`: Mảng các lời nhắc có `id` hợp lệ.
     - `timetable`: Đối tượng thời khóa biểu sư phạm chuẩn.
   - **Giới Hạn Kích Thước An Toàn (Payload Rate & Size Limiting)**: Chuỗi mã đồng bộ tối đa 500KB (`<= 500,000` ký tự), file sao lưu tải lên tối đa 2MB (`file.size <= 2,000,000` bytes).
   - **Khôi phục Nguyên tử Bản sao Sâu (Atomic Deep-Clone Rollback)**: `applySyncData()` phải snapshot toàn bộ 4 mảng/đối tượng bằng deep clone (`JSON.parse(JSON.stringify(...))`) trước khi ghi, và rollback deep clone nếu có bất kỳ ngoại lệ nào xảy ra trong quá trình ghi.
   - Sau khi áp dụng dữ liệu đồng bộ thành công, bắt buộc gọi `refreshAllAfterSync()` để re-render toàn diện giao diện:
     - Giao diện danh bạ và tabs (`renderCategoryTabs`, `renderItems`).
     - Thời khóa biểu và huy hiệu tiết học (`renderTimetableDay`, `updatePedagogicalBellBadge`).
     - Thanh điều hướng đáy màn hình điện thoại di động (`syncBottomDock`).
     - Huy hiệu và danh sách lời nhắc (`updateReminderBadge`, `renderReminderList`).
     - Đồng hồ và lời chào (`updateClockAndGreeting`).

