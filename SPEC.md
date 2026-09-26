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
3. **Chống vét cạn & Điều phối Đồng thời (Concurrent Rate-Limiting & 2PC WAL Invariant)**:
   - Giới hạn 5 lần nhập sai mã PIN; sau 5 lần sai, khóa tạm thời 30 giây lưu trạng thái an toàn.
   - **Độc quyền Web Locks (Transactional Mutex)**: Mọi thao tác đọc-sửa-ghi-xóa trạng thái xác thực (`teacher_hub_auth_fails`, `teacher_hub_lock_until`) bắt buộc phải thực thi qua `executeWithCrossTabLock("cva_storage_exclusive_lock", ...)` để loại trừ 100% hiện tượng xung đột đua lệnh (Race Condition) giữa các tab.
   - **Fencing Token & Generation CAS**: Xác thực `lock.revoked === false` và thế hệ fencing `cva_fencing_generation` trước và sau mỗi lần ghi/xóa. Nghiêm cấm Stale Writer ghi đè hoặc khôi phục trạng thái xác thực.
   - **Ghi nhật ký trước (2PC WAL Staging) & Cấu trúc Bắt buộc**:
      - Cấu trúc `cva_auth_staging` bắt buộc gồm:
        - `stage`: `"auth_lockout" | "auth_failure_increment" | "reset_auth_failures"`
        - `fails`: Số nguyên an toàn nguyên thủy bắt buộc (`typeof fails === "number"` và `Number.isSafeInteger(fails)`). Nghiêm cấm chuỗi số như `"0"` hay `"5"`. Với `auth_lockout` bắt buộc `fails === MAX_AUTH_FAILS`; với `auth_failure_increment` bắt buộc `1 <= fails < MAX_AUTH_FAILS`; với `reset_auth_failures` bắt buộc `fails === 0`.
        - `isLockout`: Kiểu boolean nguyên thủy bắt buộc (`typeof isLockout === "boolean"`). Nghiêm cấm chuỗi `"true"`/`"false"`. Bắt buộc `true` khi `stage === "auth_lockout"`; bắt buộc `false` khi `stage === "auth_failure_increment"` hoặc `"reset_auth_failures"`.
        - `lockUntil`: Số nguyên an toàn nguyên thủy bắt buộc (`typeof lockUntil === "number"` và `Number.isSafeInteger(lockUntil)`). Nghiêm cấm chuỗi số như `"0"` hay `"5000"`. Bắt buộc `lockUntil > 0` khi `stage === "auth_lockout"`; bắt buộc số `0` nguyên thủy khi `stage === "auth_failure_increment"` hoặc `"reset_auth_failures"`.
        - `generation` & `token`: Metadata định danh thế hệ khóa độc quyền (`typeof generation === "number" && Number.isSafeInteger(generation) && generation > 0`, `typeof token === "string" && token.length > 0`).
    - **Kiểm định Bất biến Tính nhất quán & Fail-Closed (Anti-Corruption Fail-Closed Invariant)**:
      - `checkRateLimit()`, `checkRateLimitUnlocked()` và Phase 1 Pre-Validation / Phase 2 Execution của `recoverStagingTransaction()` bắt buộc áp dụng cùng bộ chuẩn kiểm định `validateAuthStagingPayload()`, đối chiếu tuyệt đối tính nhất quán kiểu dữ liệu và giá trị giữa `stage`, `isLockout`, `fails` và `lockUntil`. Nghiêm cấm mọi hình thức ép kiểu ngầm bằng `Number(...)` che giấu chuỗi sai kiểu.
      - Nếu phát hiện bất kỳ sự mâu thuẫn hoặc sai lệch kiểu nào (ví dụ: `stage: "auth_lockout"` nhưng `isLockout: false` hoặc `lockUntil: 0`; `stage: "auth_failure_increment"` nhưng `isLockout: true`; hoặc `lockUntil` là chuỗi `"0"`, `"5000"`, `""`, `"NaN"`): Hệ thống kích hoạt Fail-Closed toàn cục ngay lập tức: bảo lưu 100% staging record trong WAL, ghi nhận cờ lỗi chẩn đoán `cva_auth_error`, TUYỆT ĐỐI KHÔNG commit hay ghi đè vào các khóa đích (`teacher_hub_auth_fails`, `teacher_hub_lock_until`), và KHÔNG dọn dẹp staging dở dang.
   - **Tự động phục hồi khi đột tử (Crash Recovery)**: `recoverStagingTransaction()` tự động phát hiện `cva_auth_staging` hợp lệ bị bỏ lại do crash trình duyệt và hoàn tất hoặc dọn sạch an toàn theo trạng thái khóa sau khi vượt qua 100% Phase 1 Pre-Validation.
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

---

## 7. KIẾN TRÚC LƯU TRỮ LOCAL-FIRST, ĐỒNG BỘ ĐA TAB & PHỤC HỒI NGUYÊN TỬ (2PC WAL & CONCURRENCY)
1. **Kiến trúc Master Manifest & Bản chiếu Tương thích (Master Manifest & Projections)**:
   - Dữ liệu trung tâm hệ thống được lưu trữ trong một bản ghi hợp nhất duy nhất (`teacher_hub_store_v2`) bao gồm: `version`, `generation`, `token`, `categories`, `links`, `reminders`, `timetable`, `checksum`, và `time`.
   - Các bản chiếu phụ (`teacher_hub_categories_v1`, `teacher_hub_links_v2`, `teacher_hub_reminders_v1`, `teacher_hub_timetable_v1`) đóng vai trò là projection tương thích ngược cho các thành phần UI đọc nhanh.
   - Khi có sự sai lệch hoặc nâng cấp dữ liệu, Master Manifest luôn là chân lý tối thượng (Single Source of Truth). Hàm `validateAndGetUnifiedStore()` chịu trách nhiệm kiểm định tính toàn vẹn cấu trúc và checksum, đồng bộ an toàn các projections theo Master Manifest.
2. **Kiểm Soát Đồng Thời Đa Tab Bằng Web Locks API (Cross-Tab Concurrency Control)**:
   - Mọi thao tác ghi dữ liệu, chỉnh sửa, xóa, hoặc cập nhật hệ thống (`performAtomicSystemMigration`, `saveToStorage`, `saveCategoriesStorage`, `saveVaultStorage`, `delItem`, `applySyncCode`) đều bắt buộc phải được điều phối độc quyền qua `executeWithCrossTabLock` sử dụng **Web Locks API (`navigator.locks.request("cva_storage_exclusive_lock", { mode: "exclusive" })`)**.
   - **Nguyên tắc Fail-Closed khi thiếu Web Locks API**: Trên các trình duyệt cũ không hỗ trợ Web Locks API (trước iOS 15.4), hệ thống tự động kích hoạt Chế độ Chỉ Đọc (Read-Only Mode) và hiển thị thông báo Degraded Storage Banner để bảo vệ dữ liệu giáo viên khỏi nguy cơ bị ghi đè chéo (split-brain).
3. **Giao dịch Nguyên tử Hai Pha (Two-Phase Commit - 2PC) & Ghi Nhật Ký Trước (WAL)**:
   - Mọi thao tác migration hoặc sync dữ liệu đều qua 2 giai đoạn:
     - **Phase 1 (Prepared)**: Lưu trạng thái snapshot ban đầu và dữ liệu dự kiến vào khóa staging (`cva_migration_staging`, `cva_sync_staging`, `cva_vault_staging`) kèm `status: "prepared"`, `fencingGeneration`, `token`, và `checksum`.
     - **Phase 2 (Committed)**: Ghi Master Manifest, cập nhật version marker và projections, sau đó chuyển staging sang `status: "committed"` và dọn sạch staging.
   - **Tự Động Phục Hồi Khi Đột Tử (Crash Recovery Invariant)**:
     - Khi ứng dụng khởi động lại, `recoverStagingTransaction()` tự động quét các bản ghi staging dở dang.
     - Nếu staging ở trạng thái `prepared`: Hệ thống tự động rollback toàn bộ dữ liệu về snapshot cũ trước khi xảy ra sự cố, dọn sạch staging.
     - Nếu staging ở trạng thái `committed`: Hệ thống tự động roll-forward hoàn tất việc ghi các bản chiếu và version, dọn sạch staging.
     - Nếu staging bị hỏng hoặc checksum không khớp: Hệ thống kích hoạt Fail-Closed, bảo lưu staging để chẩn đoán và đánh dấu cờ lỗi bền vững (`cva_migration_error`, `cva_sync_error`, `cva_vault_error`).
4. **Kiểm Định Toàn Vẹn Bằng Checksum (Accidental Corruption Detection)**:
   - Hàm `computeTxChecksum()` sử dụng SHA-256 nội dung để phát hiện các lỗi cắt cụt chuỗi JSON do trình duyệt bị kill giữa chừng hoặc hỏng hóc đĩa cục bộ.
   - Checksum là cơ chế CAS/Integrity Guard cục bộ của ứng dụng, đảm bảo Master Manifest chỉ được chấp nhận khi toàn bộ các trường dữ liệu khớp chính xác với checksum lúc commit.
6. **Quy Chuẩn Phòng Thủ Nghiêm Ngặt Sau Kiểm Định Toàn Cầu (Strict Hardened Invariants)**:
   - **Triệt tiêu Fallback Không Khóa (Zero Non-Lock Fallback)**: `executeWithCrossTabLock` từ chối mọi fallback không an toàn khi thiếu Web Locks API. Mọi môi trường không có `navigator.locks.request` bắt buộc phải kích hoạt Chế độ Chỉ Đọc (Fail-Closed) và ném lỗi `StorageLockUnavailable`.
   - **Triệt tiêu Hoàn toàn Non-Lock Fallback Khi Dọn Staging (Zero Non-Lock Staging Cleanup)**: Trong `performAtomicSystemMigration` và `performAtomicSystemRestore`, tuyệt đối cấm gọi raw `localStorage.removeItem(MIGRATION_STAGING_KEY)` trong các khối fallback cleanup hoặc rollback. Mọi thao tác xóa staging bắt buộc phải qua `fencedRemoveItem(MIGRATION_STAGING_KEY)` với xác thực fencing token/generation trước và sau khi xóa (kèm read-after-delete verification). Nếu fencing bị vi phạm hoặc lock bị mất giữa chừng, staging bắt buộc được bảo lưu 100% trên storage để phục vụ crash recovery chẩn đoán, đồng thời đánh dấu cờ lỗi `cva_migration_error` / `cva_restore_error` (Fail-Closed).
   - **Quy Trình Phục Hồi Hai Pha Thuần RAM (Two-Phase In-Memory Staging Recovery)**:
     - **Phase 1 (Pure Read Snapshot & In-Memory Pre-Validation)**: Quét và thẩm định toàn bộ staging records (`cva_vault_staging`, `cva_store_staging`, `cva_sync_staging`, `cva_migration_staging`) trong RAM với 0 storage writes. Kiểm tra nghiêm ngặt 5 trường tiên quyết (`status` thuộc `prepared|committed`, `token` hợp lệ, `fencingGeneration` số nguyên dương, `version` hợp lệ, `checksum` khớp 100% với `computeTxChecksum()`). Nếu bất kỳ staging nào bị hỏng hoặc corrupt: toàn bộ quá trình recovery lập tức bị hủy bỏ an toàn (Fail-Closed toàn cục), ghi nhận cờ lỗi tương ứng, bảo lưu 100% staging records để phục vụ chẩn đoán, và TUYỆT ĐỐI KHÔNG roll-forward hay rollback bất kỳ transaction nào khác để chống trộn lẫn dữ liệu.
     - **Phase 2 (Atomic Execution from RAM)**: Tiêu thụ trực tiếp các đối tượng snapshot đã được tiền kiểm định trong RAM (`preValVault`, `preValStore`, `preValSync`, `preValMigration`), tuyệt đối không đọc lại hay phân tích cú pháp từ `localStorage` để loại trừ hoàn toàn TOCTOU race conditions.
   - **Đồng Nhất Lược Đồ Sync Hai Chiều (Bidirectional Sync Schema Consistency)**: `getSyncPayload()` và `validateSyncPayload()` đồng bộ 100% các trường cấp cao nhất (`app`, `sync`, `schemaVersion`, `version`, `v`, `exportedAt`, `categories`, `links`, `reminders`, `timetable`). Mọi bản sao lưu do ứng dụng xuất ra đều được xác thực thành công bởi chính nó.
   - **Đồng Bộ Hoàn Toàn 4 Bản Chiếu Khi Khôi Phục Mặc Định (Atomic System Restore 4-Projection Invariant)**: `performAtomicSystemRestore()` bắt buộc snapshot, ghi và read-after-write verify đồng thời toàn bộ 4 bản chiếu thứ cấp (`teacher_hub_categories_v1`, `teacher_hub_links_v2`, `teacher_hub_reminders_v1`, `teacher_hub_timetable_v1`), Master Manifest `teacher_hub_store_v2`, và `teacher_hub_data_version`. Nếu xảy ra lỗi hoặc vi phạm fencing, rollback khôi phục nguyên tử toàn vẹn cả 4 projections và Master Manifest về snapshot cũ để chống split-brain.
   - **Vòng Đời Bảo Mật Sổ Tay Không Văn Bản Thô (Lifecycle Zero Plaintext Vault Invariant)**:
     - Trong `saveVaultStorageUnlocked`: Dữ liệu được mã hóa AES-GCM 256-bit vào `teacher_hub_vault_envelope_v1` và `teacher_hub_vault_enc_v2`, sử dụng `safeFencedRemove("teacher_hub_vault_v1")` và xác minh `localStorage.getItem("teacher_hub_vault_v1") === null` trước khi commit.
     - Trong `loadLinksFromStorage`: Ngay khi khởi động ứng dụng, tự động kiểm tra `teacher_hub_vault_v1`. Nếu đã tồn tại bản mã hóa (`teacher_hub_vault_envelope_v1` hoặc `teacher_hub_vault_enc_v2`), bản văn bản thô cũ sẽ lập tức bị xóa bỏ an toàn. Nếu chưa có bản mã hóa (giáo viên chưa thiết lập Master PIN), hệ thống kích hoạt Chế Độ An Toàn (Degraded Mode) với cảnh báo yêu cầu đặt PIN, bảo toàn 100% dữ liệu mật khẩu cũ và tuyệt đối không xóa dữ liệu của giáo viên.
   - **Xác Thực Khóa Fencing Toàn Diện Trong Reconcile Projections (Reconciliation Lock Guard)**:
     - `reconcileProjectionsFromManifest(manifest, lockCtx)` yêu cầu bắt buộc phải có `lockCtx` hợp lệ với đầy đủ `token`, số nguyên dương `generation`, và hàm `verifyFencing()`.
     - Tuyệt đối cấm fallback ghi đè không khóa hoặc bỏ qua xác thực. Nếu `lockCtx` rỗng `{}` hoặc thiếu fencing metadata, thao tác reconcile lập tức bị từ chối an toàn (0 writes).
     - Hàm kiểm tra tính nhất quán giữa `lockCtx` và storage fencing markers (`cva_fencing_generation`, `cva_fencing_token`), loại trừ hoàn toàn nguy cơ ghi đè lạc hậu.
   - **Kiểm Soát Quyền Sở Hữu & Thế Hệ Staging (Staging Ownership & Generation Guard)**:
     - Trong Phase 1 của `recoverStagingTransaction()`: Mọi staging records (`cva_migration_staging`, `cva_store_staging`, `cva_sync_staging`, `cva_vault_staging`) đều được đối chiếu thế hệ với `myRecoveryGen`.
     - Nếu `stagingGen > myRecoveryGen`: Phát hiện staging thuộc thế hệ tương lai $\rightarrow$ Kích hoạt Fail-Closed (`*_future_generation`), dừng recovery, bảo lưu staging phục vụ chẩn đoán.
     - Nếu `stagingGen < myRecoveryGen && stagingToken !== myRecoveryToken`:
       - Nếu staging ở trạng thái `committed` nhưng version lưu trữ đã bị đổi khác $\rightarrow$ Kích hoạt CAS conflict mismatch (`*_committed_cas_conflict`, Fail-Closed), cấm ghi đè để bảo vệ dữ liệu mới.
       - Phải chứng minh được một giao dịch mới hơn đã commit hoàn tất (qua `initialStoreParsed && generation > stagingGen && version >= stagingVersion` hoặc `initialVersion === stagingVersion`).
       - Nếu KHÔNG chứng minh được commit mới $\rightarrow$ Kích hoạt Fail-Closed (`*_unverified_superseded_staging`), dừng recovery, bảo lưu staging.
       - Nếu ĐÃ chứng minh được commit mới $\rightarrow$ Đánh dấu `_supersededAndCommitted = true`. Ở Phase 2, dọn sạch staging cũ an toàn mà không chạm vào Master Manifest hay projections.
    - **Thu Hồi Quyền Ghi Khi Hết Hạn Khóa & Fencing Revocation (Stale Lock Context & Fencing Revocation Invariant)**:
      - Trong `executeWithCrossTabLock`, `lockCtx` được khởi tạo với `lockCtx.revoked = false`.
      - Trong khối `finally` của `executeWithCrossTabLock`, hệ thống bắt buộc đánh dấu `lockCtx.revoked = true` để vô hiệu hóa ngay lập tức mọi tác vụ async bị trễ (FileReader, SubtleCrypto, timer) đang giữ tham chiếu tới `lockCtx`.
      - Mọi hàm ghi dữ liệu (`updateUnifiedStoreUnlocked`, `saveVaultStorageUnlocked`, `applySyncData`, `performAtomicSystemMigration`, `performAtomicSystemRestore`, `recoverStagingTransaction`, `reconcileProjectionsFromManifest`) bắt buộc kiểm tra `activeLockCtx.revoked === true` và sự tồn tại của `cva_migration_lock` trong storage với token/generation khớp 100%. Nếu `revoked === true` hoặc lock marker bị thiếu/sai lệch, toàn bộ thao tác ghi lập tức bị từ chối an toàn (Fail-Closed, 0 storage writes, ném lỗi `StorageLockUnavailable` hoặc `FencingViolation`).
      - Cấm hoàn toàn cơ chế bypass `if (!curLock) return curGen === mySyncGen` trong `applySyncData` khi thiếu lock marker; nếu lock marker bị mất, `verifySyncFencing` bắt buộc trả về `false`.
    - **Dọn Dẹp Staging Hàng Loạt Sau Khi Hoàn Tất Toàn Bộ Ghi (Batch Staging Cleanup Invariant)**:
      - Trong Phase 2 của `recoverStagingTransaction()`: Các bước phục hồi (2.1 Vault, 2.2 Store, 2.3 Sync, 2.4 Migration) TUYỆT ĐỐI KHÔNG xóa staging dở dang theo từng phần (no incremental staging deletion).
      - Tất cả các thao tác xóa staging records (`cva_vault_staging`, `cva_store_staging`, `cva_sync_staging`, `cva_migration_staging`) được hoãn lại (deferred) và chỉ được thực thi đồng loạt tại Bước 2.5 (Batch Staging Cleanup) sau khi TẤT CẢ các bản chiếu, Master Manifest và version markers của các transaction đã hoàn tất xác thực read-after-write.
      - Nếu bất kỳ bước ghi nào gặp sự cố (quota exceeded, đĩa lỗi, mất lock), toàn bộ các bản ghi staging trong WAL vẫn được bảo lưu 100% nguyên vẹn để phục hồi trong lần khởi động tiếp theo, ngăn chặn triệt để mất mát dữ liệu dở dang.
    - **Đồng Hồ Sư Phạm Thời Gian Thực & Đếm Ngược Tiết Học Chuẩn Xác Tới Từng Giây (Real-Time Pedagogical Clock & Countdown Invariant)**:
      - Hàm `getCurrentBellStatus(customDate = null)` tính toán thời gian dựa trên tổng số giây trong ngày (`currentSeconds = h * 3600 + m * 60 + s`), đảm bảo độ phân giải chính xác tới từng giây.
      - Thời gian còn lại được tính toán chuẩn xác `remainSecTotal = eSec - currentSeconds` và số phút còn lại được làm tròn lên qua `Math.ceil(remainSecTotal / 60)`. Tại biên chuyển giao (ví dụ `08:34:59` của Tiết 2), đồng hồ hiển thị "Còn 1p" và ngay tại `08:35:00` lập tức chuyển đổi mượt mà sang "Giờ Ra Chơi Sáng".
      - Chu kỳ cập nhật `updateClockAndGreeting` được thiết lập ở tần suất 1000ms (1 giây), kết hợp các bộ lắng nghe sự kiện `visibilitychange` (`!document.hidden`) và `window.focus` để cập nhật đồng hồ và huy hiệu tiết học tức thì ngay khi người dùng chuyển lại tab hoặc mở lại màn hình điện thoại từ chế độ tiết kiệm pin / background throttling.
    - **Tiêu chuẩn Checksum NIST FIPS 180-4 SHA-256 Chuẩn Quốc Tế (NIST FIPS 180-4 Standard SHA-256 Invariant)**:
      - Thay thế hoàn toàn thuật toán tạo số nguyên tố động tùy tiện bằng 8 hằng số băm khởi tạo chuẩn NIST (`H_INIT`: `0x6a09e667`, `0xbb67ae85`, `0x3c6ef372`, `0xa54ff53a`, `0x510e527f`, `0x9b05688c`, `0x1f83d9ab`, `0x5be0cd19`) và 64 hằng số vòng lặp `K_CONSTS` chuẩn NIST FIPS 180-4.
      - Bắt buộc kiểm định với NIST official test vectors:
        - Chuỗi rỗng `""` -> `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
        - Chuỗi `"abc"` -> `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`
      - Đảm bảo tính xác định, chuẩn xác tuyệt đối và tương thích xuyên nền tảng cho `computeRawSha256()` và `computeTxChecksum()`.
    - **Phục Hồi Đột Tử Hàng Loạt Tất-Cả-Hoặc-Không Nguyên Tử (Multi-Staging All-or-Nothing Atomic Recovery Invariant)**:
      - Khi có nhiều bản ghi staging cùng tồn tại trong WAL (`cva_vault_staging`, `cva_store_staging`, `cva_sync_staging`, `cva_migration_staging`), toàn bộ Phase 2 được bảo vệ bởi cơ chế All-or-Nothing.
      - Trước khi thực thi Phase 2, hệ thống chụp snapshot toàn bộ trạng thái storage trước phục hồi (`prePhase2Snapshot` lưu giá trị raw của `teacher_hub_vault_envelope_v1`, `teacher_hub_vault_enc_v2`, `teacher_hub_vault_v1`, `teacher_hub_store_v2`, các projections `teacher_hub_categories_v1`, `teacher_hub_links_v2`, `teacher_hub_reminders_v1`, `teacher_hub_timetable_v1`, `teacher_hub_data_version`, v.v.).
      - Nếu BẤT KỲ bước phục hồi nào (Vault 2.1, Store 2.2, Sync 2.3, Migration 2.4, hoặc Dọn dẹp 2.5) ném ra ngoại lệ hoặc thất bại, hàm `rollbackAllToPrePhase2()` lập tức được kích hoạt để khôi phục toàn bộ các khóa storage về đúng trạng thái snapshot trước Phase 2. Tuyệt đối KHÔNG để lại trạng thái phục hồi dở dang (partial recovery state).
    - **Chuẩn Hóa & Nhất Quán Lược Đồ Danh Mục (Schema Category Normalization & Consistency Invariant)**:
      - Sự bất đối xứng giữa bộ thẩm định dữ liệu đồng bộ và bộ thẩm định Master Manifest được triệt tiêu hoàn toàn.
      - Trong `validateAndGetUnifiedStore()`, danh mục của link được chấp nhận khi `(!l.category || (typeof l.category === "string" && l.category.length <= 64))`.
      - Trong `applySyncData()`, mọi link nhập vào nếu thiếu trường `category` hoặc chuỗi rỗng sẽ được tự động chuẩn hóa về danh mục mặc định: `(typeof l.category === "string" && l.category.trim() !== "") ? l.category.trim() : "all"`.
      - Đảm bảo 100% dữ liệu đồng bộ hợp lệ sau khi nạp đều vượt qua kiểm định tính toàn vẹn của Master Manifest mà không bị từ chối.
    - **Kiểm Định Đọc-Sau-Ghi & Đọc-Sau-Xóa Đóng-An-Toàn Của Fencing Marker (Fail-Closed Fencing Read-After-Write & Read-After-Delete Invariant)**:
      - Trong `executeWithCrossTabLock()`, khi thiết lập các fencing markers (`cva_fencing_generation`, `cva_fencing_token`, `cva_migration_lock`), hệ thống thực thi kiểm tra Đọc-Sau-Ghi (Read-After-Write) tức thì cho cả 3 khóa. Nếu bất kỳ khóa nào ghi không thành công hoặc bị sai lệch giá trị, hệ thống lập tức hủy bỏ giao dịch (Fail-Closed, 0 callback execution).
      - Trong khối `finally` khi giải phóng khóa, sau khi kiểm tra quyền sở hữu fencing và gọi `safeFencedRemove("cva_migration_lock")`, hệ thống thực hiện kiểm tra Đọc-Sau-Xóa (Read-After-Delete) để đảm bảo `localStorage.getItem("cva_migration_lock") === null`. Nếu còn sót lại, cờ lỗi `cva_migration_lock_cleanup_failed` được ghi nhận để ngăn chặn tình trạng lock treo (stale lock).
    - **Bảo Tồn Bản Rõ Sổ Tay Khi Ghi Lỗi (Legacy Plaintext Vault Preservation Invariant)**:
      - Trong `saveVaultStorageUnlocked()`, bản rõ cũ `teacher_hub_vault_v1` được chụp lại trong snapshot `vaultStaging.previous.legacyPlaintext`.
      - Thao tác xóa bản rõ `safeFencedRemove("teacher_hub_vault_v1")` được hoãn lại (deferred) và chỉ được thực hiện SAU KHI bản mã hóa mới đã được ghi thành công và `vaultStaging.status = "committed"` đã được xác thực Read-After-Write.
      - Nếu xảy ra lỗi trước khi commit hoặc trong quá trình recovery rollback, bản rõ `teacher_hub_vault_v1` được phục hồi nguyên vẹn 100%, bảo vệ an toàn tuyệt đối dữ liệu tài khoản của giáo viên.
    - **Điều Phối Viên Đơn Giao Dịch Chống Ghi Đè Đệ Quy & Fail-Closed Fencing Invariant (Single Transaction Coordinator & Fail-Closed Fencing Invariant)**:
      - Toàn bộ các kiểm tra an toàn số (Web Locks context `!activeLockCtx || activeLockCtx.revoked`, kiểm tra fencing `verifyFencing()`, sự tồn tại và khớp 100% của `cva_migration_lock`, `cva_fencing_token`, `cva_fencing_generation`) BẮT BUỘC phải được thực thi TRƯỚC KHI kiểm tra cờ điều phối `isSyncTransactionActive`.
      - Khi `isSyncTransactionActive === true`, hàm `updateUnifiedStoreUnlocked()` từ chối ghi đè re-entrant và trả về `false` (tuyệt đối KHÔNG trả về `true` giả mạo thành công), đảm bảo 0 storage writes và không tạo trạng thái thành công ảo cho caller.
      - Mọi lệnh gọi tới `updateUnifiedStoreUnlocked()` khi `lockCtx.revoked === true` hoặc marker fencing bị mất/sai lệch ĐỀU PHẢI NÉM NGOẠI LỆ Fail-Closed (`StorageLockUnavailable` hoặc `FencingViolation`), bất kể cờ `isSyncTransactionActive` mang giá trị gì.
    - **Dọn Dẹp Khóa An Toàn Có Fencing Tuyệt Đối (Zero Non-Lock Cleanup & Fencing-Safe Cleanup Invariant)**:
      - Toàn bộ thao tác xóa khóa phân tán `cva_migration_lock` trong khối `finally` của `executeWithCrossTabLock` bắt buộc phải được đóng gói qua `safeFencedRemoveLock("cva_migration_lock", token, generation, lockCtx)` TRƯỚC KHI đánh dấu `lockCtx.revoked = true`.
      - Cơ chế kiểm soát 4 tầng nghiêm ngặt trước và sau khi xóa:
        1. Kiểm tra `lockCtx && !lockCtx.revoked`: Ngăn chặn dọn dẹp khi ngữ cảnh đã bị thu hồi.
        2. Kiểm tra Fencing Token & Generation: `curGen === expectedGen` và `curTok === expectedToken`.
        3. Chứng minh Quyền Sở Hữu Marker (Ownership Proof): Phân tích cú pháp JSON `cva_migration_lock`, bắt buộc `p.token === expectedToken` và `Number(p.generation) === expectedGen`.
        4. Kiểm Định Đọc-Sau-Xóa & Chống Đua Lệnh (Read-After-Delete & Post-Delete Double Check): Xác nhận `localStorage.getItem(key) === null`, đồng thời kiểm tra lại thế hệ `postGen === expectedGen && postTok === expectedToken` để ngăn chặn TOCTOU race condition.
      - Nếu bất kỳ tầng nào vi phạm (ví dụ: Tab B cướp quyền và tăng thế hệ trước `finally` của Tab A), Tab A TUYỆT ĐỐI KHÔNG ĐƯỢC XÓA marker của Tab B, bảo lưu 100% marker và ghi nhận cờ lỗi `cva_migration_lock_cleanup_failed`.
      - Cấm triệt để mọi lời gọi thô `localStorage.removeItem()` không được bọc bảo vệ fencing trong toàn bộ vòng đời lưu trữ (lock, recovery, migration, restore, sync, vault).
    - **Triệt Tiêu Xóa Thô Toàn Cục & Primitive Đọc-Sau-Xóa Duy Nhất (Universal Zero Raw RemoveItem & safeStorageRemove Invariant)**:
      - Loại bỏ 100% các lệnh gọi thô `localStorage.removeItem(key)` trên toàn bộ codebase (bao gồm cả authentication failures lockout, categories, vault, unified store, sync, migration, restore, và lock release).
      - Mọi thao tác xóa khóa lưu trữ bắt buộc phải thông qua primitive duy nhất `safeStorageRemove(key)` với cơ chế xác thực Đọc-Sau-Xóa (Read-After-Delete verification). Nếu sau khi xóa mà `localStorage.getItem(key) !== null`, hàm lập tức ném ngoại lệ `ReadAfterDeleteFailure on <key>` (Fail-Closed).
    - **Khôi Phục Marker Fencing Khi Thất Bại & Cờ Báo Hỏng Fencing (Fencing Marker Rollback & Anti-Partial-Acquisition Invariant)**:
      - Trong `executeWithCrossTabLock()`, trước khi ghi 3 marker fencing (`cva_fencing_generation`, `cva_fencing_token`, `cva_migration_lock`), hệ thống snapshot trạng thái marker cũ vào RAM (`prevGenRaw`, `prevTokRaw`, `prevLockRaw`).
      - Nếu bất kỳ marker nào thất bại trong quá trình ghi (ví dụ ghi generation thành công nhưng token hoặc lock thất bại do lỗi bộ nhớ/quota), khối `catch` lập tức kích hoạt cơ chế rollback khôi phục cả 3 marker về đúng trạng thái ban đầu bằng `safeStorageRemove` / `localStorage.setItem`.
      - Nếu quá trình rollback marker cũng thất bại, hệ thống đánh dấu cờ lỗi bền vững `cva_fencing_corrupt`.
      - Trong Phase 1 của `recoverStagingTransaction()`: Hệ thống kiểm tra cờ `cva_fencing_corrupt`. Nếu phát hiện, lập tức kích hoạt Fail-Closed, từ chối recovery để chống lại sự bất nhất quán của fencing markers.
    - **Snapshot Đầy Đủ Trước Phase 2 & Dừng Khẩn Cấp Khi Rollback Lỗi (Comprehensive Pre-Phase-2 Snapshot & Immediate Rollback-Stop Invariant)**:
      - Bản sao lưu `prePhase2Snapshot` trong `recoverStagingTransaction()` được mở rộng toàn diện bao gồm đủ 23 khóa:
        1. Dữ liệu Master Manifest & Phiên bản: `teacher_hub_store_v2`, `teacher_hub_data_version` (2 khóa).
        2. Bản chiếu phân mảnh (Projections): `teacher_hub_categories_v1`, `teacher_hub_links_v2`, `teacher_hub_reminders_v1`, `teacher_hub_timetable_v1` (4 khóa).
        3. Khóa Sổ tay bảo mật (Vault): `teacher_hub_vault_envelope_v1`, `teacher_hub_vault_salt`, `teacher_hub_vault_enc_v2`, `teacher_hub_vault_v1` (4 khóa).
        4. Khóa giao dịch phân kỳ (Staging): `cva_migration_staging`, `cva_sync_staging`, `cva_vault_staging`, `cva_store_staging` (4 khóa).
        5. Cờ lỗi chẩn đoán (Error Flags): `cva_migration_error`, `cva_sync_error`, `cva_vault_error`, `cva_store_error`, `cva_fencing_corrupt`, `cva_recovery_rollback_error` (6 khóa).
        6. Điểm mốc Fencing (Fencing Markers): `cva_migration_lock`, `cva_fencing_token`, `cva_fencing_generation` (3 khóa, được phục hồi ở cuối chuỗi).
      - Thứ tự phục hồi nghiêm ngặt trong `rollbackAllToPrePhase2()`: Dữ liệu -> Bản chiếu -> Sổ tay -> Staging -> Cờ lỗi được phục hồi trước (dưới sự bảo vệ của `verifyRecoveryLock()` cả trước và sau thao tác), sau đó các mốc fencing mới được phục hồi ở bước cuối cùng.
      - Nếu xảy ra bất kỳ lỗi ngoại lệ nào trên bất kỳ khóa nào, hệ thống lập tức ngắt vòng lặp (`break`) và DỪNG NGAY LẬP TỨC (Fail-Closed Immediate Stop), tuyệt đối không tiếp tục ghi đè các khóa tiếp theo để chống chắp vá dữ liệu dở dang (partial recovery).
      - Đồng thời, chỉ ghi nhận cờ lỗi `cva_recovery_rollback_error` và cờ lỗi Phase 2 (`recErr.errorKey`) khi `verifyRecoveryLock()` xác nhận khóa recovery vẫn còn nguyên vẹn quyền sở hữu độc quyền.
    - **Kiểm Định Khóa Đọc-Sau-Xóa & Chống Đua Lệnh Sau Khi Xóa (Post-Delete Fencing Double-Check & Zero Swallowed Catches Invariant)**:
      - Trong `safeFencedRemoveLock()`, ngay sau khi xóa khóa `safeStorageRemove(key)` và vượt qua xác thực Đọc-Sau-Xóa (`localStorage.getItem(key) === null`), hệ thống tiếp tục tái thẩm định tức thì: `postDelGen === expectedGen && postDelTok === expectedToken && postDelLock === null`.
      - Nếu phát hiện bất kỳ sự can thiệp xen giữa nào của Tab khác (ví dụ Tab B cướp quyền hoặc tăng generation ngay sau lệnh xóa), hệ thống ghi nhận cờ lỗi chẩn đoán `cva_migration_lock_cleanup_failed` với lý do `PostDeleteFencingDoubleCheckFailed` và trả về `false`.
      - Triệt tiêu 100% các khối `catch(e) { /* ignore */ }` nuốt lỗi trong quá trình dọn khóa: Mọi lỗi ngoại lệ khi ghi cờ chẩn đoán đều được báo động qua `console.error`, đồng thời kích hoạt trạng thái lưu trữ suy thoái an toàn (`isStorageDegraded = true`) và hiển thị thông báo Fail-Closed cho người dùng.
    - **Điều Phối Viên Đơn Giao Dịch Xác Thực & Khóa Độc Quyền Xuyên Tab (Single-Transaction Authentication Coordinator & Exclusive Lock Invariant)**:
      - Hàm `verifyAdminPin(enteredPin, lockCtx = null)` vận hành dưới cơ chế Điều Phối Viên Đơn Giao Dịch (Single-Transaction Coordinator) đóng gói trọn vẹn toàn bộ chu trình xác thực: kiểm tra rate-limit -> đọc salt & hash -> băm mật mã SHA-256 NIST -> đối chiếu hash -> ghi nhận thất bại (`recordAuthFailure`) hoặc thiết lập lại (`resetAuthFailures`) bên trong DUY NHẤT MỘT KHÓA ĐỘC QUYỀN `executeWithCrossTabLock`.
      - Triệt tiêu hoàn toàn race condition cửa sổ thời gian (time window) giữa bước kiểm tra rate-limit và bước ghi nhận thất bại khi nhiều tab cùng nhập sai mật khẩu đồng thời.
      - Phân tách tường minh `checkRateLimitUnlocked(ctx)` cho các tác vụ đang giữ khóa độc quyền, và `checkRateLimit(lockCtx = null)` cho các tác vụ kiểm tra độc lập.
    - **Phục Hồi Sự Cố Xác Thực 2PC WAL Trong recoverStagingTransaction (Auth Staging 2PC WAL Crash Recovery Invariant)**:
      - Bản ghi staging xác thực `cva_auth_staging` được tích hợp đầy đủ vào cỗ máy phục hồi sự cố `recoverStagingTransaction()` với quy trình 2PC WAL chuẩn mực:
        1. Phase 1 (Pure Read Pre-Validation): Thẩm định toàn diện cấu trúc payload, tính hợp lệ của thế hệ fencing (`authGen <= myRecoveryGen`), các trường bắt buộc (`stage`, `fails`, `generation`, `token`), và tính toàn vẹn của `lockUntil` khi ở stage `auth_lockout`. Nếu phát hiện biến dạng hoặc cắt cụt -> Kích hoạt Fail-Closed (`cva_auth_error`), dừng recovery, bảo lưu staging.
        2. Phase 2 (Atomic Execution): Roll-forward trạng thái xác thực từ RAM:
           - `auth_lockout`: Ghi `teacher_hub_auth_fails` và `teacher_hub_lock_until` với kiểm định Đọc-Sau-Ghi.
           - `auth_failure_increment`: Ghi `teacher_hub_auth_fails` với kiểm định Đọc-Sau-Ghi.
           - `reset_auth_failures`: Xóa sạch `teacher_hub_auth_fails` và `teacher_hub_lock_until` với kiểm định Đọc-Sau-Xóa.
        3. Phase 2.5/2.6 (Batch Cleanup): Dọn sạch `cva_auth_staging` và `cva_auth_error` bằng `safeRemoveAndVerify` sau khi toàn bộ chuỗi recovery hoàn tất 100%.
      - Snapshot trước Phase 2 (`prePhase2Snapshot`) được bổ sung 4 khóa xác thực: `teacher_hub_auth_fails`, `teacher_hub_lock_until`, `cva_auth_staging`, `cva_auth_error` để rollback nguyên tử (All-or-Nothing) nếu có sự cố.
    - **Ngăn Chặn Xác Thực Khi Staging Chưa Khôi Phục (No Lingering Unrecovered Auth Staging Invariant)**:
      - Trong `checkRateLimitUnlocked(ctx)`, nếu phát hiện `cva_auth_staging` còn tồn tại trong storage, hàm lập tức kích hoạt `recoverStagingTransaction(ctx)` dưới Web Locks context để hoàn tất roll-forward.
      - Tuyệt đối cấm trả về `true` cho bất kỳ nỗ lực xác thực nào nếu `cva_auth_staging` chưa được giải quyết hoặc cờ lỗi `cva_auth_error` đang tồn tại (Fail-Closed).
    - **Kiểm Định Toàn Vẹn Khóa Lưu Trữ Xác Thực & Triệt Tiêu Ép Kiểu Ngầm (Strict Auth Storage Validation & Zero Implicit Coercion Invariant)**:
      - Loại bỏ 100% việc ép kiểu ngầm `Number(rawFails)` và `Number(lockUntilRaw)` trong toàn bộ chuỗi xác thực (`checkRateLimit`, `checkRateLimitUnlocked`, `recordAuthFailure`, `recoverStagingTransaction`).
      - Thiết lập bộ thẩm định thống nhất duy nhất `validateStoredAuthState(storage)` kiểm soát cấu trúc và mối quan hệ trạng thái của các khóa đích:
        1. **Trạng thái Clean (0 lần sai):** Cả `teacher_hub_auth_fails` và `teacher_hub_lock_until` BẮT BUỘC PHẢI LÀ `null` (không được lưu dạng chuỗi "0").
        2. **Trạng thái Increment (1 <= fails < 5):** `teacher_hub_auth_fails` là chuỗi chữ số nguyên từ 1 đến 4 (`/^\d+$/`). `teacher_hub_lock_until` BẮT BUỘC PHẢI LÀ `null`.
        3. **Trạng thái Lockout (fails === 5):** `teacher_hub_auth_fails` bắt buộc là chuỗi "5". `teacher_hub_lock_until` BẮT BUỘC tồn tại, là chuỗi chữ số nguyên mili-giây hợp lệ `>= 1,000,000,000,000` (triệt tiêu hoàn toàn "0", "5000", số âm, chuỗi rỗng "").
      - Mọi giá trị biến dạng hoặc sai lệch mối quan hệ trạng thái (`fails = "0"`, `fails = "5"` mà thiếu `lock_until`, `lock_until = "0"`, `lock_until = "5000"`, `lock_until = ""`, `lock_until = "NaN"`, `lock_until` cô lập không có `fails`) BẮT BUỘC kích hoạt Fail-Closed: từ chối xác thực, ghi nhận cờ lỗi `cva_auth_error`, chuyển sang Degraded Mode và ném ngoại lệ `AuthFailuresCorrupted` nếu đang trong giao dịch ghi.
      - **Kiểm định Storage Đích trong Crash Recovery Phase 1 (Pre-validation of Stored Auth State)**: Trong Phase 1 của `recoverStagingTransaction`, trước khi bước vào Phase 2, bắt buộc kiểm tra tính toàn vẹn của trạng thái lưu trữ hiện tại bằng `validateStoredAuthState(localStorage)`. Nếu trạng thái lưu trữ bị hỏng hoặc biến dạng, Phase 1 kích hoạt Fail-Closed (`stage: "auth_crash_recovery_corrupted_stored_auth"`), ghi nhận cờ lỗi `cva_auth_error`, bảo lưu WAL `cva_auth_staging` nguyên vẹn để phục vụ chẩn đoán sự cố, và triệt để ngăn chặn Phase 2 thực hiện bất kỳ thao tác ghi đè hoặc xóa bỏ nào trên nền trạng thái storage bị biến dạng.
      - **Triệt Tiêu Hoàn Toàn Fail-Open Khi Dọn Dẹp Expired Lockout (Zero Fail-Open on Expired Lockout Cleanup)**: Trong `checkRateLimitUnlocked(ctx)`, khi thời hạn lockout đã hết hạn, thao tác dọn dẹp `teacher_hub_auth_fails` và `teacher_hub_lock_until` bắt buộc được bảo vệ bởi `verifyAuthFencing(ctx)`. Nếu fencing context bị mất, bị thay thế hoặc quá trình dọn dẹp bằng `safeFencedRemoveAuth` gặp bất kỳ lỗi nào, hàm BẮT BUỘC ném ngoại lệ `FencingViolation`, tuyệt đối KHÔNG được nuốt lỗi và KHÔNG được trả về `true` (triệt tiêu toàn diện nguy cơ bypass xác thực).
      - **Rollback All-or-Nothing Trong Giao Dịch Xác Thực (All-or-Nothing Auth Transaction Rollback)**: Trong `recordAuthFailure()` và `resetAuthFailures()`, nếu quá trình rollback snapshot gặp sự cố đĩa/quota hoặc mất fencing context, hệ thống lập tức kích hoạt Degraded Mode, bảo lưu WAL `cva_auth_staging` nguyên vẹn để phục vụ recovery, ghi nhận cờ lỗi `cva_auth_error` (nếu còn fencing) và ném ngoại lệ `AuthRollbackFailed`. Tuyệt đối cấm nuốt lỗi rollback hay để caller tiếp tục như một lỗi nghiệp vụ thông thường.
      - **Ghi Nhận Chẩn Đoán Xác Thực Có Fencing Độc Quyền (Fenced Auth Diagnostic Writes)**: Mọi thao tác ghi cờ lỗi `cva_auth_error` trong chuỗi xác thực bắt buộc phải đi qua primitive `safeFencedSetAuth` kèm kiểm định Đọc-Sau-Ghi và CAS ownership token. Nghiêm cấm tuyệt đối mọi thao tác ghi raw qua `localStorage.setItem("cva_auth_error", ...)`.
      - **Bảo Vệ Fencing Marker Trong Phục Hồi Sự Cố (Recovery Fencing Ownership Invariant)**: Trong `rollbackAllToPrePhase2()`, toàn bộ các khóa dữ liệu và cờ lỗi bắt buộc được khôi phục thông qua `safeSetAndVerify` / `safeRemoveAndVerify` với CAS ownership proof hai đầu. Khóa phân tán và marker fencing của recovery context đang hoạt động (`MIGRATION_LOCK_KEY`, `cva_fencing_token`, `FENCING_GEN_KEY`) được bảo tồn xuyên suốt phiên điều phối, tuyệt đối cấm dùng raw `localStorage.setItem` ghi đè marker cũ để triệt tiêu hoàn toàn hiểm họa split-brain cross-tab.
      - **Xác Minh Đầy Đủ Marker Sở Hữu Khóa Trong verifyAuthFencing (Full Ownership Marker Verification Invariant)**:
        - `verifyAuthFencing(ctx)` TUYỆT ĐỐI KHÔNG được coi việc `cva_migration_lock !== null` là bằng chứng sở hữu khóa.
        - Hàm BẮT BUỘC phải phân tích cú pháp JSON của `cva_migration_lock` và xác minh đầy đủ:
          1. `parsedLock && typeof parsedLock === "object" && !Array.isArray(parsedLock)`
          2. `parsedLock.token === ctx.token`
          3. `typeof parsedLock.generation === "number" && Number.isSafeInteger(parsedLock.generation) && parsedLock.generation === Number(ctx.generation)`
          4. `Number(localStorage.getItem("cva_fencing_generation")) === Number(ctx.generation)` và `localStorage.getItem("cva_fencing_token") === ctx.token`
        - Nếu marker bị thay thế bởi tab khác (dù generation/token lưu trữ chưa kịp cập nhật), bị hỏng cú pháp JSON, hoặc thiếu các trường bắt buộc, hàm BẮT BUỘC trả về `false`.
        - Mọi thao tác ghi/xóa trạng thái xác thực (`safeFencedSetAuth`, `safeFencedRemoveAuth`, `recordAuthFailure`, `resetAuthFailures`, dọn dẹp expired lockout) khi phát hiện marker ownership mismatch BẮT BUỘC bị chặn đứng ngay lập tức với ngoại lệ `FencingViolation`, triệt tiêu hoàn toàn hiểm họa Stale Writer hoặc Split-Brain giữa các tab.

---

## 8. KIẾN TRÚC ĐỒNG BỘ ĐÁM MÂY THỜI GIAN THỰC & SMART MERGE ENGINE TOÀN TRƯỜNG (CLOUD SYNC ARCHITECTURE)
1. **Hạ Tầng Cloud Không Phụ Thuộc Thư Viện Nặng (Pure REST Zero-SDK Architecture)**:
   - Sử dụng HTTPS REST API trực tiếp tới Firebase Realtime Database (`https://cva-smartguardian-default-rtdb.asia-southeast1.firebasedatabase.app/teacher_portal`).
   - Không nhúng Firebase JS SDK cồng kềnh, tiết kiệm băng thông và tài nguyên CPU của máy trường học.
   - Hoạt động 100% qua chuẩn W3C `fetch()` hiện đại với cơ chế CORS mở sẵn sàng.
2. **Kiến Trúc Hai Endpoint Tối Ưu Lưu Lượng Mạng (Two-Tier Lightweight Polling)**:
   - `/teacher_portal/version.json`: Chứa `version` và `updatedAt` (~50 bytes). Các máy client chỉ fetch endpoint này để kiểm tra xem có bản cập nhật mới không (<100ms, không tốn data).
   - `/teacher_portal/system_config.json`: Chứa toàn bộ cấu hình chuẩn (`links` và `categories`). Client chỉ tải tệp này KHI VÀ CHỈ KHI `version.json` có `updatedAt` mới hơn mốc đồng bộ cục bộ (`teacher_hub_cloud_synced_at`).
3. **Phân Quyền Phát Hành Toàn Trường (Admin Role Enforcement)**:
   - Chỉ người dùng đã đăng nhập Quản trị viên (`isAdminLoggedIn === true`) mới có quyền gọi `syncAdminChangesToCloud()`.
   - Hệ thống tự động đẩy dữ liệu lên đám mây khi Admin:
     + Thêm hoặc cập nhật liên kết trong `sheetForm`.
     + Xóa website trong `delItem`.
     + Thêm, sửa, xóa hoặc sắp xếp lại danh mục trong `categoryModal`.
     + Chủ động bấm nút "☁️ Đẩy Dữ Liệu Lên Đám Mây Toàn Trường" trong menu sao lưu/đồng bộ.
   - Cung cấp nút "👑 Xuất Cấu Hình Đưa Lên GitHub (Admin)" định dạng sẵn mã nguồn JavaScript sạch để Admin có thể nạp thẳng vào repository GitHub chính thức.
4. **Động Cơ Trộn Thông Minh Bảo Toàn Dữ Liệu Giáo Viên (Smart Cloud Merge Engine)**:
   - **Liên kết hệ thống**: Cập nhật đè URL, Tiêu đề, Mô tả, Màu sắc, Icon, Chuyên mục theo cấu hình mới nhất từ Ban Giám Hiệu.
   - **Liên kết mới**: Bổ sung tự động vào danh sách của máy giáo viên.
   - **Bảo toàn dữ liệu cá nhân 100%**:
     + Mọi website do Thầy/Cô tự thêm (có ID cá nhân) được bảo tồn nguyên vẹn 100%, không bao giờ bị xóa.
     + Trạng thái yêu thích (`isFavorite`), số lượt mở, ghi chú cá nhân của từng giáo viên được giữ nguyên vẹn.
     + Các danh mục tùy biến do giáo viên tự tạo được bảo tồn 100%.
   - **Kiểm soát đồng thời**: Mọi thay đổi từ Smart Merge đều được thực thi trong Web Locks API qua `updateUnifiedStoreUnlocked()` và ghi dấu mốc `teacher_hub_cloud_synced_at`.
5. **Chế Độ Tự Động Kích Hoạt & Ngoại Tuyến Kiên Cường (Resilient Offline-First Lifecycle)**:
   - Sau khi khởi động ứng dụng (1.5s), nếu có kết nối mạng và không chạy trên `file:///`, app tự động kiểm tra bản mới trong nền mà không làm gián đoạn trải nghiệm của giáo viên.
   - Khi thiết bị kết nối lại WiFi/Internet (sự kiện `window.online`), app tự động kích hoạt kiểm tra đám mây.
   - Nếu mất mạng hoặc mở file cục bộ (`file:///`), ứng dụng vận hành 100% từ `localStorage` ngoại tuyến, không ném lỗi kết nối mạng.




