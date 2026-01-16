# Chakki.pk - Project Analysis

## Executive Summary

**Chakki.pk** is a production-ready wholesale eCommerce platform built with Next.js 14 (App Router), specializing in grains and daily essentials for the Pakistani market. The application features a comprehensive admin panel, user authentication, order management, delivery area tracking, and product analytics.

---

## Technology Stack

### Core Framework
- **Next.js 14.2.9** (App Router) - React framework with server-side rendering
- **TypeScript 5.6.3** - Type-safe development
- **React 18.3.1** - UI library

### Database & ORM
- **MongoDB** - NoSQL database
- **Mongoose 8.7.0** - ODM for MongoDB

### Authentication
- **NextAuth 5.0.0-beta.25** - Authentication with:
  - Google OAuth provider
  - Credentials provider (email/password)
  - JWT session strategy

### State Management
- **Zustand 4.5.5** - Lightweight state management (cart, wishlist)
- **SWR 2.2.5** - Data fetching and caching
- **TanStack React Query 5.59.7** - Server state management

### UI & Styling
- **Tailwind CSS 3.4.13** - Utility-first CSS framework
- **Framer Motion 11.3.31** - Animation library
- **Lucide React 0.460.0** - Icon library
- **Sonner 1.5.0** - Toast notifications

### Validation & Utilities
- **Zod 3.23.8** - Schema validation
- **bcryptjs 2.4.3** - Password hashing
- **Nodemailer 7.0.11** - Email sending

---

## Project Structure

```
fresh/
├── app/                    # Next.js App Router
│   ├── admin/             # Admin dashboard pages
│   │   ├── accounts/      # Financial management (cashbook, expenses, journal, reports)
│   │   ├── categories/    # Category management
│   │   ├── delivery/      # Delivery area management
│   │   ├── orders/        # Order management
│   │   ├── products/      # Product CRUD (new, edit)
│   │   ├── requests/      # User requests management
│   │   ├── transactions/  # Transaction history
│   │   └── users/         # User management
│   ├── api/               # API routes
│   │   ├── account/       # User account operations
│   │   ├── accounts/      # Financial accounts
│   │   ├── admin/         # Admin operations
│   │   ├── auth/          # Authentication endpoints
│   │   ├── cart/          # Shopping cart API
│   │   ├── categories/    # Category API
│   │   ├── delivery-areas/# Delivery area API
│   │   ├── orders/        # Order API
│   │   ├── products/      # Product API
│   │   └── wishlist/      # Wishlist API
│   ├── auth/              # Auth pages (login, signup, verify)
│   ├── components/        # React components
│   │   ├── admin/         # Admin-specific components
│   │   ├── cart/          # Cart components
│   │   ├── home/          # Homepage components
│   │   ├── layout/        # Layout components (Header, Footer)
│   │   └── product/       # Product display components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   └── page.tsx           # Homepage
├── models/                # Mongoose schemas
├── store/                 # Zustand stores
├── public/                # Static assets
└── scripts/               # Utility scripts (seed.ts)
```

---

## Key Features

### 1. Product Management
- **Multi-variant products** with different units (kg, g, half_kg, quarter_kg, l, ml, pcs, pack, unit)
- **Hierarchical categories** (category → subCategory → subSubCategory)
- **Price tiers** for bulk pricing
- **Stock management** per variant
- **Product analytics** (views, sales, revenue, trending score)
- **Related products** system
- **Discount badges** (e.g., "10% OFF")
- **Image upload** via URL (no file upload)

### 2. User Authentication & Authorization
- **Multi-provider auth**: Google OAuth + Email/Password
- **Email verification** required for login
- **Role-based access**: USER, ADMIN, CADMIN
- **Admin allowlist** via environment variable
- **Password reset** flow
- **Account deletion** functionality

### 3. Shopping Cart
- **Dual storage**: Server-side (logged-in users) + localStorage (guests)
- **Cart synchronization** between client and server
- **Persistent cart** using Zustand with localStorage
- **Cart API** for server-side persistence

### 4. Order Management
- **Payment methods**: COD, JazzCash, EasyPaisa
- **Delivery types**: STANDARD, EXPRESS
- **COD delivery fee** logic:
  - First COD order: Free delivery
  - Subsequent orders: Configurable fee
- **Order statuses**: PENDING → CONFIRMED → SHIPPING_IN_PROCESS → SHIPPED → DELIVERED → CANCELLED
- **Order email notifications**
- **Order tracking** by phone number (public)

### 5. Delivery Area Management
- **Two delivery types**:
  - **Range-based**: Radius from shop location
  - **City-based**: Entire city delivery
- **Distance calculation** using Haversine formula
- **Location validation** before order placement
- **Google Maps integration** for geocoding
- **User delivery location** saving

### 6. Admin Dashboard
- **Product CRUD** with advanced variant management
- **Order management** with status updates
- **User management** with role assignment
- **Category management** (hierarchical)
- **Delivery area configuration**
- **Financial management**:
  - Cashbook
  - Expenses
  - Journal entries
  - Reports
- **Transaction history**
- **User requests** management
- **Analytics** endpoints

### 7. Product Analytics
- **Real-time tracking**:
  - `totalSales`: Total quantity sold
  - `totalRevenue`: Total revenue generated
  - `recentSales`: Sales in last 7 days
  - `recentRevenue`: Revenue in last 7 days
  - `viewCount`: Product page views
  - `lastSoldAt`: Last sale timestamp
  - `trendingScore`: Calculated trending metric
- **Automatic updates** on order creation
- **View tracking** on product page visits

### 8. Homepage Features
- **Category slider** (horizontal scrollable)
- **Product sections**:
  - Flash Deals
  - Trending Now
  - Best Sellers
  - Featured Products
  - Special Offers
  - New Arrivals
- **Deduplication** to prevent products appearing in multiple sections
- **Mobile-optimized** search bar

### 9. POS (Point of Sale)
- **POS register** for in-store sales
- **POS sales tracking**
- **Product analytics** integration

### 10. Additional Features
- **Wishlist** functionality
- **Product reviews** system
- **Request system** (out of stock, delivery area)
- **Settings** management
- **SEO optimization** with structured data
- **Email templates** for various notifications
- **Error handling** with error dialog context

---

## Data Models

### Product Schema
```typescript
{
  slug: string (unique)
  title: string
  description: string
  brand?: string
  category?: string
  subCategory?: string
  subSubCategory?: string
  badges: string[]
  images: string[]
  moq: number (default: 1)
  isWholesale: boolean (default: true)
  inStock: boolean
  popularity: number
  mainPrice?: number
  mainPriceUnit?: string
  // Analytics
  totalSales: number
  totalRevenue: number
  recentSales: number
  recentRevenue: number
  viewCount: number
  lastSoldAt?: Date
  trendingScore: number
  variants: Variant[]
  tiers: Tier[]
  relatedProducts: ObjectId[] (ref: Product)
}
```

### Variant Schema
```typescript
{
  label: string
  unitWeight: number
  unit: 'kg' | 'g' | 'half_kg' | 'quarter_kg' | 'l' | 'ml' | 'pcs' | 'pack' | 'unit'
  sku: string (unique)
  pricePerKg: number
  costPerKg: number
  stockQty: number
}
```

### Order Schema
```typescript
{
  userId: string
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPING_IN_PROCESS' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  paymentMethod: 'COD' | 'JAZZCASH' | 'EASYPAISA'
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED'
  isFirstCodFree: boolean
  items: OrderItem[]
  totalAmount: number
  deliveryFee: number
  deliveryType: 'STANDARD' | 'EXPRESS'
  shippingName: string
  shippingPhone: string
  shippingAddress: string
  city: string
  paymentReference?: string
  paymentProofDataUrl?: string
  // Refund fields
  refunded: boolean
  refundedAt?: Date
  refundAmount: number
  refundMethod?: string
  refundAccountNumber?: string
}
```

### User Schema
```typescript
{
  name?: string
  email: string (unique, sparse)
  image?: string
  phone: string
  role: 'USER' | 'ADMIN' | 'CADMIN'
  passwordHash: string
  emailVerified: boolean
  verificationToken: string
  paymentMethods: {
    jazzcash: { accountName, accountNumber, bankName }
    easypaisa: { accountName, accountNumber, bankName }
    other: Array<{ bankName, accountName, accountNumber }>
  }
}
```

### Category Schema
```typescript
{
  name: string
  slug: string
  image: string
  description: string
  displayOrder: number
  isActive: boolean
  parentCategory?: ObjectId (ref: Category)
  level: number (0 = main, 1 = sub, 2 = sub-sub)
}
```

---

## API Architecture

### Standardized Response Format
All API endpoints return:
```typescript
{
  success: boolean
  message: string
  data?: any
  errors?: any
}
```

### Key API Endpoints

#### Products (`/api/products`)
- `GET`: Search, filter, paginate products
  - Query params: `q`, `category`, `brand`, `minPrice`, `maxPrice`, `inStock`, `sort`, `page`, `limit`
  - Special: `suggest=1` for autocomplete
- `POST`: Create product (admin only)

#### Products by ID (`/api/products/[id]`)
- `GET`: Get single product
- `PUT`: Update product (admin only)
- `DELETE`: Delete product (admin only)

#### Orders (`/api/orders`)
- `GET`: List orders (authenticated) or by phone (public)
- `POST`: Create order (authenticated)

#### Cart (`/api/cart`)
- `GET`: Get user cart
- `POST`: Add to cart
- `PUT`: Update cart item
- `DELETE`: Remove cart item

#### Categories (`/api/categories`)
- `GET`: List categories (supports `hierarchical=1`)
- `POST`: Create category (admin)

#### Delivery Areas (`/api/delivery-areas`)
- `GET`: List delivery areas
- `POST`: Create delivery area (admin)
- `PUT`: Update delivery area (admin)

---

## Security Features

1. **Authentication**: NextAuth with JWT sessions
2. **Authorization**: Role-based access control (RBAC)
3. **Password Security**: bcryptjs hashing
4. **Email Verification**: Required before login
5. **Input Validation**: Zod schemas for all inputs
6. **CORS**: Configured for API routes
7. **Admin Protection**: Server-side route guards
8. **SQL Injection Prevention**: Mongoose parameterized queries
9. **XSS Prevention**: React's built-in escaping

---

## Performance Optimizations

1. **MongoDB Connection Caching**: Global connection pool
2. **Server-Side Rendering**: Next.js App Router
3. **Image Optimization**: Next.js Image component
4. **Code Splitting**: Automatic with Next.js
5. **SWR Caching**: Client-side data caching
6. **Zustand Persistence**: localStorage for cart
7. **Dynamic Imports**: Lazy loading for heavy components
8. **Aggregation Pipelines**: Efficient MongoDB queries

---

## UI/UX Features

1. **Responsive Design**: Mobile-first approach
2. **Animations**: Framer Motion for smooth transitions
3. **Toast Notifications**: Sonner for user feedback
4. **Loading States**: Route loader component
5. **Error Handling**: Error dialog context
6. **Search**: Real-time product search
7. **Filters**: Category, brand, price range, stock status
8. **Sorting**: Price, popularity, newest
9. **Cart Drawer**: Slide-out cart on mobile
10. **Location Picker**: Google Maps integration

---

## Business Logic Highlights

### Product Variant Pricing
- **Proportional pricing**: When main variant price changes, other variants auto-calculate based on unit conversion
- **Unit conversion**: Automatic conversion between compatible units (kg ↔ g, l ↔ ml, etc.)
- **Base unit storage**: All weights stored in base units (kg for weight, l for volume)

### Order Delivery Fee Logic
```typescript
// First COD order: Free
// Subsequent COD orders: Configurable fee (default: 200)
// Express delivery: 500
// Standard delivery: 200
```

### Product Analytics Calculation
- **Trending Score**: Based on recent sales velocity
- **Auto-updates**: On order creation and product views
- **7-day window**: Recent sales/revenue tracking

### Delivery Area Validation
- **Haversine formula**: Distance calculation between coordinates
- **Radius-based**: Delivery within X km from shop
- **City-based**: Entire city delivery
- **Pre-order validation**: Checks before order placement

---

## Environment Variables Required

```env
# Database
MONGODB_URI=mongodb://...
MONGODB_DB=chakki_pk

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Admin
ADMIN_EMAILS=admin@example.com,admin2@example.com

# Delivery
COD_FREE_DELIVERY_FIRST_ORDER=true
COD_DEFAULT_DELIVERY_FEE=200

# Email (for Nodemailer)
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
```

---

## Code Quality & Best Practices

### Strengths
1. ✅ **Type Safety**: Full TypeScript coverage
2. ✅ **Validation**: Zod schemas for all inputs
3. ✅ **Error Handling**: Comprehensive try-catch blocks
4. ✅ **Code Organization**: Clear separation of concerns
5. ✅ **Reusability**: Shared components and utilities
6. ✅ **Documentation**: Inline comments for complex logic
7. ✅ **Security**: Proper authentication/authorization
8. ✅ **Performance**: Optimized queries and caching

### Areas for Improvement
1. ⚠️ **Testing**: No test files found (unit/integration tests)
2. ⚠️ **Error Logging**: Consider structured logging (e.g., Winston, Pino)
3. ⚠️ **API Rate Limiting**: No rate limiting on API routes
4. ⚠️ **Image Upload**: Currently URL-only; could add file upload
5. ⚠️ **Caching Strategy**: Could implement Redis for session/cache
6. ⚠️ **Monitoring**: No APM or error tracking (e.g., Sentry)
7. ⚠️ **Documentation**: API documentation could be auto-generated (Swagger/OpenAPI)

---

## Deployment Considerations

### Vercel (Recommended)
- Next.js optimized
- Automatic deployments
- Environment variable management
- Edge functions support

### Database
- MongoDB Atlas (cloud) or self-hosted
- Connection pooling configured
- Indexes on frequently queried fields

### Email Service
- Nodemailer configured
- SMTP credentials required
- Email templates for notifications

---

## Scalability Considerations

1. **Database Indexing**: Ensure indexes on:
   - Product: `slug`, `category`, `brand`, `popularity`
   - Order: `userId`, `status`, `createdAt`
   - User: `email`

2. **Caching Strategy**: Consider Redis for:
   - Session storage
   - Product cache
   - Category cache

3. **CDN**: Use for static assets and images

4. **Load Balancing**: For high traffic

5. **Database Sharding**: If MongoDB grows large

---

## Known Issues & Technical Debt

1. **Product Edit Page**: Complex variant management logic could be refactored
2. **Unit Conversion**: Multiple conversion functions scattered
3. **Delivery Validation**: Complex logic in order route (could be extracted)
4. **Email Templates**: HTML strings in code (could use template engine)
5. **Error Messages**: Some hardcoded strings (could be i18n)

---

## Recommendations

### Short-term
1. Add unit tests for critical business logic
2. Implement API rate limiting
3. Add structured logging
4. Create API documentation

### Medium-term
1. Add file upload for product images
2. Implement Redis caching
3. Add error tracking (Sentry)
4. Refactor complex components

### Long-term
1. Add internationalization (i18n)
2. Implement GraphQL API (optional)
3. Add real-time notifications (WebSockets)
4. Mobile app API preparation

---

## Conclusion

Chakki.pk is a well-structured, production-ready eCommerce platform with comprehensive features for wholesale grain and essentials sales. The codebase demonstrates good practices in TypeScript, Next.js App Router usage, and MongoDB integration. The application is ready for deployment with proper environment configuration.

**Overall Assessment**: ⭐⭐⭐⭐ (4/5)
- Strong architecture and code organization
- Comprehensive feature set
- Good security practices
- Needs testing and monitoring infrastructure

