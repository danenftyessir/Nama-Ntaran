'use client';

import React from 'react';
import Image from 'next/image';
import { Pencil, Trash2, UtensilsCrossed, Dumbbell, Heart } from 'lucide-react';

// interface untuk data menu
interface MenuCardProps {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  vitamins: string;
  price: number;
  imageUrl: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const MenuCard: React.FC<MenuCardProps> = ({
  id,
  name,
  description,
  calories,
  protein,
  vitamins,
  price,
  imageUrl,
  onEdit,
  onDelete,
}) => {
  // format harga ke rupiah
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('id-ID').format(value);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* gambar dengan overlay */}
      <div className="relative w-full h-48">
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          priority={false}
        />

        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* nama menu dan action buttons */}
        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
          <h3 className="text-white font-semibold text-lg">{name}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit?.(id)}
              className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30"
              aria-label={`Edit ${name}`}
            >
              <Pencil className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => onDelete?.(id)}
              className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30"
              aria-label={`Hapus ${name}`}
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* konten card */}
      <div className="p-4">
        {/* deskripsi */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {description}
        </p>

        {/* info nutrisi */}
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>{calories} Kalori</span>
          </div>
          <div className="flex items-center gap-1">
            <Dumbbell className="w-3.5 h-3.5" />
            <span>{protein}g Protein</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5" />
            <span>Vit {vitamins}</span>
          </div>
        </div>

        {/* harga */}
        <div className="border-t border-gray-100 pt-3">
          <p className="text-lg font-bold text-emerald-600">
            Rp{formatPrice(price)}
          </p>
          <p className="text-xs text-gray-400">per porsi</p>
        </div>
      </div>
    </div>
  );
};

export default MenuCard;
export type { MenuCardProps };
