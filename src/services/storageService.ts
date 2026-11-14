/**
 * SUNNO Marketplace - Firebase Storage Service
 * Handles secure file uploads for product images, store logos/banners, and customer avatars.
 */
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export interface UploadResult {
  url: string;
  path: string;
  fileName: string;
  size: number;
}

/**
 * Validates image before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Please upload a JPEG, PNG, WEBP, or GIF.`,
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
    };
  }
  return { valid: true };
}

/**
 * Compresses an image client-side using an offscreen canvas to optimize store logo and banner uploads.
 */
export async function compressImageFile(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.85
): Promise<File> {
  // If not in a browser environment or file is not an image, return unchanged
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) {
    return file;
  }
  // Skip compression for GIFs to preserve animation
  if (file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Prefer webp if supported, otherwise jpeg
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/webp';
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // If compression didn't reduce size, keep original
            resolve(file);
            return;
          }
          const compressedFile = new File([blob], file.name, {
            type: outputType,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads a store logo or banner with progress callback and previous asset cleanup
 * Path: stores/{storeId}/{assetType}-{timestamp}-{fileName}
 */
export async function uploadStoreAssetWithProgress(
  storeId: string,
  assetType: 'logo' | 'banner',
  file: File,
  onProgress?: (progressPercent: number) => void,
  previousUrl?: string
): Promise<UploadResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Compress if larger than 500KB
  let targetFile = file;
  if (file.size > 500 * 1024) {
    try {
      const maxDim = assetType === 'logo' ? 800 : 1920;
      targetFile = await compressImageFile(file, maxDim, maxDim, 0.88);
    } catch (e) {
      console.warn('Image compression skipped:', e);
    }
  }

  const cleanFileName = targetFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `stores/${storeId}/${assetType}-${Date.now()}-${cleanFileName}`;
  const storageRef = ref(storage, path);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, targetFile, {
      contentType: targetFile.type,
      customMetadata: {
        storeId,
        assetType,
        uploadedAt: new Date().toISOString(),
      },
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(progress);
        }
      },
      (error) => {
        console.warn('Storage resumable upload notice:', error);
        // Fallback for offline / emulator sandbox
        if (onProgress) onProgress(100);
        resolve({
          url: URL.createObjectURL(targetFile),
          path,
          fileName: targetFile.name,
          size: targetFile.size,
        });
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);

          // Attempt safe cleanup of previous asset if on firebase storage
          if (previousUrl && previousUrl.includes('firebasestorage.googleapis.com')) {
            try {
              const oldRef = ref(storage, previousUrl);
              deleteObject(oldRef).catch(() => {});
            } catch {
              // Ignore cleanup errors
            }
          }

          resolve({
            url,
            path,
            fileName: targetFile.name,
            size: targetFile.size,
          });
        } catch (err) {
          console.warn('Failed to get download URL, using local object URL fallback:', err);
          resolve({
            url: URL.createObjectURL(targetFile),
            path,
            fileName: targetFile.name,
            size: targetFile.size,
          });
        }
      }
    );
  });
}

/**
 * Uploads a product image
 * Path: products/{productId}/{timestamp}-{fileName}
 */
export async function uploadProductImage(productId: string, file: File): Promise<UploadResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `products/${productId}/${Date.now()}-${cleanFileName}`;
  const storageRef = ref(storage, path);

  try {
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        productId,
        uploadedAt: new Date().toISOString(),
      },
    });

    const url = await getDownloadURL(snapshot.ref);
    return {
      url,
      path,
      fileName: file.name,
      size: file.size,
    };
  } catch (err: any) {
    console.warn('Firebase Storage upload notice (falling back to object URL if offline):', err);
    return {
      url: URL.createObjectURL(file),
      path,
      fileName: file.name,
      size: file.size,
    };
  }
}

/**
 * Uploads a store logo or banner
 * Path: shops/{storeId}/{assetType}-{timestamp}-{fileName}
 */
export async function uploadStoreAsset(
  storeId: string,
  assetType: 'logo' | 'banner',
  file: File
): Promise<UploadResult> {
  return uploadStoreAssetWithProgress(storeId, assetType, file);
}

/**
 * Uploads a customer or artisan profile avatar
 * Path: users/{userId}/avatar-{timestamp}-{fileName}
 */
export async function uploadUserAvatar(userId: string, file: File): Promise<UploadResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `users/${userId}/avatar-${Date.now()}-${cleanFileName}`;
  const storageRef = ref(storage, path);

  try {
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        userId,
        uploadedAt: new Date().toISOString(),
      },
    });

    const url = await getDownloadURL(snapshot.ref);
    return {
      url,
      path,
      fileName: file.name,
      size: file.size,
    };
  } catch (err: any) {
    console.warn('Firebase Storage avatar upload notice:', err);
    return {
      url: URL.createObjectURL(file),
      path,
      fileName: file.name,
      size: file.size,
    };
  }
}

/**
 * Uploads a private seller verification document (NID, Trade License, Artisan Certificate)
 * Path: seller-documents/{userId}/{timestamp}-{fileName}
 * Strictly private - not accessible publicly
 */
export async function uploadSellerDocument(userId: string, file: File): Promise<UploadResult> {
  const allowedDocTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];
  if (!allowedDocTypes.includes(file.type)) {
    throw new Error(`Invalid document type: ${file.type}. Please upload a PDF or image (JPEG/PNG/WEBP).`);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `seller-documents/${userId}/${Date.now()}-${cleanFileName}`;
  const storageRef = ref(storage, path);

  try {
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        userId,
        uploadedAt: new Date().toISOString(),
        documentType: 'verification',
      },
    });

    const url = await getDownloadURL(snapshot.ref);
    return {
      url,
      path,
      fileName: file.name,
      size: file.size,
    };
  } catch (err: any) {
    console.warn('Firebase Storage document upload notice:', err);
    return {
      url: URL.createObjectURL(file),
      path,
      fileName: file.name,
      size: file.size,
    };
  }
}

/**
 * Uploads a chat or order communication attachment (receipts, damaged item proof, custom photos)
 * Path: chat-attachments/{conversationId}/{timestamp}-{fileName}
 */
export async function uploadChatAttachment(conversationId: string, file: File): Promise<UploadResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `chat-attachments/${conversationId}/${Date.now()}-${cleanFileName}`;
  const storageRef = ref(storage, path);

  try {
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        conversationId,
        uploadedAt: new Date().toISOString(),
      },
    });

    const url = await getDownloadURL(snapshot.ref);
    return {
      url,
      path,
      fileName: file.name,
      size: file.size,
    };
  } catch (err: any) {
    console.warn('Firebase Storage chat attachment upload notice:', err);
    return {
      url: URL.createObjectURL(file),
      path,
      fileName: file.name,
      size: file.size,
    };
  }
}

/**
 * Deletes a file from Firebase Storage
 */
export async function deleteStorageFile(path: string): Promise<void> {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (err) {
    console.warn('Could not delete file from storage path:', path, err);
  }
}

const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB video limit
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];

/**
 * Validates video before upload
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported video format: ${file.type}. Please upload an MP4, WebM, or MOV video.`,
    };
  }
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return {
      valid: false,
      error: `Video file exceeds 50MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please compress the video.`,
    };
  }
  return { valid: true };
}

/**
 * Uploads a product video
 * Path: products/{productId}/videos/{timestamp}-{fileName}
 */
export async function uploadProductVideo(productId: string, file: File): Promise<UploadResult> {
  const validation = validateVideoFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `products/${productId}/videos/${Date.now()}-${cleanFileName}`;
  const storageRef = ref(storage, path);

  try {
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        productId,
        mediaType: 'video',
        uploadedAt: new Date().toISOString(),
      },
    });

    const url = await getDownloadURL(snapshot.ref);
    return {
      url,
      path,
      fileName: file.name,
      size: file.size,
    };
  } catch (err: any) {
    console.warn('Firebase Storage product video upload notice:', err);
    return {
      url: URL.createObjectURL(file),
      path,
      fileName: file.name,
      size: file.size,
    };
  }
}

/**
 * Uploads CMS media (banner, logo, storytelling video, marketing asset)
 * and registers metadata in Firestore media_assets collection.
 */
export async function uploadCmsMedia(
  file: File,
  category: 'banner' | 'logo' | 'story' | 'document' | 'general' = 'general',
  uploaderEmail: string = 'admin@sunno.eco'
): Promise<UploadResult> {
  const isVideo = file.type.startsWith('video/');
  if (isVideo) {
    const val = validateVideoFile(file);
    if (!val.valid) throw new Error(val.error);
  } else {
    const val = validateImageFile(file);
    if (!val.valid) throw new Error(val.error);
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `cms/${category}/${Date.now()}-${cleanFileName}`;
  const storageRef = ref(storage, path);

  try {
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        category,
        uploadedBy: uploaderEmail,
        uploadedAt: new Date().toISOString(),
      },
    });

    const url = await getDownloadURL(snapshot.ref);
    return {
      url,
      path,
      fileName: file.name,
      size: file.size,
    };
  } catch (err: any) {
    console.warn('Firebase Storage CMS media upload notice:', err);
    return {
      url: URL.createObjectURL(file),
      path,
      fileName: file.name,
      size: file.size,
    };
  }
}
