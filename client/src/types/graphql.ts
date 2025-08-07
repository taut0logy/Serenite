import { PrismaClient } from '@prisma/client';

export interface Context {
  prisma: PrismaClient;
  user?: {
    id: string;
    email: string;
    role: string;
  } | null;
  token?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  isAuthenticated: boolean;
}