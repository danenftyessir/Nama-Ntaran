/**
 * ============================================================================
 * SEEDING SCRIPT: FUTURE DELIVERIES (Until December 2025)
 * ============================================================================
 *
 * Purpose: Generate deliveries from now until December 2025
 * Run: npx ts-node database/seeders/seed-future-deliveries.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface School {
  id: number;
  name: string;
  priority_score?: number;
}

interface Catering {
  id: number;
  name: string;
}

// Helper functions
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateQRCode(schoolId: number, counter: number): string {
  return `MBG-${schoolId}-${counter}-${Date.now().toString(36)}`;
}

function getRandomStatus(): string {
  const statuses = ['scheduled', 'pending', 'verified', 'delivered'];
  const weights = [0.4, 0.3, 0.2, 0.1]; // 40% scheduled, 30% pending, 20% verified, 10% delivered

  const random = Math.random();
  let cumulative = 0;

  for (let i = 0; i < statuses.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      return statuses[i];
    }
  }

  return 'scheduled';
}

async function seedFutureDeliveries() {
  console.log('🚀 Starting future deliveries seeding...\n');

  try {
    // Fetch schools and caterings
    console.log('📚 Fetching schools and caterings...');

    const [schoolsRes, cateringsRes] = await Promise.all([
      supabase.from('schools').select('id, name, priority_score').limit(100),
      supabase.from('caterings').select('id, name')
    ]);

    if (schoolsRes.error) throw schoolsRes.error;
    if (cateringsRes.error) throw cateringsRes.error;

    const schools = schoolsRes.data || [];
    const caterings = cateringsRes.data || [];

    console.log(`   Found ${schools.length} schools and ${caterings.length} caterings\n`);

    if (schools.length === 0 || caterings.length === 0) {
      console.error('❌ No schools or caterings found. Please run seeders 01 and 02 first.');
      return;
    }

    // Sort schools by priority score (highest first)
    schools.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));

    // Clear existing deliveries (optional - comment if you want to keep existing data)
    console.log('🗑️  Clearing existing deliveries...');
    await supabase.from('deliveries').delete().neq('id', 0);
    console.log('   Done\n');

    // Generate deliveries from November 2024 to December 2025
    const startDate = new Date('2024-11-01'); // November 2024
    const endDate = new Date('2025-12-31'); // End of December 2025

    const deliveries: any[] = [];
    let counter = 0;

    console.log(`📅 Generating deliveries from ${startDate.toLocaleDateString('id-ID')} to ${endDate.toLocaleDateString('id-ID')}\n`);

    // For each school, generate deliveries based on priority score
    for (const school of schools) {
      // Higher priority = more deliveries (15-20 for top priority, 8-12 for lower)
      const priorityScore = school.priority_score || 0;
      const numDeliveries = priorityScore > 35
        ? randomInt(15, 20)  // Top priority schools
        : priorityScore > 30
        ? randomInt(12, 18)  // High priority schools
        : randomInt(8, 12);  // Normal priority schools

      const catering = randomElement(caterings);

      let successfulDeliveries = 0;
      let attempts = 0;
      const maxAttempts = numDeliveries * 10; // Increase max attempts to ensure we get all deliveries

      while (successfulDeliveries < numDeliveries && attempts < maxAttempts) {
        attempts++;

        // Generate random date between startDate and endDate
        const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
        let deliveryDate = new Date(randomTime);

        // Skip weekends - retry with new date
        if (deliveryDate.getDay() === 0 || deliveryDate.getDay() === 6) {
          continue; // Just retry without incrementing anything
        }

        counter++;
        successfulDeliveries++;

        const portions = randomInt(100, 500);
        const pricePerPortion = randomInt(15000, 25000);
        const amount = portions * pricePerPortion;

        const status = getRandomStatus();

        // Set delivered_at for delivered/verified status
        let deliveredAt = null;
        if (status === 'delivered' || status === 'verified') {
          deliveredAt = deliveryDate.toISOString();
        }

        const delivery = {
          school_id: school.id,
          catering_id: catering.id,
          delivery_date: deliveryDate.toISOString().split('T')[0],
          delivery_time_start: '11:00',
          delivery_time_end: '13:00',
          portions,
          menu_items: [
            {
              menu_id: 1,
              menu_name: 'Nasi + Lauk + Sayur',
              quantity: portions,
              unit_price: pricePerPortion,
              subtotal: amount
            }
          ],
          amount,
          total_amount: amount,
          status,
          notes: null,
          qr_code: generateQRCode(school.id, counter),
          driver_name: status !== 'scheduled' ? 'Driver ' + randomInt(1, 10) : null,
          driver_phone: status !== 'scheduled' ? '0812-3456-7890' : null,
          vehicle_number: status !== 'scheduled' ? 'B ' + randomInt(1000, 9999) + ' XYZ' : null,
          delivered_at: deliveredAt
        };

        deliveries.push(delivery);
      }
    }

    console.log(`📊 Generated ${deliveries.length} deliveries\n`);

    // Insert in batches
    console.log('💾 Inserting deliveries to database...');
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < deliveries.length; i += batchSize) {
      const batch = deliveries.slice(i, i + batchSize);
      const { error } = await supabase.from('deliveries').insert(batch);

      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
      } else {
        inserted += batch.length;
        console.log(`   Inserted ${inserted}/${deliveries.length} deliveries`);
      }
    }

    console.log('\n✅ Future deliveries seeding completed!');
    console.log(`   Total inserted: ${inserted} deliveries`);
    console.log(`   Date range: ${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')}\n`);

    // Show priority-based distribution
    console.log('🎯 Priority-based distribution:');
    const topSchools = schools.slice(0, 5);
    for (const school of topSchools) {
      const schoolDeliveries = deliveries.filter(d => d.school_id === school.id);
      console.log(`   ${school.name}`);
      console.log(`      Priority: ${(school.priority_score || 0).toFixed(2)} | Deliveries: ${schoolDeliveries.length}`);
    }
    console.log('');

    // Summary by month
    console.log('📊 Summary by month:');
    const monthCounts = new Map<string, number>();
    deliveries.forEach(d => {
      const date = new Date(d.delivery_date);
      const monthKey = date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });
      monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
    });

    Array.from(monthCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([month, count]) => {
        console.log(`   ${month}: ${count} deliveries`);
      });

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

seedFutureDeliveries()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
