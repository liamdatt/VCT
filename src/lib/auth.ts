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
      const snowflake = account.providerAccountId;
      const username = user.name ?? 'unknown';
      const avatarUrl = user.image ?? null;

      // 1. Try to find by real snowflake first.
      let dbUser = await db.user.findFirst({
        where: { discordId: snowflake },
      });

      // 2. Otherwise try to find a seed row keyed by the discord username.
      if (!dbUser) {
        const byUsername = await db.user.findFirst({
          where: { discordId: username },
        });
        if (byUsername) {
          // 3. Migrate the seed row to the real snowflake.
          dbUser = await db.user.update({
            where: { id: byUsername.id },
            data: {
              discordId: snowflake,
              username,
              avatarUrl,
            },
          });
        }
      } else {
        // Keep the existing row's profile fields fresh.
        dbUser = await db.user.update({
          where: { id: dbUser.id },
          data: { username, avatarUrl },
        });
      }

      // 4. Still nothing — create a fresh user.
      if (!dbUser) {
        dbUser = await db.user.create({
          data: {
            discordId: snowflake,
            username,
            avatarUrl,
          },
        });
      }

      (user as { dbId?: string }).dbId = dbUser.id;
      return true;
    },
    async jwt({ token, account }) {
      if (account?.providerAccountId) {
        // At this point signIn has already migrated any seed row, so
        // looking up by the real snowflake is sufficient.
        const dbUser = await db.user.findFirst({
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
