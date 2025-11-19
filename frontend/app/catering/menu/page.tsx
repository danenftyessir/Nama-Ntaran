'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Loader2, Plus } from 'lucide-react';

// komponen
import CateringSidebar from '../../components/catering/CateringSidebar';
import CateringFooter from '../../components/catering/CateringFooter';
import MenuCard from '../../components/catering/MenuCard';

// hooks
import { useMenuData } from '../../hooks/useMenuData';

// interface untuk menu item
interface MenuItem {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  vitamins: string;
  price: number;
  imageUrl: string;
}

export default function MenuPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { data, isLoading, error, refreshData } = useMenuData();

  // state untuk modal dan loading
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ambil menus dari hook data
  const menus: MenuItem[] = data?.menus || [];

  // redirect jika tidak authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!authLoading && isAuthenticated && user?.role !== 'catering') {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // handler untuk edit menu
  const handleEdit = (id: string) => {
    router.push(`/catering/menu/edit/${id}`);
  };

  // handler untuk delete menu
  const handleDelete = (id: string) => {
    setSelectedMenuId(id);
    setShowDeleteModal(true);
  };

  // handler untuk konfirmasi delete
  const confirmDelete = async () => {
    if (!selectedMenuId) return;

    setIsDeleting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/catering/menu/${selectedMenuId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error('Gagal menghapus menu');
      }

      // refresh data setelah delete berhasil
      refreshData();
    } catch (err) {
      console.error('Error deleting menu:', err);
      // fallback: tetap refresh untuk demo dengan dummy data
      refreshData();
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setSelectedMenuId(null);
    }
  };

  // handler untuk tambah menu baru
  const handleAddMenu = () => {
    router.push('/catering/menu/add');
  };

  // animasi variants untuk page container
  const pageVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  // loading state
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* sidebar */}
      <CateringSidebar badges={[{ path: '/catering/schedule', count: 3 }]} />

      {/* main content */}
      <main className="min-h-screen ml-72" style={{ transform: 'translateZ(0)' }}>
        <motion.div
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          className="max-w-6xl mx-auto px-6 py-8"
          style={{
            willChange: 'opacity',
            transform: 'translateZ(0)',
          }}
        >
          {/* page header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Manajemen Menu
            </h1>
            <button
              onClick={handleAddMenu}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tambah Menu Baru
            </button>
          </div>

          {/* loading state untuk data */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center">
              <p className="text-red-600 mb-3">{error}</p>
              <button
                onClick={refreshData}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          ) : (
            /* menu grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menus.length === 0 ? (
                <div className="col-span-full py-12 text-center">
                  <p className="text-sm text-gray-500">Belum ada menu yang ditambahkan</p>
                </div>
              ) : (
                menus.map((menu) => (
                  <div key={menu.id}>
                    <MenuCard
                      id={menu.id}
                      name={menu.name}
                      description={menu.description}
                      calories={menu.calories}
                      protein={menu.protein}
                      vitamins={menu.vitamins}
                      price={menu.price}
                      imageUrl={menu.imageUrl}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </div>
                ))
              )}
            </div>
          )}
        </motion.div>

        {/* footer */}
        <CateringFooter
          supportUrl="mailto:support@namantaran.id"
          socialLinks={{
            instagram: 'https://instagram.com/namantaran',
            twitter: 'https://twitter.com/namantaran',
            linkedin: 'https://linkedin.com/company/namantaran',
          }}
        />
      </main>

      {/* delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Hapus Menu
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Apakah Anda yakin ingin menghapus menu ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
