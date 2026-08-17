import bcrypt from 'bcryptjs';
import { env } from '../../config/env';

// ============================================================
// Password Hashing Service
// Wraps bcryptjs with the configured salt rounds from env.
// ============================================================

/**
 * Hash a plain-text password using bcrypt.
 * @param plainTextPassword - The raw password to hash
 * @returns The bcrypt hash string
 */
export async function hashPassword(plainTextPassword: string): Promise<string> {
  const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
  return bcrypt.hash(plainTextPassword, salt);
}

/**
 * Compare a plain-text password against a stored bcrypt hash.
 * @param plainTextPassword - The raw password to check
 * @param hash - The stored bcrypt hash
 * @returns true if the password matches, false otherwise
 */
export async function comparePassword(
  plainTextPassword: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, hash);
}
