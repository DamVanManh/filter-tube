# Kênh của Mẹ

App Android xem YouTube không theo thuật toán đề xuất: video chỉ đến từ kênh tin cậy và chủ đề
do người quản lý đặt, qua bộ lọc nội dung. Đặc tả: `docs/spec.md`.

## Dựng APK
```bash
yarn install
export JAVA_HOME=$(/usr/libexec/java_home -v 21) ANDROID_HOME=$HOME/Library/Android/sdk
yarn apk          # → android/app/build/outputs/apk/release/app-release.apk
yarn test         # bộ lọc + feed
```
Cần `keystore.properties` + `momtube-release.jks` ở gốc repo (không commit). Mất keystore thì
phải tạo keystore mới VÀ cập nhật SHA-1 trong Google Cloud (project `kenh-cua-me`, API key
`kenh-cua-me-android`) + `src/environments/environment.ts`, nếu không app không tải được video.

## Google Cloud (project `kenh-cua-me`)
- API key `kenh-cua-me-android`: chỉ YouTube Data API v3, chỉ app `vn.kenhcuame.app` + SHA-1 keystore.
- OAuth (đăng nhập để bình luận): Android client cho `vn.kenhcuame.app` + cùng SHA-1, quyền
  `youtube.force-ssl`. Trạng thái **Testing** — chỉ tài khoản có trong *Audience → Test users*
  đăng nhập được, và Google bắt đăng nhập lại khoảng 7 ngày/lần. Lên Production cần trang chủ +
  chính sách quyền riêng tư trên tên miền đã xác minh.
