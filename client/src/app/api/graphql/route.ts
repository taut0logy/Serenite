import { createYoga } from 'graphql-yoga'
import { schema } from '@/graphql'
import prisma from '@/lib/prisma'
import { verifySession } from '@/actions/auth.actions'

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

    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (token) {
      try {
        const { valid, user: authenticatedUser } = await verifySession(token);
        if (valid && authenticatedUser) {
          user = authenticatedUser;
        }
      } catch (error) {
        console.error('Authentication error in GraphQL context:', error);
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
