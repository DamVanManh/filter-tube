# Kênh của Mẹ — đặc tả (2026-09-25)

## Vấn đề
Mẹ xem YouTube, thuật toán đề xuất dựa trên lịch sử kéo mẹ vào các kênh không tốt.
Đăng nhập trong WebView bị Google chặn; API không trả feed trang chủ ⇒ app KHÔNG dùng
đề xuất của YouTube, tự dựng feed và chỉ dùng YouTube làm trình phát.

## Hành vi
- Mẹ mở app: thấy lưới video chữ to. Tab "Mới nhất" (gộp tất cả), "Kênh quen", và một tab mỗi chủ đề.
- Nguồn video duy nhất:
  1. Kênh tin cậy — video mới đăng của các kênh do người quản lý thêm.
  2. Chủ đề — tìm theo từ khóa (safeSearch nghiêm, vùng VN, tiếng Việt, chỉ video nhúng được).
- Mọi video phải qua bộ lọc: không phải nội dung trẻ em (madeForKids), dài >= ngưỡng phút,
  kênh không nằm trong blacklist/danh sách chặn, tiêu đề/tên kênh không chứa từ cấm,
  tiêu đề không viết hoa quá nửa, kênh lạ (từ chủ đề) phải đủ ngưỡng người đăng ký và tuổi kênh.
  Kênh tin cậy bỏ qua ngưỡng người đăng ký/tuổi kênh nhưng vẫn chịu từ cấm & madeForKids.
- Bấm video: phát toàn màn hình. Khi tạm dừng hoặc phát xong, app che trình phát bằng lớp của
  mình (không để lộ "video gợi ý" của YouTube). Phát xong: đếm ngược rồi sang video kế trong feed.
- Nút lớn "Không xem kênh này nữa" trong màn phát ⇒ kênh vào danh sách chặn ngay.
- Không có đường nào rời app sang YouTube (logo, tiêu đề trong trình phát bị chặn).
- Video đã xem được đẩy xuống cuối.
- Cài đặt (khóa PIN, tạo PIN lần đầu): kênh tin cậy (thêm bằng @handle hoặc link kênh), chủ đề,
  từ cấm, kênh chặn, ngưỡng lọc, xuất/nhập JSON sao lưu.
- Không đăng nhập Google. Không server. Dữ liệu nằm trên máy.

## Giới hạn
- Quota YouTube Data API 10.000 đơn vị/ngày; mỗi lượt tìm chủ đề 100 ⇒ cache chủ đề 6 giờ.
- Lọc tự động không đảm bảo 100%; nút chặn kênh là lưới cuối.
- App không ngăn mẹ mở app YouTube gốc — khuyến nghị tắt Lịch sử xem + ẩn app YouTube.
