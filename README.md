# Bidu Pink Schedule App

Một dự án HTML/CSS/JS tĩnh với 2 tab:
- Vòng quay may mắn
- Lịch đi bệnh viện

## Tính năng chính
- Giao diện màu hồng đẹp mắt
- Tab riêng cho lịch đi bệnh viện
- Hiển thị ngày, thứ, năm và địa điểm
- Label mặc định: `Đi bệnh viện`
- Dữ liệu lưu trong `localStorage` để có hiệu ứng "database" đơn giản trên frontend

## Chạy local

```bash
cd bidu
python3 -m http.server 8000
```

Mở trong trình duyệt:

```text
http://localhost:8000
```

## Deploy lên GitHub Pages

1. Push project lên GitHub.
2. Vào repository → Settings → Pages.
3. Chọn `Deploy from a branch`.
4. Chọn branch: `main` hoặc `master`.
5. Chọn folder: `/root`.
6. Save.

Link nhận được sẽ có dạng:

```text
https://<username>.github.io/<repo-name>/
```

> Đây là cách deploy cực đơn giản cho HTML/CSS/JS tĩnh.
