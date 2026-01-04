# Hệ Thống Đặt Tour Guide

Ứng dụng web full-stack để đặt tour guide và quản lý địa điểm du lịch.

## Cấu Trúc Dự Án

```
project-root/
├── backend/         # Máy chủ backend Node.js
├── frontend/        # Các file HTML/CSS/JS frontend
├── data/           # Các file dữ liệu MongoDB
└── uploads/        # Thư mục lưu trữ file upload
```

## Yêu Cầu Hệ Thống

- Node.js (phiên bản 14 trở lên)
- MongoDB Community Server
- MongoDB Compass (Giao diện đồ họa cho MongoDB)
- Git

## Hướng Dẫn Cài Đặt

### 1. Clone Repository

```bash
git clone https://github.com/ClowderDev/project-root.git
cd project-root
```

### 2. Cài Đặt Backend

1. Di chuyển vào thư mục backend:
```bash
cd backend
```

2. Cài đặt các gói phụ thuộc:
```bash
npm install
```

3. Tạo file `.env` trong thư mục backend với nội dung sau:
```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/tour-guide-db
JWT_SECRET=your_jwt_secret_key
```

4. Khởi động máy chủ backend:
```bash
# Chế độ phát triển với tự động reload
npm run dev

# Chế độ production
npm start
```

### 3. Cài Đặt Frontend

Frontend được xây dựng bằng HTML/CSS/JavaScript thuần. Không cần quá trình build.

1. Di chuyển vào thư mục frontend:
```bash
cd frontend
```

2. Mở file HTML bất kỳ trong trình duyệt hoặc sử dụng máy chủ local (ví dụ: extension Live Server trong VS Code)

### 4. Cài Đặt MongoDB

1. Cài đặt MongoDB Community Server từ [Trang Tải MongoDB](https://www.mongodb.com/try/download/community)

2. Cài đặt MongoDB Compass từ [Trang Tải MongoDB Compass](https://www.mongodb.com/try/download/compass)

3. Khởi động dịch vụ MongoDB:
   - Windows: MongoDB sẽ tự động chạy như một service
   - Linux/Mac: `sudo service mongod start` hoặc `brew services start mongodb-community`

4. Mở MongoDB Compass và kết nối đến: `mongodb://localhost:27017`

5. Import Dữ Liệu:
   - Trong MongoDB Compass, nhấp vào "Create Database"
   - Tên Database: `tour-guide-db`
   - Tên Collection: `tên-collection-của-bạn`
   - Nhấp "Create Database"
   - Nhấp vào collection
   - Nhấp "Add Data" > "Import JSON or CSV file"
   - Chọn các file JSON từ thư mục `data`
   - Nhấp "Import"

### 5. Chạy Ứng Dụng

1. Khởi động máy chủ backend (từ thư mục backend):
```bash
npm run dev
```

2. Mở frontend:
   - Truy cập `frontend/index.html` trong trình duyệt
   - Hoặc sử dụng máy chủ local (khuyến nghị)

## Các Lệnh Có Sẵn

Trong thư mục backend:

- `npm run dev`: Khởi động máy chủ phát triển với tự động reload
- `npm start`: Khởi động máy chủ production
- `npm run seed`: Nạp dữ liệu ban đầu vào database

## Tính Năng

- Xác thực người dùng (Đăng ký/Đăng nhập)
- Hệ thống đặt tour guide
- Quản lý địa điểm
- Bảng điều khiển admin
- Hệ thống phê duyệt guide
- Quản lý đặt tour
- Hệ thống đánh giá
- Chat thời gian thực
- Tích hợp thanh toán


## Xử Lý Sự Cố

1. Vấn Đề Kết Nối MongoDB:
   - Đảm bảo dịch vụ MongoDB đang chạy
   - Kiểm tra chuỗi kết nối trong file `.env` có chính xác
   - Xác minh MongoDB Compass có thể kết nối đến database

2. Vấn Đề Máy Chủ Backend:
   - Kiểm tra cổng 4000 có sẵn
   - Xác minh tất cả biến môi trường đã được thiết lập
   - Kiểm tra console để xem thông báo lỗi

3. Vấn Đề Frontend:
   - Xóa cache trình duyệt
   - Kiểm tra console trình duyệt để xem lỗi
   - Đảm bảo máy chủ backend đang chạy

## Hỗ Trợ

Nếu có bất kỳ vấn đề hoặc câu hỏi nào, vui lòng liên hệ với nhóm phát triển. 