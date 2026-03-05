import { createYoga } from 'graphql-yoga';
import { schema } from '@/graphql';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

/**
 * GraphQL API route.
 *
 * Auth: NextAuth cookie session only.
 * Auth mutations (login/register/2FA/password/social) have been removed —
 * they live exclusively in /src/actions/auth.actions.ts as Next.js server actions.
 * Exposing them via GraphQL created a redundant unauthenticated attack surface.
 */

interface Context {
  prisma: typeof prisma;
  user?: {
    id: string;
    email: string | null | undefined;
    role: string;
    verified: boolean;
    twoFactorEnabled: boolean;
    hasPassword: boolean;
    questionnaireCompleted: boolean;
  } | null;
  isAuthenticated: boolean;
}

const { handleRequest } = createYoga({
  schema,
  context: async (): Promise<Context> => {
    let user: Context['user'] = null;

    try {
      const session = await auth();
      if (session?.user?.id) {
        user = {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role ?? 'USER',
          verified: session.user.email_verified ?? false,
          twoFactorEnabled: session.user.twoFactorEnabled ?? false,
          hasPassword: session.user.hasPassword ?? false,
          questionnaireCompleted: session.user.questionnaireCompleted ?? false,
        };
      }
    } catch {
      // Session read failed — context is unauthenticated
    }

    return {
      prisma,
      user,
      isAuthenticated: !!user,
    };
  },
  graphiql: process.env.NODE_ENV !== 'production',
  logging: false,
});

export async function GET(request: Request, ctx) {
  return handleRequest(request, ctx);
}

export async function POST(request: Request, ctx) {
  return handleRequest(request, ctx);
}
