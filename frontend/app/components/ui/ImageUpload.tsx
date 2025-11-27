'use client';

import { memo, useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadImage } from '@/lib/supabase-storage';

// komponen upload gambar dengan preview dan akselerasi GPU
interface ImageUploadProps {
  value?: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  folder?: string; // folder path in Supabase Storage (e.g., 'avatars', 'schools/logos')
}

const ImageUpload = memo(function ImageUpload({
  value,
  onChange,
  placeholder = 'Unggah Gambar',
  disabled = false,
  className = '',
  size = 'md',
  folder = 'uploads',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // ukuran komponen berdasarkan prop size
  const sizeClasses = {
    sm: {
      container: 'w-20 h-20',
      icon: 'w-6 h-6',
    },
    md: {
      container: 'w-24 h-24',
      icon: 'w-8 h-8',
    },
    lg: {
      container: 'w-32 h-32',
      icon: 'w-10 h-10',
    },
  };

  const currentSize = sizeClasses[size];

  const handleFileChange = async (file: File | null) => {
    if (!file) return;

    // validasi tipe file
    if (!file.type.startsWith('image/')) {
      alert('Hanya file gambar yang diizinkan');
      return;
    }

    // validasi ukuran file (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB');
      return;
    }

    // Upload ke Supabase Storage
    setIsUploading(true);
    try {
      const { publicUrl, error } = await uploadImage(file, folder);

      if (error) {
        console.error('Upload error:', error);
        alert(error.message || 'Gagal mengunggah gambar');
        return;
      }

      if (publicUrl) {
        setImageError(false); // Reset error state on successful upload
        onChange(publicUrl);
        console.log('Image uploaded successfully:', publicUrl);
      }
    } catch (error: any) {
      console.error('Upload exception:', error);
      alert('Terjadi kesalahan saat mengunggah gambar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] || null;
    handleFileChange(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* preview area */}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          ${currentSize.container}
          relative rounded-xl border-2 border-dashed
          flex items-center justify-center
          transition-all duration-200 ease-out
          transform-gpu will-change-transform
          overflow-hidden
          ${disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : isDragging
              ? 'border-indigo-500 bg-indigo-50 cursor-pointer'
              : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-gray-100 cursor-pointer'
          }
        `}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className={`${currentSize.icon} text-indigo-600 animate-spin`} />
            <span className="text-xs text-gray-600">Mengunggah...</span>
          </div>
        ) : value ? (
          <>
            {!imageError ? (
              <Image
                src={value}
                alt="Preview"
                fill
                className="object-cover"
                onError={() => setImageError(true)}
                unoptimized
              />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <ImageIcon className={`${currentSize.icon} text-red-400`} />
                <span className="text-xs text-red-600">Gagal memuat</span>
              </div>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="
                  absolute top-1 right-1 p-1 bg-red-500 text-white
                  rounded-full shadow-md hover:bg-red-600
                  transition-colors duration-150 z-10
                "
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </>
        ) : (
          <ImageIcon className={`${currentSize.icon} text-gray-400`} />
        )}
      </div>

      {/* tombol upload */}
      <button
        type="button"
        onClick={() => !disabled && !isUploading && inputRef.current?.click()}
        disabled={disabled || isUploading}
        className={`
          px-4 py-2 bg-white border border-gray-200 rounded-lg
          text-sm font-medium text-gray-700
          flex items-center gap-2
          transition-all duration-200 ease-out
          transform-gpu will-change-transform
          ${disabled || isUploading
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-gray-50 hover:border-gray-300 cursor-pointer'
          }
        `}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Mengunggah...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            {placeholder}
          </>
        )}
      </button>

      {/* hidden input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
      />
    </div>
  );
});

export default ImageUpload;
