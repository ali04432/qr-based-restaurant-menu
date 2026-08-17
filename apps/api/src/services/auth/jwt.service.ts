import jwt, { SignOptions } from 'jsonwebtoken';
import { JwtPayload } from '@qr-menu/shared';
import { env } from '../../config/env';

// ============================================================
// JWT Utility Service
// ============================================================

/**
 * Sign a new JWT access token.
 * @param payload - The data to embed in the token
 * @returns A signed JWT string
 */
export function signToken(
  payload: Omit<JwtPayload, 'iat' | 'exp'>
): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    subject: payload.sub,
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * Verify and decode a JWT token.
 * @param token - The JWT string to verify
 * @returns The decoded JwtPayload, or null if invalid/expired
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    // Invalid signature, expired, malformed — all result in null
    return null;
  }
}

/**
 * Decode a JWT without verifying the signature.
 * Use only when you need to inspect claims without trust (e.g., logging).
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload | null;
  } catch {
    return null;
  }
}
