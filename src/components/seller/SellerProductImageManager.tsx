import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Trash2, Star, ArrowLeft, ArrowRight, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { uploadProductImage, validateImageFile } from '../../services/storageService';

interface SellerProductImageManagerProps {
  images: string[];
  onChange: (images: string[]) => void;
  productId?: string;
  disabled?: boolean;
}

export const SellerProductImageManager: React.FC<SellerProductImageManagerProps> = ({
  images,
  onChange,
  productId = `prod-${Date.now()}`,
  disabled = false,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Uploading ${i + 1} of ${files.length} (${file.name})...`);

      const validation = validateImageFile(file);
      if (!validation.valid) {
        setUploadError(validation.error || 'Invalid file format');
        continue;
      }

      try {
        const res = await uploadProductImage(productId, file);
        if (res.url) {
          uploadedUrls.push(res.url);
        }
      } catch (err: any) {
        console.warn('Image upload error:', err);
        setUploadError(err.message || 'Failed to upload image file');
      }
    }

    if (uploadedUrls.length > 0) {
      onChange([...images, ...uploadedUrls]);
    }

    setIsUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:') {
        setUploadError('Only secure https:// image URLs are allowed.');
        return;
      }
      const pathname = parsed.pathname.toLowerCase();
      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
      const hasValidExt = validExtensions.some((ext) => pathname.endsWith(ext));
      const isKnownCdn =
        parsed.hostname.includes('unsplash.com') ||
        parsed.hostname.includes('cloudinary.com') ||
        parsed.hostname.includes('firebasestorage.googleapis.com') ||
        parsed.hostname.includes('googleusercontent.com') ||
        parsed.hostname.includes('imgbb.com');

      if (!hasValidExt && !isKnownCdn) {
        setUploadError('URL must point to a supported image file (.jpg, .jpeg, .png, .webp, .avif) or recognized CDN.');
        return;
      }
      onChange([...images, trimmed]);
      setUrlInput('');
      setUploadError(null);
    } catch {
      setUploadError('Please enter a valid https:// image URL.');
    }
  };

  const handleRemoveImage = (index: number) => {
    const updated = images.filter((_, idx) => idx !== index);
    onChange(updated);
    setUploadError(null);
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    const selected = images[index];
    const rest = images.filter((_, idx) => idx !== index);
    onChange([selected, ...rest]);
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= images.length) return;
    const reordered = [...images];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;
    onChange(reordered);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="block font-bold text-xs text-[#002c11]">
            Product Image Gallery ({images.length} images) *
          </label>
          <p className="text-[11px] text-[#717970]">
            The first image is the <strong className="text-[#002c11]">Primary Showcase Photo</strong> shown in the marketplace.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#002c11] hover:bg-[#1b6d24] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          <span>{isUploading ? 'Uploading...' : 'Upload Photos'}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          multiple
          onChange={handleFilesSelected}
          className="hidden"
        />
      </div>

      {uploadProgress && (
        <div className="flex items-center gap-2 p-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" />
          <span>{uploadProgress}</span>
        </div>
      )}

      {uploadError && (
        <div className="flex items-center gap-2 p-2 bg-red-50 text-red-800 rounded-xl text-xs">
          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Image URL addition field */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <ImageIcon className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddUrl();
              }
            }}
            placeholder="Or paste external image URL (https://...)"
            className="w-full bg-[#f0eded] text-stone-900 placeholder:text-stone-500 font-medium border border-[#c1c9be]/60 rounded-xl pl-9 pr-3 py-1.5 text-xs outline-none focus:border-[#1b6d24] focus:ring-1 focus:ring-[#1b6d24]"
            disabled={disabled}
          />
        </div>
        <button
          type="button"
          onClick={handleAddUrl}
          disabled={disabled || !urlInput.trim()}
          className="px-3 py-1.5 bg-[#f0eded] hover:bg-[#e8f5e9] text-[#002c11] text-xs font-bold rounded-xl border border-[#c1c9be]/60 transition-colors disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5 inline mr-1" />
          Add URL
        </button>
      </div>

      {/* Image Thumbnails Gallery */}
      {images.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#c1c9be] rounded-2xl p-6 text-center cursor-pointer hover:bg-emerald-50/40 hover:border-[#1b6d24] transition-all"
        >
          <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-[#1b6d24] mb-2">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-[#002c11]">No images uploaded yet</p>
          <p className="text-[11px] text-[#717970] mt-0.5">
            Click to select JPEG, PNG, or WEBP photos from your device (Max 10MB each)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
          {images.map((imgUrl, index) => {
            const isPrimary = index === 0;
            return (
              <div
                key={`${imgUrl}-${index}`}
                className={`relative group rounded-2xl overflow-hidden border-2 bg-stone-50 aspect-square flex flex-col justify-between p-1.5 transition-all ${
                  isPrimary
                    ? 'border-[#1b6d24] ring-2 ring-[#1b6d24]/20 shadow-xs'
                    : 'border-[#c1c9be]/60 hover:border-stone-400'
                }`}
              >
                <img
                  src={imgUrl}
                  alt={`Product view ${index + 1}`}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600';
                  }}
                />

                {/* Badges and controls */}
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  {isPrimary ? (
                    <span className="px-2 py-0.5 bg-[#002c11] text-[#a0f399] rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      Primary
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(index)}
                      className="px-1.5 py-0.5 bg-black/70 hover:bg-[#002c11] text-white rounded-md text-[9px] font-bold shadow-xs transition-colors"
                      title="Make Primary Showcase Photo"
                    >
                      Make Primary
                    </button>
                  )}
                </div>

                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition-colors"
                    title="Remove Photo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Reorder arrows */}
                {images.length > 1 && (
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-xs rounded-lg py-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'left')}
                      className="p-0.5 text-white hover:text-[#a0f399] disabled:opacity-20"
                      title="Move left"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <span className="text-[9px] text-white font-mono">{index + 1}/{images.length}</span>
                    <button
                      type="button"
                      disabled={index === images.length - 1}
                      onClick={() => handleMove(index, 'right')}
                      className="p-0.5 text-white hover:text-[#a0f399] disabled:opacity-20"
                      title="Move right"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
