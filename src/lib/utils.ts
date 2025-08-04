import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { logger } from './logger'

/**
 * A utility function that merges Tailwind CSS classes with clsx for conditional class handling.
 *
 * This function is a common pattern in projects that use shadcn/ui. It allows you to
 * conditionally apply classes and merge them with existing Tailwind classes without
 * conflicts.
 *
 * @param inputs - An array of class values to be merged.
 * @returns The merged class string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(...inputs))
}

/**
 * Creates a downloadable link for a Blob and triggers the download.
 * This helper prevents memory leaks by revoking the object URL after the download.
 *
 * @param blob - The Blob object to download.
 * @param filename - The name of the file to be downloaded.
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    logger.error('downloadBlob called in a non-browser environment');
    return;
  }

  const safeName = (filename ?? '').trim() || 'download';
  let url: string | undefined;

  try {
url = window.URL.createObjectURL(blob);
    logger.debug('[BLOB_URL] Created URL', { url, filename: safeName, blobSize: blob.size });
    const link = document.createElement('a');
    link.href = url;
    link.download = safeName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    logger.error('downloadBlob failed', err);
  } finally {
    if (url) {
      // Defer revocation to avoid timing races in some browsers
setTimeout(() => {
        URL.revokeObjectURL(url!);
        logger.debug('[BLOB_URL] Revoked URL', { url, filename: safeName });
      }, 0);
    }
  }
};
