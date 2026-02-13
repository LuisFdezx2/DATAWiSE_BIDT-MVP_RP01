/**
 * Local Authentication Service
 * 
 * Replaces VBE6D OAuth for standalone local installation.
 * Provides JWT-based authentication with bcrypt password hashing.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'local-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token válido por 7 días

export interface LocalUser {
  id: number;
  openId: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

export interface AuthTokens {
  accessToken: string;
  user: LocalUser;
}

/**
 * Register a new user
 */
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<AuthTokens> {
  // Check if user already exists
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  
  if (existing.length > 0) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const openId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db!.insert(users).values({
    openId,
    name,
    email,
    role: 'user', // Default role
    passwordHash,
    createdAt: new Date(),
  });
  
  // Fetch the created user
  const [newUser] = await db!.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (!newUser) throw new Error('Failed to create user');

  // Generate JWT
  const accessToken = jwt.sign(
    {
      userId: newUser.id,
      openId: newUser.openId,
      email: newUser.email,
      role: newUser.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    accessToken,
    user: {
      id: newUser.id,
      openId: newUser.openId,
      name: newUser.name || name,
      email: newUser.email || email,
      role: newUser.role,
    },
  };
}

/**
 * Login with email and password
 */
export async function loginUser(
  email: string,
  password: string
): Promise<AuthTokens> {
  // Find user by email
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // For now, we'll create a simple password check
  // In production, this should verify against stored hash
  // TODO: Add passwordHash field to users table
  const isValidPassword = await bcrypt.compare(password, user.passwordHash || '');

  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  // Generate JWT
  const accessToken = jwt.sign(
    {
      userId: user.id,
      openId: user.openId,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    accessToken,
    user: {
      id: user.id,
      openId: user.openId,
      name: user.name || 'User',
      email: user.email || '',
      role: user.role,
    },
  };
}

/**
 * Verify JWT token and return user info
 */
export async function verifyToken(token: string): Promise<LocalUser | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Fetch fresh user data from database
    const db = await getDb();
    if (!db) return null;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      openId: user.openId,
      name: user.name || 'User',
      email: user.email || '',
      role: user.role,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Create default admin user if none exists
 */
export async function ensureDefaultAdmin(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn('Database not available, skipping default admin creation');
    return;
  }
  const admins = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);

  if (admins.length === 0) {
    const passwordHash = await bcrypt.hash('admin123', 10);

    await db!.insert(users).values({
      openId: 'local_admin',
      name: 'Administrator',
      email: 'admin@localhost',
      role: 'admin',
      passwordHash,
      createdAt: new Date(),
    });

    console.log('✅ Default admin user created: admin@localhost / admin123');
  }
}

/**
 * Change user password
 */
export async function changePassword(
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  // Verify old password
  const isValid = await bcrypt.compare(oldPassword, user.passwordHash || '');
  if (!isValid) {
    throw new Error('Invalid current password');
  }

  // Hash new password
  const newHash = await bcrypt.hash(newPassword, 10);

  // Update in database
  await db!.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));
}
