import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Creates a downloadable link for a Blob and triggers the download.
 * This helper prevents memory leaks by revoking the object URL after the download.
 *
 * @param blob - The Blob object to download.
 * @param filename - The name of the file to be downloaded.
 */
export const downloadBlob = (blob: Blob, filename:string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
