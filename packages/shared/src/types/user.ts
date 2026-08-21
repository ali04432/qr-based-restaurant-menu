// ============================================================
// User & Role Types
// ============================================================

/** All roles supported by the platform */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CHEF = 'CHEF',
  WAITER = 'WAITER',
  CASHIER = 'CASHIER',
}

/** Restaurant-scoped staff user */
export interface User {
  id: string;
  restaurantId: string | null; // null for SUPER_ADMIN accounts
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/** Safe user representation (no passwordHash) */
export type SafeUser = Omit<User, never>; // passwordHash is excluded at the DB query level

/** JWT payload embedded in access tokens */
export interface JwtPayload {
  sub: string;          // user id
  email: string;
  role: UserRole;
  restaurantId: string | null;
  iat?: number;
  exp?: number;
}

/** Input for creating a new staff user */
export interface CreateUserInput {
  restaurantId?: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

/** Input for user login */
export interface LoginInput {
  email: string;
  password: string;
}

/** Response returned after successful authentication */
export interface AuthResponse {
  user: SafeUser;
  accessToken: string;
}
