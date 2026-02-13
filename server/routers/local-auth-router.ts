/**
 * Local Authentication Router
 * 
 * tRPC procedures for local authentication (replaces VBE6D OAuth)
 */

import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { registerUser, loginUser, changePassword, ensureDefaultAdmin } from '../local-auth';
import { TRPCError } from '@trpc/server';

// Ensure default admin exists on module load
ensureDefaultAdmin().catch(console.error);

export const localAuthRouter = router({
  /**
   * Register a new user
   */
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        name: z.string().min(1, 'Name is required'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await registerUser(input.email, input.password, input.name);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to register user',
        });
      }
    }),

  /**
   * Login with email and password
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(1, 'Password is required'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await loginUser(input.email, input.password);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: error.message || 'Invalid credentials',
        });
      }
    }),

  /**
   * Change password (requires authentication)
   */
  changePassword: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        oldPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string().min(6, 'New password must be at least 6 characters'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await changePassword(input.userId, input.oldPassword, input.newPassword);
        return { success: true, message: 'Password changed successfully' };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to change password',
        });
      }
    }),

  /**
   * Get current authentication mode
   */
  getAuthMode: publicProcedure.query(() => {
    return {
      mode: 'local',
      features: {
        registration: true,
        passwordReset: false, // TODO: implement password reset
        socialLogin: false,
      },
    };
  }),
});
