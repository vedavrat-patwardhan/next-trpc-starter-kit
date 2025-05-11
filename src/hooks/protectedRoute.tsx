'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import { checkPermission } from '@/utils/auth';
import Loader from '@/components/Loader';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
}

export const ProtectedRoute = ({
  children,
  requiredPermission,
}: ProtectedRouteProps) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    // Not logged in
    if (!session) {
      router.replace('/auth/sign-in');
      return;
    }

    // Permission check
    if (requiredPermission) {
      const hasPermission = checkPermission(
        (session.user.permissions || []).map((p) => p.code),
        requiredPermission
      );
      if (!hasPermission) {
        router.replace('/error/403');
        return;
      }
    }

    const profileType = session.user.currentProfileType;

    const onboardingRoutes: Record<string, string> = {
      ORGANIZATION: '/onboarding/organization',
      PROFESSIONAL: '/onboarding/professional',
    };

    const isOnboarded =
      profileType === 'ORGANIZATION' || profileType === 'PROFESSIONAL';

    const currentOnboardingRoute = onboardingRoutes[profileType];

    const isOnboardingPath = pathname === currentOnboardingRoute;

    if (!isOnboarded && !isOnboardingPath) {
      router.replace(currentOnboardingRoute);
      return;
    }

    setIsAuthorized(true);
  }, [session, status, requiredPermission, pathname, router]);

  if (status === 'loading' || !isAuthorized) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return <>{children}</>;
};
