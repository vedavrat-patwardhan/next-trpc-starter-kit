import type { AuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
// import { db } from '@/lib/db'; // Assuming prisma is exported as db - db is not used
import { verifyPassword } from '@/utils/encoder';
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "~/app/server/db"; 

export const authConfig: AuthOptions = {
  adapter: PrismaAdapter(prisma),
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

        const userWithOrg = await prisma.user.findUnique({ 
          where: { email: credentials.email },
          include: {
            organization: true, // Include the organization details
          },
        });

        if (!userWithOrg || !userWithOrg.passwordHash) { 
          throw new Error(
            JSON.stringify({
              field: 'email',
              message: 'The email address is not registered or user profile is incomplete.',
            })
          );
        }
        
        if (!userWithOrg.organizationId || !userWithOrg.organization) {
            throw new Error(
              JSON.stringify({
                field: 'email', 
                message: 'User is not associated with an organization.',
              })
            );
        }

        const isValidPassword = await verifyPassword(
          credentials.password,
          userWithOrg.passwordHash 
        );

        if (!isValidPassword) {
          throw new Error(
            JSON.stringify({
              field: 'password',
              message: 'The password is incorrect',
            })
          );
        }

        await prisma.user.update({
          where: { userId: userWithOrg.userId },
          data: { lastLogin: new Date() },
        });
        
        return { 
          id: userWithOrg.userId, 
          email: userWithOrg.email,
          roleId: userWithOrg.roleId, 
          name: userWithOrg.username, 
          organizationId: userWithOrg.organizationId, 
          organizationName: userWithOrg.organization.name, 
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/auth/error', 
  },
  callbacks: {
    async jwt({ token, user, trigger, session: newSessionData, account }) { 
      if (user) { 
        token.userId = user.id; 
        token.email = user.email as string; 
        token.name = user.name as string;   
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        
        if (user.roleId) {
          const roleWithPermissions = await prisma.role.findUnique({
            where: { roleId: user.roleId }, 
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          });
          token.role = roleWithPermissions ? roleWithPermissions.name : null;
          token.permissions = roleWithPermissions
            ? roleWithPermissions.permissions.map((p) => p.permission.name)
            : [];
        } else {
          token.role = null;
          token.permissions = [];
        }
      }
      
      if (trigger === "update" && newSessionData?.user) {
        // Example: token.name = newSessionData.user.name;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId; 
        session.user.role = token.role;
        session.user.name = token.name;
        session.user.email = token.email; 
        session.user.permissions = token.permissions;
        session.user.organizationId = token.organizationId; 
        session.user.organizationName = token.organizationName; 
      }
      return session;
    },
  },
  session: { strategy: 'jwt' },
};
