import type { AuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { verifyPassword } from '@/utils/encoder';

export const authConfig: AuthOptions = {
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error(
            JSON.stringify({
              field: !credentials?.email ? 'email' : 'password',
              message: 'This field is required',
            })
          );
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },

        });

        if (!user) {
          throw new Error(
            JSON.stringify({
              field: 'email',
              message: 'The email address is not registered',
            })
          );
        }

        const isValid = await verifyPassword(
          credentials.password,
          user.password
        );

        if (!isValid) {
          throw new Error(
            JSON.stringify({
              field: 'password',
              message: 'The password is incorrect',
            })
          );
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          permissions: user.permissions.map((p) => p.permission),
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.name = user.name;
        token.permissions = user.permissions;
      }
      return token;
    },

    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.name = token.name;
        session.user.permissions = token.permissions;
      }
      return session;
    },
  },
  session: { strategy: 'jwt' },
};
