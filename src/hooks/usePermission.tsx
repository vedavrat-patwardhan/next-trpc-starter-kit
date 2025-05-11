'use client';

import { useSession } from 'next-auth/react';
import { checkPermission } from '@/utils/auth';

export const usePermission = (permission: string) => {
  const { data: session } = useSession();

  if (!session) return false;

  return checkPermission(
    session.user.permissions.map((p) => p.code),
    permission
  );
};
