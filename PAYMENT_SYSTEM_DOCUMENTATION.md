# 💰 NutriChain Payment System Documentation

**Sistem Pembayaran Blockchain Escrow + Xendit untuk Program MBG (Makan Bergizi Gratis)**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup & Installation](#setup--installation)
4. [API Endpoints](#api-endpoints)
5. [Flow Examples](#flow-examples)
6. [Database Schema](#database-schema)
7. [Blockchain Events](#blockchain-events)
8. [Response Examples](#response-examples)

---

## Overview

### Program: MBG (Makan Bergizi Ga Bocor)

Program pemerintah untuk distribusi makanan bergizi ke sekolah dengan transparansi blockchain.

### Pilar Utama

**Escrow Blockchain**: Dana pemerintah di-lock di smart contract, tidak pernah di-tangan sekolah

**Roles**:
- **Pemerintah/Dinas**: Payer (pengirim dana)
- **Sekolah**: Verifier (konfirmasi penerimaan)
- **Catering**: Payee (penerima dana)

### Flow Pembayaran

```
1. Admin Dinas lock dana → Smart Contract Escrow
2. Katering kirim makanan ke sekolah
3. Sekolah login portal, cek delivery
4. Sekolah klik "Konfirmasi Penerimaan"
5. Backend trigger releaseEscrow() → Dana to Catering
6. Event listener capture PaymentReleased → Update DB
7. Public Dashboard update secara real-time
```

---

## Architecture

### Tech Stack

```
├── Smart Contract Layer
│   └── NutriChainEscrow.sol (Solidity, Polygon L2)
│
├── Backend Layer
│   ├── Node.js + Express.js
│   ├── Services:
│   │   ├── blockchainPaymentService.ts (Ethers.js integration)
│   │   ├── xenditPaymentService.ts (Xendit API integration)
│   │   └── blockchainEventListener.ts (Event monitoring)
│   │
│   └── Routes:
│       ├── adminPaymentRoutes.ts (Lock escrow)
│       ├── schoolPaymentRoutes.ts (Confirm delivery)
│       ├── publicPaymentRoutes.ts (Transparency dashboard)
│       └── webhookRoutes.ts (Xendit & Blockchain webhooks)
│
├── Database Layer
│   └── PostgreSQL with Payment System Tables
│
└── Frontend Layer
    └── Socket.IO listener untuk real-time updates
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    NUTRICHAIN ECOSYSTEM                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   DINAS APP  │    │  SCHOOL APP  │    │ CATERING APP │ │
│  │ (Admin)      │    │ (Verifier)   │    │ (Vendor)     │ │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘ │
│         │                    │                    │        │
│         └────────────────────┼────────────────────┘        │
│                              │                             │
│                       ┌──────▼──────┐                      │
│                       │ BACKEND API │                      │
│                       └──────┬──────┘                      │
│                              │                             │
│         ┌────────────────────┼────────────────────┐        │
│         │                    │                    │        │
│    ┌────▼────┐         ┌─────▼──────┐      ┌────▼────┐   │
│    │ BLOCKCHAIN   │      │  XENDIT   │      │ DATABASE │   │
│    │ ESCROW SC    │      │   API     │      │ POSTGRESQL   │
│    └────┬────┘         └─────┬──────┘      └────┬────┘   │
│         │                    │                    │        │
│         └────────────────────┼────────────────────┘        │
│                              │                             │
│                    ┌─────────▼─────────┐                   │
│                    │  PUBLIC DASHBOARD │                   │
│                    │  (Transparency)   │                   │
│                    └───────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Setup & Installation

### 1. Environment Configuration

Buat `.env` file di folder `backend/`:

```bash
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mbg_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Blockchain
BLOCKCHAIN_RPC_URL=https://rpc-mumbai.maticvigil.com
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
ADMIN_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
ADMIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Xendit
XENDIT_SECRET_KEY=xnd_development_IkPiJypdizXKeU0Wk9svMxrC88XhRGZF2rOgEJ2GqXkXztxo3ppYZ5YXwm6dqU
XENDIT_PUBLIC_KEY=xnd_public_development_uIbhxYYHtPiIOpYY2k6DdxOD6CQvkAgpq9ABLa94dW7_7PMEHdxSTZyFO9Mecs
XENDIT_WEBHOOK_TOKEN=your-webhook-token

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# CORS
FRONTEND_URL=http://localhost:3000
```

### 2. Database Setup

```bash
# Apply migrations
cd backend
npm run migrate

# Jalankan migration 004 untuk payment system
psql -U postgres -d mbg_db -f ../database/migrations/004_add_payment_system.sql
```

### 3. Install Dependencies

```bash
cd backend

# Install required packages
npm install ethers@6 axios dotenv socket.io multer uuid

# Install type definitions
npm install -D @types/express @types/node @types/uuid
```

### 4. Smart Contract Deployment

```bash
cd blockchain

# Install dependencies
npm install

# Compile contract
npx hardhat compile

# Deploy ke testnet (mumbai)
npx hardhat run scripts/deployEscrow.ts --network polygonMumbai

# Save contract address ke .env
# CONTRACT_ADDRESS=0x...
```

### 5. Start Services

```bash
# Terminal 1: Backend API
cd backend
npm run dev

# Terminal 2: Event Listener (background service)
npm run listener

# Terminal 3: Frontend (if needed)
cd frontend
npm run dev
```

---

## API Endpoints

### Admin Routes: `/api/admin/`

#### POST `/api/admin/escrow/lock`

**Lock dana ke smart contract escrow**

```http
POST /api/admin/escrow/lock
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "schoolId": 1,
  "cateringId": 5,
  "amount": 15000000,
  "portions": 100,
  "deliveryDate": "2024-11-20",
  "notes": "Standard delivery"
}
```

**Response 201**:
```json
{
  "success": true,
  "message": "Fund locked to escrow successfully",
  "data": {
    "allocationId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "LOCKED",
    "amount": 15000000,
    "currency": "IDR",
    "blockchainTxHash": "0x1234567890abcdef...",
    "blockchainBlockNumber": 12345678,
    "xenditInvoiceId": "invoice_123456",
    "xenditInvoiceUrl": "https://checkout.xendit.co/web/...",
    "lockedAt": "2024-11-20T10:30:00Z"
  }
}
```

#### GET `/api/admin/allocations`

```http
GET /api/admin/allocations?page=1&limit=10&status=LOCKED
Authorization: Bearer {jwt_token}
```

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "allocation_id": "550e8400-e29b-41d4-a716-446655440000",
      "school_id": 1,
      "catering_id": 5,
      "school_name": "SDN Jakarta Utama",
      "catering_name": "PT Makan Sehat",
      "amount": 15000000,
      "currency": "IDR",
      "status": "LOCKED",
      "tx_hash_lock": "0x1234567890abcdef...",
      "locked_at": "2024-11-20T10:30:00Z",
      "created_at": "2024-11-20T10:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

---

### School Routes: `/api/school/`

#### GET `/api/school/deliveries`

**List deliveries untuk sekolah**

```http
GET /api/school/deliveries
Authorization: Bearer {jwt_token}
```

**Response 200**:
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "allocation_id": 1,
      "delivery_date": "2024-11-20",
      "portions": 100,
      "amount": 15000000,
      "status": "scheduled",
      "blockchain_alloc_id": "550e8400-e29b-41d4-a716-446655440000",
      "allocation_status": "LOCKED",
      "catering_name": "PT Makan Sehat",
      "catering_phone": "081234567890",
      "confirmation_status": null
    }
  ]
}
```

#### POST `/api/school/deliveries/:deliveryId/confirm`

**Konfirmasi penerimaan makanan (CRITICAL ENDPOINT)**

```http
POST /api/school/deliveries/1/confirm
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

{
  "isOk": true,
  "portionsReceived": 100,
  "qualityRating": 5,
  "notes": "Makanan segar dan berkualitas"
}

# Optional: upload foto
file: <photo.jpg>
```

**Response 200**:
```json
{
  "success": true,
  "message": "Delivery confirmed, escrow released",
  "data": {
    "deliveryId": 1,
    "allocationId": "550e8400-e29b-41d4-a716-446655440000",
    "confirmationStatus": "APPROVED",
    "releasedAmount": 15000000,
    "blockchainTxHash": "0xabcdef1234567890...",
    "blockchainBlockNumber": 12345679,
    "confirmedAt": "2024-11-20T14:30:00Z"
  }
}
```

#### GET `/api/school/payments`

**Payment history untuk sekolah**

```http
GET /api/school/payments
Authorization: Bearer {jwt_token}
```

---

### Public Routes: `/api/public/` (No Auth Required)

#### GET `/api/public/payment-feed`

**Get public payment feed (Transparency Dashboard)**

```http
GET /api/public/payment-feed?page=1&limit=20&region=DKI%20Jakarta
```

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "school_name": "SDN Jakarta Utama",
      "school_region": "DKI Jakarta",
      "catering_name": "PT Makan Sehat",
      "amount": 15000000,
      "currency": "IDR",
      "portions_count": 100,
      "delivery_date": "2024-11-20",
      "status": "COMPLETED",
      "blockchain_tx_hash": "0xabcdef1234567890...",
      "blockchain_block_number": 12345679,
      "released_at": "2024-11-20T14:30:00Z",
      "created_at": "2024-11-20T14:32:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  },
  "metadata": {
    "timestamp": "2024-11-20T15:00:00Z",
    "source": "Blockchain Event Feed",
    "transparency": "Full"
  }
}
```

#### GET `/api/public/statistics`

**Payment statistics untuk dashboard**

```http
GET /api/public/statistics
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalPayments": 156,
      "totalAmountDistributed": 2340000000,
      "totalPortions": 15600,
      "averageAmountPerPayment": 15000000,
      "regionsServed": 5,
      "cateringsParticipated": 12,
      "schoolsServed": 45,
      "dateRange": {
        "earliest": "2024-01-01",
        "latest": "2024-11-20"
      }
    },
    "topRegions": [
      {
        "region": "DKI Jakarta",
        "paymentCount": 45,
        "totalAmount": 675000000,
        "totalPortions": 4500
      },
      {
        "region": "Jawa Barat",
        "paymentCount": 38,
        "totalAmount": 570000000,
        "totalPortions": 3800
      }
    ],
    "topCaterings": [
      {
        "cateringName": "PT Makan Sehat",
        "paymentCount": 23,
        "totalAmount": 345000000,
        "totalPortions": 2300
      }
    ]
  },
  "metadata": {
    "timestamp": "2024-11-20T15:00:00Z",
    "currency": "IDR"
  }
}
```

#### GET `/api/public/regions`

**List regions dengan summary**

```http
GET /api/public/regions
```

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "region": "DKI Jakarta",
      "paymentCount": 45,
      "schoolsCount": 12,
      "cateringsCount": 8,
      "totalAmount": 675000000,
      "totalPortions": 4500,
      "lastPaymentDate": "2024-11-20T14:30:00Z"
    }
  ]
}
```

---

## Flow Examples

### Flow 1: Happy Path (Normal Delivery & Payment)

#### Step 1: Admin Lock Dana

```bash
curl -X POST http://localhost:5000/api/admin/escrow/lock \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schoolId": 1,
    "cateringId": 5,
    "amount": 15000000,
    "portions": 100,
    "deliveryDate": "2024-11-20"
  }'
```

**Backend does**:
1. Validasi request
2. Create allocation record (status: PLANNED)
3. Create payment record (status: PENDING)
4. Call `blockchainPaymentService.lockFund()` → smart contract
5. Smart contract emit `FundLocked` event
6. Update allocation status → LOCKED
7. Optional: create Xendit invoice
8. Log event ke payment_events table
9. Return response dengan tx hash

**Smart contract does**:
1. Check signer authorized payer
2. Store allocation data
3. Lock dana di contract
4. Emit FundLocked event (dengan semua detail)

**Event Listener (background)**:
1. Capture FundLocked event
2. Update database:
   - allocations.status = LOCKED
   - allocations.blockchain_confirmed = true
3. Broadcast ke WebSocket: `payment:fund_locked`

---

#### Step 2: Katering Kirim Makanan

Catering create delivery record (bukan via API, bisa manual atau via vendor app)

#### Step 3: Sekolah Konfirmasi Penerimaan

```bash
curl -X POST http://localhost:5000/api/school/deliveries/1/confirm \
  -H "Authorization: Bearer SCHOOL_JWT_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "isOk=true" \
  -F "portionsReceived=100" \
  -F "qualityRating=5" \
  -F "notes=Makanan enak dan segar" \
  -F "photo=@/path/to/photo.jpg"
```

**Backend does**:
1. Validasi request
2. Create delivery_confirmations record
3. Update deliveries.status → CONFIRMED
4. **CRITICAL**: Call `blockchainPaymentService.releaseEscrow()`
5. Smart contract transfer dana to catering wallet
6. Update allocations.status → RELEASED
7. Update payments.status → COMPLETED
8. Insert to public_payment_feed (for transparency)
9. Log event ke payment_events
10. Return response dengan blockchain tx hash

**Smart contract does**:
1. Check signer adalah backend service account
2. Validate allocation is locked
3. Transfer dana dari contract to catering wallet
4. Emit PaymentReleased event

**Event Listener (background)**:
1. Capture PaymentReleased event
2. Update database:
   - allocations.status = RELEASED
   - payments.status = COMPLETED
   - public_payment_feed.status = COMPLETED
3. Broadcast ke WebSocket: `payment:payment_released`
4. Frontend dashboard immediately update (real-time)

---

#### Step 4: Public Dashboard Updates

Users access `/api/public/payment-feed`:
- Lihat payment yang baru saja completed
- Blockchain tx hash verified on-chain
- Transparency penuh: sekolah mana, catering mana, jumlah, tanggal
- No sensitive data exposed

---

### Flow 2: Rejected Delivery (Issue Reported)

```bash
curl -X POST http://localhost:5000/api/school/deliveries/1/confirm \
  -H "Authorization: Bearer SCHOOL_JWT_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "isOk=false" \
  -F "qualityRating=2" \
  -F "notes=Makanan tidak segar, kurang porsi" \
  -F "photo=@/path/to/photo.jpg"
```

**Backend does**:
1. Create delivery_confirmations record (status: REJECTED)
2. Do NOT call releaseEscrow()
3. Create issues record untuk report masalah
4. Dana tetap di-lock (tidak di-release)
5. Admin akan investigate dan decide next action

---

## Database Schema

### Key Tables

```sql
-- Allocations: Dana yang di-lock ke escrow
allocations {
  id,
  allocation_id (unique),
  school_id,
  catering_id,
  amount,
  status: PLANNED | LOCKED | RELEASED | CANCELLED,
  tx_hash_lock,
  tx_hash_release,
  locked_at,
  released_at
}

-- Payments: Payment records
payments {
  id,
  allocation_id (FK),
  school_id,
  catering_id,
  amount,
  status: PENDING | LOCKED | COMPLETED | FAILED,
  blockchain_tx_hash,
  blockchain_block_number,
  paid_at,
  released_to_catering_at
}

-- Payment Events: Audit trail
payment_events {
  id,
  payment_id,
  allocation_id,
  event_type: FUND_LOCKED | PAYMENT_RELEASED,
  blockchain_tx_hash,
  event_data (JSON)
}

-- Delivery Confirmations: Sekolah konfirmasi
delivery_confirmations {
  id,
  delivery_id,
  allocation_id,
  school_id,
  status: PENDING | APPROVED | REJECTED,
  portions_received,
  quality_rating,
  photo_urls,
  confirmed_at
}

-- Public Payment Feed: Transparency data
public_payment_feed {
  id,
  allocation_id,
  school_name,
  school_region,
  catering_name,
  amount,
  portions_count,
  delivery_date,
  status: COMPLETED,
  blockchain_tx_hash,
  blockchain_block_number,
  released_at
}
```

---

## Blockchain Events

### Smart Contract Escrow Events

```solidity
// Event 1: FundLocked
// Emitted saat admin lock dana
event FundLocked(
  bytes32 indexed allocationId,
  address indexed payer,
  address indexed payee,
  uint256 amount,
  uint256 timestamp,
  string metadata
);

// Event 2: PaymentReleased
// Emitted saat backend release escrow
event PaymentReleased(
  bytes32 indexed allocationId,
  address indexed payer,
  address indexed payee,
  uint256 amount,
  uint256 timestamp,
  bytes32 txHash
);
```

### Event Flow in Backend

```
Smart Contract (Polygon)
  ↓
  └─→ Emit Event
       ↓
Event Listener Service
  ↓
  ├─→ Capture Event
  ├─→ Validate Event
  ├─→ Update Database
  └─→ Broadcast via Socket.IO
       ↓
Frontend Dashboard
  ├─→ Listen Socket.IO event
  ├─→ Update UI real-time
  └─→ No page refresh needed
```

---

## Response Examples

### Successful Lock Response

```json
{
  "success": true,
  "message": "Fund locked to escrow successfully",
  "data": {
    "allocationId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "LOCKED",
    "amount": 15000000,
    "currency": "IDR",
    "blockchainTxHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "blockchainBlockNumber": 12345678,
    "xenditInvoiceId": "inv_12345678",
    "xenditInvoiceUrl": "https://checkout.xendit.co/web/checkout_page?reference_id=...",
    "lockedAt": "2024-11-20T10:30:00.000Z"
  }
}
```

### Successful Release Response

```json
{
  "success": true,
  "message": "Delivery confirmed, escrow released",
  "data": {
    "deliveryId": 1,
    "allocationId": "550e8400-e29b-41d4-a716-446655440000",
    "confirmationStatus": "APPROVED",
    "releasedAmount": 15000000,
    "blockchainTxHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    "blockchainBlockNumber": 12345679,
    "confirmedAt": "2024-11-20T14:30:00.000Z"
  }
}
```

### Error Response

```json
{
  "error": "Blockchain lock fund failed",
  "detail": "Insufficient funds in payer wallet",
  "timestamp": "2024-11-20T10:30:00.000Z"
}
```

---

## Key Features for Hackathon

✅ **Full Blockchain Integration**: Smart contract escrow dengan Solidity
✅ **Event Listener**: Real-time blockchain event monitoring
✅ **Database Sync**: Automatic DB updates dari blockchain events
✅ **Public Transparency**: Dashboard tanpa auth dengan blockchain data
✅ **Role-Based Access**: Admin, School, Catering, Public (4 roles)
✅ **Payment Verification**: 3-way verification (Dinas, Catering, Sekolah)
✅ **Xendit Integration**: Optional payment tracking layer
✅ **Socket.IO Real-time**: Live dashboard updates
✅ **Audit Trail**: Complete payment_events log untuk compliance
✅ **Documentation**: Clear flow comments di setiap function

---

## Support & Debugging

### Check Services Status

```bash
# Check API
curl http://localhost:5000/api/public/health

# Check blockchain connection
curl http://localhost:5000/api/admin/blockchain/health

# Check event listener status
curl http://localhost:5000/api/admin/listener/status
```

### Database Queries untuk Debugging

```sql
-- List semua allocations
SELECT * FROM allocations ORDER BY created_at DESC;

-- List semua payments dengan detail
SELECT p.*, a.allocation_id, s.name as school, c.name as catering
FROM payments p
JOIN allocations a ON p.allocation_id = a.id
JOIN schools s ON a.school_id = s.id
JOIN caterings c ON a.catering_id = c.id
ORDER BY p.created_at DESC;

-- Check payment events
SELECT * FROM payment_events ORDER BY created_at DESC;

-- Public payment feed
SELECT * FROM public_payment_feed WHERE status = 'COMPLETED';
```

---

**Created by**: NutriChain Development Team
**Last Updated**: 2024-11-20
**Version**: 1.0.0
