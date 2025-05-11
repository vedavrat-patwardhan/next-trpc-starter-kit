import { Permission, ProfileType, Role } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      role: Role;
      name: string;
      permissions: Permission[];
      profileId: string;
      currentProfileType: ProfileType;
    };
  }

  interface User {
    id: string;
    email: string;
    role: Role;
    name: string;
    permissions: Permission[];
    profileId: string;
    currentProfileType: ProfileType;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    name: string;
    permissions: Permission[];
    profileId: string;
    currentProfileType: ProfileType;
  }
}
