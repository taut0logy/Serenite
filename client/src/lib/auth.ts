import { auth } from '@/auth';
import type { User } from '@/types';

export const currentUser = async (): Promise<User | null> => {
    const session = await auth();
    return session?.user as User | null;
};
