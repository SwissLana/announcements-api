import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(30),
  email: z.email().transform(value => value.toLowerCase()),
  password: z.string().min(6).refine(value => Buffer.byteLength(value, 'utf8') <= 72, {
    message: 'Password must not exceed 72 UTF-8 bytes (bcrypt limit)',
  }),
  name: z.string().trim().min(2),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
