# 🎓 EdTech Store — Full-Stack E-Commerce & Entitlements Application

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Vitest-Automated%20Tests-6E9F18?style=flat&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Test%20Mode-0C2340?style=flat&logo=razorpay&logoColor=white)](https://razorpay.com/)

A production-ready full-stack Ed-Tech application where students browse CBSE curriculum study materials, buy content per chapter, per subject, or as a monthly/annual all-access pass, pay via UPI / Card through Razorpay, and receive verified access immediately upon confirmation.

Built for the **Intern Assessment: Ed-Tech App**.

---

## 📑 Table of Contents
- [✨ Key Features & Requirements](#-key-features--requirements)
- [📐 Key Design Decisions](#-key-design-decisions)
- [📊 Entity-Relationship (ER) Diagram](#-entity-relationship-er-diagram)
- [💳 Razorpay Payment Architecture](#-razorpay-payment-architecture)
- [🚀 Quickstart & Setup Guide](#-quickstart--setup-guide)
- [🧪 Automated Test Suite](#-automated-test-suite)
- [👤 Seed Accounts & Test Credentials](#-seed-accounts--test-credentials)
- [🎥 5-Minute Walkthrough Guide](#-5-minute-walkthrough-guide)

---

## ✨ Key Features & Requirements

### 🧑‍🎓 Student Experience
- **S1 (Must):** Authentication with bcrypt password hashing and `httpOnly` secure JWT cookies.
- **S2 (Must):** Browse catalogue hierarchically by Board → Class → Subject → Chapter, with instant real-time search.
- **S3 (Must):** Product page showing prices (incl. 18% GST), included items, access length, and dynamic **"Owned"** or **"Upgrade"** states.
- **S4 (Must):** Shopping cart supporting multiple items, coupon validation (`WELCOME50`, `EDTECH20`, `PASS500`), upgrade credit discounts, and an itemized 18% GST tax breakdown.
- **S5 (Must):** Checkout with Razorpay (UPI `success@razorpay` / `failure@razorpay`, cards, netbanking) with pending collect status tracking.
- **S6 (Must):** **"My Library"** listing active passes with expiration dates, owned subject packs, and individual chapters.
- **S7 (Must):** In-browser study notes reader. **Locked content is strictly refused by the server (HTTP 403 Forbidden)**, not just hidden in the UI.
- **S8 (Should):** Order history with downloadable & printable official GST tax invoice with 18% split.

### 👑 Admin Capabilities
- **A1 (Must):** Full CRUD for boards, classes, subjects, and chapters.
- **A2 (Must):** Upload study notes (PDF / markdown) to chapters and toggle **Free Sample** status (one free chapter per subject).
- **A3 (Must):** Create products and configure prices for each product type (`CHAPTER_NOTES`, `SUBJECT_PACK`, `MONTHLY_PASS`, `ANNUAL_PASS`, `BUNDLE`).
- **A4 (Must):** Filterable orders and payments table (by status: `PAID`, `PENDING`, `FAILED` and date range) with search and payment audit logs.
- **A5 (Should):** Create, toggle, and manage discount coupons (flat/percentage, minimum order, usage limits).
- **A6 (Should):** Manually grant or revoke student access with a **mandatory logged reason**.
- **A7 (Should):** Analytics dashboard: revenue by day (7-day chart), top selling products, active pass subscribers, and user metrics.

---

## 📐 Key Design Decisions

### 1. Entitlements-First Access Control
*Requirement: "Access checks read entitlements; they do not re-derive access from old orders on every request."*
- When an order is settled (or access granted manually), the server issues rows in the `Entitlement` table with an indexed compound key `(userId, accessType, targetId)`.
- Reading protected study materials calls `checkChapterAccess(userId, chapterId)`. This reads active entitlements directly:
  - If chapter is marked `isFree: true` → Unlocked (sign-in required).
  - If user owns an active `CLASS` entitlement for the parent class → Unlocked.
  - If user owns a `SUBJECT` entitlement for the parent subject → Unlocked.
  - If user owns a `CHAPTER` entitlement for the chapter → Unlocked.
  - Otherwise → Returns **HTTP 403 Forbidden** with `{ error: 'LOCKED' }`.

### 2. Money Stored in Integers (Paise)
*Requirement: "Store amounts as integers in paise, never as floats."*
- All prices, upgrade credits, discounts, taxes, and totals across the database, API routes, and Razorpay calls are strictly stored as integers in **paise** (`₹49 = 4900 paise`, `₹499 = 49900 paise`, `₹299 = 29900 paise`, `₹2,499 = 249900 paise`).
- This completely eliminates floating-point rounding errors.

### 3. Subject Pack Upgrades
*Requirement: "A student who owns some chapters of a subject sees the subject pack price reduced by what they already paid for those chapters (never below 0)."*
- When computing prices for a `SUBJECT_PACK`, `calculateUpgradeCredit()` queries all paid order items the student has for `CHAPTER_NOTES` in that subject.
- The amount already paid is subtracted from the subject pack base price. The final price can never fall below 0.
- Example: Student previously purchased Chapter 1 for ₹49. When viewing the Subject Pack (₹499), the price is dynamically discounted to **₹450**!

### 4. Overlapping Purchases Prevention
*Requirement: "A student who owns a subject pack must not be offered a chapter inside it. A student with an active pass sees everything in that class as unlocked."*
- The cart and catalogue check user ownership:
  - If a student owns a subject pack, chapters in that subject display "Included in Subject Pack" and are blocked from cart addition.
  - If a student has an active class pass, individual subjects and chapters display "Unlocked via Class Pass".
  - If overlapping items are added, `/api/cart/calculate` auto-removes them and surfaces a friendly notification.

### 5. Time-Bound Passes & Extension on Renewal
*Requirement: "Monthly and annual access ends at the expiry time. Buying again before expiry extends from the old expiry date."*
- Monthly passes grant 30 days (`30 * 86,400,000 ms`); Annual passes grant 365 days.
- If a student purchases another pass while their existing pass is still active (`validUntil > now`), the new duration is added to `existing.validUntil` instead of resetting from today.

### 6. Inclusive 18% GST Compliance
*Requirement: "Show prices inclusive of 18% GST and show the GST split on the invoice."*
- Given an inclusive total $T$:
  $$\text{Base Taxable Amount} = \text{round}\left(\frac{T}{1.18}\right)$$
  $$\text{Total GST} = T - \text{Base Amount}$$
  $$\text{CGST (9\%)} = \text{round}\left(\frac{\text{Total GST}}{2}\right), \quad \text{SGST (9\%)} = \text{Total GST} - \text{CGST}$$
- The split is calculated in `src/lib/pricing.ts` and shown itemized on the checkout cart and the printable GST tax invoice.

### 7. Dual Database Engine Flexibility
- Works out-of-the-box with zero setup using **SQLite** (`dev.db`).
- Fully compatible with **PostgreSQL** (Docker Compose provided: `docker-compose.yml`).
- Switching between Postgres and SQLite is a 1-second script: `npm run db:use-postgres` or `npm run db:use-sqlite`.

---

## 📊 Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    User ||--o{ Order : places
    User ||--o{ Entitlement : holds
    User ||--o{ ManualAccessLog : admin_or_target

    Board ||--o{ Class : contains
    Class ||--o{ Subject : contains
    Class ||--o{ Product : has_pass
    Subject ||--o{ Chapter : contains
    Subject ||--o{ Product : has_pack
    Chapter ||--o{ Material : holds
    Chapter ||--o{ Product : has_notes

    Product ||--o{ Price : priced_at
    Product ||--o{ OrderItem : included_in

    Coupon ||--o{ Order : discounts
    Order ||--o{ OrderItem : contains
    Order ||--o{ Payment : records
    Order ||--o{ Entitlement : grants

    User {
        string id PK
        string email UK
        string passwordHash
        string name
        string role "STUDENT | ADMIN"
        datetime createdAt
    }

    Board {
        string id PK
        string name "CBSE"
        string slug UK
    }

    Class {
        string id PK
        string boardId FK
        string name "Class 10 | Class 12"
        int gradeNumber
    }

    Subject {
        string id PK
        string classId FK
        string name "Physics | Chemistry | Math"
        string slug
    }

    Chapter {
        string id PK
        string subjectId FK
        string name
        int chapterNumber
        boolean isFree
    }

    Material {
        string id PK
        string chapterId FK
        string title
        string type "PDF | VIDEO | QUIZ"
        string content
    }

    Product {
        string id PK
        string type "CHAPTER_NOTES | SUBJECT_PACK | MONTHLY_PASS | ANNUAL_PASS | BUNDLE"
        string title
        int accessLengthDays "null = Lifetime"
    }

    Price {
        string id PK
        string productId FK
        int amountPaise "Integer in paise"
        string currency "INR"
    }

    Coupon {
        string id PK
        string code UK
        string discountType "FLAT | PERCENTAGE"
        int discountValue
        int maxUses
        int usedCount
    }

    Order {
        string id PK
        string orderNumber UK
        string userId FK
        int subtotalPaise
        int upgradeCreditPaise
        int discountPaise
        int taxPaise "18% GST"
        int totalPaise
        string status "CREATED | PENDING | PAID | FAILED"
        string razorpayOrderId UK
    }

    OrderItem {
        string id PK
        string orderId FK
        string productId FK
        int unitPricePaise
        int upgradeCreditPaise
        int finalPricePaise
        string title
    }

    Payment {
        string id PK
        string orderId FK
        string razorpayPaymentId UK
        string razorpayOrderId
        int amountPaise
        string status "PENDING | SUCCESS | FAILED"
        string signature
    }

    WebhookEvent {
        string id PK
        string eventId UK
        string eventType
        string payloadJson
        boolean isProcessed
    }

    Entitlement {
        string id PK
        string userId FK
        string accessType "CHAPTER | SUBJECT | CLASS"
        string targetId
        datetime validFrom
        datetime validUntil "null = Lifetime"
        boolean isActive
    }

    ManualAccessLog {
        string id PK
        string adminId FK
        string targetUserId FK
        string action "GRANT | REVOKE"
        string accessType
        string targetId
        string reason "Mandatory audit explanation"
        datetime createdAt
    }
```

---

## 💳 Razorpay Payment Architecture

```
Student Browser              Your Server + DB                 Razorpay
       |                            |                            |
       | 1. Send Cart               |                            |
       |--------------------------->|                            |
       |                            | 2. Recompute total from DB |
       |                            |    Create Razorpay Order   |
       |                            |--------------------------->|
       | 3. Return order_id         |<---------------------------|
       |<---------------------------|                            |
       |                            |                            |
       | 4. Open Checkout (UPI / Card)                           |
       |-------------------------------------------------------->|
       | 5. Return payment_id & HMAC signature                   |
       |<--------------------------------------------------------|
       |                                                         |
       | 6. Post payment_id & signature                          |
       |--------------------------->|                            |
       |                            | 7. Webhook: payment.captured (if tab closed)
       |                            |<---------------------------|
       |                            |                            |
       |                            | [Check HMAC & Amount]      |
       |                            | [Grant Access Once]        |
       |                            |                            |
       | 8. Instant Unlock          |                            |
       |<---------------------------|                            |
```

### Idempotency Guarantee
- Both **Step 6** (client callback) and **Step 7** (webhook) can arrive in either order, more than once.
- `settleSuccessfulPayment()` checks if the order is already marked `PAID`.
- If already paid, it updates payment audit records but avoids duplicate entitlement creation or double-counting revenue.

### Amount Verification
- Before granting access, the paid amount is verified to match `order.totalPaise` to the exact paise. Tampered amounts are rejected and logged.

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- **Node.js**: v18+ (v22 recommended)
- **npm**: v9+

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone <repo-url>
cd "ed store"
npm install
```

### 3. Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env
```
Default `.env` configuration (ready to run):
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="edtech-secure-jwt-secret-key-32-chars-long-development"
RAZORPAY_KEY_ID="rzp_test_placeholderKey"
RAZORPAY_KEY_SECRET="placeholderSecretKey123"
RAZORPAY_WEBHOOK_SECRET="placeholderWebhookSecret123"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_placeholderKey"
```

### 4. Database Setup & Seeding
Push the database schema and populate seed data:
```bash
npm run prisma:push
npm run seed
```

*(Optional: If running with PostgreSQL via Docker)*
```bash
docker compose up -d
npm run db:use-postgres
npm run prisma:push
npm run seed
```

### 5. Start the Application
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 🧪 Automated Test Suite

Run the full automated test suite using Vitest:
```bash
npm test
```

### Verified Test Cases (23 Passing Tests)
1. **Price Calculation (`tests/pricing.test.ts`)**:
   - 18% inclusive GST calculation on ₹49 (4900 paise → 4153 base + 747 tax).
   - 18% inclusive GST calculation on ₹499 (49900 paise → 42288 base + 7612 tax).
   - Flat coupon discount with minimum order threshold.
   - Percentage coupon discount with maximum discount cap.
   - Rejection of expired, disabled, or limit-exhausted coupons.
2. **Signature Verification (`tests/signature.test.ts`)**:
   - HMAC-SHA256 signature verification matching `order_id + "|" + payment_id`.
   - Rejection of tampered signatures.
   - Rejection of tampered payment IDs or order IDs.
   - Webhook raw body signature verification with `X-Razorpay-Signature`.
3. **Idempotency & Webhooks (`tests/webhooks.test.ts`)**:
   - Successful settlement on first arrival granting entitlements.
   - Duplicate arrival idempotency (access granted exactly once, order not counted twice).
   - Amount check: tampered or underpaid amounts rejected and logged.
4. **Access Checks (`tests/access.test.ts`)**:
   - Free sample chapter accessible to signed-in students.
   - Server strictly refuses locked content (HTTP 403 Forbidden).
   - Chapter entitlement unlocks chapter.
   - Subject pack entitlement unlocks all chapters in that subject.
   - Class pass entitlement unlocks all chapters across all subjects in that class.
   - Expired pass access refused.
   - Renewal extension: purchasing before expiry extends from old expiry date.

---

## 👤 Seed Accounts & Test Credentials

The database comes pre-seeded with:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Student** | `student@edstore.com` | `Student@123` | Rahul Sharma (Student Account) |
| **Admin** | `admin@edstore.com` | `Admin@123` | Admin Instructor (Full Admin Console Access) |

> 💡 **Quick Switcher:** Click the **"🧑‍🎓 Student Mode"** or **"👑 Admin Mode"** pills in the top banner of the app to switch accounts instantly with 1-click!

### Catalogue Seed Data
- **1 Board:** CBSE
- **2 Classes:** Class 10, Class 12
- **6 Subjects:** Mathematics, Science, Social Science (Class 10); Physics, Chemistry, Mathematics (Class 12)
- **30 Chapters:** 5 chapters per subject. **Chapter 1 of every subject is marked as a Free Sample.**
- **Products:**
  - Chapter Notes: **₹49** (Lifetime)
  - Subject Pack: **₹499** (Lifetime, includes future chapters)
  - Monthly Class Pass: **₹299** (30 Days)
  - Annual Class Pass: **₹2,499** (365 Days)
  - Class 12 STEM All-Subject Mega Bundle: **₹1,199** (Lifetime)

### Active Coupons
- `WELCOME50`: Flat ₹50 off (min. order ₹99)
- `EDTECH20`: 20% off up to ₹200 (min. order ₹150)
- `PASS500`: Flat ₹500 off on Class Passes (min. order ₹2,000)

---

## 🎥 5-Minute Walkthrough Guide

Follow these steps for the review call or video recording:

1. **Step 1: Student buys a Chapter by UPI (`success@razorpay`)**
   - Click **"🧑‍🎓 Student Mode"** in the top banner.
   - Browse to **Class 12 → Physics**.
   - Note Chapter 1 is marked **"Free Sample"** (click to read notes).
   - Click **"Buy ₹49"** on Chapter 2 (*Electrostatic Potential*).
   - Go to Cart (`/cart`), enter coupon `WELCOME50` (or skip), review the 18% GST split.
   - Click **"Pay with Razorpay"**.
   - In the Razorpay modal, click **"success@razorpay"**.
   - Verified immediately! Redirects to **"My Library"** showing the unlocked chapter.

2. **Step 2: Failed UPI Payment (`failure@razorpay`)**
   - Add another chapter to Cart.
   - In the Razorpay modal, click **"failure@razorpay"**.
   - Notice the order is marked **FAILED**, access is refused, and the student can retry.

3. **Step 3: Upgrade to Subject Pack (Credit Applied)**
   - Go back to **Class 12 Physics**.
   - Because Chapter 2 was purchased for ₹49, notice the Physics Subject Pack now shows:
     **"Upgrade: ₹450"** (strikethrough ₹499 with ₹49 credit applied)!
   - Add the Subject Pack to Cart and complete checkout.
   - All 5 chapters in Physics are now unlocked!

4. **Step 4: Monthly Class Pass & Order Invoice**
   - Buy the **Class 12 All-Access Monthly Pass (₹299)**.
   - Go to **"Orders & Invoices"** (`/orders`).
   - Click **"Download / Print GST Invoice"** to open the official tax invoice with the 18% CGST/SGST split and SAC Code 9992.
   - Check **"My Library"** to see the 30-day countdown timer.

5. **Step 5: Admin Orders View & Analytics**
   - Click **"👑 Admin Mode"** in the top banner.
   - View **Dashboard**: 7-day revenue chart, top selling products, active passes count.
   - View **Orders & Payments**: Filter by `PAID`, `FAILED`, or date range.
   - View **Manual Access Logs**: Demonstrate granting or revoking access with a logged audit reason.
