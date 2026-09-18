# CVA-SMARTGUARDIAN (HỆ THỐNG GIÁM SÁT THÔNG MINH & ĐỒNG HÀNH TỰ CHỦ SỐ)
**Dự án Nghiên cứu Khoa học Kỹ thuật dành cho Học sinh THCS**
*Lĩnh vực: Phần mềm hệ thống (Systems Software) & Công nghệ Giáo dục*

---

## 1. TÓM TẮT DỰ ÁN (ABSTRACT)
Trong bối cảnh chuyển đổi số giáo dục, việc học sinh THCS sở hữu điện thoại thông minh phục vụ học tập ngày càng phổ biến, kéo theo những thách thức nghiêm trọng về nguy cơ nghiện game, sa đà vào mạng xã hội và tiếp xúc với nội dung độc hại trên Internet.

Dự án **CVA-SmartGuardian** được nghiên cứu và phát triển nhằm cung cấp một giải pháp công nghệ toàn diện giúp Phụ huynh học sinh (PHHS) theo dõi, nắm bắt chi tiết và khách quan con mình đang sử dụng điện thoại để làm gì (thời lượng, phân loại ứng dụng, nội dung tìm kiếm, cảnh báo nguy cơ), dựa trên **sự đồng thuận hợp pháp và minh bạch giữa gia đình và học sinh**. 

Đồng thời, hệ thống ứng dụng **Tâm lý học hành vi (Thuyết cú hích - Nudge Theory)** và mô hình **"Thỏa ước số Gia đình" (Digital Contract)** nhằm giúp học sinh tự giác rèn luyện thói quen tự chủ, cân bằng giữa thời gian học tập và giải trí lành mạnh.

---

## 2. CẤU TRÚC THƯ MỤC DỰ ÁN

```
khkt-smart-guardian/
├── README.md                                # Tổng quan dự án và bản tóm tắt đề tài
├── docs/                                    # HỒ SƠ KHOA HỌC DỰ THI KHKT
│   ├── 01_DE_CUONG_NGHIEN_CUU_KHKT.md       # Đề cương NCKH 15 trang chuẩn Thông tư 06/2024/TT-BGDĐT
│   ├── 02_KIEN_TRUC_KY_THUAT_CHUYEN_SAU.md  # Đặc tả kỹ thuật 4 tầng (Native Agent, Local AI, Sync, Web UI)
│   ├── 03_SO_TAY_NGHIEN_CUU_LOGBOOK.md      # Khung nhật ký nghiên cứu thực nghiệm (Research Logbook)
│   └── 04_PHIEU_KHAO_SAT_THUC_NGHIEM.md     # Bộ công cụ khảo sát định lượng người dùng trước và sau
├── src/                                     # MÃ NGUỒN NGUYÊN MẪU (WORKING PROTOTYPE)
│   ├── core/                                # Module xử lý thuật toán & dữ liệu cốt lõi
│   │   ├── data-models.js                   # Định nghĩa cấu trúc dữ liệu chuẩn (Activity, Risk, Contract)
│   │   ├── app-classifier.js                # Bộ phân loại ứng dụng tự động (Game, MXH, Học tập)
│   │   ├── web-blocker.js                   # Bộ lọc web xấu và màn hình chặn vi phạm
│   │   └── local-nlp-analyzer.js            # Bộ lọc từ khóa nhạy cảm & an toàn mạng cục bộ
│   ├── parent-dashboard/                    # Giao diện Web PWA dành cho Phụ huynh theo dõi
│   │   ├── index.html                       # Bảng điều khiển thời gian thực, biểu đồ trực quan
│   │   ├── styles.css                       # Giao diện sư phạm hiện đại, chuẩn WCAG AAA
│   │   └── app.js                           # Xử lý sự kiện, đồng bộ dữ liệu và hiển thị cảnh báo
│   └── mock-agent/                          # Trình giả lập thiết bị học sinh phục vụ thử nghiệm
│       └── student-device-sim.js            # Phát sinh dữ liệu thực tế kiểm thử luồng đồng bộ
├── android-app/                             # ỨNG DỤNG NATIVE ANDROID CHUẨN CÔNG NGHIỆP
│   ├── app/src/main/java/                   # Toàn bộ mã nguồn Kotlin (Clean Architecture & Jetpack)
│   │   ├── data/ (AppClassifier, WebFilterList)
│   │   ├── service/ (UsageTracker, Accessibility, SafeVpn)
│   │   ├── receiver/ (DeviceAdmin, BootReceiver)
│   │   └── ui/ (MainActivity, BlockedActivity)
│   ├── app/src/main/res/                    # Giao diện XML Dark Mode chuẩn Material3
│   └── HUONG_DAN_DONG_GOI_APK_VA_LEN_STORE.md # Hướng dẫn xuất APK và lộ trình lên CH Play / App Store
└── test/                                    # KIỂM THỬ TỰ ĐỘNG & BẰNG CHỨNG THỰC NGHIỆM
    └── verify_pipeline.js                   # Kịch bản kiểm thử tự động toàn diện (Pass 100%)
```

---

## 3. CÁC TÍNH NĂNG ĐỘT PHÁ CỦA DỰ ÁN
1. **Theo dõi chính xác từng phút theo 4 nhóm hoạt động**: Học tập (K12Online, Azota, OLM), Chơi game (Liên Quân, Free Fire, Roblox), Mạng xã hội (TikTok, Facebook, YouTube) và Tiện ích khác.
2. **Cảnh báo ban đêm (Night-owl Alert)**: Tự động ghi nhận và cảnh báo nếu học sinh sử dụng máy sau 22h30 đêm gây hại sức khỏe.
3. **Bộ phân tích rủi ro cục bộ (Local AI NLP Engine)**: Phát hiện từ khóa tìm kiếm về bạo lực học đường, tự hại, cờ bạc trực tuyến mà không gửi nội dung nhạy cảm lên cloud.
4. **Cơ chế Thỏa ước số gia đình (Gamified Digital Contract)**: Đặt hạn mức thời gian chơi game; nếu đạt chỉ tiêu cả tuần sẽ được tích điểm rèn luyện.
5. **Cơ chế chống học sinh gỡ cài đặt (Anti-Tamper Device Admin)**: Chặn gỡ ứng dụng khi không có mật mã phụ huynh.

---

## 4. HƯỚNG DẪN CHẠY THỬ NGHIỆM NGUYÊN MẪU (PROTOTYPE)
1. Chạy trình giả lập thiết bị học sinh và mở Dashboard phụ huynh:
   ```bash
   cd "c:\Users\HPZBook\Desktop\PM ALL\khkt-smart-guardian"
   node test/verify_pipeline.js
   ```
2. Mở tệp `src/parent-dashboard/index.html` trên trình duyệt để trải nghiệm toàn bộ giao diện quản trị dành cho Phụ huynh.
