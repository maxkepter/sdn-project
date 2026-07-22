# PROJECT CONTEXT — SDN Project

> Cập nhật: 2026-07-20 | Branch: `hunter` | Repo: `maxkepter/sdn-project`

---

## 1. Tổng quan

Marketplace web app kiểu eBay (mua/bán đấu giá). Monorepo gồm Express backend + React frontend. Đang trong giai đoạn **scaffolding / MVP** — nhiều model đã có nhưng một số route/controller chưa implement đầy đủ.

---

## 2. Tech Stack

| Layer | Công nghệ |
|---|---|
| **Backend** | Node.js, Express 5.2.1 |
| **Database** | MongoDB 9.x (Mongoose ODM) |
| **Auth** | JWT (`jsonwebtoken`) + `bcryptjs` |
| **File Upload** | `multer` |
| **Security** | `helmet`, `cors` |
| **Logging** | `morgan` |
| **Frontend** | React 19.2.7, Create React App |
| **Routing (UI)** | `react-router-dom` v6 |
| **HTTP Client** | `axios` |
| **Styling** | Tailwind CSS |

---

## 3. Cấu trúc thư mục

```
sdn-project/
├── package.json              # Root workspace scripts
├── server/                   # Express API
│   └── src/
│       ├── server.js         # Entry point, kết nối MongoDB
│       ├── app.js            # Express setup, middleware, routes
│       ├── seed.js           # Seed dữ liệu mẫu
│       ├── config/
│       │   ├── db.js         # Mongoose connect helper
│       │   ├── environment.js# Đọc .env, validate biến môi trường
│       │   └── upload.js     # Multer config
│       ├── models/           # Mongoose schemas (xem mục 5)
│       └── modules/          # Feature modules (xem mục 4)
└── ui/                       # React SPA
    └── src/
        ├── App.js            # Root component + routing
        ├── context/
        │   ├── AuthContext.js
        │   └── LoadingContext.js
        ├── hooks/
        │   ├── useAuth.js
        │   └── useIsLoading.js
        ├── services/
        │   └── apiClient.js  # Axios instance với interceptors
        ├── components/       # Reusable components
        ├── layout/           # MainLayout, Header, Footer, Menu
        └── pages/            # Page components
```

---

## 4. Backend Modules & API Routes

Base URL: `/api/v1`

### 4.1 Auth (`/api/v1/auth`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/auth/login` | ❌ | Đăng nhập, trả JWT |
| POST | `/auth/register` | ❌ | Đăng ký tài khoản |
| GET | `/auth/bypass` | ❌ | Dev-only: login không cần password |
| GET | `/auth/profile` | ✅ | Lấy thông tin user hiện tại |

**JWT:** Expire 7 ngày. Middleware `auth.js` verify token, gắn `req.user`.

### 4.2 Users (`/api/v1/users`)

Route file: `userRoutes.js` — chi tiết xem `userController.js`.

### 4.3 Products (`/api/v1/products`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/products` | ✅ | Lấy sản phẩm của seller (có filter, phân trang) |
| GET | `/products/:id` | ✅ | Lấy 1 sản phẩm của seller |
| POST | `/products` | ✅ | Tạo sản phẩm + inventory |
| PUT | `/products/:id` | ✅ | Cập nhật sản phẩm |

Query params `GET /products`: `search`, `status` (`active`/`hidden`), `page`, `limit` (default 20).

### 4.4 Listings (`/api/v1/listings`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/listings` | ❌ | Tạo listing công khai (không cần đăng nhập) |

> ⚠️ Controller dùng hardcoded seller fallback — chỉ dùng cho dev/demo.

### 4.5 Orders (`/api/v1/orders`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/orders` | ✅ | Lấy orders của seller |
| PUT | `/orders/:id/status` | ✅ | Cập nhật trạng thái đơn hàng |
| GET | `/orders/stats` | ✅ | Thống kê tổng quan seller |

Order statuses: `pending` → `paid` → `shipped` → `delivered` → `cancelled` / `returned`

### 4.6 Inventory (`/api/v1/inventory`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/inventory` | ✅ | Lấy tồn kho của seller |
| PUT | `/inventory/:productId` | ✅ | Set số lượng tồn kho |
| PATCH | `/inventory/:productId/adjust` | ✅ | Điều chỉnh tồn kho (±) |

### 4.7 Coupons (`/api/v1/coupons`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/coupons` | ✅ | Lấy coupon của seller |
| POST | `/coupons` | ✅ | Tạo coupon |
| DELETE | `/coupons/:id` | ✅ | Xóa coupon |

### 4.8 Categories / Public (`/api/v1/categories`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/categories` | ❌ | Lấy tất cả categories |
| GET | `/categories/products` | ❌ | Lấy sản phẩm public (isHidden=false, limit 50) |

### 4.9 Health Check

```
GET /health  →  { status: "OK", timestamp: "..." }
```

---

## 5. Data Models (MongoDB Schemas)

### User
```
username (String, unique)
email    (String, unique, lowercase)
password (String, hashed bcrypt)
role     (enum: "buyer" | "seller" | "admin", default: "buyer")
avatarURL (String)
```

### Product
```
title        (String, required)
description  (String)
price        (Number, required, min 0)
images       ([String])
categoryId   (ref: Category, required)
sellerId     (ref: User, required)
isAuction    (Boolean, default false)
auctionEndTime (Date)
isHidden     (Boolean, default false)
sku          (String)
condition    (String)
itemSpecifics (Map<String,String>)
```

### Order
```
buyerId    (ref: User, required)
addressId  (ref: Address, required)
orderDate  (Date)
totalPrice (Number, required)
status     (enum: pending|paid|shipped|delivered|cancelled|returned)
```

### OrderItem
```
orderId   (ref: Order, required)
productId (ref: Product, required)
quantity  (Number, min 1)
unitPrice (Number, min 0)
```

### Payment
```
orderId (ref: Order)
userId  (ref: User)
amount  (Number)
method  (enum: credit_card|paypal|bank_transfer|cod)
status  (enum: pending|completed|failed|refunded)
paidAt  (Date)
```

### Inventory
```
productId   (ref: Product, unique)
quantity    (Number, min 0)
lastUpdated (Date)
```

### Coupon
```
code            (String, unique, uppercase)
discountPercent (Number, 0-100)
startDate       (Date)
endDate         (Date)
maxUsage        (Number)
productId       (ref: Product, optional)
```

### Review
```
productId  (ref: Product)
reviewerId (ref: User)
rating     (Number, 1-5)
comment    (String)
```

### Bid
```
productId (ref: Product)
bidderId  (ref: User)
amount    (Number, min 0)
bidTime   (Date)
```

### Message
```
senderId   (ref: User)
receiverId (ref: User)
content    (String)
timestamp  (Date)
```

### ShippingInfo
```
orderId          (ref: Order)
carrier          (String)
trackingNumber   (String)
status           (enum: preparing|in_transit|delivered|failed)
estimatedArrival (Date)
```

### ReturnRequest
```
orderId (ref: Order)
userId  (ref: User)
reason  (String)
status  (enum: requested|approved|rejected|completed)
```

### Dispute
```
orderId     (ref: Order)
raisedBy    (ref: User)
description (String)
status      (enum: open|under_review|resolved|rejected)
resolution  (String)
```

### Feedback
```
sellerId      (ref: User, unique)
averageRating (Number, 0-5)
totalReviews  (Number)
positiveRate  (Number, 0-100)
```

### Store
```
sellerId      (ref: User, unique)
storeName     (String)
description   (String)
bannerImageURL (String)
```

### Address
```
userId    (ref: User)
fullName  (String)
phone     (String)
street    (String)
city      (String)
state     (String)
country   (String)
isDefault (Boolean)
```

### Category
```
name (String, unique)
```

---

## 6. Frontend Routes

| Path | Component | Auth Required |
|---|---|---|
| `/` | `HomePage` | ❌ |
| `/login` | `Login` | ❌ |
| `/sell` | `SellPage` | ❌ |
| `/listng` | `ListingPage` | ❌ ⚠️ typo |
| `/dashboard` | `Dashboard` | ✅ |
| `/seller` | `SellerHub` (layout) | ✅ |
| `/seller` (index) | `SellerOverview` | ✅ |
| `/seller/orders` | `SellerOrders` | ✅ |
| `/seller/listings` | `SellerListings` | ✅ |
| `/seller/marketing` | `SellerMarketing` | ✅ |
| `/seller/store` | `SellerStore` | ✅ |
| `/seller/performance` | `SellerPerformance` | ✅ |
| `/seller/payments` | `SellerPayments` | ✅ |
| `/seller/research` | `SellerResearch` | ✅ |
| `/seller/reports` | `SellerReports` | ✅ |

**PrivateRoute:** Redirect về `/login` nếu chưa đăng nhập.

---

## 7. Auth Flow

```
1. User POST /auth/login  →  server trả { token, user }
2. Frontend lưu token vào localStorage
3. apiClient interceptor gắn "Authorization: Bearer <token>" vào mọi request
4. Khi app load: GET /auth/profile để restore session
5. 401 response → xóa token khỏi localStorage
6. Logout → xóa token, set user = null
```

---

## 8. Environment Variables (server/.env)

| Biến | Mặc định | Mô tả |
|---|---|---|
| `PORT` | `5000` | Port Express server |
| `NODE_ENV` | `development` | Môi trường |
| `CLIENT_URL` | `http://localhost:3000` | CORS origin |
| `DATABASE_URL` | `mongodb://localhost:27017/sdn_db` | MongoDB URI |
| `JWT_SECRET` | *(bắt buộc đặt)* | Ký JWT |

---

## 9. Scripts

Chạy từ root:

```bash
npm run install:all   # Cài dependencies toàn bộ
npm run dev           # Chạy cả server + UI song song
npm run server        # Chỉ chạy Express (nodemon)
npm run ui            # Chỉ chạy React dev server
```

Chạy từ `server/`:
```bash
npm run seed          # Seed dữ liệu mẫu vào MongoDB
```

---

## 10. Known Issues / TODO

| # | Vấn đề | File |
|---|---|---|
| 1 | Route `/listng` bị typo (thiếu `i`) | `ui/src/App.js` |
| 2 | `listingsController` dùng hardcoded seller fallback | `modules/listings/controllers/listingsController.js` |
| 3 | `unreadMessages: 52` hardcoded trong stats | `modules/order/controllers/orderController.js` |
| 4 | Nhiều seller pages có thể còn là stub (SellerStore, SellerResearch, SellerReports...) | `ui/src/pages/seller/` |
| 5 | `Bid`, `Message`, `Dispute`, `ReturnRequest`, `ShippingInfo` chưa có routes/controllers | `server/src/modules/` |
| 6 | Chưa có role-based access control (RBAC) — chỉ check auth, chưa check role | `modules/auth/middleware/` |
| 7 | `bypassLogin` endpoint cần xóa trước khi production | `modules/auth/controllers/bypassController.js` |
