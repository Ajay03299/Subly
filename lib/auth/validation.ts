/**
 * Auth validation rules:
 * - Email must be unique (checked in API when creating user)
 * - Password: length > 8, uppercase, lowercase, special character
 */

const MIN_PASSWORD_LENGTH = 8;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }
  if (password.length <= MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be longer than ${MIN_PASSWORD_LENGTH} characters`,
    };
  }
  if (!HAS_UPPERCASE.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }
  if (!HAS_LOWERCASE.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }
  if (!HAS_SPECIAL.test(password)) {
    return { valid: false, error: "Password must contain at least one special character" };
  }
  return { valid: true };
}

export const PASSWORD_RULES = [
  `More than ${MIN_PASSWORD_LENGTH} characters`,
  "At least one uppercase letter",
  "At least one lowercase letter",
  "At least one special character (!@#$%^&* etc.)",
] as const;
