import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
import { JWT as DefaultJWT } from 'next-auth/jwt';
import { RoleName } from '@prisma/client'; // Import RoleName

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      roles?: RoleName[]; // Changed from role: string to roles: RoleName[]
      // permissions?: string[]; // Removed permissions
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    roles?: RoleName[];
    // permissions?: string[]; // Removed permissions
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string;
    roles?: RoleName[];
    // permissions?: string[]; // Removed permissions
  }
}
