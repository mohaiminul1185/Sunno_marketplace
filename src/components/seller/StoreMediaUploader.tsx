import React, { useState, useRef } from 'react';
import { Upload, X, RefreshCw, Image as ImageIcon, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { uploadStoreAssetWithProgress, validateImageFile } from '../../services/storageService';

interface StoreMediaUploaderProps {
  storeId: string;
  assetType: 'logo' | 'banner';
  currentUrl?: string;
  onUploadSuccess: (url: string) => void;
  onRemove?: () => void;
  title: string;
  description: string;
  aspectRatioHint: string;
}

export const StoreMediaUploader: React.FC<StoreMediaUploaderProps> = ({
  storeId,
  assetType,
  currentUrl,
  onUploadSuccess,
  onRemove,
  title,
  description,
  aspectRatioHint,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync if currentUrl updates externally
  React.useEffect(() => {
    if (currentUrl) {
      setPreviewUrl(currentUrl);
    }
  }, [currentUrl]);

  const handleFileProcess = async (file: File) => {
    setErrorMsg(null);
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Invalid image file.');
      return;
    }

    // Instant local preview
    const tempUrl = URL.createObjectURL(file);
    setPreviewUrl(tempUrl);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadStoreAssetWithProgress(
        storeId || 'new_store',
        assetType,
        file,
        (pct) => setUploadProgress(pct),
        currentUrl
      );

      setPreviewUrl(result.url);
      onUploadSuccess(result.url);
    } catch (err: any) {
      console.error(`Store ${assetType} upload failed:`, err);
      setErrorMsg(err.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleManualUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;
    if (!manualUrl.startsWith('http://') && !manualUrl.startsWith('https://')) {
      setErrorMsg('Please enter a valid URL starting with http:// or https://');
      return;
    }
    setPreviewUrl(manualUrl.trim());
    onUploadSuccess(manualUrl.trim());
    setShowUrlInput(false);
    setManualUrl('');
    setErrorMsg(null);
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onRemove) onRemove();
  };

  const isLogo = assetType === 'logo';

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 md:p-5 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-serif font-bold text-stone-900 text-sm md:text-base">{title}</h4>
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {aspectRatioHint}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-xs text-stone-500 hover:text-emerald-700 underline font-medium"
        >
          {showUrlInput ? 'Use File Upload' : 'Paste Image URL'}
        </button>
      </div>

      {showUrlInput ? (
        <form onSubmit={handleManualUrlSubmit} className="flex gap-2 mb-3">
          <input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://example.com/artisan-store-asset.jpg"
            className="flex-1 text-xs border border-stone-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl"
          >
            Apply
          </button>
        </form>
      ) : null}

      {/* Upload Zone & Preview */}
      <div className="relative">
        {previewUrl ? (
          <div className="relative group overflow-hidden rounded-xl border border-stone-200 bg-stone-900/5">
            {isLogo ? (
              <div className="h-32 w-32 mx-auto my-2 rounded-2xl overflow-hidden border-2 border-stone-200 shadow-inner bg-white flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Store Logo Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-40 w-full overflow-hidden rounded-xl bg-stone-100 flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Store Banner Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Hover Action Overlay */}
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-white text-stone-900 text-xs font-semibold rounded-lg shadow-sm hover:bg-stone-100 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Replace
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-rose-700 flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl cursor-pointer p-6 text-center transition-all ${
              isDragOver
                ? 'border-emerald-600 bg-emerald-50/50'
                : 'border-stone-300 hover:border-emerald-600 bg-white hover:bg-stone-50'
            }`}
          >
            <div className="mx-auto w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-stone-800">
              <span className="text-emerald-700 font-semibold underline">Click to upload</span> or drag and drop
            </p>
            <p className="text-[11px] text-stone-400 mt-1">JPEG, PNG, WEBP, or AVIF (Up to 10MB)</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-stone-600 mb-1">
            <span className="flex items-center gap-1 font-medium text-emerald-800">
              <Sparkles className="w-3.5 h-3.5 animate-spin" /> Uploading to Secure Eco Storage...
            </span>
            <span className="font-mono font-bold text-emerald-700">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {errorMsg && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
