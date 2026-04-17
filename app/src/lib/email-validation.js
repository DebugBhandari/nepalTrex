/**
 * Email validation utility
 * Uses a more comprehensive regex pattern and additional checks
 */

// RFC 5322 simplified pattern for email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Common disposable email domains to block (optional)
const DISPOSABLE_DOMAINS = [
  'tempmail.com',
  'throwaway.email',
  'guerrillamail.com',
  '10minutemail.com',
  'mailinator.com',
];

export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Basic regex validation
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return false;
  }

  // Check length
  if (trimmedEmail.length > 254) {
    return false;
  }

  const [localPart, domain] = trimmedEmail.split('@');

  // Local part should not be too long (RFC 5321)
  if (localPart.length > 64) {
    return false;
  }

  // Check for consecutive dots
  if (localPart.includes('..') || domain.includes('..')) {
    return false;
  }

  // Check for leading/trailing dots
  if (localPart.startsWith('.') || localPart.endsWith('.') ||
      domain.startsWith('.') || domain.endsWith('.')) {
    return false;
  }

  // Optional: Check against disposable email domains
  if (DISPOSABLE_DOMAINS.some(d => domain.endsWith(d))) {
    return false;
  }

  return true;
}

export function getEmailValidationError(email) {
  if (!email || !email.trim()) {
    return 'Email is required';
  }

  if (email.length > 254) {
    return 'Email is too long (max 254 characters)';
  }

  if (!EMAIL_REGEX.test(email)) {
    return 'Please enter a valid email address';
  }

  const [localPart] = email.split('@');
  if (localPart.length > 64) {
    return 'Email local part is too long';
  }

  const domain = email.split('@')[1];
  if (DISPOSABLE_DOMAINS.some(d => domain.toLowerCase().endsWith(d))) {
    return 'Disposable email addresses are not allowed';
  }

  return null;
}
