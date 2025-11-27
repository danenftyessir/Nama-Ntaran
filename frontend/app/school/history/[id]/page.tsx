'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * History Detail Page
 * Redirects to the delivery detail page since they show the same information
 */
export default function HistoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    // Redirect to delivery detail page
    if (id) {
      router.replace(`/school/deliveries/${id}`);
    }
  }, [id, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Memuat detail pengiriman...</p>
      </div>
    </div>
  );
}
