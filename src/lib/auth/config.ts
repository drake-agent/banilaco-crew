import NextAuth from 'next-auth';
import Discord from 'next-auth/providers/discord';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/db';
import { users, accounts, sessions, verificationTokens } from '@/db/schema/auth';
import { discordLinks } from '@/db/schema/discord';
import { eq } from 'drizzle-orm';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),

  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: { scope: 'identify email guilds' },
      },
    }),
  ],

  session: { strategy: 'jwt' },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id;
      }

      // FIX SEC-6: Always refresh role from DB (not just at login)
      // This ensures admin demotion takes effect immediately
      if (token.userId) {
        const dbUser = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, token.userId as string))
          .limit(1);

        token.role = dbUser[0]?.role ?? 'user';
      }

      // Store Discord user ID for bot linking
      if (account?.provider === 'discord') {
        token.discordId = account.providerAccountId;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        (session.user as Record<string, unknown>).role = token.role;
        (session.user as Record<string, unknown>).discordId = token.discordId;
      }
      return session;
    },
  },

  pages: {
    signIn: '/auth',
    error: '/auth',
  },
});
