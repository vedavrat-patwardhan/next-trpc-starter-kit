import type { AuthOptions, User as NextAuthUser } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { verifyPassword } from '@/utils/encoder'; // Assuming this utility exists and works
import { RoleName } from '@prisma/client'; // Import RoleName enum

interface ExtendedUser extends NextAuthUser {
  roles?: RoleName[];
  // permissions?: string[]; // Removed permissions
}

export const authConfig: AuthOptions = {
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials): Promise<ExtendedUser | null> {
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
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        });

        if (!user) {
          throw new Error(
            JSON.stringify({
              field: 'email',
              message: 'The email address is not registered',
            })
          );
        }

        // Ensure user.password exists before trying to verify
        if (!user.password) {
            throw new Error(
                JSON.stringify({
                    field: 'email', // Or a general error
                    message: 'Password not set for this user.',
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

        const userRoles = user.roles.map((userRole) => userRole.role.name);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: userRoles, // Assign fetched roles
        };
      },
    }),
  ],
  pages: {
    signIn: '/login', // Assuming your login page is at /login
    error: '/auth/error', // Custom error page for auth errors
  },
  callbacks: {
    async jwt({ token, user }) {
      const u = user as ExtendedUser | undefined;
      if (u) {
        token.id = u.id;
        token.name = u.name;
        token.email = u.email;
        token.roles = u.roles;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email;
        (session.user as ExtendedUser).roles = token.roles as RoleName[];
      }
      return session;
    },
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET, // Make sure NEXTAUTH_SECRET is set in your .env
};
