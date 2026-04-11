import NextAuth, { type DefaultSession } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import { authConfig } from './auth.config';
import { db } from './db';

// ensure type import is retained
export type { JWT };

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      discordId: string;
      role: 'USER' | 'COMMISSIONER';
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    dbId?: string;
    discordId?: string;
    role?: 'USER' | 'COMMISSIONER';
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider !== 'discord' || !account.providerAccountId) return false;
      const dbUser = await db.user.upsert({
        where: { discordId: account.providerAccountId },
        update: {
          username: user.name ?? 'unknown',
          avatarUrl: user.image ?? null,
        },
        create: {
          discordId: account.providerAccountId,
          username: user.name ?? 'unknown',
          avatarUrl: user.image ?? null,
        },
      });
      (user as { dbId?: string }).dbId = dbUser.id;
      return true;
    },
    async jwt({ token, account }) {
      if (account?.providerAccountId) {
        const dbUser = await db.user.findUnique({
          where: { discordId: account.providerAccountId },
        });
        if (dbUser) {
          token.dbId = dbUser.id;
          token.discordId = dbUser.discordId;
          token.role = dbUser.role;
        }
      }
      return token;
    },
  },
});
