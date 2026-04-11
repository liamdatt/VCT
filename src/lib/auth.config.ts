import type { NextAuthConfig } from 'next-auth';
import Discord from 'next-auth/providers/discord';

export const authConfig = {
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token }) {
      return token;
    },
    async session({ session, token }) {
      if (token.dbId) {
        session.user.id = token.dbId as string;
        session.user.discordId = token.discordId as string;
        session.user.role = (token.role as 'USER' | 'COMMISSIONER') ?? 'USER';
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
