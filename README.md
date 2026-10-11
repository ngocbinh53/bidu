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
- Trang `/food` tải danh sách món ăn sáng và tối từ Google Sheet, đồng thời vẫn có danh sách mặc định trong `src/data/foodOptions.js` nếu API không khả dụng

## Chạy local

```bash
cd bidu
python3 -m http.server 8000
```

Mở trong trình duyệt:

```text
http://localhost:8000
```

Trang chọn món ăn: `http://localhost:8000/food`

## Cấu hình danh sách món ăn

Trong cùng Google Spreadsheet, tab `Work` lưu lịch bệnh viện. Tab `food` lưu thực đơn theo cấu trúc:

| Breakfast | Dinner |
| --- | --- |
| Phở | Cơm tấm |
| Bánh mì | Hủ tiếu |

Mỗi món ăn nằm ở một ô bên dưới tiêu đề tương ứng; có thể thêm bao nhiêu hàng tùy ý. Google Apps Script cung cấp dữ liệu qua `GET <URL_API>?action=food`, trả về JSON dạng `{ "breakfast": ["Phở", "Bánh mì"], "dinner": ["Cơm tấm", "Hủ tiếu"] }`.

Sau khi cập nhật `google-apps-script/Code.gs`, hãy deploy phiên bản mới của Apps Script Web App để endpoint hiện tại đọc đúng hai tab và nhận route `action=food`.

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
