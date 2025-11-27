# 🚀 Quick Reference - Admin Panel

## Start Servers

```bash
# Backend (Terminal 1)
cd backend
npm run dev

# Frontend (Terminal 2)
cd frontend
npm run dev
```

## Create Admin Account

```bash
curl -X POST http://localhost:5000/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@nutritrack.com",
    "password": "admin12345",
    "name": "Super Admin",
    "inviteCode": "MBG-ADMIN-2025"
  }'
```

## Login & Get Token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nutritrack.com","password":"admin12345"}' \
  | jq -r '.token'
```

## Test Endpoints

```bash
# Set token
TOKEN="your_token_here"

# Dashboard
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/admin/dashboard

# Users
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/admin/users

# Issues
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/issues

# Manual Review
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/manual-review/pending
```

## Admin URLs

- Dashboard: http://localhost:3000/admin
- Accounts: http://localhost:3000/admin/accounts
- Issues: http://localhost:3000/admin/issues
- Manual Review: http://localhost:3000/admin/manual-review

## Default Admin Credentials

**Email:** admin@nutritrack.com
**Password:** admin12345
**Invite Code:** MBG-ADMIN-2025

## Health Check

```bash
curl http://localhost:5000/api/health
```

## Common Issues

### Backend not responding
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Restart backend
cd backend
npm run dev
```

### Frontend can't connect
```bash
# Check .env.local
cat frontend/.env.local

# Should show:
# NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Token expired
- Just logout and login again
- Or clear localStorage in browser

### Users endpoint timeout
**Fixed!** Query optimized dengan separate queries dan pagination.
- Max 50 users per page by default
- Uses efficient Maps for lookups

### Manual review relationship error
**Fixed!** Query dipisah untuk avoid ambiguous relationships.
- Separate queries for each table
- Manual join at application layer

## Files Modified

**Backend:**
- `backend/src/routes/adminRoutes.ts` (NEW)
- `backend/src/routes/issues.ts`
- `backend/src/routes/manualReview.ts`
- `backend/src/server.ts`

**Frontend:**
- `frontend/app/admin/page.tsx`
- `frontend/app/admin/accounts/page.tsx`
- `frontend/app/admin/issues/page.tsx`
- `frontend/app/admin/manual-review/page.tsx`
- `frontend/lib/api.ts`

## Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "message": "Details"
}
```

---

**For detailed documentation, see:** [FINAL_ADMIN_FIX_GUIDE.md](FINAL_ADMIN_FIX_GUIDE.md)
