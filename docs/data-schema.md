# Data Schema Diagram

Sơ đồ quan hệ giữa các collection (MongoDB / Mongoose) trong `server/src/models/`.

## ER Diagram

```mermaid
erDiagram
    User ||--o| Store : "sells as"
    User ||--o{ Product : "lists"
    User ||--o{ Order : "places"
    User ||--o{ Address : "has"
    User ||--o{ Payment : "pays"
    User ||--o{ Review : "writes"
    User ||--o{ Bid : "bids"
    User ||--o{ Dispute : "raises"
    User ||--o{ ReturnRequest : "requests"
    User ||--o{ Message : "sends"
    User ||--o{ Message : "receives"
    User ||--o| Feedback : "rated as seller"

    Category ||--o{ Product : "groups"

    Product ||--o{ OrderItem : "appears in"
    Product ||--o{ Review : "reviewed by"
    Product ||--o{ Bid : "auctioned by"
    Product ||--o{ Inventory : "stocked in"
    Product ||--o{ Coupon : "discounted by"

    Order ||--o{ OrderItem : "contains"
    Order ||--|| Address : "ships to"
    Order ||--o| Payment : "settled by"
    Order ||--o| ShippingInfo : "fulfilled by"
    Order ||--o| Dispute : "subject of"
    Order ||--o| ReturnRequest : "returned via"

    User {
        ObjectId _id PK
        string username UK
        string email UK
        string password
        string role "buyer|seller|admin"
        string avatarURL
    }

    Store {
        ObjectId _id PK
        ObjectId sellerId FK
        string storeName
        string description
        string bannerImageURL
    }

    Category {
        ObjectId _id PK
        string name UK
    }

    Product {
        ObjectId _id PK
        string title
        string description
        number price
        string[] images
        ObjectId categoryId FK
        ObjectId sellerId FK
        boolean isAuction
        Date auctionEndTime
        boolean isHidden
        string sku
        string condition
        Map itemSpecifics
    }

    Order {
        ObjectId _id PK
        ObjectId buyerId FK
        ObjectId addressId FK
        Date orderDate
        number totalPrice
        string status "pending|paid|shipped|delivered|cancelled|returned"
    }

    OrderItem {
        ObjectId _id PK
        ObjectId orderId FK
        ObjectId productId FK
        number quantity
        number unitPrice
    }

    Address {
        ObjectId _id PK
        ObjectId userId FK
        string fullName
        string phone
        string street
        string city
        string state
        string country
        boolean isDefault
    }

    Payment {
        ObjectId _id PK
        ObjectId orderId FK
        ObjectId userId FK
        number amount
        string method "credit_card|paypal|bank_transfer|cod"
        string status "pending|completed|failed|refunded"
        Date paidAt
    }

    ShippingInfo {
        ObjectId _id PK
        ObjectId orderId FK
        string carrier
        string trackingNumber
        string status "preparing|in_transit|delivered|failed"
        Date estimatedArrival
    }

    Review {
        ObjectId _id PK
        ObjectId productId FK
        ObjectId reviewerId FK
        number rating "1-5"
        string comment
        Date createdAt
    }

    Feedback {
        ObjectId _id PK
        ObjectId sellerId FK UK
        number averageRating
        number totalReviews
        number positiveRate
    }

    Bid {
        ObjectId _id PK
        ObjectId productId FK
        ObjectId bidderId FK
        number amount
        Date bidTime
    }

    Inventory {
        ObjectId _id PK
        ObjectId productId FK UK
        number quantity
        Date lastUpdated
    }

    Coupon {
        ObjectId _id PK
        string code UK
        number discountPercent
        Date startDate
        Date endDate
        number maxUsage
        ObjectId productId FK
    }

    Dispute {
        ObjectId _id PK
        ObjectId orderId FK
        ObjectId raisedBy FK
        string description
        string status "open|under_review|resolved|rejected"
        string resolution
    }

    ReturnRequest {
        ObjectId _id PK
        ObjectId orderId FK
        ObjectId userId FK
        string reason
        string status "requested|approved|rejected|completed"
        Date createdAt
    }

    Message {
        ObjectId _id PK
        ObjectId senderId FK
        ObjectId receiverId FK
        string content
        Date timestamp
    }
```

## Nhóm quan hệ chính

| Nhóm | Quan hệ |
|------|---------|
| Identity | `User` ↔ `Store` (1-1, role=seller), `User` ↔ `Address` (1-n) |
| Catalog | `Category` → `Product` (1-n), `User` (seller) → `Product` (1-n) |
| Inventory & Promos | `Product` ↔ `Inventory` (1-1), `Product` ↔ `Coupon` (1-n) |
| Buying | `User` → `Order` → `OrderItem` ← `Product` |
| Checkout | `Order` ↔ `Address`, `Order` ↔ `Payment`, `Order` ↔ `ShippingInfo` |
| Engagement | `Product` ↔ `Review` (1-n), `User` ↔ `Bid` (1-n, khi product.isAuction=true) |
| Post-sale | `Order` ↔ `Dispute` (1-1), `Order` ↔ `ReturnRequest` (1-1) |
| Trust | `User` (seller) ↔ `Feedback` (1-1, tổng hợp rating) |
| Messaging | `User` ↔ `Message` (sender + receiver, 1-n mỗi phía) |

## Ghi chú

- Quan hệ `||--o|` / `||--o{` chỉ phản ánh cardinality theo reference; Mongoose không enforce FK ở DB level.
- `User.role` quyết định entity kèm theo: `seller` → `Store`, `buyer` → `Order`/`Address`/`Payment`.
- `Product.isAuction=true` → `Bid` mới có nghĩa; ngược lại `Inventory.quantity` là nguồn stock chính.
- `Feedback` là aggregate read-model 1-1 với `User(seller)` (unique index trên `sellerId`).