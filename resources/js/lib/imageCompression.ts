import imageCompression from 'browser-image-compression';

const MAX_SIZE_MB = 0.8;
const MAX_DIMENSION_PX = 1920;

/**
 * Compresses an image client-side before upload. Falls back to the
 * original file if compression fails (e.g. unsupported format) or
 * if it's already small enough to skip the work.
 */
export async function compressImage(file: File): Promise<File> {
    if (file.size <= MAX_SIZE_MB * 1024 * 1024) {
        return file;
    }

    try {
        return await imageCompression(file, {
            maxSizeMB: MAX_SIZE_MB,
            maxWidthOrHeight: MAX_DIMENSION_PX,
            useWebWorker: true,
            fileType: file.type,
        });
    } catch {
        return file;
    }
}
