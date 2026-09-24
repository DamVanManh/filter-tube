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
- Mọi video phải qua bộ lọc: không phải nội dung trẻ em (madeForKids), phải là tiếng Việt
  (tiêu đề có chữ tiếng Việt và âm thanh không khai ngôn ngữ khác), dài >= ngưỡng phút,
  kênh không nằm trong danh sách chặn, tiêu đề/tên kênh không chứa từ cấm (giật tít, hù dọa
  sức khỏe, truyện AI, cờ bạc/bói toán, trò chơi trẻ em), tiêu đề không viết hoa quá nửa.
  Kênh lạ (từ chủ đề) thêm: đủ ngưỡng người đăng ký và tuổi kênh, và không thuộc danh mục
  Phim & Hoạt hình / Giải trí / Tin tức / Hài / Trò chơi / Trailer.
  Kênh tin cậy bỏ qua ngưỡng kênh và danh mục nhưng vẫn chịu các quy tắc nội dung.
- Tìm theo chủ đề luôn xếp theo "phổ biến"; khoảng thời gian luân phiên 1 năm / 2 tháng mỗi 6 giờ,
  kết quả cộng dồn (tối đa 150 video mỗi chủ đề) để mỗi lần tải có video mới.
- Bấm video: phát trong khung 16:9. Trình phát YouTube không nhận bất kỳ cú chạm nào — một lớp
  chắn phủ toàn khung; mọi điều khiển (phát/dừng, lùi/tới 10 giây, thanh tua) là nút của app.
  Khi tạm dừng hoặc phát xong, app che trình phát bằng lớp của mình. Phát xong: đếm ngược 8 giây
  rồi sang video kế trong feed.
- Nút lớn "Không xem kênh này nữa" trong màn phát ⇒ kênh vào danh sách chặn ngay.
- Không có đường nào rời app sang YouTube: lớp chắn chạm + tầng Android chặn mọi điều hướng
  và cửa sổ mới ra ngoài app (chỉ cho phép khung nhúng YouTube).
- Mạng lỗi lúc mở app: tự thử lại (3s, 10s, 30s); mở app từ nền cũng tự tải lại.
- Video đã xem được đẩy xuống cuối.
- Cài đặt (khóa PIN, tạo PIN lần đầu): kênh tin cậy (thêm bằng @handle hoặc link kênh), chủ đề,
  từ cấm, kênh chặn, ngưỡng lọc, xuất/nhập JSON sao lưu.
- Không đăng nhập Google. Không server. Dữ liệu nằm trên máy.

## Giới hạn
- Quota YouTube Data API 10.000 đơn vị/ngày; mỗi lượt tìm chủ đề 100 ⇒ cache chủ đề 6 giờ.
- Lọc tự động không đảm bảo 100%; nút chặn kênh là lưới cuối.
- App không ngăn mẹ mở app YouTube gốc — khuyến nghị tắt Lịch sử xem + ẩn app YouTube.
