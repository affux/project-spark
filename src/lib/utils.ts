import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency with the specified currency code
 * @param amount - The amount to format
 * @param currencyCode - The currency code (default: USD)
 * @param locale - The locale to use for formatting (default: en-US)
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Validate a price value - must be a non-negative number
 * @param value - The value to validate
 * @param minValue - Optional minimum value (default: 0)
 */
export function isValidPrice(value: string | number, minValue: number = 0): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num >= minValue;
}

/**
 * Validate and sanitize a price input - returns sanitized value or empty string if invalid
 * @param value - The input value
 * @param allowNegative - Whether to allow negative values (default: false)
 */
export function sanitizePriceInput(value: string, allowNegative: boolean = false): string {
  // Remove any non-numeric characters except decimal point and minus sign
  let sanitized = value.replace(/[^0-9.-]/g, '');
  
  // Handle negative sign - only allow at the start if permitted
  if (!allowNegative) {
    sanitized = sanitized.replace(/-/g, '');
  } else {
    // Only allow one minus sign at the start
    const hasNegative = sanitized.startsWith('-');
    sanitized = sanitized.replace(/-/g, '');
    if (hasNegative) sanitized = '-' + sanitized;
  }
  
  // Only allow one decimal point
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    sanitized = parts[0] + '.' + parts.slice(1).join('');
  }
  
  return sanitized;
}

/**
 * Format a percentage value for display
 * @param value - The percentage value
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
