/**
 * ============================================
 * XENDIT PAYMENT SERVICE
 * ============================================
 * Service untuk integrasi dengan Xendit API
 * Xendit digunakan untuk:
 * 1. Membuat invoice untuk tracking pembayaran
 * 2. Optional: Create payout untuk catering (jika pakai Xendit payout)
 * 3. Webhook handling untuk payment confirmation
 *
 * Note: Dalam flow MBG, pembayaran utama via blockchain escrow
 * Xendit bisa digunakan untuk backup / additional tracking layer
 *
 * Author: NutriChain Dev Team
 */

import axios, { AxiosInstance } from 'axios';
import { pool } from '../config/database.js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// ============================================
// TYPES & INTERFACES
// ============================================

interface CreateInvoiceParams {
  allocationId: string;
  description: string;
  amount: number; // IDR
  schoolName: string;
  cateringName: string;
  deliveryDate: string;
  portions: number;
}

interface CreatePayoutParams {
  allocationId: string;
  amount: number; // IDR
  bankAccountId: string;
  reference: string;
  notes: string;
}

interface XenditInvoiceResponse {
  id: string;
  user_id: string;
  external_id: string;
  invoice_url?: string;
  amount: number;
  status: string;
  expiry_date: string;
  created: string;
  updated: string;
  qr_code?: {
    qr_code_url: string;
  };
}

interface XenditPayoutResponse {
  id: string;
  reference_id: string;
  amount: number;
  status: string;
  channel_code: string;
  created: string;
}

interface WebhookVerifyResult {
  valid: boolean;
  error?: string;
}

// ============================================
// XENDIT PAYMENT SERVICE CLASS
// ============================================

class XenditPaymentService {
  private client: AxiosInstance;
  private secretKey: string;
  private publicKey: string;
  private webhookToken: string;

  constructor() {
    // Validate environment variables
    const secretKey = process.env.XENDIT_SECRET_KEY;
    const publicKey = process.env.XENDIT_PUBLIC_KEY;
    const webhookToken = process.env.XENDIT_WEBHOOK_TOKEN;

    if (!secretKey || !publicKey) {
      throw new Error(
        'Missing required Xendit environment variables: XENDIT_SECRET_KEY, XENDIT_PUBLIC_KEY'
      );
    }

    this.secretKey = secretKey;
    this.publicKey = publicKey;
    this.webhookToken = webhookToken || 'default-webhook-token';

    // Initialize Axios client dengan Xendit API
    this.client = axios.create({
      baseURL: 'https://api.xendit.co',
      auth: {
        username: secretKey,
        password: '', // Secret key hanya butuh username saja
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Xendit Payment Service initialized');
    console.log(`   Public Key: ${publicKey.substring(0, 20)}...`);
  }

  /**
   * ============================================
   * CREATE INVOICE (Optional Tracking)
   * ============================================
   * Membuat invoice di Xendit untuk tracking pembayaran
   *
   * Flow (optional):
   * 1. Backend create allocation + lock ke blockchain
   * 2. Backend create invoice di Xendit (untuk transparency)
   * 3. Invoice URL dikirim ke payment status page
   * 4. (Optional) Catering bisa lihat invoice di dashboard
   */
  async createInvoice(params: CreateInvoiceParams) {
    try {
      console.log('\n📋 [Xendit] Creating invoice...');
      console.log(`   Allocation: ${params.allocationId}`);
      console.log(`   Amount: Rp ${params.amount.toLocaleString('id-ID')}`);

      const response = await this.client.post<XenditInvoiceResponse>(
        '/v2/invoices',
        {
          external_id: params.allocationId,
          amount: params.amount,
          description: params.description,
          invoice_duration: 86400, // 24 jam validity
          currency: 'IDR',
          items: [
            {
              name: `Delivery untuk ${params.schoolName}`,
              quantity: params.portions,
              price: Math.floor(params.amount / params.portions),
            },
          ],
          customer: {
            given_names: params.cateringName,
            email: 'catering@nutrichain.local',
          },
          fees: [],
        }
      );

      const invoice = response.data;

      console.log(`   ✅ Invoice created: ${invoice.id}`);
      console.log(`   URL: ${invoice.invoice_url}`);

      // Simpan ke database
      await this.saveInvoiceRecord(
        params.allocationId,
        invoice.id,
        invoice.invoice_url || '',
        invoice.amount,
        'PENDING'
      );

      return {
        success: true,
        invoiceId: invoice.id,
        invoiceUrl: invoice.invoice_url,
        externalId: invoice.external_id,
        amount: invoice.amount,
      };
    } catch (error: any) {
      console.error('❌ Create invoice error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * ============================================
   * CREATE PAYOUT (Optional - Xendit Payout Feature)
   * ============================================
   * Membuat payout dari Xendit ke rekening catering
   * (Alternative: bisa pakai blockchain transfer saja)
   */
  async createPayout(params: CreatePayoutParams) {
    try {
      console.log('\n💸 [Xendit] Creating payout...');
      console.log(`   Allocation: ${params.allocationId}`);
      console.log(`   Amount: Rp ${params.amount.toLocaleString('id-ID')}`);

      const response = await this.client.post<XenditPayoutResponse>(
        '/payouts',
        {
          reference_id: params.reference,
          channel_code: 'ID_BCA', // Bisa adjust sesuai bank catering
          amount: params.amount,
          description: params.notes,
          bank_account_id: params.bankAccountId,
        }
      );

      const payout = response.data;

      console.log(`   ✅ Payout created: ${payout.id}`);
      console.log(`   Status: ${payout.status}`);

      return {
        success: true,
        payoutId: payout.id,
        status: payout.status,
        amount: payout.amount,
      };
    } catch (error: any) {
      console.error(
        '❌ Create payout error:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * ============================================
   * GET INVOICE STATUS
   * ============================================
   * Get status invoice dari Xendit
   */
  async getInvoiceStatus(invoiceId: string) {
    try {
      const response = await this.client.get<XenditInvoiceResponse>(
        `/v2/invoices/${invoiceId}`
      );

      return {
        success: true,
        status: response.data.status,
        amount: response.data.amount,
        paidAmount: response.data.amount, // Kalau PAID, maka full amount
        expiryDate: response.data.expiry_date,
      };
    } catch (error: any) {
      console.error('Error getting invoice status:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * ============================================
   * VERIFY WEBHOOK SIGNATURE
   * ============================================
   * Verifikasi bahwa webhook benar-benar dari Xendit
   * Xendit mengirim signature di header X-XENDIT-WEBHOOK-TOKEN
   */
  verifyWebhookSignature(
    body: string,
    signature: string
  ): WebhookVerifyResult {
    try {
      // Xendit menggunakan HMAC SHA256
      const calculatedSignature = crypto
        .createHmac('sha256', this.webhookToken)
        .update(body)
        .digest('hex');

      if (calculatedSignature !== signature) {
        return {
          valid: false,
          error: 'Invalid webhook signature',
        };
      }

      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * ============================================
   * HANDLE WEBHOOK: Invoice Paid
   * ============================================
   * Xendit mengirim webhook saat invoice dibayar
   * (Optional: bisa trigger additional action jika perlu)
   */
  async handleInvoicePaidWebhook(payload: any) {
    try {
      console.log('\n📬 [Xendit Webhook] Invoice paid event received');
      console.log(`   External ID: ${payload.external_id}`);
      console.log(`   Amount: ${payload.amount}`);

      const allocationId = payload.external_id;

      // Update payment record di database
      await pool.query(
        `UPDATE payments
         SET xendit_invoice_id = $1, status = $2, updated_at = NOW()
         WHERE allocation_id IN (
           SELECT id FROM allocations WHERE allocation_id = $3
         )`,
        [payload.id, 'LOCKED', allocationId]
      );

      // Optionally: bisa trigger additional notification
      console.log(`   ✅ Payment record updated`);

      return { success: true };
    } catch (error: any) {
      console.error('Error handling invoice paid webhook:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * ============================================
   * HANDLE WEBHOOK: Payout Settlement
   * ============================================
   */
  async handlePayoutSettledWebhook(payload: any) {
    try {
      console.log('\n📬 [Xendit Webhook] Payout settled event received');
      console.log(`   Payout ID: ${payload.id}`);
      console.log(`   Amount: ${payload.amount}`);

      // Update payment record
      await pool.query(
        `UPDATE payments
         SET status = $1, released_to_catering_at = NOW(), updated_at = NOW()
         WHERE allocation_id IN (
           SELECT id FROM allocations
           WHERE allocation_id = $2
         )`,
        ['COMPLETED', payload.reference_id]
      );

      console.log(`   ✅ Payout settled, payment marked as COMPLETED`);

      return { success: true };
    } catch (error: any) {
      console.error('Error handling payout settled webhook:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * ============================================
   * HELPER: Save Invoice Record
   * ============================================
   */
  private async saveInvoiceRecord(
    allocationId: string,
    xenditInvoiceId: string,
    invoiceUrl: string,
    amount: number,
    status: string
  ) {
    try {
      const result = await pool.query(
        `SELECT id FROM allocations WHERE allocation_id = $1`,
        [allocationId]
      );

      if (result.rows.length === 0) {
        console.warn(`Allocation ${allocationId} not found`);
        return;
      }

      const allocIdDb = result.rows[0].id;

      await pool.query(
        `INSERT INTO payments
         (allocation_id, school_id, catering_id, amount, currency, status,
          xendit_invoice_id, created_at, updated_at)
         SELECT
          $1, a.school_id, a.catering_id, $2, $3, $4, $5, NOW(), NOW()
         FROM allocations a WHERE a.id = $1
         ON CONFLICT DO NOTHING`,
        [allocIdDb, amount, 'IDR', status, xenditInvoiceId]
      );
    } catch (error: any) {
      console.error('Error saving invoice record:', error.message);
    }
  }

  /**
   * ============================================
   * HEALTH CHECK
   * ============================================
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check dengan get invoice
      await this.client.get('/accounts');
      console.log('✅ Xendit API health check OK');
      return true;
    } catch (error) {
      console.error('❌ Xendit API health check failed');
      return false;
    }
  }
}

// Export singleton instance
export default new XenditPaymentService();
