import { prisma } from '../../config/database';
import { hashPassword, comparePassword } from './password.service';
import { signToken } from './jwt.service';
import { AppError, errors } from '../../middleware/error.middleware';
import { CreateUserInput, LoginInput, AuthResponse, SafeUser, UserRole } from '@qr-menu/shared';

// ============================================================
// Authentication Service
// Orchestrates user registration, login, and token refresh.
// This is a stub with the core structure — full implementation
// in later phases when login UI is built.
// ============================================================

/**
 * Register a new staff user.
 * Password is hashed before storage.
 */
export async function registerUser(input: CreateUserInput): Promise<SafeUser> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new AppError('A user with this email already exists', 409, 'CONFLICT');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      restaurantId: input.restaurantId ?? null,
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role as import('@prisma/client').UserRole,
    },
    select: {
      id: true,
      restaurantId: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return {
    ...user,
    role: user.role as unknown as UserRole,
  };
}

/**
 * Authenticate a user with email and password.
 * Returns an AuthResponse containing the safe user and a signed JWT.
 */
export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    // Use a generic message to avoid user enumeration attacks
    throw errors.unauthorized('Invalid email or password');
  }

  const isPasswordValid = await comparePassword(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw errors.unauthorized('Invalid email or password');
  }

  const safeUser: SafeUser = {
    id: user.id,
    restaurantId: user.restaurantId,
    name: user.name,
    email: user.email,
    role: user.role as unknown as UserRole,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const accessToken = signToken({
    sub: user.id,
    email: user.email,
    role: user.role as unknown as UserRole,
    restaurantId: user.restaurantId,
  });

  return { user: safeUser, accessToken };
}
