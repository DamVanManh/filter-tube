# App "YouTube" có lọc cho mẹ — đặc tả (2026-09-25, cập nhật 2026-09-26)

Tên hiển thị của app: **YouTube** (icon kiểu YouTube; app cá nhân, không phát hành).

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
- Tìm theo chủ đề luôn xếp theo "phổ biến"; khoảng thời gian luân phiên 1 năm / 30 ngày / 7 ngày mỗi 4 giờ,
  kết quả cộng dồn (tối đa 150 video mỗi chủ đề) để mỗi lần tải có video mới.
- Bấm video: phát trong khung 16:9. Trình phát YouTube không nhận bất kỳ cú chạm nào — một lớp
  chắn phủ toàn khung; mọi điều khiển (phát/dừng, lùi/tới 10 giây, thanh tua) là nút của app.
  Khi tạm dừng hoặc phát xong, app che trình phát bằng lớp của mình. Phát xong: đếm ngược 8 giây
  rồi sang video kế trong feed.
- Trang chủ có ô tìm kiếm; kết quả qua đúng bộ lọc như video chủ đề (kênh lạ). Kết quả mỗi từ khóa
  được giữ 6 giờ để tiết kiệm hạn mức. Nút ✕ quay lại các tab.
- Màn xem video: video ở trên; khối điều khiển gồm thanh tua, lùi/tới 10 giây, phát/dừng,
  "← Quay lại", "⛶ Toàn màn hình", và hai nút chọn nội dung bên dưới: "Bình luận" / "Video khác"
  (video khác = danh sách tab "Mới nhất"; bấm một video sẽ mở nó, Quay lại về video trước).
  Bên dưới: tiêu đề, thời gian đăng, nút "Xem kênh", rồi nội dung đang chọn. Cuộn (lên hay xuống
  đều vậy) thì phần nút điều khiển thu gọn, chỉ còn hai nút chọn nội dung; không cuộn nữa trong 1
  khoảng thời gian cài đặt (mặc định 30 giây, 0 = không tự mở), hoặc chạm vào video, thì phần nút mở rộng lại (chạm video lúc đang thu gọn chỉ mở rộng, không
  tạm dừng). Các nút chia cột theo độ rộng màn hình, chữ xuống dòng khi màn hình hẹp — không bao giờ
  tràn/cắt mép. Màn hình hẹp hơn 380px (hoặc cỡ chữ từ "Rất lớn") thì đầu trang chỉ hiện logo.
- Tạm dừng KHÔNG che video — khung hình đang dừng hiện rõ để đọc; chạm video để phát tiếp.
- Chữ không đủ chỗ (tên kênh, tiêu đề khi tắt "hiện đầy đủ", dòng kênh · thời gian, tên trong cài
  đặt…) KHÔNG bao giờ bị cắt bằng "…": luôn một dòng, và nếu dài hơn chỗ hiển thị thì chạy chữ liên tục,
  hai bản nối đuôi nhau, tốc độ chậm (chỉnh trong Cài đặt: Rất chậm/Chậm/Vừa/Nhanh). Chữ vừa chỗ thì
  đứng yên; chữ ở ngoài màn hình tạm ngừng chạy.
- Toàn màn hình, đang phát: chạm video để hiện/ẩn nút; nút tự ẩn sau N giây (mặc định 4, chỉnh trong
  Cài đặt). Bấm Dừng ⇒ ẩn TOÀN BỘ nút, chỉ còn khung hình đang dừng để đọc. Chạm video lúc đang dừng ⇒
  phát tiếp và hiện nút trong N giây rồi ẩn. Thanh nút
trong suốt (nền mờ dần, nút bán trong suốt) để vẫn nhìn thấy video phía sau; "Thu nhỏ"
  hoặc Back để thoát. Đang phát mà không chạm gì ⇒ tự vào toàn màn hình (mặc định 60 giây, chỉnh trong
  Cài đặt, 0 = tắt).
- Phụ đề (CC): mặc định TẮT; bật trong Cài đặt thì hiện phụ đề (ưu tiên tiếng Việt).
- Giao diện luôn tối, kể cả màn chờ lúc mở app và thanh trạng thái, bất kể điện thoại đặt sáng hay tối.
- Điều hướng tới lui giữ nguyên hành trình: mỗi màn (video, trang kênh) chồng lên màn trước;
  Quay lại / nút Back của Android lùi đúng một bước: về đúng video đang xem (phát tiếp từ chỗ đã
  dừng), đúng trang kênh (giữ vị trí cuộn), đúng kết quả tìm, đúng tab và vị trí cuộn trang chủ.
  "Video tiếp theo" tự phát sau khi hết video thì thay video hiện tại (không chồng thêm).
- Trang kênh: ảnh, tên, số người đăng ký, video của kênh (tải thêm từng trang) — vẫn qua bộ lọc
  (kênh bị chặn ⇒ không hiện video). Xem video từ trang kênh thì "video tiếp theo" lấy từ kênh đó.
- Bình luận: đọc không cần đăng nhập và không bao giờ hết hạn (xếp theo phổ biến, mở xem trả lời,
  tải thêm). Đăng nhập Google CHỈ làm được trong Cài đặt (sau mã PIN); màn xem video không có nút
  đăng nhập. Khi đã đăng nhập thì có ô viết bình luận và nút trả lời. Google (app ở chế độ Testing)
  bắt cấp lại quyền khoảng 7 ngày/lần: khi đó app KHÔNG tự hiện màn đăng nhập mà lặng lẽ đăng xuất —
  ô viết bình luận biến mất, đọc vẫn bình thường — cho tới khi người quản lý đăng nhập lại trong Cài
  đặt. Video xem trong app vẫn không ghi vào lịch sử YouTube. Video tắt bình luận ⇒ báo rõ.
- Chọn một chủ đề: sau 30 phút app tự quay về tab "Mới nhất".
- Giờ nghỉ (mặc định bật, 23:00 → 06:00, sửa trong cài đặt): báo trước 5 phút bằng thông báo nổi
  (kể cả khi đang xem video); tới giờ thì thoát toàn màn hình, dừng video, hiện màn "Đến giờ nghỉ rồi"
  với giờ mở lại. Tại màn khóa có "Mở khóa": nhập mã PIN rồi chọn mở 30 phút / 1 giờ / tới giờ mở
  buổi sáng (mở tạm thời được nhớ cả khi tắt app; sắp hết thì báo trước 5 phút rồi khóa lại). Chưa có
  PIN thì phải vào Cài đặt tạo PIN trước.
- Làm mới: tự tải lại mỗi 30 phút khi app mở, khi mở app lên từ nền; kênh tin cậy 1 giờ/lần, chủ đề
  4 giờ/lần, luân phiên khoảng tìm 1 năm / 30 ngày / 7 ngày để luôn có video mới.
- Không có đường nào rời app sang YouTube: lớp chắn chạm + tầng Android chặn mọi điều hướng
  và cửa sổ mới ra ngoài app (chỉ cho phép khung nhúng YouTube).
- Mạng lỗi lúc mở app: tự thử lại (3s, 10s, 30s); mở app từ nền cũng tự tải lại.
- Video đã xem được đẩy xuống cuối.
- Ảnh đại diện người bình luận: máy chủ ảnh YouTube hay từ chối khi tải nhiều ảnh cùng lúc ⇒ app
  tự thử lại; vẫn lỗi thì hiện vòng tròn chữ cái đầu tên.
- Từ cấm mới do app bổ sung ở các bản cập nhật được tự thêm vào danh sách đã lưu trên máy (không
  thêm lại từ người quản lý đã xóa sau lần cập nhật đó). So khớp coi "hoạ"/"họa", "thuỷ"/"thủy" là một.
- Cài đặt (khóa PIN, tạo PIN lần đầu): danh sách chủ đề và từ cấm nằm trong khung cuộn riêng (không
  chiếm cả trang); phát video (2 hẹn giờ + phụ đề); tài khoản Google (đăng nhập/đăng xuất), hiển thị (cỡ chữ và cỡ
  nút toàn app: Nhỏ/Vừa/Lớn/Rất lớn/Cực lớn — một thông số phóng cả chữ lẫn bố cục; bật/tắt hiện đầy
  đủ tiêu đề video thay vì cắt "…", khi bật các thẻ video cao thấp khác nhau), giờ nghỉ, kênh tin cậy
  (thêm bằng @handle hoặc link kênh), chủ đề (thêm, SỬA tên/từ khóa, xóa — sửa từ khóa thì video
  cũ của chủ đề bị bỏ và tải lại), từ cấm, chặn kênh bằng link/@handle, ngưỡng lọc, xuất/nhập JSON.
- Không server. Dữ liệu nằm trên máy.

## Giới hạn
- Quota YouTube Data API 10.000 đơn vị/ngày; mỗi lượt tìm chủ đề 100 ⇒ cache chủ đề 6 giờ.
- Lọc tự động không đảm bảo 100%; nút chặn kênh là lưới cuối.
- App không ngăn mẹ mở app YouTube gốc — khuyến nghị tắt Lịch sử xem + ẩn app YouTube.
