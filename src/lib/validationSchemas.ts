/**
 * Centralized Validation Schemas
 * 
 * OWASP Best Practices:
 * - Schema-based validation with zod
 * - Type checks with strict parsing
 * - Length limits to prevent DoS
 * - Sanitization helpers
 * - Rejection of unexpected fields
 */

import { z } from 'zod';

// ============================================================================
// Constants for validation limits
// ============================================================================

export const VALIDATION_LIMITS = {
  // String lengths
  NAME_MIN: 1,
  NAME_MAX: 100,
  EMAIL_MAX: 254, // RFC 5321
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  PHONE_MIN: 7,
  PHONE_MAX: 20,
  ADDRESS_MAX: 500,
  MESSAGE_MAX: 5000,
  ORDER_NUMBER_MAX: 50,
  SEARCH_QUERY_MAX: 200,
  UUID_LENGTH: 36,
  
  // Numeric limits
  AMOUNT_MIN: 0,
  AMOUNT_MAX: 10000000, // 10 million
  QUANTITY_MIN: 1,
  QUANTITY_MAX: 1000,
} as const;

// ============================================================================
// Sanitization Helpers
// ============================================================================

/**
 * Escape HTML special characters to prevent XSS
 * Use this before rendering any user-provided content
 */
export const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Strip HTML tags from string (for plain text contexts)
 */
export const stripHtml = (str: string): string => {
  return str.replace(/<[^>]*>/g, '');
};

/**
 * Normalize whitespace (trim and collapse multiple spaces)
 */
export const normalizeWhitespace = (str: string): string => {
  return str.trim().replace(/\s+/g, ' ');
};

/**
 * Remove non-printable characters
 */
export const removeNonPrintable = (str: string): string => {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\x00-\x1F\x7F]/g, '');
};

/**
 * Sanitize string with all common sanitization steps
 */
export const sanitizeString = (str: string): string => {
  return normalizeWhitespace(removeNonPrintable(str));
};

// ============================================================================
// Common Field Schemas
// ============================================================================

/**
 * Email validation schema with proper format and length checks
 */
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(VALIDATION_LIMITS.EMAIL_MAX, `Email must be less than ${VALIDATION_LIMITS.EMAIL_MAX} characters`)
  .email('Please enter a valid email address')
  .transform(val => val.toLowerCase());

/**
 * Name validation schema
 */
export const nameSchema = z
  .string()
  .trim()
  .min(VALIDATION_LIMITS.NAME_MIN, 'Name is required')
  .max(VALIDATION_LIMITS.NAME_MAX, `Name must be less than ${VALIDATION_LIMITS.NAME_MAX} characters`)
  .transform(sanitizeString);

/**
 * Phone number validation schema
 * Allows digits, spaces, dashes, parentheses, and plus sign
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(VALIDATION_LIMITS.PHONE_MIN, 'Phone number is too short')
  .max(VALIDATION_LIMITS.PHONE_MAX, `Phone number must be less than ${VALIDATION_LIMITS.PHONE_MAX} characters`)
  .regex(/^[\d\s\-+()]+$/, 'Phone number contains invalid characters')
  .transform(val => val.replace(/[^\d+]/g, '')); // Normalize to digits and plus only

/**
 * Password validation schema with strength requirements
 */
export const passwordSchema = z
  .string()
  .min(VALIDATION_LIMITS.PASSWORD_MIN, `Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN} characters`)
  .max(VALIDATION_LIMITS.PASSWORD_MAX, `Password must be less than ${VALIDATION_LIMITS.PASSWORD_MAX} characters`)
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

/**
 * UUID validation schema
 */
export const uuidSchema = z
  .string()
  .trim()
  .length(VALIDATION_LIMITS.UUID_LENGTH, 'Invalid ID format')
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'Invalid ID format'
  );

/**
 * Order number validation schema
 */
export const orderNumberSchema = z
  .string()
  .trim()
  .min(1, 'Order number is required')
  .max(VALIDATION_LIMITS.ORDER_NUMBER_MAX, 'Order number is too long')
  .regex(/^[A-Z0-9\-]+$/i, 'Order number contains invalid characters')
  .transform(val => val.toUpperCase());

/**
 * Search query validation schema
 */
export const searchQuerySchema = z
  .string()
  .trim()
  .max(VALIDATION_LIMITS.SEARCH_QUERY_MAX, 'Search query is too long')
  .transform(sanitizeString);

/**
 * Message/text content validation schema
 */
export const messageSchema = z
  .string()
  .trim()
  .min(1, 'Message is required')
  .max(VALIDATION_LIMITS.MESSAGE_MAX, `Message must be less than ${VALIDATION_LIMITS.MESSAGE_MAX} characters`)
  .transform(sanitizeString);

/**
 * Address validation schema
 */
export const addressSchema = z
  .string()
  .trim()
  .min(1, 'Address is required')
  .max(VALIDATION_LIMITS.ADDRESS_MAX, `Address must be less than ${VALIDATION_LIMITS.ADDRESS_MAX} characters`)
  .transform(sanitizeString);

/**
 * Positive number validation schema
 */
export const positiveNumberSchema = z
  .number()
  .positive('Value must be positive')
  .max(VALIDATION_LIMITS.AMOUNT_MAX, 'Value is too large');

/**
 * Non-negative number validation schema
 */
export const nonNegativeNumberSchema = z
  .number()
  .min(0, 'Value cannot be negative')
  .max(VALIDATION_LIMITS.AMOUNT_MAX, 'Value is too large');

/**
 * Quantity validation schema
 */
export const quantitySchema = z
  .number()
  .int('Quantity must be a whole number')
  .min(VALIDATION_LIMITS.QUANTITY_MIN, `Quantity must be at least ${VALIDATION_LIMITS.QUANTITY_MIN}`)
  .max(VALIDATION_LIMITS.QUANTITY_MAX, `Quantity cannot exceed ${VALIDATION_LIMITS.QUANTITY_MAX}`);

// ============================================================================
// Form-Specific Schemas
// ============================================================================

/**
 * Checkout form validation schema
 */
export const checkoutSchema = z.object({
  firstName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  countryCode: z.string().length(2, 'Invalid country code'),
  streetAddress: addressSchema,
  apartment: z.string().max(100, 'Apartment/suite is too long').optional(),
  city: z.string().trim().min(1, 'City is required').max(100, 'City name is too long'),
  pinCode: z.string().trim().min(1, 'PIN/ZIP code is required').max(20, 'PIN/ZIP code is too long'),
  state: z.string().trim().min(1, 'State is required').max(100, 'State name is too long'),
}).strict(); // Reject unexpected fields

/**
 * Contact form validation schema
 */
export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: z.string().trim().optional(),
  message: messageSchema,
}).strict();

/**
 * Login form validation schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
}).strict();

/**
 * Signup form validation schema
 */
export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).strict().refine(
  data => data.password === data.confirmPassword,
  { message: "Passwords don't match", path: ['confirmPassword'] }
);

/**
 * Product form validation schema (admin)
 */
export const productSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'Name is too long'),
  description: z.string().max(5000, 'Description is too long').optional(),
  sku: z.string().trim().min(1, 'SKU is required').max(50, 'SKU is too long')
    .regex(/^[A-Z0-9\-_]+$/i, 'SKU contains invalid characters'),
  category: z.string().max(100, 'Category is too long').optional(),
  base_price: positiveNumberSchema,
  stock: nonNegativeNumberSchema.int(),
}).strict();

/**
 * Payout request validation schema
 */
export const payoutRequestSchema = z.object({
  amount: positiveNumberSchema,
  payment_method: z.enum(['bank_transfer', 'upi', 'paypal']),
  payment_details: z.object({
    account_name: nameSchema.optional(),
    account_number: z.string().max(50).optional(),
    bank_name: z.string().max(100).optional(),
    ifsc_code: z.string().max(20).optional(),
    upi_id: z.string().max(100).optional(),
    paypal_email: emailSchema.optional(),
  }),
}).strict();

/**
 * Support ticket validation schema
 */
export const supportTicketSchema = z.object({
  category: z.string().min(1, 'Category is required').max(50),
  subject: z.string().trim().min(1, 'Subject is required').max(200, 'Subject is too long'),
  message: messageSchema,
}).strict();

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Safely parse and validate data with a schema
 * Returns { success: true, data } or { success: false, errors }
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach(err => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = err.message;
        }
      });
      return { success: false, errors };
    }
    return { success: false, errors: { _form: 'Validation failed' } };
  }
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a string is a valid email (simple check)
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: Record<string, string>): string[] {
  return Object.values(errors);
}
