'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Receipt, CreditCard, ChevronDown, ChevronLeft, ChevronRight, Filter, Calendar } from 'lucide-react';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'completed' | 'deducted' | 'sent' | 'paid' | 'returned';
  date: string;
}

interface TransactionGroup {
  date: string;
  transactions: Transaction[];
}

type StatusFilter = 'all' | 'completed' | 'deducted' | 'sent' | 'paid' | 'returned';
type DateFilter = 'all' | 'today' | 'week' | 'month';

interface TransactionHistoryProps {
  transactions: TransactionGroup[];
  itemsPerPage?: number;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  itemsPerPage = 5,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  // state untuk pagination dan filter
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID').format(value);
  };

  // format tanggal
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // mapping status ke label dan style
  const statusConfig: Record<string, { label: string; className: string }> = {
    completed: {
      label: 'Selesai',
      className: 'bg-emerald-100 text-emerald-700',
    },
    deducted: {
      label: 'Dipotong',
      className: 'bg-orange-100 text-orange-700',
    },
    sent: {
      label: 'Terkirim',
      className: 'bg-pink-100 text-pink-700',
    },
    paid: {
      label: 'Lunas',
      className: 'bg-blue-100 text-blue-700',
    },
    returned: {
      label: 'Dikembalikan',
      className: 'bg-purple-100 text-purple-700',
    },
  };

  // status filter options
  const statusOptions: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'Semua Status' },
    { id: 'completed', label: 'Selesai' },
    { id: 'deducted', label: 'Dipotong' },
    { id: 'sent', label: 'Terkirim' },
    { id: 'paid', label: 'Lunas' },
    { id: 'returned', label: 'Dikembalikan' },
  ];

  // date filter options
  const dateOptions: { id: DateFilter; label: string }[] = [
    { id: 'all', label: 'Semua Tanggal' },
    { id: 'today', label: 'Hari Ini' },
    { id: 'week', label: 'Minggu Ini' },
    { id: 'month', label: 'Bulan Ini' },
  ];

  // filter transaksi berdasarkan status dan tanggal
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // filter berdasarkan tanggal
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered
        .map((group) => ({
          ...group,
          transactions: group.transactions.filter(
            (txn) => new Date(txn.date) >= startDate
          ),
        }))
        .filter((group) => group.transactions.length > 0);
    }

    // filter berdasarkan status
    if (statusFilter !== 'all') {
      filtered = filtered
        .map((group) => ({
          ...group,
          transactions: group.transactions.filter(
            (txn) => txn.status === statusFilter
          ),
        }))
        .filter((group) => group.transactions.length > 0);
    }

    return filtered;
  }, [transactions, statusFilter, dateFilter]);

  // hitung total transaksi untuk pagination
  const totalTransactions = filteredTransactions.reduce(
    (acc, group) => acc + group.transactions.length,
    0
  );
  const totalPages = Math.ceil(totalTransactions / itemsPerPage);

  // reset currentPage jika melebihi totalPages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (currentPage < 1 && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // paginate transaksi dengan flatten dulu lalu group ulang
  const paginatedTransactions = useMemo(() => {
    // flatten semua transaksi dengan menyimpan date-nya
    const allTransactions: (Transaction & { groupDate: string })[] = [];
    for (const group of filteredTransactions) {
      for (const txn of group.transactions) {
        allTransactions.push({ ...txn, groupDate: group.date });
      }
    }

    // paginate
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = allTransactions.slice(startIndex, endIndex);

    // re-group berdasarkan date
    const grouped: { [date: string]: Transaction[] } = {};
    for (const item of paginatedItems) {
      const { groupDate, ...txn } = item;
      if (!grouped[groupDate]) {
        grouped[groupDate] = [];
      }
      grouped[groupDate].push(txn);
    }

    // convert ke array format TransactionGroup
    return Object.entries(grouped)
      .map(([date, transactions]) => ({ date, transactions }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredTransactions, currentPage, itemsPerPage]);

  // reset ke halaman 1 ketika filter berubah
  const handleStatusFilterChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setCurrentPage(1);
    setShowStatusDropdown(false);
  };

  const handleDateFilterChange = (date: DateFilter) => {
    setDateFilter(date);
    setCurrentPage(1);
    setShowDateDropdown(false);
  };

  // animasi variants untuk container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className="mb-8"
      style={{
        willChange: 'opacity',
        transform: 'translateZ(0)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Riwayat Transaksi
        </h2>

        {/* filter controls */}
        <div className="flex items-center gap-2">
          {/* date filter dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowDateDropdown(!showDateDropdown);
                setShowStatusDropdown(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:border-gray-300 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              {dateOptions.find((o) => o.id === dateFilter)?.label}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showDateDropdown && (
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                {dateOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleDateFilterChange(option.id)}
                    className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition-colors ${
                      dateFilter === option.id
                        ? 'text-indigo-600 font-medium'
                        : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* status filter dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowDateDropdown(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:border-gray-300 transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              {statusOptions.find((o) => o.id === statusFilter)?.label}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showStatusDropdown && (
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                {statusOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleStatusFilterChange(option.id)}
                    className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition-colors ${
                      statusFilter === option.id
                        ? 'text-indigo-600 font-medium'
                        : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {paginatedTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500">Tidak ada transaksi ditemukan</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {paginatedTransactions.map((group) => (
                <div key={group.date}>
                  {/* tanggal header */}
                  <div className="px-5 py-3 bg-gray-50">
                    <p className="text-sm font-medium text-gray-700">
                      {formatDate(group.date)}
                    </p>
                  </div>

                  {/* list transaksi */}
                  {group.transactions.map((transaction) => {
                    const config = statusConfig[transaction.status] || statusConfig.completed;
                    const isExpense = transaction.type === 'expense';

                    return (
                      <div
                        key={transaction.id}
                        className="px-5 py-4 hover:bg-gray-50 transition-colors duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isExpense ? 'bg-gray-100' : 'bg-indigo-50'}`}>
                              {isExpense ? (
                                <CreditCard className="w-4 h-4 text-gray-500" />
                              ) : (
                                <Receipt className="w-4 h-4 text-indigo-600" />
                              )}
                            </div>
                            <p className="text-sm text-gray-700">
                              {transaction.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <p className={`text-sm font-semibold ${isExpense ? 'text-pink-600' : 'text-emerald-600'}`}>
                              {isExpense ? '- ' : ''}Rp {formatCurrency(transaction.amount)}
                            </p>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
                              {config.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Menampilkan {(currentPage - 1) * itemsPerPage + 1}-
                  {Math.min(currentPage * itemsPerPage, totalTransactions)} dari{' '}
                  {totalTransactions} transaksi
                </p>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default TransactionHistory;
export type { StatusFilter, DateFilter };
