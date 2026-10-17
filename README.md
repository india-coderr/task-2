# Retail Inventory and Sales Management System

A production-grade, full-stack Inventory and Sales Management web application designed for retail businesses (grocery stores, electronics shops, and general retail). Built with Next.js (App Router), Node.js Express, and MongoDB Mongoose.

Inspired by clean, high-density internal retail tools (Greenfield Grocers / Foodly Kitchen POS), featuring 3px border-radius, thin off-white borders, responsive layouts, integer paise calculations, and atomic multi-document transaction consistency.

---

## 1. Monorepo Folder Structure

```
Task 2/
├── README.md                           # Comprehensive documentation & API reference
├── .gitignore                          # Excludes local secrets and generated files
├── server/                             # Express.js REST API (Port 5000, ESM)
│   ├── package.json                    # Scripts: start, dev, seed, verify:stock, test
│   ├── .env.example                    # Backend environment template
│   └── src/
│       ├── server.js                   # Express app entry point & graceful shutdown
│       ├── config/
│       │   └── db.js                   # MongoDB connection & replica-set hello check
│       ├── models/
│       │   ├── User.js                 # Admin & Staff user model
│       │   ├── Product.js              # Products with SKU, stock, reorderLevel, indexes
│       │   ├── StockMovement.js        # Append-only audit log (immutable)
│       │   ├── Sale.js                 # Immutable sales invoices with snapshots
│       │   ├── Settings.js             # Singleton store settings document
│       │   └── Counter.js              # Atomic invoice number counter
│       ├── middleware/
│       │   ├── auth.js                 # JWT token verification
│       │   ├── roles.js                # Role-based access control (admin / staff)
│       │   ├── validate.js             # Zod input validation middleware
│       │   └── errorHandler.js         # Centralized Error handler & response formatter
│       ├── validators/
│       │   ├── auth.validator.js       # Auth request schemas
│       │   ├── product.validator.js    # Product creation, update, and query schemas
│       │   ├── inventory.validator.js  # Stock adjustments & movements schemas
│       │   ├── sale.validator.js       # Sales checkout & report query schemas
│       │   └── settings.validator.js   # Store settings schema
│       ├── services/
│       │   ├── counter.service.js      # Atomic sequence generator (INV-YYYYMMDD-XXXX)
│       │   ├── inventory.service.js    # Stock adjustment service with audit writer
│       │   └── sale.service.js         # Atomic transaction checkout & rollback logic
│       ├── controllers/
│       │   ├── auth.controller.js      # Login & identity endpoints
│       │   ├── product.controller.js   # Catalogue CRUD & staff price privacy
│       │   ├── inventory.controller.js # Stock adjustment & low-stock prioritization
│       │   ├── sale.controller.js      # Sales execution & invoice retrieval
│       │   ├── report.controller.js    # Dashboard, daily breakdown & admin profit
│       │   └── settings.controller.js  # Store configuration
│       ├── routes/
│       │   ├── index.js                # Prefix router (/api)
│       │   ├── auth.routes.js
│       │   ├── product.routes.js
│       │   ├── inventory.routes.js
│       │   ├── sale.routes.js
│       │   ├── report.routes.js
│       │   └── settings.routes.js
│       ├── utils/
│       │   ├── errors.js               # AppError classes extending native Error
│       │   ├── response.js             # Standardized apiSuccess & apiError helpers
│       │   ├── money.js                # Pure paise math & calculateSaleTotals
│       │   ├── dateUtils.js            # Server local day bounds (00:00:00 to 23:59:59)
│       │   └── asyncHandler.js         # Express async wrapper
│       ├── scripts/
│       │   ├── seed.js                 # Seed 2 users, 20 products, 10 sales, movements
│       │   └── verifyStock.js          # npm run verify:stock audit check
│       └── tests/
│           └── pricing.test.js         # Node native unit tests (node --test)
│
└── client/                             # Next.js App Router (Port 3000, JavaScript)
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js              # 3px border radius & custom palette
    ├── postcss.config.js
    ├── jsconfig.json                   # @/* alias mapping
    ├── .env.example
    └── src/
        ├── app/
        │   ├── globals.css             # 3px borders, tabular-nums, print CSS
        │   ├── layout.js               # Root layout with providers & Navbar
        │   ├── page.js                 # Home redirector
        │   ├── login/page.js           # Login with quick credential fills
        │   ├── dashboard/page.js       # 4 metric boxes, top products, low stock, sales
        │   ├── products/page.js        # Products table, search, filters, modals
        │   ├── inventory/
        │   │   ├── low-stock/page.js   # Urgent low-stock alerts & restock modal
        │   │   └── movements/page.js   # Audit trail with filters & pagination
        │   ├── sales/
        │   │   ├── new/page.js         # POS terminal, search, cart, live bill
        │   │   ├── page.js             # Past invoices list with date filters
        │   │   └── [id]/page.js        # Printable invoice page
        │   ├── reports/page.js         # Turnover reports & admin profit margin
        │   └── settings/page.js        # Store settings & staff discount ceiling
        ├── components/
        │   ├── Navbar.js               # Image 3 design: Brand + POS + Nav + User
        │   ├── ProtectedRoute.js       # Session guard & role restriction
        │   └── Modal.js                # Accessible modal with 3px border radius
        ├── context/
        │   ├── AuthContext.js          # JWT state, user profile & auth helpers
        │   └── SettingsContext.js      # Store settings & low stock badge count
        └── lib/
            ├── api.js                  # Fetch wrapper handling auth & error models
            ├── money.js                # Intl.NumberFormat('en-IN') currency formatters
            └── date.js                 # Local timezone date & time helpers
```

---

## 2. Setup and Prerequisites

### MongoDB Configuration (Dedicated Isolated Database / Cluster)
To ensure no collision with earlier projects, the database name is configured as **`inventory_sales_mgmt`** by default.

Copy `server/.env.example` to `server/.env` and configure the values for your environment. For the frontend, copy `client/.env.example` to `client/.env.local`. Local environment files are excluded from Git; do not commit credentials or deployment-specific values.

#### Option A: MongoDB Atlas (Recommended)
MongoDB Atlas clusters come with replica sets enabled by default, which natively supports multi-document transactions.
1. Create a free M0 cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Obtain your connection URI and configure the database name `inventory_sales_mgmt`:
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/inventory_sales_mgmt?retryWrites=true&w=majority
   ```

#### Option B: Local MongoDB Replica Set (Docker or Native)
If running locally, start MongoDB with a replica set named `rs0`:
```bash
# Docker single-node replica set:
docker run -d --name mongo-replica -p 27017:27017 mongo:7.0 --replSet rs0

# Initialize replica set:
docker exec -it mongo-replica mongosh --eval "rs.initiate()"
```
In `server/.env`:
```env
MONGO_URI=mongodb://127.0.0.1:27017/inventory_sales_mgmt?replicaSet=rs0
```

> **Replica-Set Detection:** On startup, the server issues a `hello` command to verify `helloResult.setName`. If transactions are not supported, a clear warning is logged.

---

## 3. Quick Start Commands

### Backend (`/server`):
```bash
cd server
npm install

# Run database seed (Creates Admin, Staff, 20 products, 10 sales, audit logs)
npm run seed

# Run stock integrity verification
npm run verify:stock

# Run pure pricing unit tests
npm test

# Start backend server on port 5000
npm run dev
```

### Frontend (`/client`):
```bash
cd client
npm install

# Start Next.js App Router on port 3000
npm run dev
```

Visit **http://localhost:3000** in your browser.

### Default Demo Credentials:
- **Administrator**: `admin@store.com` / `Admin@123`
- **Staff Cashier**: `staff@store.com` / `Staff@123`

---

## 4. API Endpoints Reference (Prefix: `/api`)

All endpoints use standardized JSON responses:
- **Success:** `{ "success": true, "data": ... }` (with optional `"meta": { ... }` for pagination)
- **Error:** `{ "success": false, "error": { "code": "...", "message": "...", "details": [...] } }`

| Method | Endpoint | Allowed Role | Reason / Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/auth/login` | Public | Authenticates credentials and returns JWT token and user profile |
| **GET** | `/auth/me` | Admin, Staff | Returns the currently authenticated user session |
| **GET** | `/products` | Admin, Staff | Lists products with search, category, and stockStatus filters. `purchasePrice` is omitted for Staff. `includeInactive=true` is Admin-only. |
| **GET** | `/products/categories` | Admin, Staff | Returns list of distinct active categories for filter dropdowns |
| **GET** | `/products/:id` | Admin, Staff | Retrieves a single product by ID (sanitized based on role) |
| **POST** | `/products` | Admin only | Creates a product; writes an `initial` StockMovement if opening stock > 0 |
| **PUT** | `/products/:id` | Admin only | Modifies SKU, name, prices, reorderLevel (direct stock modification is blocked) |
| **PATCH**| `/products/:id/deactivate`| Admin only | Soft-deactivates product (reserves SKU, hides from POS sale search) |
| **PATCH**| `/products/:id/activate` | Admin only | Reactivates a deactivated product |
| **GET** | `/inventory/low-stock` | Admin, Staff | Returns low-stock products (`stock <= reorderLevel`) sorted by urgency |
| **POST** | `/inventory/adjustments`| Admin, Staff | Records `stock_received` (Staff & Admin) or manual adjustments (Admin only) |
| **GET** | `/inventory/movements` | Admin, Staff | Paginated audit log filterable by productId, type, and date range |
| **POST** | `/sales` | Admin, Staff | Atomically executes a sale, verifies stock, updates counter, and writes movements |
| **GET** | `/sales` | Admin, Staff | Lists sales invoices with date range and invoiceNumber search |
| **GET** | `/sales/:id` | Admin, Staff | Retrieves detailed printable invoice (cost prices stripped for staff) |
| **GET** | `/reports/sales` | Admin, Staff | Computes gross sales, transactions, average sale, top products, and daily table |
| **GET** | `/reports/profit` | Admin only | Computes net revenue (ex. tax), COGS, gross profit, and margin % |
| **GET** | `/settings` | Admin, Staff | Retrieves current store settings, tax rates, and discount ceilings |
| **PUT** | `/settings` | Admin only | Updates store name, default tax rate, currency symbol, and staff discount limit |

---

## 5. API Request & Response Examples

### 1. Successful Sale Creation (`POST /api/sales`)
**Request:**
```http
POST /api/sales
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "items": [
    { "productId": "6710db4e8199b0c2049e7a01", "quantity": 1 },
    { "productId": "6710db4e8199b0c2049e7a02", "quantity": 2 }
  ],
  "discountType": "percent",
  "discountValue": 5,
  "paymentMethod": "UPI",
  "customerName": "Rohan Sharma"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "sale": {
      "_id": "6710db7c8199b0c2049e7a10",
      "invoiceNumber": "INV-20261017-0001",
      "items": [
        {
          "productId": "6710db4e8199b0c2049e7a01",
          "skuSnapshot": "RIC-005",
          "nameSnapshot": "Basmati rice 5 kg",
          "unitPrice": 640.00,
          "quantity": 1,
          "lineTotal": 640.00
        },
        {
          "productId": "6710db4e8199b0c2049e7a02",
          "skuSnapshot": "BUT-500",
          "nameSnapshot": "Amul butter 500 g",
          "unitPrice": 285.00,
          "quantity": 2,
          "lineTotal": 570.00
        }
      ],
      "subtotal": 1210.00,
      "discountType": "percent",
      "discountValue": 5,
      "discountAmount": 60.50,
      "taxRate": 5,
      "taxAmount": 57.48,
      "total": 1206.98,
      "paymentMethod": "UPI",
      "customerName": "Rohan Sharma",
      "status": "completed",
      "createdAt": "2026-10-17T07:15:00.000Z"
    },
    "warnings": []
  }
}
```

### 2. Stock Rejection Error (`409 Conflict - INSUFFICIENT_STOCK`)
When available stock cannot fulfill the checkout request:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Insufficient stock for one or more requested items",
    "details": [
      {
        "productId": "6710db4e8199b0c2049e7a05",
        "sku": "OIL-001",
        "name": "Sunflower oil 1 L",
        "requested": 5,
        "available": 0
      }
    ]
  }
}
```

---

## 6. Business Rules Enforced

1. **Server-Side Pricing Authority**: Client-submitted unit prices or totals are strictly disregarded. The server retrieves active DB selling prices, computes minor units (paise) integer math, and rounds half up.
2. **Atomic Stock Decrement**: Stock deductions execute via conditional atomic operations `Product.findOneAndUpdate({ _id, isActive: true, stock: { $gte: qty } }, { $inc: { stock: -qty } })`. If any unit is unavailable, the entire sale aborts and rolls back.
3. **Transaction Rollback Protection**: Invoice numbers, product deductions, sale records, and StockMovement rows occur within a single database session (`session.withTransaction`). No invoice counter gaps or orphan decrements occur upon failure.
4. **Append-Only Audit Log**: Every inventory change (`initial`, `stock_received`, `adjustment_increase`, `adjustment_decrease`, `sale`) creates a `StockMovement` capturing `balanceBefore` and `balanceAfter`. Mongoose schema hooks disallow update or delete operations on audit movements.
5. **Role-Based Field Security**:
   - `purchasePrice` is never transmitted to Staff accounts over the API.
   - Staff discounts exceeding `staffMaxDiscountPercent` are rejected with `403 Forbidden`.
   - Direct stock editing is blocked on product update routes; adjustments must be registered via traceable inventory endpoints.
6. **Date Boundaries**: Date range filters normalize to the server's local day: `from` at 00:00:00.000 and `to` at 23:59:59.999.

---

## 7. Design Decisions & Assumptions

- **Out of Scope**: Sales returns, refunds, voids, and invoice cancellations are explicitly out of scope per specifications. Once a sale completes, it is immutable.
- **Single Currency Minor Units**: All monetary arithmetic operates in integer paise (`Math.round(rupees * 100)`) and formats via `Intl.NumberFormat('en-IN')` to avoid IEEE-754 floating-point drift.
- **UI Architecture**: Plain, high-density internal tool aesthetic matching the provided design specifications. Strictly uses 3px border-radius (`rounded-[3px]`), thin off-white borders (`#e2e8f0` / `#cbd5e1`), no box shadows or gradients, sentence-case labels, and tabular numeral alignment.
