'use client';

import TrpcProvider from '@/hooks/trpcProvider';
import { SessionProvider } from 'next-auth/react';

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <TrpcProvider>
      <SessionProvider>{children}</SessionProvider>
    </TrpcProvider>
  );
}
