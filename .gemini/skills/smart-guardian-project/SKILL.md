---
name: smart-guardian-project
description: Quy chuẩn kỹ thuật và quy tắc cứng bắt buộc cho dự án Smart Guardian (Android Native & Web Portal). Bắt buộc tuân thủ quy trình phê duyệt bản vẽ 2D từ người dùng trước khi code và thiết kế bất biến chống học sinh can thiệp tắt quyền.
---

# Quy Chuẩn Kỹ Thuật Dự Án Smart Guardian (Android & Web)

## 1. QUY TẮC CỨNG TỐI CAO: CHỐT CHẶN PHÍM SỐ 1 (NUMBER '1' STRICT GATEKEEPER)
- **CƠ CHẾ KHÓA CỨNG BẬC CAO NHẤT (ZERO-BYPASS MANDATE)**:
  - Sau khi vẽ xong Bản phác thảo 2D hoặc trình bày giải pháp, AI BẮT BUỘC DỪNG LẠI và hỏi ý kiến người dùng.
  - **CHỈ KHI NGƯỜI DÙNG NHẬP DUY NHẤT SỐ `1` THÌ MỚI ĐƯỢC PHÉP BẮT ĐẦU VIẾT CODE.**
  - **MỌI PHẢN HỒI KHÁC HOẶC TỰ ĐỘNG CỦA HỆ THỐNG (SYSTEM AUTO-MESSAGE) ĐỀU VÔ HIỆU: CẤM TUYỆT ĐỐI GÕ CODE.**
  - Bất kể là câu hỏi, góp ý, lời khen, chỉnh sửa hay tín hiệu hệ thống nào khác số `1`, AI TUYỆT ĐỐI KHÔNG ĐƯỢC VIẾT BẤT KỲ DÒNG CODE NÀO (kể cả XML, HTML, CSS, JS, Kotlin).
  - Nếu vi phạm gõ code khi chưa nhận được phím `1` từ người dùng -> ĐÂY LÀ LỖI KỶ LUẬT NGHIÊM TRỌNG NHẤT.

---

## 2. QUY CHUẨN BẢO MẬT & BẤT BIẾN: CẤM HỌC SINH THAY ĐỔI QUYỀN (TAMPER-PROOF & READ-ONLY)
- **Bắt buộc Read-Only trên máy Học sinh**:
  - 4 trạng thái hệ thống: `Quyền Trợ Năng`, `Lọc Web Độc Hại`, `Đồng Bộ Thời Gian Thực`, `Pin Thiết Bị`.
  - Toàn bộ 4 thẻ này trên giao diện học sinh là **BẤT BIẾN (CHỈ ĐỌC / READ-ONLY)**.
  - Phải có huy hiệu/icon khóa `🔒 Giám Sát Bởi Phụ Huynh (Enforced by Parent)`.
  - CẤM đặt Switch/Toggle có thể gạt tắt được trên màn hình học sinh. Nếu học sinh bấm vào, chỉ hiển thị thông báo "Trạng thái được quản lý bởi Phụ huynh. Cần mã PIN Phụ huynh để thay đổi".
  - Nếu học sinh có thể tự tắt hoặc thay đổi được trạng thái này trên giao diện -> **ỨNG DỤNG BỊ ĐÁNH GIÁ KHÔNG ĐẠT YÊU CẦU**.

---

## 3. QUY CHUẨN GIAO DIỆN TINH GỌN (COMPACT & ERGONOMIC UI)
- **Màn hình Học sinh (Student Companion)**:
  - **BỎ dòng "Xin chào Liam Chen • Lớp 9B"**: Không hiển thị thông tin rườm rà này, tránh lãng phí diện tích hiển thị.
  - **Thẻ Khiên Bảo Vệ**: Thiết kế nhỏ gọn, tinh tế dạng viên nhộng hoặc thẻ kính mờ nhỏ (chiếm < 20% chiều cao màn hình).
  - Không gian còn lại dành cho hiển thị trực quan trạng thái kết nối và lưới an toàn.
- **Màn hình Phụ huynh (Parent Hub)**:
  - **Thẻ Mã Gia Đình Vàng Kim**: Thiết kế dạng Compact Card thanh thoát, tỷ lệ vàng cân đối, không được quá to làm thô giao diện, nút Sao Chép và Đổi Mã hài hòa với tổng thể.
