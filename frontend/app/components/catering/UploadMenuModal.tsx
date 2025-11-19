'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, File, Image as ImageIcon, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload?: (files: File[]) => Promise<void>;
}

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

const UploadMenuModal: React.FC<UploadMenuModalProps> = ({
  isOpen,
  onClose,
  onUpload,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // generate unique id untuk file
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      id: generateId(),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status: 'pending',
      progress: 0,
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  // handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // handle remove file
  const handleRemoveFile = useCallback((id: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  // handle upload
  const handleUpload = useCallback(async () => {
    if (uploadedFiles.length === 0) return;

    setIsUploading(true);

    // update status ke uploading
    setUploadedFiles(prev =>
      prev.map(f => ({ ...f, status: 'uploading' as const }))
    );

    try {
      // simulasi upload dengan progress
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];

        // simulasi progress upload
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 50));
          setUploadedFiles(prev =>
            prev.map(f =>
              f.id === file.id ? { ...f, progress } : f
            )
          );
        }

        // update status ke success
        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === file.id ? { ...f, status: 'success' as const } : f
          )
        );
      }

      // call callback jika ada
      if (onUpload) {
        await onUpload(uploadedFiles.map(f => f.file));
      }

      // tutup modal setelah delay
      setTimeout(() => {
        onClose();
        setUploadedFiles([]);
      }, 1000);
    } catch (error) {
      // update status ke error
      setUploadedFiles(prev =>
        prev.map(f => ({
          ...f,
          status: 'error' as const,
          error: 'Gagal mengupload file',
        }))
      );
    } finally {
      setIsUploading(false);
    }
  }, [uploadedFiles, onUpload, onClose]);

  // cleanup saat modal ditutup
  const handleClose = useCallback(() => {
    uploadedFiles.forEach(f => {
      if (f.preview) {
        URL.revokeObjectURL(f.preview);
      }
    });
    setUploadedFiles([]);
    onClose();
  }, [uploadedFiles, onClose]);

  // format ukuran file
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // animasi variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Upload Menu</h2>
              <button
                onClick={handleClose}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* konten modal */}
            <div className="p-6">
              {/* dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                  transition-all duration-200
                  ${isDragging
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={e => handleFileSelect(e.target.files)}
                  className="hidden"
                />
                <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-indigo-500' : 'text-gray-400'}`} />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Drag & drop file di sini
                </p>
                <p className="text-xs text-gray-500">
                  atau klik untuk memilih file
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Format: JPG, PNG, PDF, DOC (Maks. 10MB)
                </p>
              </div>

              {/* daftar file yang diupload */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">
                    File Terpilih ({uploadedFiles.length})
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {uploadedFiles.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        {/* preview atau icon */}
                        {item.preview ? (
                          <img
                            src={item.preview}
                            alt={item.file.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center">
                            <File className="w-5 h-5 text-gray-500" />
                          </div>
                        )}

                        {/* info file */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">
                            {item.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(item.file.size)}
                          </p>

                          {/* progress bar */}
                          {item.status === 'uploading' && (
                            <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 transition-all duration-200"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* status atau tombol hapus */}
                        {item.status === 'success' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : item.status === 'error' ? (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        ) : item.status !== 'uploading' ? (
                          <button
                            onClick={() => handleRemoveFile(item.id)}
                            className="p-1 rounded hover:bg-gray-200 transition-colors duration-200"
                          >
                            <Trash2 className="w-4 h-4 text-gray-400" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* footer modal */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={handleClose}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleUpload}
                disabled={uploadedFiles.length === 0 || isUploading}
                className={`
                  px-4 py-2 text-sm font-medium text-white rounded-lg
                  transition-all duration-200
                  ${uploadedFiles.length === 0 || isUploading
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                  }
                `}
              >
                {isUploading ? 'Mengupload...' : 'Upload'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UploadMenuModal;
