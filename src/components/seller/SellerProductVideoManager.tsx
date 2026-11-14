import React, { useState, useRef } from 'react';
import { Video, Trash2, Upload, AlertCircle, Loader2, Play } from 'lucide-react';
import { uploadProductVideo, validateVideoFile } from '../../services/storageService';

interface SellerProductVideoManagerProps {
  videoUrl?: string;
  onChange: (url: string | undefined) => void;
  productId?: string;
  disabled?: boolean;
}

export const SellerProductVideoManager: React.FC<SellerProductVideoManagerProps> = ({
  videoUrl,
  onChange,
  productId = `prod-${Date.now()}`,
  disabled = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid video file');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const res = await uploadProductVideo(productId, file);
      if (res.url) {
        onChange(res.url);
      }
    } catch (err: any) {
      console.error('Video upload error:', err);
      setUploadError(err.message || 'Failed to upload video');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddDirectUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:') {
        setUploadError('Only secure https:// video URLs are allowed.');
        return;
      }
      const pathname = parsed.pathname.toLowerCase();
      const validExtensions = ['.mp4', '.webm', '.mov', '.ogg'];
      const hasValidExt = validExtensions.some((ext) => pathname.endsWith(ext));
      const isKnownVideoHost =
        parsed.hostname.includes('firebasestorage.googleapis.com') ||
        parsed.hostname.includes('vimeo.com') ||
        parsed.hostname.includes('youtube.com') ||
        parsed.hostname.includes('youtu.be') ||
        parsed.hostname.includes('cloudinary.com');

      if (!hasValidExt && !isKnownVideoHost) {
        setUploadError('Please provide a direct MP4/WebM video URL or supported hosting link (Firebase Storage, Cloudinary, YouTube/Vimeo).');
        return;
      }
      onChange(trimmed);
      setUrlInput('');
      setUploadError(null);
    } catch {
      setUploadError('Please enter a valid https:// video URL.');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block font-bold text-xs text-[#002c11]">
          Optional Product Showcase Video
        </label>
        <span className="text-[10px] text-[#717970]">Max 50MB (MP4, WebM)</span>
      </div>

      {uploadError && (
        <div className="flex items-center gap-1.5 p-2 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {videoUrl ? (
        <div className="relative rounded-xl overflow-hidden bg-black/5 border border-[#c1c9be]/60 p-2">
          <div className="aspect-video max-h-48 rounded-lg overflow-hidden bg-black relative">
            <video
              src={videoUrl}
              controls
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-[#414941] truncate max-w-xs">{videoUrl}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                className="px-2.5 py-1 text-xs bg-[#f0eded] hover:bg-[#e8f5e9] text-[#002c11] rounded-lg font-bold transition-colors cursor-pointer"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange(undefined)}
                disabled={disabled || isUploading}
                className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Remove video"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="flex-1 border-2 border-dashed border-[#c1c9be] hover:border-[#1b6d24] rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-bold text-[#002c11] hover:bg-[#fbf9f8] transition-all cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#1b6d24]" />
                <span>Uploading Video...</span>
              </>
            ) : (
              <>
                <Video className="w-4 h-4 text-[#1b6d24]" />
                <span>Upload Video File (Firebase Storage)</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1 sm:w-1/2">
            <input
              type="url"
              placeholder="Or paste video MP4 URL..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={disabled || isUploading}
              className="flex-1 bg-[#f0eded] border border-[#c1c9be]/60 rounded-xl px-2.5 py-2 text-xs outline-none focus:border-[#1b6d24]"
            />
            <button
              type="button"
              onClick={handleAddDirectUrl}
              disabled={disabled || isUploading || !urlInput.trim()}
              className="px-3 py-2 bg-[#002c11] hover:bg-[#1b6d24] text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/quicktime"
        onChange={handleFileSelected}
        className="hidden"
      />
    </div>
  );
};
