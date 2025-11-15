'use client';

import Navbar from '../components/layout/Navbar';
import GlassPanel from '../components/ui/GlassPanel';
import { Shield, ExternalLink, CheckCircle, Clock, DollarSign, FileText, TrendingUp, Activity } from 'lucide-react';

export default function TransparansiPage() {
  // Mock blockchain transactions
  const transactions = [
    {
      id: 1,
      type: 'escrow_locked',
      from: 'Pemerintah Daerah',
      to: 'Smart Contract',
      amount: 'Rp 50.000.000',
      timestamp: '2025-01-15 10:30:45',
      txHash: '0x7f9fa3b2c8d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9',
      status: 'confirmed',
    },
    {
      id: 2,
      type: 'fund_released',
      from: 'Smart Contract',
      to: 'Katering Sehat Mandiri',
      amount: 'Rp 15.000.000',
      timestamp: '2025-01-15 14:20:12',
      txHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
      status: 'confirmed',
    },
    {
      id: 3,
      type: 'verification',
      from: 'SDN 01 Bandung',
      to: 'Smart Contract',
      amount: '450 Porsi',
      timestamp: '2025-01-15 14:15:30',
      txHash: '0x9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8',
      status: 'confirmed',
    },
    {
      id: 4,
      type: 'escrow_locked',
      from: 'Pemerintah Daerah',
      to: 'Smart Contract',
      amount: 'Rp 30.000.000',
      timestamp: '2025-01-15 09:00:00',
      txHash: '0x5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4',
      status: 'confirmed',
    },
    {
      id: 5,
      type: 'fund_released',
      from: 'Smart Contract',
      to: 'Boga Rasa Catering',
      amount: 'Rp 12.500.000',
      timestamp: '2025-01-14 16:45:22',
      txHash: '0x3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2',
      status: 'confirmed',
    },
  ];

  const stats = {
    totalTransactions: '15,432',
    totalValue: 'Rp 280 M',
    avgBlockTime: '2.3s',
    gasUsed: '0.0021 ETH',
  };

  return (
    <div className="min-h-screen bg-gray-950 blockchain-mesh">
      <Navbar role="public" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12 fade-in">
          <div className="inline-block mb-4 px-4 py-2 glass-subtle rounded-full">
            <span className="text-sm font-semibold text-white">
              Blockchain-Powered Transparency
            </span>
          </div>
          <h1 className="text-5xl font-bold mb-4 text-white">
            Transparansi Blockchain
          </h1>
          <p className="text-white/80 max-w-2xl mx-auto text-lg">
            Setiap transaksi tercatat permanen di blockchain. Tidak ada yang bisa dihapus, diubah, atau disembunyikan.
          </p>
        </div>

        {/* Blockchain Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <GlassPanel hover>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Transaksi</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel hover>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Nilai</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalValue}</p>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel hover>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Block Time</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgBlockTime}</p>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel hover>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Gas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.gasUsed}</p>
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* How Blockchain Ensures Transparency */}
        <GlassPanel className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Bagaimana Blockchain Menjamin Transparansi
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Immutable</h3>
              <p className="text-sm text-gray-600">
                Data tidak dapat diubah atau dihapus setelah tercatat di blockchain
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Auditable</h3>
              <p className="text-sm text-gray-600">
                Setiap transaksi dapat dilacak dan diaudit oleh siapa saja
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Trustless</h3>
              <p className="text-sm text-gray-600">
                Tidak perlu percaya pada pihak ketiga, smart contract otomatis bekerja
              </p>
            </div>
          </div>
        </GlassPanel>

        {/* Recent Transactions */}
        <GlassPanel>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Transaksi Terbaru
              </h2>
              <p className="text-gray-600">Real-time blockchain transactions</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm text-green-600 font-semibold">LIVE</span>
            </div>
          </div>

          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="glass-subtle rounded-xl p-5 hover:shadow-modern transition-smooth"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        tx.type === 'escrow_locked'
                          ? 'bg-yellow-100'
                          : tx.type === 'fund_released'
                          ? 'bg-green-100'
                          : 'bg-blue-100'
                      }`}
                    >
                      {tx.type === 'escrow_locked' ? (
                        <Clock className="w-5 h-5 text-yellow-600" />
                      ) : tx.type === 'fund_released' ? (
                        <DollarSign className="w-5 h-5 text-green-600" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {tx.type === 'escrow_locked'
                          ? 'Dana Dikunci di Escrow'
                          : tx.type === 'fund_released'
                          ? 'Dana Dicairkan'
                          : 'Verifikasi Pengiriman'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {tx.from} → {tx.to}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{tx.amount}</p>
                    <p className="text-xs text-gray-500">{tx.timestamp}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-3">
                  <Shield className="w-4 h-4 text-gray-500" />
                  <code className="text-xs text-gray-700 flex-1 truncate">
                    {tx.txHash}
                  </code>
                  <button className="text-blue-600 hover:text-blue-700">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      tx.status === 'confirmed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {tx.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
                  </span>
                  <span className="text-xs text-gray-500">
                    12 block confirmations
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              Lihat Semua Transaksi
            </button>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
