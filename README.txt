VIETREADER — CHROME EXTENSION 1.0.0
==================================
- Đọc đoạn văn bản được bôi đen trên trang web (báo, thông tin,...).
- Đọc nội dung chính trong trang: Bộ trích xuất sẽ tìm vùng nội dung và đọc.
- Có các chức năng Đọc lại, Dừng đọc/Tiếp tục đọc, và điều chỉnh tốc độ đọc.
- Có sẵn giọng đọc Tiếng Việt được tạo tự động bởi Google và 9 ngôn ngữ phổ biến khác.

LƯU Ý QUAN TRỌNG VỀ GIỌNG GOOGLE
- Tiếng Việt sử dụng endpoint Google Translate TTS không chính thức: https://translate.google.com/translate_tts
- Google không công bố đây là API Text-to-Speech công khai dành cho extension bên thứ ba. Endpoint có thể bị giới hạn, trả lỗi 403/429, đổi cách hoạt động hoặc ngừng cung cấp bất cứ lúc nào.
- VietReader chia văn bản thành các phần âm thanh ngắn để phù hợp giới hạn thông thường của endpoint. Phần tiếp theo được tải trước trong lúc phần hiện tại đang phát nhằm giảm khoảng lặng giữa hai phần.
- Khi đọc văn bản bôi đen, VietReader cố gắng giữ ngắt giữa các đoạn văn HTML thực sự; các xuống dòng mềm do bố cục trang được nối thành khoảng trắng để câu không bị ngắt sai.
- Nếu văn bản dài hơn giới hạn cho mỗi yêu cầu, vẫn cần chia thành nhiều phần âm thanh nội bộ.
- Khi dùng tiếng Việt trực tuyến, văn bản đoạn đọc sẽ được gửi tới Google qua HTTPS. Không dùng để đọc thông tin riêng tư nếu bạn không chấp nhận việc gửi nội dung tới Google.

CÀI ĐẶT TRÊN CHROME (WINDOWS)
1. Giải nén ZIP vào một thư mục cố định, ví dụ D:\VietReader.
2. Mở Chrome và nhập chrome://extensions vào thanh địa chỉ.
3. Bật Developer mode / Chế độ dành cho nhà phát triển.
4. Nếu đã cài VietReader bản cũ, gỡ bản cũ để tránh nhầm mã cũ với mã mới.
5. Nhấn Load unpacked / Tải tiện ích đã giải nén.
6. Chọn thư mục vietreader-extension có file manifest.json bên trong.
7. Mở lại/tải lại trang web đang đọc sau khi cài extension.

CÁCH DÙNG
A. Đọc đoạn văn được bôi đen
1. Bôi đen đoạn văn cần đọc.
2. Nhấn chuột phải.
3. Chọn “Đọc văn bản đã chọn bằng VietReader”.
4. Chọn ngôn ngữ phù hợp trong danh sách rồi nhấn Đọc lại nếu cần.

B. Đọc nội dung chính của trang
1. Nhấn biểu tượng VietReader trên thanh công cụ Chrome.
2. Nhấn “Đọc nội dung chính”.
3. Chọn ngôn ngữ, điều chỉnh tốc độ, sau đó dùng Đọc lại và Tạm dừng / Tiếp tục. Mức 1,00× nằm ở giữa thanh tốc độ.
4. Kéo phần đầu bảng (khu vực biểu tượng/tên VietReader) để chuyển bảng đến vị trí mong muốn; vị trí sẽ được ghi nhớ.

DANH SÁCH NGÔN NGỮ
1. Tiếng Việt — giọng Google (trực tuyến)
2. Tiếng Anh — Anh (UK)
3. Tiếng Anh — Mỹ (US)
4. Tiếng Trung phổ thông
5. Tiếng Nhật
6. Tiếng Hàn
7. Tiếng Tây Ban Nha
8. Tiếng Pháp
9. Tiếng Đức
10. Tiếng Hindi

CÁCH WEB SPEECH API HOẠT ĐỘNG
- Web Speech API dùng những giọng được trình duyệt và hệ điều hành cung cấp. Danh sách giọng có thể khác nhau giữa các máy, phiên bản hệ điều hành và cấu hình Chrome.
- Những ngôn ngữ chưa có giọng phù hợp sẽ được hiển thị là “chưa có giọng trên máy” và không thể chọn.
- Nếu vừa cài thêm giọng vào Windows, tải lại trang web hoặc khởi động lại Chrome để làm mới danh sách.
- VietReader không dịch văn bản; bạn cần chọn ngôn ngữ đúng với văn bản cần đọc. Không nên chọn một ngôn ngữ cho đoạn văn trộn nhiều ngôn ngữ.

QUYỀN RIÊNG TƯ VÀ KẾT NỐI
- Tiếng Việt: văn bản được gửi tới Google Translate TTS để tạo âm thanh.
- Các ngôn ngữ khác: văn bản được đọc bằng Web Speech API thông qua giọng có sẵn trên thiết bị; không gửi qua endpoint Google TTS.
- Extension không có máy chủ riêng và không lưu nội dung bài đọc.
- Khi đọc văn bản trực tuyến, cần có kết nối Internet.

KHẮC PHỤC LỖI
- Giọng Google trả lỗi 403/429: dịch vụ có thể đang giới hạn yêu cầu hoặc endpoint không còn cho phép truy cập. Đợi một lúc rồi thử lại; nếu vẫn lỗi thì đây có thể là thay đổi phía Google, không phải lỗi văn bản.
- Giọng Google không phát: kiểm tra kết nối Internet và âm lượng, rồi nhấn Đọc lại. Một số trang có thể giới hạn phát âm thanh tự động; thao tác đọc lại sau khi bấm trực tiếp thường giúp kích hoạt phát âm thanh.
- Sau khi thay đổi mã nguồn, mở chrome://extensions, nhấn Reload và tải lại trang web đang đọc.
- Extension không chạy trên các trang nội bộ như chrome://extensions hoặc Chrome Web Store.

CẤU TRÚC FILE
manifest.json       Cấu hình Manifest V3 và quyền truy cập endpoint Google TTS
service-worker.js   Menu chuột phải và gọi Google Translate TTS cho tiếng Việt
content.js          Bảng đọc, Web Speech API, điều khiển âm thanh và trích xuất nội dung
popup.html/css/js   Popup mở nhanh
icons/              Icon extension