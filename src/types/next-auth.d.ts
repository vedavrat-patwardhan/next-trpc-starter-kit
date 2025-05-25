import { Role as PrismaRole } from '@prisma/client'; // Renamed to avoid conflict

declare module 'next-auth' {
  interface Session {
    user: {
      id: string; // User's CUID from your User model
      email: string;
      role: string | null; // Role name (e.g., "ADMIN", "HR")
      name: string; // Typically user.username or user.name
      permissions: string[]; // Array of permission strings (e.g., "employee:create")
      organizationId: string;
      organizationName: string;
    };
  }

  interface User {
    id: string;
    email?: string | null; 
    roleId?: string | null; 
    name?: string | null; 
    organizationId: string; 
    organizationName: string; 
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string; 
    email: string;
    role: string | null;
    name: string;
    permissions: string[];
    organizationId: string;
    organizationName: string;
  }
}
