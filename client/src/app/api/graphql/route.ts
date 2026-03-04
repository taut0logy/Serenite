import { createYoga } from 'graphql-yoga'
import { schema } from '@/graphql'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { getToken } from 'next-auth/jwt'
import { verifySession } from '@/actions/auth.actions'
import type { NextRequest } from 'next/server'
import { Role } from '@prisma/client'

interface Context {
  prisma: typeof prisma;
  user?: Awaited<ReturnType<typeof verifySession>>['user'] | null;
  token?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  isAuthenticated: boolean;
}

const { handleRequest } = createYoga({
  schema,
  context: async ({ request }): Promise<Context> => {
    let user: Awaited<ReturnType<typeof verifySession>>['user'] | null = null;
    let token: string | null = null;

    // Strategy 1: NextAuth cookie session (browser requests — same domain)
    try {
      const session = await auth();
      if (session?.user?.id) {
        // Retrieve the raw DB token from the server-side JWT (never exposed to client)
        const jwt = await getToken({
          req: request as unknown as NextRequest,
          secret: process.env.AUTH_SECRET!,
        });
        token = (jwt?.accessToken as string) ?? null;
        user = {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role as Role,
          verified: session.user.email_verified ?? false,
          kycVerified: session.user.kycVerified ?? false,
          twoFactorEnabled: session.user.twoFactorEnabled ?? false,
          hasPassword: session.user.hasPassword ?? false,
          questionnaireCompleted: session.user.questionnaireCompleted ?? false,
          profile: null,
        };
      }
    } catch {
      // cookie auth failed — fall through to Bearer
    }

    // Strategy 2: Bearer token (internal server callers, e.g. NextAuth jwt callback)
    if (!user) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
        try {
          const { valid, user: authenticatedUser } = await verifySession(token);
          if (valid && authenticatedUser) {
            user = authenticatedUser;
          }
        } catch (error) {
          console.error('Bearer auth error in GraphQL context:', error);
        }
      }
    }

    return {
      prisma,
      user,
      token,
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
      isAuthenticated: !!user,
    };
  },
  graphiql: process.env.NODE_ENV !== 'production',
  logging: {
    debug: (...args) => console.debug(args),
    info: (...args) => console.info(args),
    warn: (...args) => console.warn(args),
    error: (...args) => console.error(args)
  }
});

export async function GET(request: Request, ctx) {
  return handleRequest(request, ctx);
}

export async function POST(request: Request, ctx) {
  return handleRequest(request, ctx);
}
