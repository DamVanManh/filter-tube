# Plan — shipped 2026-09-25
- [x] Types + bộ lọc thuần + unit test (Jest)
- [x] YouTube API client (CapacitorHttp, header Android key) + dựng feed + cache
- [x] Store cài đặt (Preferences) + mặc định
- [x] UI: lưới feed, tab, trình phát có lớp che, nút chặn kênh
- [x] UI: cài đặt có PIN
- [x] Google Console: project kenh-cua-me + API key (chỉ YouTube Data API v3, chỉ vn.kenhcuame.app + SHA-1 keystore)
- [x] Capacitor Android + chặn điều hướng ra ngoài (NavigationGuardPlugin)
- [x] Build APK + chạy máy ảo qua mọi màn
- [x] Đo bộ lọc trên dữ liệu thật; vá: tiếng Việt, danh mục, từ cấm truyện AI / hù dọa sức khỏe

## Gate log
| gate | kết quả |
|---|---|
| jest | 41/41 xanh |
| ng build | xanh |
| gradle assembleRelease | xanh |
| đột biến: bỏ quy tắc tiếng Việt | 1 test đỏ ⇒ test có tác dụng |
| đột biến: bỏ NavigationGuardPlugin | location.href=youtube.com ⇒ app YouTube bật lên; có plugin ⇒ app ở lại |
| elementFromPoint trên logo/ảnh gợi ý/link/tiêu đề/avatar | cả 5 là lớp chắn của app |
| API key không header Android | 403 forbidden; có header ⇒ 200 |
| dữ liệu thật, 5 chủ đề × 40 | giữ 77/200 (cửa sổ 1 năm) |
