import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: string | number): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return String(price);
  return `$${num.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatAddress(address: string, city?: string | null, state?: string | null, zip?: string | null): string {
  const parts = [address];
  const locationParts = [city, state].filter(Boolean).join(", ");
  if (locationParts) parts.push(locationParts);
  if (zip) parts.push(zip);
  return parts.join(", ");
}
