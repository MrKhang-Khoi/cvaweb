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
