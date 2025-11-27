# Database Seeders

## 🎯 Active Seeders (Production-Ready)

### Core Data Seeders
1. **01-seed-users.ts** - Seed users (admin, schools, caterings)
2. **02-seed-menu-items.ts** - Seed menu items for caterings

### Custom Seeders
- **seed-future-deliveries.ts** ✨ - Generate deliveries from Nov 2024 to Dec 2025 (CURRENTLY USED)
  - Replaces `04-seed-deliveries.ts` for this project
  - Generates future dates for development/demo purposes

## 📦 Optional/Advanced Seeders

These seeders are for more complex scenarios and depend on deliveries:

- **03-seed-allocations.ts** - Payment allocations (escrow)
- **05-seed-verifications.ts** - Delivery verifications
- **06-seed-payments.ts** - Payment records
- **07-seed-issues.ts** - Issues/complaints
- **08-seed-escrow-transactions.ts** - Escrow transactions
- And more...

## 🚀 Quick Start

### For Development (Current Setup)

```bash
# 1. Seed basic data
cd database
npx ts-node seeders/01-seed-users.ts
npx ts-node seeders/02-seed-menu-items.ts

# 2. Seed deliveries (Nov 2024 - Dec 2025)
npx ts-node seeders/seed-future-deliveries.ts

# Done! Your database is ready for development
```

### For Advanced Features

If you need payment tracking, verifications, etc., run the additional seeders in order:

```bash
npx ts-node seeders/03-seed-allocations.ts
npx ts-node seeders/05-seed-verifications.ts
npx ts-node seeders/06-seed-payments.ts
# ... and so on
```

## 🗑️ Deprecated/Replaced Seeders

- ~~**04-seed-deliveries.ts**~~ - Replaced by `seed-future-deliveries.ts`
  - Original seeder uses past 3 months date distribution
  - Not suitable for future dates requirement

## 📝 Notes

- `seed-future-deliveries.ts` will **clear existing deliveries** before seeding
- Modify the script if you want to keep existing data
- For production, consider using `04-seed-deliveries.ts` with adjusted date ranges
