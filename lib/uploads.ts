export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function isAllowedImage(file: File) {
  return ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number]) && file.size <= MAX_IMAGE_BYTES;
}
